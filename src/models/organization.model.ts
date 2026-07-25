import { model, models, Schema, Types, type Model } from "mongoose";

import { baseSchemaOptions } from "@/models/shared";

export interface IOrganization {
  name: string;
  slug: string;
  logo?: string;
  website?: string;
  industry?: string;
  size?: string;
  branding: {
    primaryColor: string;
    secondaryColor: string;
    assessmentSupportMessage: string;
  };
  privacyContactEmail?: string;
  retentionDays: number;
  ownerId: Types.ObjectId;
  subscriptionId?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const organizationSchema = new Schema<IOrganization>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      minlength: 2,
      maxlength: 80,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
    logo: { type: String, trim: true },
    website: { type: String, trim: true },
    industry: { type: String, trim: true, maxlength: 100 },
    size: { type: String, trim: true, maxlength: 40 },
    branding: {
      primaryColor: { type: String, default: "#7c3aed" },
      secondaryColor: { type: String, default: "#18181b" },
      assessmentSupportMessage: { type: String, trim: true, maxlength: 2_000, default: "Contact the recruiting team if you need an accommodation or want to challenge an AI-assisted result." },
    },
    privacyContactEmail: { type: String, lowercase: true, trim: true, maxlength: 254 },
    retentionDays: { type: Number, required: true, min: 30, max: 2_555, default: 365 },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    subscriptionId: { type: Schema.Types.ObjectId, ref: "Subscription" },
  },
  baseSchemaOptions,
);

organizationSchema.index({ ownerId: 1 });

export const Organization =
  (models.Organization as Model<IOrganization> | undefined) ??
  model<IOrganization>("Organization", organizationSchema);
