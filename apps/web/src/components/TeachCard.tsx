import { Spinner } from "./Loading";

type TeachCardData = {
  answer: string;
  context: string | null;
  mnemonic: string | null;
};

type Props = {
  data: TeachCardData;
  yourAnswer: string | null;
  onContinue: () => void;
  busy?: boolean;
};

// Shown after a miss. The tone is "here's how to remember it", never
// "you got it wrong". The item comes back later so they can bounce back.
export default function TeachCard({ data, yourAnswer, onContinue, busy = false }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-4">
        <div className="text-4xl" aria-hidden>
          💡
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xl font-display font-semibold text-spud-500">Let's learn this one</p>
          <p className="text-4xl font-display font-bold text-teal-600 mt-1 break-words">{data.answer}</p>
          {yourAnswer && (
            <p className="text-teal-400 mt-1">
              You said <span className="line-through decoration-coral-400 decoration-2">{yourAnswer}</span>
            </p>
          )}
        </div>
      </div>

      {data.context && <p className="text-teal-500 text-lg pl-14">{data.context}</p>}

      {data.mnemonic && (
        <div className="ml-14 rounded-2xl bg-white/80 border border-spud-200 p-4">
          <p className="font-semibold text-spud-500">Trick to remember</p>
          <p className="text-teal-600 text-lg mt-1">{data.mnemonic}</p>
        </div>
      )}

      <p className="pl-14 text-teal-400">It'll come back later so you can get it right.</p>

      <button onClick={onContinue} disabled={busy} className="btn-primary w-full !text-2xl !py-5 disabled:!opacity-100" autoFocus>
        Got it
        {busy && <Spinner className="text-xl" />}
      </button>
    </div>
  );
}
