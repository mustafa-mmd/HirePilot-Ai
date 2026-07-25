import { describe, expect, it } from "vitest";

import { DEFAULT_SCORING_WEIGHTS } from "@/modules/ai/constants";
import type { EvaluationResult } from "@/modules/ai/schemas";
import { enforceEvidenceBasedScore } from "@/modules/ai/scoring";

function resultWithQuotes(quote: string): EvaluationResult {
  return {
    score: 99,
    confidence: 0.9,
    summary: "Candidate evidence was evaluated.",
    strengths: ["TypeScript delivery"],
    missingPoints: [],
    evidence: [{ criterion: "Skills", sourceQuote: quote }],
    suggestedFollowUpQuestions: ["Describe your TypeScript architecture decisions."],
    manualReviewRequired: false,
    rubricBreakdown: [
      { category: "skills", weight: 50, score: 45, maxScore: 50, evidence: [{ criterion: "TypeScript", sourceQuote: quote }] },
      { category: "experience", weight: 25, score: 20, maxScore: 25, evidence: [{ criterion: "Experience", sourceQuote: quote }] },
      { category: "education", weight: 10, score: 10, maxScore: 10, evidence: [{ criterion: "Education", sourceQuote: quote }] },
      { category: "roleFit", weight: 15, score: 12, maxScore: 15, evidence: [{ criterion: "Role fit", sourceQuote: quote }] },
    ],
  };
}

describe("evidence-based scoring", () => {
  it("accepts only literal CV evidence and derives the final weighted score", () => {
    const cv = "Led a TypeScript platform migration serving 2 million monthly requests.";
    const result = enforceEvidenceBasedScore(resultWithQuotes(cv), cv, DEFAULT_SCORING_WEIGHTS, "high");
    expect(result.score).toBe(87);
    expect(result.manualReviewRequired).toBe(false);
    expect(result.evidence.length).toBeGreaterThan(0);
  });

  it("awards zero when the claimed quote does not exist in the CV", () => {
    const result = enforceEvidenceBasedScore(
      resultWithQuotes("Built systems used by ten million customers."),
      "Worked on internal TypeScript tools.",
      DEFAULT_SCORING_WEIGHTS,
      "high",
    );
    expect(result.score).toBe(0);
    expect(result.evidence).toHaveLength(0);
    expect(result.manualReviewRequired).toBe(true);
    expect(result.confidence).toBeLessThanOrEqual(0.55);
  });

  it("caps confidence for low-quality extracted text", () => {
    const cv = "Led a TypeScript platform migration serving 2 million monthly requests.";
    const result = enforceEvidenceBasedScore(resultWithQuotes(cv), cv, DEFAULT_SCORING_WEIGHTS, "low");
    expect(result.confidence).toBeLessThanOrEqual(0.35);
    expect(result.manualReviewRequired).toBe(true);
  });

  it("removes protected-characteristic references from the report", () => {
    const cv = "Led a TypeScript platform migration serving 2 million monthly requests.";
    const raw = resultWithQuotes(cv);
    raw.summary = "Strong TypeScript evidence. The candidate is a woman.";
    raw.strengths.push("Her age appears suitable.");
    const result = enforceEvidenceBasedScore(raw, cv, DEFAULT_SCORING_WEIGHTS, "high");
    expect(result.summary).toBe("Strong TypeScript evidence.");
    expect(result.strengths).not.toContain("Her age appears suitable.");
  });
});
