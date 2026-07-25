import "server-only";

import { hash } from "bcryptjs";

import { connectToDatabase } from "@/lib/database";
import { AppError, isDuplicateKeyError } from "@/lib/errors";
import { User } from "@/models/user.model";
import { registrationSchema, type RegistrationInput } from "@/modules/auth/schemas";

export async function registerUser(input: RegistrationInput) {
  const data = registrationSchema.parse(input);
  await connectToDatabase();

  const existing = await User.exists({ email: data.email });
  if (existing) {
    throw new AppError(
      "An account with this email already exists.",
      409,
      "EMAIL_ALREADY_REGISTERED",
    );
  }

  const passwordHash = await hash(data.password, 12);

  try {
    const user = await User.create({
      name: data.name,
      email: data.email,
      passwordHash,
      globalRole: "user",
    });

    return { id: user.id, name: user.name, email: user.email };
  } catch (error) {
    if (isDuplicateKeyError(error)) {
      throw new AppError(
        "An account with this email already exists.",
        409,
        "EMAIL_ALREADY_REGISTERED",
      );
    }
    throw error;
  }
}
