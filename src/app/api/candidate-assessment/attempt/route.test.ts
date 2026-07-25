import { beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/rate-limit", () => ({ enforceCandidateRateLimit: vi.fn() }));
vi.mock("@/modules/attempts/service", () => ({ getCandidateAssessmentSession: vi.fn(), startAssessmentAttempt: vi.fn() }));
import { startAssessmentAttempt } from "@/modules/attempts/service";
import { POST } from "@/app/api/candidate-assessment/attempt/route";
describe("candidate assessment attempt route", () => {
  beforeEach(() => vi.clearAllMocks());
  it("rejects malformed capability tokens before the service", async () => { const response = await POST(new Request("https://app.test/api/candidate-assessment/attempt", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ token: "bad", sessionId: crypto.randomUUID(), systemCheck: { camera: true, microphone: true, network: true }, consent: { privacy: true, monitoring: true, mediaRecording: false } }) })); expect(response.status).toBe(422); expect(startAssessmentAttempt).not.toHaveBeenCalled(); });
  it("passes validated consent and system checks to the attempt service", async () => { const input = { token: "a".repeat(43), sessionId: crypto.randomUUID(), systemCheck: { camera: true, microphone: true, network: true as const }, consent: { privacy: true as const, monitoring: true as const, mediaRecording: true } }; vi.mocked(startAssessmentAttempt).mockResolvedValue({ state: "completed", attemptId: "attempt", totalScore: 0, maximumScore: 0, submittedAt: undefined }); const response = await POST(new Request("https://app.test/api/candidate-assessment/attempt", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(input) })); expect(response.status).toBe(201); expect(startAssessmentAttempt).toHaveBeenCalledWith(input, "unknown"); });
});
