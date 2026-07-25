import { model, models, Schema, Types, type Model } from "mongoose";

import { baseSchemaOptions } from "@/models/shared";

export interface IAuditLog {
  organizationId: Types.ObjectId;
  actorId: Types.ObjectId;
  action: string;
  resourceType: string;
  resourceId: Types.ObjectId;
  metadata: Record<string, unknown>;
  ipAddress?: string;
  createdAt: Date;
  updatedAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    action: { type: String, required: true, trim: true, maxlength: 120 },
    resourceType: { type: String, required: true, trim: true, maxlength: 80 },
    resourceId: { type: Schema.Types.ObjectId, required: true },
    metadata: { type: Schema.Types.Mixed, default: {} },
    ipAddress: { type: String, trim: true, maxlength: 64 },
  },
  baseSchemaOptions,
);

auditLogSchema.index({ organizationId: 1, createdAt: -1 });
auditLogSchema.index({ organizationId: 1, resourceType: 1, resourceId: 1 });

export const AuditLog =
  (models.AuditLog as Model<IAuditLog> | undefined) ??
  model<IAuditLog>("AuditLog", auditLogSchema);
