export const QUESTION_TYPES = [
  "single_choice",
  "multiple_choice",
  "true_false",
  "short_text",
  "long_text",
  "video",
  "audio",
  "file_upload",
  "coding",
  "case_study",
] as const;

export type QuestionType = (typeof QUESTION_TYPES)[number];

export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  single_choice: "Single-choice MCQ",
  multiple_choice: "Multiple-choice MCQ",
  true_false: "True / false",
  short_text: "Short written answer",
  long_text: "Long written answer",
  video: "Video answer",
  audio: "Audio answer",
  file_upload: "File upload",
  coding: "Coding challenge",
  case_study: "Practical case study",
};

export const QUESTION_DIFFICULTIES = ["easy", "medium", "hard"] as const;
export type QuestionDifficulty = (typeof QUESTION_DIFFICULTIES)[number];

export const MONITORING_LEVELS = ["standard", "verified", "proctored"] as const;
export type MonitoringLevel = (typeof MONITORING_LEVELS)[number];

export const TEMPLATE_STATUSES = ["draft", "published", "archived"] as const;
export type TemplateStatus = (typeof TEMPLATE_STATUSES)[number];

export const INVITATION_STATUSES = ["invited", "opened", "started", "completed", "expired"] as const;
export type AssessmentInvitationStatus = (typeof INVITATION_STATUSES)[number];

export const AUTO_GRADABLE_QUESTION_TYPES: ReadonlySet<QuestionType> = new Set([
  "single_choice",
  "multiple_choice",
  "true_false",
]);

export const ATTEMPT_STATUSES = ["in_progress", "completed", "expired"] as const;
export type AttemptStatus = (typeof ATTEMPT_STATUSES)[number];

export const ANSWER_STATUSES = ["draft", "submitted"] as const;
export type AnswerStatus = (typeof ANSWER_STATUSES)[number];

export const INTEGRITY_EVENT_TYPES = [
  "attempt_started",
  "question_opened",
  "answer_saved",
  "copy_attempted",
  "paste_attempted",
  "tab_hidden",
  "fullscreen_exited",
  "camera_disabled",
  "microphone_disabled",
  "connection_lost",
  "connection_restored",
  "multiple_session_detected",
  "question_submitted",
  "assessment_completed",
  "identity_captured",
  "snapshot_captured",
  "recording_uploaded",
] as const;
export type IntegrityEventType = (typeof INTEGRITY_EVENT_TYPES)[number];
