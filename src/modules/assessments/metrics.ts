export function calculateAssessmentMetrics(
  questions: Array<{ points: number; timeLimit: number }>,
  questionLimit: number | null,
) {
  const effectiveCount = questionLimit ?? questions.length;
  const randomizedSubset = effectiveCount < questions.length;
  const unequalRandomizedPoints = randomizedSubset && new Set(questions.map((question) => question.points)).size > 1;
  const selectedForTimer = [...questions].sort((a, b) => b.timeLimit - a.timeLimit).slice(0, effectiveCount);
  const totalPoints = randomizedSubset ? (questions[0]?.points ?? 0) * effectiveCount : questions.reduce((sum, question) => sum + question.points, 0);
  return {
    totalPoints,
    timedMinutes: Math.ceil(selectedForTimer.reduce((sum, question) => sum + question.timeLimit, 0) / 60),
    unequalRandomizedPoints,
  };
}
