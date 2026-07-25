import { model, models, Schema, Types, type Model } from "mongoose";

import {
  baseSchemaOptions,
  MEMBERSHIP_STATUSES,
  ORGANIZATION_ROLES,
  type MembershipStatus,
  type OrganizationRole,
} from "@/models/shared";

export interface IMembership {
  organizationId: Types.ObjectId;
  userId: Types.ObjectId;
  role: OrganizationRole;
  status: MembershipStatus;
  invitedBy?: Types.ObjectId;
  joinedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const membershipSchema = new Schema<IMembership>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      index: true,
    },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    role: { type: String, enum: ORGANIZATION_ROLES, required: true },
    status: { type: String, enum: MEMBERSHIP_STATUSES, default: "active", required: true },
    invitedBy: { type: Schema.Types.ObjectId, ref: "User" },
    joinedAt: { type: Date, default: Date.now, required: true },
  },
  baseSchemaOptions,
);

membershipSchema.index({ organizationId: 1, userId: 1 }, { unique: true });
membershipSchema.index({ organizationId: 1, role: 1, status: 1 });

export const Membership =
  (models.Membership as Model<IMembership> | undefined) ??
  model<IMembership>("Membership", membershipSchema);
