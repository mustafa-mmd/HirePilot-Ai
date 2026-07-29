import { describe, expect, it } from "vitest";

import { getAssessmentInvitationWindowState } from "@/modules/assessments/invitation-window";

const availableFrom = "2026-08-03T14:00:00.000Z";
const expiresAt = "2026-08-05T14:00:00.000Z";

describe("assessment invitation availability window", () => {
  it("is scheduled before the configured start time", () => {
    expect(
      getAssessmentInvitationWindowState(
        availableFrom,
        expiresAt,
        "2026-08-03T13:59:59.999Z",
      ),
    ).toBe("scheduled");
  });

  it("becomes active exactly at the configured start time", () => {
    expect(
      getAssessmentInvitationWindowState(
        availableFrom,
        expiresAt,
        availableFrom,
      ),
    ).toBe("active");
  });

  it("stays active until immediately before expiration", () => {
    expect(
      getAssessmentInvitationWindowState(
        availableFrom,
        expiresAt,
        "2026-08-05T13:59:59.999Z",
      ),
    ).toBe("active");
  });

  it("expires exactly at the configured end time", () => {
    expect(
      getAssessmentInvitationWindowState(
        availableFrom,
        expiresAt,
        expiresAt,
      ),
    ).toBe("expired");
  });
});
