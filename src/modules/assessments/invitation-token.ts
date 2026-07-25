import { createHash, randomBytes } from "node:crypto";

export function hashAssessmentInvitationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function createAssessmentInvitationToken() {
  const token = randomBytes(32).toString("base64url");
  return { token, tokenHash: hashAssessmentInvitationToken(token) };
}

export function isAssessmentInvitationToken(value: string) {
  return /^[A-Za-z0-9_-]{43}$/.test(value);
}
