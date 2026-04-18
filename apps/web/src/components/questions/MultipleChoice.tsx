import { useState } from "react";
import type { SessionItem } from "../../lib/api";

type Props = {
  item: SessionItem;
  onAnswer: (userAnswer: string, correctHint: null) => void;
  disabled: boolean;
};

export default function MultipleChoice({ item, onAnswer, disabled }: Props) {
  const [selected, setSelected] = useState<string | null>(null);
  const choices = item.choices ?? [];

  function pick(choice: string) {
    if (disabled) return;
    setSelected(choice);
    onAnswer(choice, null);
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {choices.map((choice, i) => {
          const isSelected = selected === choice;
          return (
            <button
              key={i}
              onClick={() => pick(choice)}
              disabled={disabled}
              className={`card text-left !py-5 text-xl transition-all hover:border-teal-300 ${
                isSelected ? "!border-teal-400 !bg-teal-50" : ""
              }`}
            >
              <span className="mr-3 text-teal-300 font-display font-bold">
                {String.fromCharCode(65 + i)}.
              </span>
              {choice}
            </button>
          );
        })}
      </div>
    </div>
  );
}
