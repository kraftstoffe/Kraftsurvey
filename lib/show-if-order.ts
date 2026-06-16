import { parseShowIf } from "@/lib/choice-answers";

export type OrderedQuestion = {
  id: string;
  order: number;
  showIf: string | null;
};

export function validateQuestionOrder(questions: OrderedQuestion[]): string | null {
  const orderById = new Map(questions.map((q) => [q.id, q.order]));

  for (const question of questions) {
    if (!question.showIf) continue;
    const showIf = parseShowIf(question.showIf);
    if (!showIf) continue;

    const parentOrder = orderById.get(showIf.questionId);
    if (parentOrder === undefined) continue;

    if (parentOrder >= question.order) {
      return "Bedingte Fragen müssen nach der referenzierten Frage stehen";
    }
  }

  return null;
}
