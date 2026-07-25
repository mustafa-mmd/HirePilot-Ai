import { describe, expect, it } from "vitest";

import { applicationConfirmationHtml } from "@/emails/application-confirmation";

describe("application confirmation email", () => {
  it("escapes candidate-controlled values", () => {
    const html = applicationConfirmationHtml({ candidateName: "<script>alert(1)</script>", jobTitle: "Engineer & Builder", organizationName: "A > B" });
    expect(html).not.toContain("<script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).toContain("Engineer &amp; Builder");
  });
});
