export function attemptExpiry(startedAt: Date, durationMinutes: number, invitationExpiry: Date) {
  const durationExpiry = new Date(startedAt.getTime() + durationMinutes * 60_000);
  return durationExpiry < invitationExpiry ? durationExpiry : invitationExpiry;
}

export function questionExpiry(startedAt: Date, preparationSeconds: number, timeLimitSeconds: number, overallExpiry: Date) {
  const deadline = new Date(startedAt.getTime() + (preparationSeconds + timeLimitSeconds) * 1_000);
  return deadline < overallExpiry ? deadline : overallExpiry;
}

export function hasExpired(deadline: Date, now = new Date()) {
  return deadline.getTime() <= now.getTime();
}

export function remainingSeconds(deadline: Date, now = new Date()) {
  return Math.max(0, Math.ceil((deadline.getTime() - now.getTime()) / 1_000));
}
