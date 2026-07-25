import { z } from "zod";

import { apiError, apiSuccess } from "@/lib/api-response";
import { createLogoUploadSignature } from "@/lib/cloudinary";
import { enforceApplicationRateLimit } from "@/lib/rate-limit";
import { assertSameOrigin, getRequestIp } from "@/lib/request-security";
import { requireOrganizationContext } from "@/modules/authorization/service";

const uploadRequestSchema = z.object({
  filename: z.string().trim().min(1).max(255).refine((name) => /\.(png|jpg|jpeg|webp)$/i.test(name), "Unsupported file type."),
  bytes: z.number().int().positive().max(2 * 1024 * 1024), // Max 2MB
  mimeType: z.enum(["image/png", "image/jpeg", "image/jpg", "image/webp"]),
}).superRefine((value, context) => {
  const extension = value.filename.split(".").pop()?.toLowerCase();
  const expectedMime: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
  };
  if (!extension || expectedMime[extension] !== value.mimeType) {
    context.addIssue({
      code: "custom",
      path: ["mimeType"],
      message: "Filename and media type do not match.",
    });
  }
});

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    await enforceApplicationRateLimit(`upload-logo:${getRequestIp(request)}`);
    const context = await requireOrganizationContext("organization:update");
    const input = uploadRequestSchema.parse(await request.json());
    const signature = createLogoUploadSignature(context.organizationId);
    return apiSuccess(signature);
  } catch (error) {
    return apiError(error);
  }
}
