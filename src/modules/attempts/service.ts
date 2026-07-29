import "server-only";

import { createHash, randomInt } from "node:crypto";
import { Types, type HydratedDocument } from "mongoose";

import { connectToDatabase } from "@/lib/database";
import { verifyAssessmentMediaAsset } from "@/lib/cloudinary";
import { AppError, isDuplicateKeyError } from "@/lib/errors";
import { Answer } from "@/models/answer.model";
import { Application } from "@/models/application.model";
import { AssessmentAttempt, type IAssessmentAttempt } from "@/models/assessment-attempt.model";
import { AssessmentInvitation } from "@/models/assessment-invitation.model";
import { AssessmentTemplate } from "@/models/assessment-template.model";
import { IntegrityEvent } from "@/models/integrity-event.model";
import { Question, type IQuestion } from "@/models/question.model";
import { scoreObjectiveAnswer } from "@/modules/attempts/scoring";
import type { IntegrityEventType } from "@/modules/assessments/constants";
import { getAssessmentInvitationWindowState } from "@/modules/assessments/invitation-window";
import type { AnswerInput, IntegrityEventInput, StartAttemptInput } from "@/modules/attempts/schemas";
import { attemptExpiry, hasExpired, questionExpiry } from "@/modules/attempts/timers";
import { requireVerifiedInvitation } from "@/modules/attempts/otp";
import { transcribeAnswerMedia } from "@/modules/media/transcription";

type AttemptDocument = HydratedDocument<IAssessmentAttempt>;

function hashSession(sessionId: string) {
  return createHash("sha256").update(sessionId).digest("hex");
}

function shuffle<T>(items: T[]) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const target = randomInt(index + 1);
    [copy[index], copy[target]] = [copy[target], copy[index]];
  }
  return copy;
}

async function addEvent(attempt: AttemptDocument, type: IntegrityEventType, questionId?: Types.ObjectId, metadata: Record<string, unknown> = {}) {
  await IntegrityEvent.create({ organizationId: attempt.organizationId, attemptId: attempt._id, invitationId: attempt.invitationId, candidateId: attempt.candidateId, questionId, type, occurredAt: new Date(), metadata });
}

async function assertBrowserSession(attempt: AttemptDocument, sessionId: string) {
  if (attempt.activeSessionHash === hashSession(sessionId)) return;
  await addEvent(attempt, "multiple_session_detected", undefined, { blocked: true });
  throw new AppError("This attempt is already active in another browser session.", 409, "MULTIPLE_SESSION");
}

async function finalizeAttempt(attempt: AttemptDocument, status: "completed" | "expired") {
  if (attempt.status !== "in_progress") return;
  const totals = await Answer.aggregate<{ score: number }>([
    { $match: { organizationId: attempt.organizationId, attemptId: attempt._id, status: "submitted" } },
    { $project: { finalScore: { $ifNull: ["$overrideScore", { $ifNull: ["$aiScore", { $ifNull: ["$autoScore", 0] }] }] } } },
    { $group: { _id: null, score: { $sum: "$finalScore" } } },
  ]);
  const now = new Date();
  attempt.status = status;
  attempt.submittedAt = now;
  attempt.totalScore = totals[0]?.score ?? 0;
  await attempt.save();
  if (status === "completed") {
    await Promise.all([
      AssessmentInvitation.updateOne({ _id: attempt.invitationId, organizationId: attempt.organizationId }, { $set: { status: "completed", completedAt: now } }),
      Application.updateOne({ _id: attempt.applicationId, organizationId: attempt.organizationId }, { $set: { stage: "assessment_completed" } }),
    ]);
    await addEvent(attempt, "assessment_completed");
  }
}

async function synchronizeDeadlines(attempt: AttemptDocument) {
  if (attempt.status !== "in_progress") return;
  const now = new Date();
  if (hasExpired(attempt.expiresAt, now)) {
    await finalizeAttempt(attempt, "expired");
    return;
  }

  while (attempt.currentQuestionIndex < attempt.questions.length) {
    const state = attempt.questions[attempt.currentQuestionIndex];
    if (!state.startedAt) {
      state.startedAt = now;
      attempt.markModified("questions");
      await attempt.save();
      await addEvent(attempt, "question_opened", state.questionId);
    }
    const question = await Question.findOne({ _id: state.questionId, organizationId: attempt.organizationId }).select("type points timeLimit preparationTime");
    if (!question) throw new AppError("An assessment question is no longer available.", 409, "QUESTION_UNAVAILABLE");
    const deadline = questionExpiry(state.startedAt, question.preparationTime, question.timeLimit, attempt.expiresAt);
    if (!hasExpired(deadline, now)) break;
    const autoScore = scoreObjectiveAnswer({ type: question.type, selectedOptions: [], correctAnswers: [], points: question.points });
    await Answer.findOneAndUpdate(
      { organizationId: attempt.organizationId, attemptId: attempt._id, questionId: question._id },
      { $setOnInsert: { candidateId: attempt.candidateId, type: question.type, selectedOptions: [], text: "" }, $set: { status: "submitted", submittedAt: now, ...(autoScore === undefined ? {} : { autoScore }) } },
      { upsert: true, runValidators: true },
    );
    state.submittedAt = now;
    attempt.currentQuestionIndex += 1;
    attempt.markModified("questions");
    await addEvent(attempt, "question_submitted", state.questionId, { automatic: true, reason: "question_expired" });
    if (attempt.currentQuestionIndex < attempt.questions.length) attempt.questions[attempt.currentQuestionIndex].startedAt = now;
    await attempt.save();
  }
  if (attempt.currentQuestionIndex >= attempt.questions.length) await finalizeAttempt(attempt, "completed");
}

async function serializeSession(attempt: AttemptDocument) {
  await synchronizeDeadlines(attempt);
  if (attempt.status !== "in_progress") return { state: attempt.status, attemptId: attempt.id, totalScore: attempt.totalScore ?? 0, maximumScore: attempt.maximumScore, submittedAt: attempt.submittedAt?.toISOString() };
  const state = attempt.questions[attempt.currentQuestionIndex];
  const question = await Question.findOne({ _id: state.questionId, organizationId: attempt.organizationId }).lean();
  if (!question || !state.startedAt) throw new AppError("The current question is unavailable.", 409, "QUESTION_UNAVAILABLE");
  const [answer, invitation] = await Promise.all([
    Answer.findOne({ organizationId: attempt.organizationId, attemptId: attempt._id, questionId: question._id }).lean(),
    AssessmentInvitation.findOne({ _id: attempt.invitationId, organizationId: attempt.organizationId }).select("monitoringLevel").lean(),
  ]);
  const optionById = new Map(question.options.map((option) => [option.id, option]));
  const options = question.type === "true_false"
    ? [{ id: "true", label: "True" }, { id: "false", label: "False" }]
    : state.optionOrder.map((id) => optionById.get(id)).filter((option): option is IQuestion["options"][number] => Boolean(option));
  const questionDeadline = questionExpiry(state.startedAt, question.preparationTime, question.timeLimit, attempt.expiresAt);
  return {
    state: "in_progress" as const,
    attemptId: attempt.id,
    serverNow: new Date().toISOString(),
    attemptExpiresAt: attempt.expiresAt.toISOString(),
    monitoringLevel: invitation?.monitoringLevel ?? "standard",
    progress: { current: attempt.currentQuestionIndex + 1, total: attempt.questions.length },
    question: {
      id: String(question._id), type: question.type, title: question.title, description: question.description, category: question.category,
      difficulty: question.difficulty, points: question.points, preparationTime: question.preparationTime, timeLimit: question.timeLimit,
      required: question.required, options, codingConfig: { language: question.codingConfig.language, allowedLanguages: question.codingConfig.allowedLanguages ?? [question.codingConfig.language], starterCode: question.codingConfig.starterCode, exampleTests: question.codingConfig.exampleTests ?? [], runtimeLimitMs: question.codingConfig.runtimeLimitMs ?? 3_000, memoryLimitKb: question.codingConfig.memoryLimitKb ?? 128_000 },
      startedAt: state.startedAt.toISOString(), preparationEndsAt: new Date(state.startedAt.getTime() + question.preparationTime * 1_000).toISOString(), expiresAt: questionDeadline.toISOString(),
    },
    answer: answer ? { selectedOptions: answer.selectedOptions, text: answer.text, coding: answer.coding, media: answer.media, status: answer.status, updatedAt: answer.updatedAt.toISOString() } : null,
  };
}

async function latestAttempt(invitationId: Types.ObjectId) {
  return AssessmentAttempt.findOne({ invitationId }).select("+activeSessionHash").sort({ attemptNumber: -1 });
}

export async function startAssessmentAttempt(input: StartAttemptInput, ipAddress?: string) {
  const invitation = await requireVerifiedInvitation(input.token);
  await connectToDatabase();
  const existing = await AssessmentAttempt.findOne({ invitationId: invitation._id, status: "in_progress" }).select("+activeSessionHash");
  if (existing) {
    await assertBrowserSession(existing, input.sessionId);
    return serializeSession(existing);
  }
  const now = new Date();
  const windowState = getAssessmentInvitationWindowState(
    invitation.startDeadline,
    invitation.expiresAt,
    now,
  );
  if (windowState === "scheduled") {
    throw new AppError(
      `This assessment opens at ${invitation.startDeadline.toISOString()}.`,
      409,
      "ASSESSMENT_NOT_OPEN",
      { availableFrom: invitation.startDeadline.toISOString() },
    );
  }
  if (windowState === "expired") {
    await AssessmentInvitation.updateOne(
      { _id: invitation._id, organizationId: invitation.organizationId },
      { $set: { status: "expired" } },
    );
    throw new AppError(
      "This assessment invitation has expired.",
      410,
      "INVITATION_EXPIRED",
    );
  }
  if (invitation.monitoringLevel !== "standard" && (!input.systemCheck.camera || !input.systemCheck.microphone)) throw new AppError("Camera and microphone checks are required for this assessment.", 422, "SYSTEM_CHECK_REQUIRED");
  if (invitation.monitoringLevel === "proctored" && !input.consent.mediaRecording) throw new AppError("Recording consent is required for a proctored assessment.", 422, "RECORDING_CONSENT_REQUIRED");

  const template = await AssessmentTemplate.findOne({ _id: invitation.assessmentId, organizationId: invitation.organizationId });
  if (!template) throw new AppError("Assessment template not found.", 404, "ASSESSMENT_NOT_FOUND");
  const questions = await Question.find({ organizationId: invitation.organizationId, _id: { $in: template.questionIds } });
  const questionById = new Map(questions.map((question) => [question.id, question]));
  let ordered = template.questionIds.map((id) => questionById.get(String(id))).filter((question): question is HydratedDocument<IQuestion> => Boolean(question));
  if (ordered.length !== template.questionIds.length) throw new AppError("The assessment contains unavailable questions.", 409, "QUESTION_UNAVAILABLE");
  if (template.randomizationSettings.randomizeQuestionOrder) ordered = shuffle(ordered);
  if (template.randomizationSettings.questionLimit) ordered = ordered.slice(0, template.randomizationSettings.questionLimit);
  const priorAttempts = await AssessmentAttempt.countDocuments({ invitationId: invitation._id });
  if (priorAttempts >= invitation.maximumAttempts) throw new AppError("The maximum number of attempts has been reached.", 409, "MAXIMUM_ATTEMPTS_REACHED");
  try {
    const attempt = await AssessmentAttempt.create({
      organizationId: invitation.organizationId, invitationId: invitation._id, assessmentId: invitation.assessmentId,
      applicationId: invitation.applicationId, candidateId: invitation.candidateId, attemptNumber: priorAttempts + 1, status: "in_progress",
      questions: ordered.map((question, index) => ({ questionId: question._id, optionOrder: question.randomizeAnswers ? shuffle(question.options.map((option) => option.id)) : question.options.map((option) => option.id), ...(index === 0 ? { startedAt: now } : {}) })),
      currentQuestionIndex: 0, startedAt: now, expiresAt: attemptExpiry(now, invitation.assessmentDuration, invitation.expiresAt), lastHeartbeatAt: now,
      activeSessionHash: hashSession(input.sessionId), systemCheck: { ...input.systemCheck, completedAt: now }, consent: { ...input.consent, acceptedAt: now, ipAddress },
      maximumScore: ordered.reduce((sum, question) => sum + question.points, 0),
    });
    await Promise.all([
      AssessmentInvitation.updateOne({ _id: invitation._id, organizationId: invitation.organizationId }, { $set: { status: "started", startedAt: invitation.startedAt ?? now } }),
      Application.updateOne({ _id: invitation.applicationId, organizationId: invitation.organizationId }, { $set: { stage: "assessment_in_progress" } }),
      IntegrityEvent.create({ organizationId: invitation.organizationId, attemptId: attempt._id, invitationId: invitation._id, candidateId: invitation.candidateId, questionId: ordered[0]?._id, type: "attempt_started", occurredAt: now, metadata: { attemptNumber: priorAttempts + 1 } }),
    ]);
    const loaded = await AssessmentAttempt.findById(attempt._id).select("+activeSessionHash");
    if (!loaded) throw new AppError("Attempt could not be loaded.", 500, "ATTEMPT_LOAD_FAILED");
    return serializeSession(loaded);
  } catch (error) {
    if (isDuplicateKeyError(error)) throw new AppError("An attempt was already started. Refresh to continue.", 409, "ATTEMPT_ALREADY_STARTED");
    throw error;
  }
}

export async function getCandidateAssessmentSession(token: string, sessionId: string) {
  const invitation = await requireVerifiedInvitation(token);
  const attempt = await latestAttempt(invitation._id);
  if (!attempt) return { state: "ready" as const, monitoringLevel: invitation.monitoringLevel };
  await assertBrowserSession(attempt, sessionId);
  attempt.lastHeartbeatAt = new Date();
  await attempt.save();
  return serializeSession(attempt);
}

export async function saveCandidateAnswer(input: AnswerInput) {
  const invitation = await requireVerifiedInvitation(input.token);
  const attempt = await AssessmentAttempt.findOne({ invitationId: invitation._id, status: "in_progress" }).select("+activeSessionHash");
  if (!attempt) throw new AppError("No active assessment attempt was found.", 409, "ATTEMPT_NOT_ACTIVE");
  await assertBrowserSession(attempt, input.sessionId);
  await synchronizeDeadlines(attempt);
  if (attempt.status !== "in_progress") return serializeSession(attempt);
  const state = attempt.questions[attempt.currentQuestionIndex];
  if (String(state.questionId) !== input.questionId) {
    if (attempt.questions.some((item) => String(item.questionId) === input.questionId && item.submittedAt)) return serializeSession(attempt);
    throw new AppError("Only the current question can be updated.", 409, "QUESTION_NOT_CURRENT");
  }
  const question = await Question.findOne({ _id: state.questionId, organizationId: attempt.organizationId });
  if (!question || !state.startedAt) throw new AppError("Question not found.", 404, "QUESTION_NOT_FOUND");
  const validOptions = new Set(question.type === "true_false" ? ["true", "false"] : question.options.map((option) => option.id));
  if (input.selectedOptions.some((option) => !validOptions.has(option))) throw new AppError("The answer contains an invalid option.", 422, "INVALID_OPTION");
  if (["single_choice", "true_false"].includes(question.type) && input.selectedOptions.length > 1) throw new AppError("Select one answer.", 422, "TOO_MANY_OPTIONS");
  const now = new Date();
  const existingAnswer = await Answer.findOne({ organizationId: attempt.organizationId, attemptId: attempt._id, questionId: question._id }).lean();
  let verifiedMedia;
  if (input.media) {
    const expectedKind = question.type === "video" ? "video_answer" : question.type === "audio" ? "audio_answer" : question.type === "file_upload" ? "file_answer" : null;
    if (!expectedKind || input.media.kind !== expectedKind) throw new AppError("This media type does not match the question.", 422, "MEDIA_TYPE_MISMATCH");
    verifiedMedia = await verifyAssessmentMediaAsset(attempt.id, question.id, input.media.kind, input.media.asset);
  }
  if (input.submit && question.required) {
    const hasResponse = ["single_choice", "multiple_choice", "true_false"].includes(question.type) ? input.selectedOptions.length > 0
      : ["short_text", "long_text", "case_study"].includes(question.type) ? input.text.trim().length > 0
        : question.type === "coding" ? Boolean(input.coding?.sourceCode.trim() || existingAnswer?.coding?.sourceCode?.trim())
          : ["video", "audio", "file_upload"].includes(question.type) ? Boolean(verifiedMedia || existingAnswer?.media?.url)
            : true;
    if (!hasResponse) throw new AppError("A response is required before submitting this question.", 422, "ANSWER_REQUIRED");
  }
  const autoScore = input.submit ? scoreObjectiveAnswer({ type: question.type, selectedOptions: input.selectedOptions, correctAnswers: question.correctAnswers, points: question.points }) : undefined;
  const answerSet: Record<string, unknown> = { candidateId: attempt.candidateId, type: question.type, selectedOptions: [...new Set(input.selectedOptions)], text: input.text, status: input.submit ? "submitted" : "draft", ...(input.submit ? { submittedAt: now } : {}), ...(autoScore === undefined ? {} : { autoScore }) };
  if (input.coding) { answerSet["coding.language"] = input.coding.language; answerSet["coding.sourceCode"] = input.coding.sourceCode; }
  if (verifiedMedia) answerSet.media = verifiedMedia;
  const savedAnswer = await Answer.findOneAndUpdate(
    { organizationId: attempt.organizationId, attemptId: attempt._id, questionId: question._id },
    { $set: answerSet },
    { upsert: true, new: true, runValidators: true },
  );
  if (input.submit && verifiedMedia && ["audio", "video"].includes(question.type)) await transcribeAnswerMedia(savedAnswer.id);
  attempt.lastHeartbeatAt = now;
  if (input.submit) {
    state.submittedAt = now;
    attempt.currentQuestionIndex += 1;
    if (attempt.currentQuestionIndex < attempt.questions.length) attempt.questions[attempt.currentQuestionIndex].startedAt = now;
    attempt.markModified("questions");
    await attempt.save();
    await addEvent(attempt, "question_submitted", question._id, { automatic: false });
    if (attempt.currentQuestionIndex >= attempt.questions.length) await finalizeAttempt(attempt, "completed");
    else await addEvent(attempt, "question_opened", attempt.questions[attempt.currentQuestionIndex].questionId);
  } else {
    await attempt.save();
    await addEvent(attempt, "answer_saved", question._id);
  }
  return serializeSession(attempt);
}

export async function requireActiveQuestionAccess(token: string, sessionId: string, questionId: string) {
  const invitation = await requireVerifiedInvitation(token);
  const attempt = await AssessmentAttempt.findOne({ invitationId: invitation._id, status: "in_progress" }).select("+activeSessionHash");
  if (!attempt) throw new AppError("No active assessment attempt was found.", 409, "ATTEMPT_NOT_ACTIVE");
  await assertBrowserSession(attempt, sessionId);
  await synchronizeDeadlines(attempt);
  if (attempt.status !== "in_progress") throw new AppError("The assessment attempt has ended.", 409, "ATTEMPT_NOT_ACTIVE");
  const current = attempt.questions[attempt.currentQuestionIndex];
  if (!current || String(current.questionId) !== questionId) throw new AppError("Only the current question can be accessed.", 409, "QUESTION_NOT_CURRENT");
  const question = await Question.findOne({ _id: current.questionId, organizationId: attempt.organizationId });
  if (!question) throw new AppError("Question not found.", 404, "QUESTION_NOT_FOUND");
  return { invitation, attempt, question };
}

export async function recordIntegrityEvent(input: IntegrityEventInput) {
  const invitation = await requireVerifiedInvitation(input.token);
  const attempt = await AssessmentAttempt.findOne({ invitationId: invitation._id, status: "in_progress" }).select("+activeSessionHash");
  if (!attempt) throw new AppError("No active assessment attempt was found.", 409, "ATTEMPT_NOT_ACTIVE");
  await assertBrowserSession(attempt, input.sessionId);
  const questionId = input.questionId ? new Types.ObjectId(input.questionId) : undefined;
  if (questionId && !attempt.questions.some((question) => question.questionId.equals(questionId))) throw new AppError("Question does not belong to this attempt.", 422, "QUESTION_NOT_IN_ATTEMPT");
  await IntegrityEvent.create({ organizationId: attempt.organizationId, attemptId: attempt._id, invitationId: attempt.invitationId, candidateId: attempt.candidateId, questionId, type: input.type, occurredAt: new Date(), clientOccurredAt: input.clientOccurredAt ? new Date(input.clientOccurredAt) : undefined, metadata: input.metadata });
  attempt.lastHeartbeatAt = new Date();
  await attempt.save();
  return { recorded: true };
}

export async function completeAssessmentAttempt(token: string, sessionId: string) {
  const invitation = await requireVerifiedInvitation(token);
  const attempt = await AssessmentAttempt.findOne({ invitationId: invitation._id, status: "in_progress" }).select("+activeSessionHash");
  if (!attempt) return { completed: invitation.status === "completed" };
  await assertBrowserSession(attempt, sessionId);
  await synchronizeDeadlines(attempt);
  if (attempt.status === "expired") return { completed: false, expired: true };
  if (attempt.questions.some((question) => !question.submittedAt)) throw new AppError("Submit every question before completing the assessment.", 409, "QUESTIONS_REMAINING");
  await finalizeAttempt(attempt, "completed");
  return { completed: true };
}
