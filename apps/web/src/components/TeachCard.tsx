type TeachCardData = {
  answer: string;
  context: string | null;
  mnemonic: string | null;
};

type Props = {
  data: TeachCardData;
  onContinue: () => void;
};

export default function TeachCard({ data, onContinue }: Props) {
  return (
    <div className="card !bg-spud-50 !border-spud-200 space-y-4 animate-in fade-in">
      <div className="flex items-start gap-3">
        <div className="text-3xl">💡</div>
        <div className="flex-1">
          <p className="text-sm uppercase tracking-widest text-spud-500 font-bold mb-1">
            Let's learn it
          </p>
          <p className="text-3xl font-display font-semibold text-teal-500">
            {data.answer}
          </p>
        </div>
      </div>

      {data.context && (
        <div className="pl-10">
          <p className="text-teal-500 text-lg">{data.context}</p>
        </div>
      )}

      {data.mnemonic && (
        <div className="pl-10">
          <p className="text-sm uppercase tracking-widest text-spud-500 font-bold mb-1">
            Trick to remember
          </p>
          <p className="text-teal-500 italic">"{data.mnemonic}"</p>
        </div>
      )}

      <button onClick={onContinue} className="btn-primary w-full !text-xl !py-4">
        Got it, next →
      </button>
    </div>
  );
}
