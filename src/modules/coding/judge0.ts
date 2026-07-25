import "server-only";

import { randomUUID } from "node:crypto";

import { AppError } from "@/lib/errors";
import { Answer } from "@/models/answer.model";
import { requireActiveQuestionAccess } from "@/modules/attempts/service";

const LANGUAGE_IDS: Record<string, number> = { javascript: 63, typescript: 74, python: 71, java: 62, "c++": 54, cpp: 54, "c#": 51, csharp: 51, go: 60, ruby: 72 };

function judgeConfig() {
  const baseUrl = process.env.JUDGE0_API_URL?.replace(/\/$/, "");
  if (!baseUrl) throw new AppError("Secure code execution is not configured.", 503, "JUDGE0_NOT_CONFIGURED");
  const key = process.env.JUDGE0_API_KEY;
  return { baseUrl, headers: { "content-type": "application/json", ...(key ? { "X-Auth-Token": key, "X-RapidAPI-Key": key } : {}) } };
}

type JudgeResult = { token?: string; stdout?: string | null; stderr?: string | null; compile_output?: string | null; time?: string | null; memory?: number | null; status?: { id?: number; description?: string } };

async function execute(sourceCode: string, languageId: number, stdin: string, expectedOutput: string | undefined, runtimeLimitMs: number, memoryLimitKb: number) {
  const config = judgeConfig();
  const response = await fetch(`${config.baseUrl}/submissions?base64_encoded=false&wait=true`, { method: "POST", headers: config.headers, body: JSON.stringify({ source_code: sourceCode, language_id: languageId, stdin, expected_output: expectedOutput, cpu_time_limit: Math.max(0.25, runtimeLimitMs / 1_000), memory_limit: memoryLimitKb }), cache: "no-store" });
  if (!response.ok) throw new AppError("The isolated code runner rejected the request.", 502, "CODE_EXECUTION_FAILED");
  let result = await response.json() as JudgeResult;
  if (result.token && !result.status) {
    for (let attempt = 0; attempt < 10; attempt += 1) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      const poll = await fetch(`${config.baseUrl}/submissions/${result.token}?base64_encoded=false`, { headers: config.headers, cache: "no-store" });
      if (!poll.ok) continue;
      result = await poll.json() as JudgeResult;
      if ((result.status?.id ?? 0) > 2) break;
    }
  }
  return result;
}

export async function executeCandidateCode(input: { token: string; sessionId: string; questionId: string; language: string; sourceCode: string; stdin: string; submit: boolean }) {
  const { attempt, question } = await requireActiveQuestionAccess(input.token, input.sessionId, input.questionId);
  if (question.type !== "coding") throw new AppError("This is not a coding question.", 422, "NOT_CODING_QUESTION");
  const allowed = question.codingConfig.allowedLanguages?.length ? question.codingConfig.allowedLanguages : [question.codingConfig.language];
  const configuredLanguage = allowed.find((language) => language.toLowerCase() === input.language.toLowerCase());
  const languageId = configuredLanguage ? LANGUAGE_IDS[configuredLanguage.toLowerCase()] : undefined;
  if (!configuredLanguage || !languageId) throw new AppError("The selected programming language is not allowed.", 422, "LANGUAGE_NOT_ALLOWED");
  const runtime = question.codingConfig.runtimeLimitMs ?? 3_000;
  const memory = question.codingConfig.memoryLimitKb ?? 128_000;

  if (!input.submit) {
    const result = await execute(input.sourceCode, languageId, input.stdin, undefined, runtime, memory);
    return { status: result.status?.description ?? "Unknown", stdout: result.stdout ?? "", stderr: result.stderr ?? "", compileOutput: result.compile_output ?? "", time: Number(result.time ?? 0), memory: result.memory ?? 0 };
  }

  const tests = question.codingConfig.hiddenTests ?? [];
  if (!tests.length) throw new AppError("This coding question has no hidden tests configured.", 409, "HIDDEN_TESTS_MISSING");
  let passed = 0;
  let maximumTime = 0;
  let maximumMemory = 0;
  let finalStatus = "Accepted";
  for (const test of tests) {
    const result = await execute(input.sourceCode, languageId, test.input, test.expectedOutput, runtime, memory);
    const accepted = result.status?.id === 3 || result.status?.description === "Accepted";
    if (accepted) passed += 1; else finalStatus = result.status?.description ?? "Failed";
    maximumTime = Math.max(maximumTime, Number(result.time ?? 0));
    maximumMemory = Math.max(maximumMemory, result.memory ?? 0);
  }
  const executionId = randomUUID();
  const autoScore = Math.round((passed / tests.length) * question.points * 100) / 100;
  await Answer.findOneAndUpdate(
    { organizationId: attempt.organizationId, attemptId: attempt._id, questionId: question._id },
    { $set: { candidateId: attempt.candidateId, type: question.type, status: "draft", "coding.language": configuredLanguage, "coding.sourceCode": input.sourceCode, "coding.status": finalStatus, "coding.time": maximumTime, "coding.memory": maximumMemory, "coding.passedTests": passed, "coding.totalTests": tests.length, "coding.executionId": executionId, autoScore } },
    { upsert: true, runValidators: true },
  );
  return { status: finalStatus, passedTests: passed, totalTests: tests.length, time: maximumTime, memory: maximumMemory, executionId };
}
