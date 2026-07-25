import { z } from "zod";

import { apiError, apiSuccess } from "@/lib/api-response";
import { createCvUploadSignature } from "@/lib/cloudinary";
import { enforceApplicationRateLimit } from "@/lib/rate-limit";
import { assertSameOrigin, getRequestIp } from "@/lib/request-security";
import { getPublishedJobById } from "@/modules/jobs/service";

const uploadRequestSchema = z.object({
  jobId: z.string().regex(/^[a-f\d]{24}$/i),
  filename: z.string().trim().min(1).max(255).refine((name) => /\.(pdf|doc|docx)$/i.test(name), "Unsupported file type."),
  bytes: z.number().int().positive().max(5 * 1024 * 1024),
  mimeType: z.enum(["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]),
}).superRefine((value, context) => {
  const extension = value.filename.split(".").pop()?.toLowerCase();
  const expectedMime: Record<string, string> = { pdf: "application/pdf", doc: "application/msword", docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };
  if (!extension || expectedMime[extension] !== value.mimeType) context.addIssue({ code: "custom", path: ["mimeType"], message: "Filename and media type do not match." });
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await enforceApplicationRateLimit(`upload:${getRequestIp(request)}`);
    const input = uploadRequestSchema.parse(await request.json());
    await getPublishedJobById(input.jobId);
    return apiSuccess(createCvUploadSignature(input.jobId));
  } catch (error) { return apiError(error); }
}
