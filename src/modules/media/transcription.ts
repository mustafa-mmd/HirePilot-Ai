import "server-only";

import { createPartFromUri, createUserContent, FileState, type File as GeminiFile } from "@google/genai";

import { AppError } from "@/lib/errors";
import { AIUsage } from "@/models/ai-usage.model";
import { Answer } from "@/models/answer.model";
import { AssessmentAttempt } from "@/models/assessment-attempt.model";
import { getGeminiClient } from "@/modules/ai/client";
import { AI_MODEL, AI_TRANSCRIPTION_PROMPT_VERSION } from "@/modules/ai/constants";
import { createUsageRecord } from "@/modules/ai/service";

const FILE_PROCESSING_TIMEOUT_MS = 2 * 60 * 1_000;

function wait(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function waitForGeminiFile(file: GeminiFile) {
  const client = getGeminiClient();
  let current = file;
  const deadline = Date.now() + FILE_PROCESSING_TIMEOUT_MS;
  while (current.state === FileState.PROCESSING && Date.now() < deadline) {
    await wait(2_000);
    if (!current.name) break;
    current = await client.files.get({ name: current.name });
  }
  if (current.state === FileState.FAILED) {
    throw new AppError(current.error?.message || "Gemini could not process the recording.", 502, "TRANSCRIPTION_PROCESSING_FAILED");
  }
  if (current.state === FileState.PROCESSING) {
    throw new AppError("Gemini did not finish processing the recording in time.", 504, "TRANSCRIPTION_PROCESSING_TIMEOUT");
  }
  if (!current.uri || !current.mimeType) {
    throw new AppError("Gemini did not return a usable media file.", 502, "TRANSCRIPTION_FILE_INVALID");
  }
  return current;
}

export async function transcribeAnswerMedia(answerId: string) {
  const answer = await Answer.findById(answerId);
  if (!answer?.media || !["audio", "video"].includes(answer.type)) return;
  await Answer.updateOne({ _id: answer._id }, { $set: { "media.transcriptionStatus": "pending" }, $unset: { "media.transcriptionError": 1 } });
  let uploadedFileName: string | undefined;
  try {
    const response = await fetch(answer.media.url, { cache: "no-store" });
    if (!response.ok) throw new AppError("The recording could not be downloaded for transcription.", 502, "TRANSCRIPTION_DOWNLOAD_FAILED");
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length > 100 * 1024 * 1024) throw new AppError("The recording is too large to transcribe.", 422, "TRANSCRIPTION_FILE_TOO_LARGE");
    const responseMimeType = response.headers.get("content-type")?.split(";", 1)[0]?.trim();
    const mimeType = responseMimeType?.startsWith(`${answer.type}/`) ? responseMimeType : `${answer.type}/webm`;
    const client = getGeminiClient();
    const uploaded = await client.files.upload({
      file: new Blob([new Uint8Array(bytes)], { type: mimeType }),
      config: { mimeType, displayName: `assessment-answer-${answer.id}.${answer.media.format || "webm"}` },
    });
    uploadedFileName = uploaded.name;
    const file = await waitForGeminiFile(uploaded);
    const transcription = await client.models.generateContent({
      model: AI_MODEL,
      contents: createUserContent([
        createPartFromUri(file.uri!, file.mimeType!),
        "Transcribe all spoken words exactly as heard. Preserve the original language, speaker changes, and meaningful pauses. Do not summarize, evaluate, or infer anything from appearance, accent, emotion, or the visual scene. Return only the transcript.",
      ]),
      config: { thinkingConfig: { thinkingBudget: 0 } },
    });
    const transcript = transcription.text?.trim();
    if (!transcript) throw new AppError("Gemini did not return a transcript.", 502, "TRANSCRIPTION_OUTPUT_EMPTY");
    await Answer.updateOne({ _id: answer._id }, { $set: { "media.transcript": transcript.slice(0, 100_000), "media.transcriptionStatus": "completed" }, $unset: { "media.transcriptionError": 1 } });

    const attempt = await AssessmentAttempt.findOne({ _id: answer.attemptId, organizationId: answer.organizationId }).select("applicationId").lean();
    if (attempt) {
      try {
        await AIUsage.create({
          organizationId: answer.organizationId,
          applicationId: attempt.applicationId,
          attemptId: answer.attemptId,
          answerId: answer._id,
          ...createUsageRecord("media_transcription", AI_TRANSCRIPTION_PROMPT_VERSION, transcription.usageMetadata, "audio"),
        });
      } catch (usageError) {
        console.error("Failed to record Gemini transcription usage", usageError);
      }
    }
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0, 1_000) : "Transcription failed.";
    await Answer.updateOne({ _id: answer._id }, { $set: { "media.transcriptionStatus": "failed", "media.transcriptionError": message } });
  } finally {
    if (uploadedFileName) {
      await getGeminiClient().files.delete({ name: uploadedFileName }).catch((cleanupError) => {
        console.error("Failed to delete temporary Gemini media file", cleanupError);
      });
    }
  }
}
