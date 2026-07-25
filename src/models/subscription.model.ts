import { model, models, Schema, Types, type Model } from "mongoose";

import { baseSchemaOptions } from "@/models/shared";

export const SUBSCRIPTION_PLANS = ["starter", "growth", "business"] as const;
export type SubscriptionPlan = (typeof SUBSCRIPTION_PLANS)[number];
export const SUBSCRIPTION_STATUSES = ["trialing", "active", "past_due", "canceled"] as const;

export interface ISubscription {
  organizationId: Types.ObjectId;
  plan: SubscriptionPlan;
  status: (typeof SUBSCRIPTION_STATUSES)[number];
  periodStart: Date;
  periodEnd: Date;
  limits: { members: number; activeJobs: number; monthlyAssessments: number; monthlyAiTokens: number };
  externalCustomerId?: string;
  externalSubscriptionId?: string;
  createdAt: Date;
  updatedAt: Date;
}

const subscriptionSchema = new Schema<ISubscription>({
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, unique: true },
  plan: { type: String, enum: SUBSCRIPTION_PLANS, required: true, default: "starter" },
  status: { type: String, enum: SUBSCRIPTION_STATUSES, required: true, default: "trialing" },
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  limits: { _id: false, members: { type: Number, required: true, min: 1 }, activeJobs: { type: Number, required: true, min: 1 }, monthlyAssessments: { type: Number, required: true, min: 1 }, monthlyAiTokens: { type: Number, required: true, min: 1 } },
  externalCustomerId: { type: String, trim: true, maxlength: 200 },
  externalSubscriptionId: { type: String, trim: true, maxlength: 200 },
}, baseSchemaOptions);
subscriptionSchema.index({ plan: 1, status: 1 });
export const Subscription = (models.Subscription as Model<ISubscription> | undefined) ?? model<ISubscription>("Subscription", subscriptionSchema);
