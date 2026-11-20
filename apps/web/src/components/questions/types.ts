import type { ReactNode } from "react";
import type { SessionItem } from "../../lib/api";

export type Reveal = { picked: string; answer: string; correct: boolean } | null;

export type QuestionProps = {
  item: SessionItem;
  prompt: ReactNode; // the question card, laid out by each question type
  onAnswer: (userAnswer: string) => void;
  disabled: boolean;
  reveal: Reveal;
};
