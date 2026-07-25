import { describe, expect, it } from "vitest";

import { assessmentInvitationHtml } from "@/emails/assessment-invitation";

describe("assessment invitation email", () => {
  it("escapes candidate-controlled content", () => {
    const html = assessmentInvitationHtml({ candidateName: "<script>alert(1)</script>", assessmentTitle: "Frontend", jobTitle: "Engineer", organizationName: "Acme", assessmentUrl: "https://example.com/assessment/token", startDeadline: "July 20", duration: 30 });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
  });
});
