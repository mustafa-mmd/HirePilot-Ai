export const ASSESSMENT_MEDIA_KINDS = ["video_answer", "audio_answer", "file_answer", "identity_photo", "integrity_snapshot", "proctor_recording"] as const;
export type AssessmentMediaKind = (typeof ASSESSMENT_MEDIA_KINDS)[number];
export type AssessmentMediaAsset = { url: string; publicId: string; resourceType: "image" | "video" | "raw"; format: string; bytes: number; duration?: number };
