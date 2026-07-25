export const JOB_STATUSES = ["draft", "published", "closed", "archived"] as const;
export const WORKPLACE_TYPES = ["remote", "hybrid", "onsite"] as const;
export const EMPLOYMENT_TYPES = ["full_time", "part_time", "contract", "internship"] as const;
export const EXPERIENCE_LEVELS = ["entry", "mid", "senior", "lead", "executive"] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];
export type WorkplaceType = (typeof WORKPLACE_TYPES)[number];
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];
