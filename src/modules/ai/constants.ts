export const AI_PROVIDER = "gemini" as const;
export const AI_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
export const AI_PROMPT_VERSION = "cv-match-gemini-v1";
export const ASSESSMENT_PROMPT_VERSION = "assessment-evaluation-gemini-v1";
export const AI_TRANSCRIPTION_PROMPT_VERSION = "media-transcription-gemini-v1";

export const AI_OPERATIONS = [
  "candidate_profile",
  "job_requirements",
  "candidate_match",
  "answer_evaluation",
  "assessment_summary",
  "media_transcription",
] as const;

export type AIOperation = (typeof AI_OPERATIONS)[number];

export const DEFAULT_SCORING_WEIGHTS = {
  skills: 50,
  experience: 25,
  education: 10,
  roleFit: 15,
} as const;

// Gemini 2.5 Flash paid-tier standard pricing, captured on 2026-07-18.
export const AI_PRICE_PER_MILLION_TOKENS = {
  input: 0.3,
  cachedInput: 0.03,
  audioInput: 1,
  cachedAudioInput: 0.1,
  output: 2.5,
} as const;
