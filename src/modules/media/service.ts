import "server-only";

import { AppError } from "@/lib/errors";
import { createAssessmentMediaUploadSignature, verifyAssessmentMediaAsset } from "@/lib/cloudinary";
import type { AssessmentMediaAsset, AssessmentMediaKind } from "@/modules/media/types";
import { IntegrityEvent } from "@/models/integrity-event.model";
import { requireActiveQuestionAccess } from "@/modules/attempts/service";

export async function createCandidateMediaSignature(input: { token: string; sessionId: string; questionId: string; kind: AssessmentMediaKind }) {
  const { attempt, question, invitation } = await requireActiveQuestionAccess(input.token, input.sessionId, input.questionId);
  const responseKind = question.type === "video" ? "video_answer" : question.type === "audio" ? "audio_answer" : question.type === "file_upload" ? "file_answer" : null;
  const integrityKind = ["identity_photo", "integrity_snapshot", "proctor_recording"].includes(input.kind);
  if (input.kind !== responseKind && !integrityKind) throw new AppError("This upload type is not allowed for the current question.", 422, "MEDIA_TYPE_MISMATCH");
  if (integrityKind && invitation.monitoringLevel === "standard") throw new AppError("Media monitoring is not enabled for this assessment.", 403, "MEDIA_MONITORING_DISABLED");
  if (input.kind === "proctor_recording" && (!attempt.consent.mediaRecording || invitation.monitoringLevel !== "proctored")) throw new AppError("Proctor recording is not authorized.", 403, "RECORDING_NOT_AUTHORIZED");
  return createAssessmentMediaUploadSignature(attempt.id, question.id, input.kind);
}

export async function registerIntegrityMedia(input: { token: string; sessionId: string; questionId: string; kind: AssessmentMediaKind; asset: AssessmentMediaAsset }) {
  if (!["identity_photo", "integrity_snapshot", "proctor_recording"].includes(input.kind)) throw new AppError("This is not an integrity-media upload.", 422, "INVALID_INTEGRITY_MEDIA");
  const { attempt, question, invitation } = await requireActiveQuestionAccess(input.token, input.sessionId, input.questionId);
  if (invitation.monitoringLevel === "standard") throw new AppError("Media monitoring is not enabled.", 403, "MEDIA_MONITORING_DISABLED");
  if (input.kind === "proctor_recording" && (!attempt.consent.mediaRecording || invitation.monitoringLevel !== "proctored")) throw new AppError("Recording is not authorized.", 403, "RECORDING_NOT_AUTHORIZED");
  const media = await verifyAssessmentMediaAsset(attempt.id, question.id, input.kind, input.asset);
  const eventType = input.kind === "identity_photo" ? "identity_captured" : input.kind === "integrity_snapshot" ? "snapshot_captured" : "recording_uploaded";
  await IntegrityEvent.create({ organizationId: attempt.organizationId, attemptId: attempt._id, invitationId: attempt.invitationId, candidateId: attempt.candidateId, questionId: question._id, type: eventType, occurredAt: new Date(), metadata: media });
  return { recorded: true };
}
