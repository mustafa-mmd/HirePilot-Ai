import { model, models, Schema, Types, type Model } from "mongoose";

import { baseSchemaOptions, ORGANIZATION_ROLES, type OrganizationRole } from "@/models/shared";

export interface IInvitation {
  organizationId: Types.ObjectId;
  email: string;
  role: Exclude<OrganizationRole, "owner">;
  tokenHash: string;
  status: "pending" | "accepted" | "expired" | "revoked";
  expiresAt: Date;
  invitedBy: Types.ObjectId;
  acceptedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const invitationSchema = new Schema<IInvitation>({
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
  email: { type: String, required: true, lowercase: true, trim: true, maxlength: 254 },
  role: { type: String, enum: ORGANIZATION_ROLES.filter((role) => role !== "owner"), required: true },
  tokenHash: { type: String, required: true, unique: true, select: false, minlength: 64, maxlength: 64 },
  status: { type: String, enum: ["pending", "accepted", "expired", "revoked"], required: true, default: "pending" },
  expiresAt: { type: Date, required: true },
  invitedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  acceptedAt: Date,
}, baseSchemaOptions);
invitationSchema.index({ organizationId: 1, email: 1, status: 1 });
invitationSchema.index({ organizationId: 1, createdAt: -1 });
export const Invitation = (models.Invitation as Model<IInvitation> | undefined) ?? model<IInvitation>("Invitation", invitationSchema);
