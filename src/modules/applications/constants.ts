export const APPLICATION_STAGES = [
  "applied",
  "cv_reviewed",
  "assessment_invited",
  "assessment_in_progress",
  "assessment_completed",
  "shortlisted",
  "interview",
  "offer",
  "hired",
  "rejected",
] as const;

export type ApplicationStage = (typeof APPLICATION_STAGES)[number];
