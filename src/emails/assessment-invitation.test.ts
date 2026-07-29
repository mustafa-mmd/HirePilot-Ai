import { describe, expect, it } from "vitest";

import {
  assessmentInvitationHtml,
  assessmentReminderHtml,
} from "@/emails/assessment-invitation";

describe("assessment invitation email", () => {
  it("escapes candidate-controlled content", () => {
    const html = assessmentInvitationHtml({ candidateName: "<script>alert(1)</script>", assessmentTitle: "Frontend", jobTitle: "Engineer", organizationName: "Acme", assessmentUrl: "https://example.com/assessment/token", startDeadline: "July 20", duration: 30 });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("includes a secure assessment link in reminders", () => {
    const html = assessmentReminderHtml({
      candidateName: "Candidate",
      assessmentTitle: "Frontend",
      jobTitle: "Engineer",
      organizationName: "Acme",
      assessmentUrl: "https://example.com/assessment/reminder-token?x=1&y=2",
      startDeadline: "July 20",
    });

    expect(html).toContain("Open assessment");
    expect(html).toContain(
      "https://example.com/assessment/reminder-token?x=1&amp;y=2",
    );
    expect(html).toContain("original invitation link also remains valid");
  });
});
