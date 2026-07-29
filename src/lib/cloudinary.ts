import "server-only";

import { randomUUID } from "node:crypto";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";

import { AppError } from "@/lib/errors";
import type { AssessmentMediaAsset, AssessmentMediaKind } from "@/modules/media/types";

let configured = false;

function getCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!cloudName || !apiKey || !apiSecret) throw new AppError("CV upload is not configured.", 503, "UPLOAD_UNAVAILABLE");
  if (!configured) {
    cloudinary.config({ cloud_name: cloudName, api_key: apiKey, api_secret: apiSecret, secure: true });
    configured = true;
  }
  return { client: cloudinary, cloudName, apiKey, apiSecret };
}

export function createCvUploadSignature(jobId: string) {
  const { client, cloudName, apiKey, apiSecret } = getCloudinary();
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = `hirepilot/cvs/${jobId}`;
  const publicId = randomUUID();
  const signature = client.utils.api_sign_request({ timestamp, folder, public_id: publicId }, apiSecret);
  return { cloudName, apiKey, timestamp, folder, publicId, signature, resourceType: "raw" as const };
}

export function createLogoUploadSignature(organizationId: string) {
  const { client, cloudName, apiKey, apiSecret } = getCloudinary();
  const timestamp = Math.floor(Date.now() / 1000);
  const folder = `hirepilot/logos/${organizationId}`;
  const publicId = randomUUID();
  const signature = client.utils.api_sign_request({ timestamp, folder, public_id: publicId }, apiSecret);
  return { cloudName, apiKey, timestamp, folder, publicId, signature, resourceType: "image" as const };
}

export type CvAssetInput = {
  url: string;
  publicId: string;
  resourceType: "raw";
  format: "pdf" | "doc" | "docx";
  bytes: number;
  originalFilename: string;
};

export async function verifyCvAsset(jobId: string, asset: CvAssetInput) {
  const { client, cloudName } = getCloudinary();
  const expectedPrefix = `hirepilot/cvs/${jobId}/`;
  if (!asset.publicId.startsWith(expectedPrefix)) throw new AppError("Invalid CV upload path.", 422, "INVALID_CV_ASSET");
  const parsedUrl = new URL(asset.url);
  if (parsedUrl.protocol !== "https:" || parsedUrl.hostname !== "res.cloudinary.com" || !parsedUrl.pathname.includes(`/${cloudName}/`)) throw new AppError("Invalid CV asset URL.", 422, "INVALID_CV_ASSET");

  let resource: UploadApiResponse;
  try {
    resource = (await client.api.resource(asset.publicId, { resource_type: "raw" })) as UploadApiResponse;
  } catch {
    throw new AppError("The uploaded CV could not be verified.", 422, "INVALID_CV_ASSET");
  }
  const format = (resource.format ?? asset.originalFilename.split(".").pop() ?? "").toLowerCase();
  let signatureMatches = false;
  try {
    const response = await fetch(resource.secure_url, { headers: { Range: "bytes=0-7" }, cache: "no-store" });
    const bytes = new Uint8Array(await response.arrayBuffer());
    const pdf = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
    const doc = bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0;
    const docx = bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04;
    signatureMatches = format === "pdf" ? pdf : format === "doc" ? doc : format === "docx" ? docx : false;
  } catch { signatureMatches = false; }
  if (!["pdf", "doc", "docx"].includes(format) || !signatureMatches || resource.bytes > 5 * 1024 * 1024 || resource.bytes !== asset.bytes || resource.secure_url !== asset.url) {
    await client.uploader.destroy(asset.publicId, { resource_type: "raw", invalidate: true }).catch(() => undefined);
    throw new AppError("The CV must be a PDF, DOC, or DOCX file no larger than 5 MB.", 422, "INVALID_CV_FILE");
  }
  return { ...asset, format: format as CvAssetInput["format"], bytes: resource.bytes, url: resource.secure_url };
}

export type CloudinaryResourceType = "image" | "video" | "raw";

export async function deleteCloudinaryAsset(
  publicId: string,
  resourceType: CloudinaryResourceType,
) {
  try {
    const { client } = getCloudinary();
    await client.uploader.destroy(publicId, {
      resource_type: resourceType,
      invalidate: true,
    });
  } catch (error) {
    console.error("Failed to delete Cloudinary asset", {
      publicId,
      resourceType,
      error,
    });
  }
}

export async function deleteCvAsset(
  publicId: string,
  resourceType: Extract<CloudinaryResourceType, "raw" | "image"> = "raw",
) {
  await deleteCloudinaryAsset(publicId, resourceType);
}

function assessmentResourceType(kind: AssessmentMediaKind) {
  if (["video_answer", "audio_answer", "proctor_recording"].includes(kind)) return "video" as const;
  if (["identity_photo", "integrity_snapshot"].includes(kind)) return "image" as const;
  return "raw" as const;
}

export function createAssessmentMediaUploadSignature(attemptId: string, questionId: string, kind: AssessmentMediaKind) {
  const { client, cloudName, apiKey, apiSecret } = getCloudinary();
  const timestamp = Math.floor(Date.now() / 1_000);
  const resourceType = assessmentResourceType(kind);
  const folder = `hirepilot/assessments/${attemptId}/${questionId}`;
  const publicId = `${kind}-${randomUUID()}`;
  const signature = client.utils.api_sign_request({ timestamp, folder, public_id: publicId }, apiSecret);
  return { cloudName, apiKey, timestamp, folder, publicId, signature, resourceType };
}

export async function verifyAssessmentMediaAsset(attemptId: string, questionId: string, kind: AssessmentMediaKind, asset: AssessmentMediaAsset) {
  const { client, cloudName } = getCloudinary();
  const expectedType = assessmentResourceType(kind);
  if (asset.resourceType !== expectedType || !asset.publicId.startsWith(`hirepilot/assessments/${attemptId}/${questionId}/${kind}-`)) throw new AppError("Invalid assessment upload path.", 422, "INVALID_MEDIA_ASSET");
  const parsed = new URL(asset.url);
  if (parsed.protocol !== "https:" || parsed.hostname !== "res.cloudinary.com" || !parsed.pathname.includes(`/${cloudName}/`)) throw new AppError("Invalid assessment media URL.", 422, "INVALID_MEDIA_ASSET");
  let resource: UploadApiResponse;
  try { resource = (await client.api.resource(asset.publicId, { resource_type: expectedType })) as UploadApiResponse; }
  catch { throw new AppError("The uploaded assessment media could not be verified.", 422, "INVALID_MEDIA_ASSET"); }
  const format = String(resource.format ?? asset.format).toLowerCase();
  const limits: Record<AssessmentMediaKind, number> = { video_answer: 500 * 1024 * 1024, audio_answer: 100 * 1024 * 1024, file_answer: 25 * 1024 * 1024, identity_photo: 10 * 1024 * 1024, integrity_snapshot: 10 * 1024 * 1024, proctor_recording: 500 * 1024 * 1024 };
  const allowed: Record<AssessmentMediaKind, string[]> = { video_answer: ["webm", "mp4", "mov"], audio_answer: ["webm", "mp3", "wav", "m4a", "ogg"], file_answer: ["pdf", "doc", "docx", "txt", "csv", "zip", "png", "jpg", "jpeg"], identity_photo: ["png", "jpg", "jpeg", "webp"], integrity_snapshot: ["png", "jpg", "jpeg", "webp"], proctor_recording: ["webm", "mp4"] };
  if (resource.secure_url !== asset.url || resource.bytes !== asset.bytes || resource.bytes > limits[kind] || !allowed[kind].includes(format)) {
    await client.uploader.destroy(asset.publicId, { resource_type: expectedType, invalidate: true }).catch(() => undefined);
    throw new AppError("The uploaded file type or size is not allowed.", 422, "INVALID_MEDIA_FILE");
  }
  const duration = typeof resource.duration === "number" ? resource.duration : asset.duration;
  if (duration && duration > 14_400) throw new AppError("The uploaded recording is too long.", 422, "MEDIA_TOO_LONG");
  return { url: resource.secure_url, publicId: asset.publicId, resourceType: expectedType, format, bytes: resource.bytes, ...(duration === undefined ? {} : { duration }) };
}
