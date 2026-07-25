import "server-only";

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

import { AppError } from "@/lib/errors";

let authRateLimiter: Ratelimit | null = null;
let applicationRateLimiter: Ratelimit | null = null;
let aiRateLimiter: Ratelimit | null = null;
let candidateRateLimiter: Ratelimit | null = null;

function getAuthRateLimiter() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    if (process.env.NODE_ENV === "production") {
      throw new AppError(
        "Authentication rate limiting is not configured.",
        503,
        "RATE_LIMIT_UNAVAILABLE",
      );
    }
    return null;
  }

  authRateLimiter ??= new Ratelimit({
    redis: new Redis({ url, token }),
    limiter: Ratelimit.slidingWindow(5, "10 m"),
    analytics: true,
    prefix: "hirepilot:auth",
  });

  return authRateLimiter;
}

export async function enforceAuthRateLimit(identifier: string) {
  const limiter = getAuthRateLimiter();
  if (!limiter) return;

  const result = await limiter.limit(identifier);
  if (!result.success) {
    throw new AppError(
      "Too many authentication attempts. Please try again later.",
      429,
      "RATE_LIMITED",
      { retryAfter: Math.ceil((result.reset - Date.now()) / 1000) },
    );
  }
}

export async function enforceApplicationRateLimit(identifier: string) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    if (process.env.NODE_ENV === "production") throw new AppError("Application rate limiting is not configured.", 503, "RATE_LIMIT_UNAVAILABLE");
    return;
  }
  applicationRateLimiter ??= new Ratelimit({ redis: new Redis({ url, token }), limiter: Ratelimit.slidingWindow(10, "1 h"), analytics: true, prefix: "hirepilot:applications" });
  const result = await applicationRateLimiter.limit(identifier);
  if (!result.success) throw new AppError("Too many application requests. Please try again later.", 429, "RATE_LIMITED", { retryAfter: Math.ceil((result.reset - Date.now()) / 1000) });
}

export async function enforceAiRateLimit(identifier: string) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    if (process.env.NODE_ENV === "production") throw new AppError("AI rate limiting is not configured.", 503, "RATE_LIMIT_UNAVAILABLE");
    return;
  }
  aiRateLimiter ??= new Ratelimit({ redis: new Redis({ url, token }), limiter: Ratelimit.slidingWindow(20, "1 h"), analytics: true, prefix: "hirepilot:ai" });
  const result = await aiRateLimiter.limit(identifier);
  if (!result.success) throw new AppError("Too many AI analysis requests. Please try again later.", 429, "RATE_LIMITED", { retryAfter: Math.ceil((result.reset - Date.now()) / 1000) });
}

export async function enforceCandidateRateLimit(identifier: string) {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    if (process.env.NODE_ENV === "production") throw new AppError("Candidate rate limiting is not configured.", 503, "RATE_LIMIT_UNAVAILABLE");
    return;
  }
  candidateRateLimiter ??= new Ratelimit({ redis: new Redis({ url, token }), limiter: Ratelimit.slidingWindow(30, "10 m"), analytics: true, prefix: "hirepilot:candidate-assessment" });
  const result = await candidateRateLimiter.limit(identifier);
  if (!result.success) throw new AppError("Too many assessment requests. Please wait before trying again.", 429, "RATE_LIMITED", { retryAfter: Math.ceil((result.reset - Date.now()) / 1000) });
}
