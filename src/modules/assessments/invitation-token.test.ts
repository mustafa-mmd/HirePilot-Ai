import { describe, expect, it } from "vitest";

import { createAssessmentInvitationToken, hashAssessmentInvitationToken, isAssessmentInvitationToken } from "@/modules/assessments/invitation-token";

describe("assessment invitation tokens", () => {
  it("creates a high-entropy URL-safe token and stores only its hash", () => {
    const value = createAssessmentInvitationToken();
    expect(isAssessmentInvitationToken(value.token)).toBe(true);
    expect(value.tokenHash).toHaveLength(64);
    expect(value.tokenHash).toBe(hashAssessmentInvitationToken(value.token));
    expect(value.tokenHash).not.toContain(value.token);
  });
});
