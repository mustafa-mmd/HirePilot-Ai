import { APPLICATION_STAGES, type ApplicationStage } from "@/modules/applications/constants";

export const STAGE_LABELS: Record<ApplicationStage, string> = {
  applied: "Applied", cv_reviewed: "CV reviewed", assessment_invited: "Assessment invited", assessment_in_progress: "Assessment in progress", assessment_completed: "Assessment completed", shortlisted: "Shortlisted", interview: "Interview", offer: "Offer", hired: "Hired", rejected: "Rejected",
};

const forwardStages = APPLICATION_STAGES.filter((stage) => stage !== "rejected");

export function canTransitionStage(from: ApplicationStage, to: ApplicationStage) {
  if (from === to) return true;
  if (to === "rejected") return from !== "hired";
  if (from === "rejected") return to === "applied";
  const fromIndex = forwardStages.indexOf(from);
  const toIndex = forwardStages.indexOf(to);
  return toIndex >= 0 && Math.abs(toIndex - fromIndex) === 1;
}
