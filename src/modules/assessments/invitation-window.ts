export type AssessmentInvitationWindowState =
  | "scheduled"
  | "active"
  | "expired";

export function getAssessmentInvitationWindowState(
  availableFrom: Date | string | number,
  expiresAt: Date | string | number,
  now: Date | string | number = new Date(),
): AssessmentInvitationWindowState {
  const nowTime = new Date(now).getTime();
  if (nowTime < new Date(availableFrom).getTime()) return "scheduled";
  if (nowTime >= new Date(expiresAt).getTime()) return "expired";
  return "active";
}
