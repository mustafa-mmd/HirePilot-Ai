import { model, models, Schema, Types, type Model } from "mongoose";

import { baseSchemaOptions } from "@/models/shared";

export interface ICandidate {
  organizationId: Types.ObjectId;
  fullName: string;
  email: string;
  phone?: string;
  location?: string;
  linkedinUrl?: string;
  githubUrl?: string;
  portfolioUrl?: string;
  profilePhotoUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

const candidateSchema = new Schema<ICandidate>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    fullName: { type: String, required: true, trim: true, maxlength: 160 },
    email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254 },
    phone: { type: String, trim: true, maxlength: 40 },
    location: { type: String, trim: true, maxlength: 160 },
    linkedinUrl: { type: String, trim: true, maxlength: 500 },
    githubUrl: { type: String, trim: true, maxlength: 500 },
    portfolioUrl: { type: String, trim: true, maxlength: 500 },
    profilePhotoUrl: { type: String, trim: true, maxlength: 1_000 },
  },
  baseSchemaOptions,
);

candidateSchema.index({ organizationId: 1, email: 1 }, { unique: true });
candidateSchema.index({ organizationId: 1, createdAt: -1 });

export const Candidate =
  (models.Candidate as Model<ICandidate> | undefined) ??
  model<ICandidate>("Candidate", candidateSchema);
