import { model, models, Schema, type Model } from "mongoose";

import { baseSchemaOptions, GLOBAL_ROLES, type GlobalRole } from "@/models/shared";

export interface IUser {
  name: string;
  email: string;
  passwordHash?: string;
  image?: string;
  emailVerified?: Date;
  globalRole: GlobalRole;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      maxlength: 254,
    },
    passwordHash: { type: String, select: false },
    image: { type: String, trim: true },
    emailVerified: { type: Date },
    globalRole: { type: String, enum: GLOBAL_ROLES, default: "user", required: true },
  },
  baseSchemaOptions,
);

export const User = (models.User as Model<IUser> | undefined) ?? model<IUser>("User", userSchema);
