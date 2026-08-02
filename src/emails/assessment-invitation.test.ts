import { describe, expect, it } from "vitest";

import {
  assessmentInvitationHtml,
  assessmentInvitationText,
  assessmentReminderHtml,
} from "@/emails/assessment-invitation";

describe("assessment invitation email", () => {
  it("escapes candidate-controlled content", () => {
    const html = assessmentInvitationHtml({ candidateName: "<script>alert(1)</script>", assessmentTitle: "Frontend", jobTitle: "Engineer", organizationName: "Acme", assessmentUrl: "https://example.com/assessment/token", availableFrom: "July 20", expiresAt: "July 22", duration: 30 });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("Open Assessment");
    expect(html).toContain("https://example.com/assessment/token");
  });

  it("includes a plain-text fallback URL in initial invitations", () => {
    const text = assessmentInvitationText({ candidateName: "Candidate", assessmentTitle: "Frontend", jobTitle: "Engineer", organizationName: "Acme", assessmentUrl: "https://example.com/assessment/token", availableFrom: "July 20", expiresAt: "July 22", duration: 30 });
    expect(text).toContain("Open Assessment:\nhttps://example.com/assessment/token");
  });

  it("includes a secure assessment link in reminders", () => {
    const html = assessmentReminderHtml({
      candidateName: "Candidate",
      assessmentTitle: "Frontend",
      jobTitle: "Engineer",
      organizationName: "Acme",
      assessmentUrl: "https://example.com/assessment/reminder-token?x=1&y=2",
      availableFrom: "July 20",
      expiresAt: "July 22",
    });

    expect(html).toContain("Open Assessment");
    expect(html).toContain(
      "https://example.com/assessment/reminder-token?x=1&amp;y=2",
    );
    expect(html).toContain("original invitation link also remains valid");
    expect(html).toContain("opens at");
    expect(html).toContain("closes at");
  });
});
