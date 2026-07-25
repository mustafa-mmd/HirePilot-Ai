import type { QuestionType } from "@/modules/assessments/constants";

export function scoreObjectiveAnswer(input: { type: QuestionType; selectedOptions: string[]; correctAnswers: string[]; points: number }) {
  if (!["single_choice", "multiple_choice", "true_false"].includes(input.type)) return undefined;
  const selected = [...new Set(input.selectedOptions)].sort();
  const correct = [...new Set(input.correctAnswers)].sort();
  return selected.length === correct.length && selected.every((value, index) => value === correct[index]) ? input.points : 0;
}
