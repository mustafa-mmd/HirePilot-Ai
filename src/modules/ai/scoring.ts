import type { CandidateProfile, EvaluationResult, ScoringWeights } from "@/modules/ai/schemas";

const protectedReferencePattern = /\b(age|aged|gender|male|female|man|woman|men|women|religion|religious|race|racial|ethnicity|ethnic|disability|disabled|appearance|accent|facial expression|camera background|emotion|emotional state|personality)\b/i;

function isJobRelatedText(value: string) {
  return !protectedReferencePattern.test(value);
}

function sanitizeNarrative(value: string, fallback: string) {
  const safeSentences = value.split(/(?<=[.!?])\s+/).filter(isJobRelatedText);
  return safeSentences.join(" ").trim() || fallback;
}

function sanitizeField(value: string) {
  return isJobRelatedText(value) ? value : "";
}

export function sanitizeCandidateProfile(profile: CandidateProfile): CandidateProfile {
  return {
    ...profile,
    headline: sanitizeNarrative(profile.headline, "Candidate profile"),
    summary: sanitizeNarrative(profile.summary, "Review the job-related CV evidence manually."),
    skills: profile.skills.filter((item) => isJobRelatedText(`${item.name} ${item.evidence}`)),
    experienceHistory: profile.experienceHistory.map((item) => ({
      ...item,
      jobTitle: sanitizeField(item.jobTitle),
      employer: sanitizeField(item.employer),
      summary: sanitizeNarrative(item.summary, ""),
      highlights: item.highlights.filter(isJobRelatedText),
    })),
    education: profile.education.map((item) => ({
      ...item,
      qualification: sanitizeField(item.qualification),
      institution: sanitizeField(item.institution),
      field: sanitizeField(item.field),
      evidence: sanitizeField(item.evidence),
    })),
    certifications: profile.certifications.map((item) => ({
      ...item,
      name: sanitizeField(item.name),
      issuer: sanitizeField(item.issuer),
      evidence: sanitizeField(item.evidence),
    })),
    projects: profile.projects.map((item) => ({
      ...item,
      name: sanitizeField(item.name),
      description: sanitizeNarrative(item.description, ""),
      technologies: item.technologies.filter(isJobRelatedText),
      evidence: sanitizeField(item.evidence),
    })),
    manualReviewNotes: profile.manualReviewNotes.filter(isJobRelatedText),
  };
}

function normalizedEvidenceText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function isVerifiableQuote(cvText: string, quote: string) {
  const normalizedQuote = normalizedEvidenceText(quote);
  return normalizedQuote.length >= 8 && normalizedEvidenceText(cvText).includes(normalizedQuote);
}

export function enforceEvidenceBasedScore(
  raw: EvaluationResult,
  cvText: string,
  weights: ScoringWeights,
  sourceQuality: CandidateProfile["sourceQuality"],
): EvaluationResult {
  const categories = Object.keys(weights) as Array<keyof ScoringWeights>;
  let missingEvidence = false;

  const rubricBreakdown = categories.map((category) => {
    const item = raw.rubricBreakdown.find((entry) => entry.category === category);
    const evidence = (item?.evidence ?? []).filter((entry) => isJobRelatedText(`${entry.criterion} ${entry.sourceQuote}`) && isVerifiableQuote(cvText, entry.sourceQuote));
    const maxScore = weights[category];
    if (maxScore > 0 && evidence.length === 0) missingEvidence = true;
    const score = evidence.length > 0 ? Math.min(Math.max(item?.score ?? 0, 0), maxScore) : 0;
    return { category, weight: maxScore, score, maxScore, evidence };
  });

  const rubricEvidence = rubricBreakdown.flatMap((item) => item.evidence);
  const directEvidence = raw.evidence.filter((entry) => isJobRelatedText(`${entry.criterion} ${entry.sourceQuote}`) && isVerifiableQuote(cvText, entry.sourceQuote));
  const evidence = [...directEvidence, ...rubricEvidence].filter(
    (entry, index, all) => all.findIndex((candidate) => candidate.sourceQuote === entry.sourceQuote && candidate.criterion === entry.criterion) === index,
  );
  const score = Number(rubricBreakdown.reduce((sum, item) => sum + item.score, 0).toFixed(1));
  const noEvidence = evidence.length === 0;

  return {
    ...raw,
    score: noEvidence ? 0 : score,
    confidence: Math.min(raw.confidence, sourceQuality === "low" ? 0.35 : missingEvidence ? 0.55 : 0.95),
    summary: sanitizeNarrative(raw.summary, "The available job-related evidence requires human review."),
    strengths: raw.strengths.filter(isJobRelatedText),
    evidence,
    rubricBreakdown,
    manualReviewRequired: raw.manualReviewRequired || missingEvidence || noEvidence || sourceQuality === "low",
    missingPoints: missingEvidence
      ? [...raw.missingPoints.filter(isJobRelatedText), "One or more scoring categories had no verifiable CV evidence and received zero points."]
      : raw.missingPoints.filter(isJobRelatedText),
    suggestedFollowUpQuestions: raw.suggestedFollowUpQuestions.filter(isJobRelatedText),
  };
}
