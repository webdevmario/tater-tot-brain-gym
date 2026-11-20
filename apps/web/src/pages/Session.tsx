import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, type FinishResult, type SessionItem } from "../lib/api";
import { isMuted, playSound, setMuted } from "../lib/sounds";
import { canSpeak, prefetchSpeech, speak, stopSpeaking } from "../lib/speech";
import MultipleChoice from "../components/questions/MultipleChoice";
import TypeAnswer from "../components/questions/TypeAnswer";
import SpellingBee from "../components/questions/SpellingBee";
import MathDrill from "../components/questions/MathDrill";
import type { QuestionProps, Reveal } from "../components/questions/types";
import TeachCard from "../components/TeachCard";
import FinishScreen from "../components/FinishScreen";
import { subjectStyle } from "../components/subjects";
import { DEFAULT_THEME } from "../lib/theme";
import type { Theme } from "../lib/api";

// A workout is a fixed round of questions with no clock anywhere.
// Correct answers glide to the next question; misses open a "let's
// learn it" sheet and come back later in the round.

type SessionMeta = {
  id: string;
  kidId: string;
  packId: string | null;
  packTitle: string | null;
  target: number;
  answered: number;
  correct: number;
  ended: boolean;
  theme: Theme;
};

type AttemptResponse = {
  correct: boolean;
  bounceBack: boolean;
  answer: string;
  xp: number;
  teachCard: { answer: string; context: string | null; mnemonic: string | null } | null;
};

const PRAISE = ["Nice!", "You got it!", "Great job!", "Yes!", "Brainy!", "Awesome!", "Nailed it!"];
const COMBO_AT = new Set([3, 5, 8, 10, 15, 20]);

const QUESTION_TYPES: Record<string, (p: QuestionProps) => JSX.Element> = {
  "multiple-choice": MultipleChoice,
  "type-answer": TypeAnswer,
  "spelling-bee": SpellingBee,
  "math-drill": MathDrill,
};

export default function Session() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [meta, setMeta] = useState<SessionMeta | null>(null);
  const [item, setItem] = useState<SessionItem | null>(null);
  const [answered, setAnswered] = useState(0);
  const [busy, setBusy] = useState(false);
  const [reveal, setReveal] = useState<Reveal>(null);
  const [feedback, setFeedback] = useState<
    | { kind: "correct"; text: string; xp: number; extra: string | null }
    | { kind: "teach"; data: NonNullable<AttemptResponse["teachCard"]>; yourAnswer: string | null }
    | null
  >(null);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmExit, setConfirmExit] = useState(false);
  const [result, setResult] = useState<FinishResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [empty, setEmpty] = useState(false);
  const [muted, setMutedState] = useState(isMuted());
  const combo = useRef(0);
  const questionStart = useRef(Date.now());
  const finishing = useRef(false);

  useEffect(() => {
    if (!sessionId) return;
    api
      .get<SessionMeta>(`/api/sessions/${sessionId}`)
      .then((m) => {
        if (m.ended) return navigate(`/kid/${m.kidId}`, { replace: true });
        setMeta(m);
        setAnswered(m.answered);
        loadNext();
      })
      .catch((e) => setError(e.message));
    return stopSpeaking;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  async function loadNext() {
    setReveal(null);
    setFeedback(null);
    try {
      const data = await api.get<{ done: boolean; item?: SessionItem; answered: number }>(
        `/api/sessions/${sessionId}/next-item`
      );
      if (data.done || !data.item) {
        // Nothing at this kid's grade in the chosen pack: say so plainly
        // instead of showing a 0 XP "workout done" screen.
        if (data.answered === 0) return setEmpty(true);
        return finish();
      }
      setItem(data.item);
      if (data.item.questionType !== "spelling-bee") prefetchSpeech(data.item.prompt);
      questionStart.current = Date.now();
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function submitAnswer(userAnswer: string) {
    if (!item || busy) return;
    setBusy(true);
    try {
      const r = await api.post<AttemptResponse>(`/api/sessions/${sessionId}/attempts`, {
        itemId: item.id,
        userAnswer,
        responseMs: Date.now() - questionStart.current,
      });
      const n = answered + 1;
      setAnswered(n);
      setReveal({ picked: userAnswer, answer: r.answer, correct: r.correct });

      if (meta && meta.target >= 6 && n === Math.floor(meta.target / 2)) {
        flashToast("Halfway there! 💪");
        playSound("halftime");
      }

      if (r.correct) {
        combo.current += 1;
        const comboHit = COMBO_AT.has(combo.current);
        playSound(comboHit ? "streak" : "correct");
        setFeedback({
          kind: "correct",
          text: PRAISE[Math.floor(Math.random() * PRAISE.length)],
          xp: r.xp,
          extra: r.bounceBack
            ? "You bounced back on that one!"
            : comboHit
            ? `🔥 ${combo.current} in a row!`
            : null,
        });
        window.setTimeout(() => {
          setBusy(false);
          loadNext();
        }, r.bounceBack || comboHit ? 1500 : 1000);
      } else {
        combo.current = 0;
        playSound("wrong");
        window.setTimeout(() => {
          setFeedback({ kind: "teach", data: r.teachCard!, yourAnswer: userAnswer });
          setBusy(false);
        }, 700);
      }
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  async function finish() {
    if (finishing.current) return;
    finishing.current = true;
    stopSpeaking();
    try {
      const r = await api.patch<FinishResult>(`/api/sessions/${sessionId}`, {});
      setResult(r);
    } catch (e) {
      setError((e as Error).message);
    }
  }

  function flashToast(text: string) {
    setToast(text);
    window.setTimeout(() => setToast(null), 1800);
  }

  function toggleMute() {
    setMuted(!muted);
    setMutedState(!muted);
  }

  async function exitNow() {
    setConfirmExit(false);
    if (answered === 0) return navigate(`/kid/${meta?.kidId ?? ""}`);
    finish();
  }

  async function anotherRound() {
    if (!meta) return;
    const s = await api.post<{ id: string }>("/api/sessions", { kidId: meta.kidId, packId: meta.packId });
    navigate(`/session/${s.id}`, { replace: true });
  }

  if (error) {
    return (
      <div className="safe-page min-h-[100dvh] grid place-items-center text-center">
        <div>
          <p className="text-2xl font-display font-semibold mb-2">Something went wrong.</p>
          <p className="text-teal-400 mb-6">Your answers so far are saved.</p>
          <button onClick={() => window.location.reload()} className="btn-primary">
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (empty && meta) {
    return (
      <div className="safe-page min-h-[100dvh] grid place-items-center text-center">
        <div className="panel max-w-md p-8">
          <p className="text-5xl mb-3" aria-hidden>
            🌱
          </p>
          <p className="text-2xl font-display font-semibold text-teal-600">Nothing to practice here yet</p>
          <p className="text-teal-400 mt-2">Try a different pack, or ask a grown-up to add more.</p>
          <button onClick={() => navigate(`/kid/${meta.kidId}`)} className="btn-primary mt-6">
            Back to my gym
          </button>
        </div>
      </div>
    );
  }

  if (result && meta) {
    return (
      <FinishScreen
        result={result}
        onAgain={anotherRound}
        onDone={() => navigate(`/kid/${meta.kidId}`)}
      />
    );
  }

  if (!meta || !item) {
    return <div className="min-h-[100dvh] grid place-items-center text-teal-300">Getting ready…</div>;
  }

  const Question = QUESTION_TYPES[item.questionType];
  const s = subjectStyle(item.subject);
  const isSpelling = item.questionType === "spelling-bee";
  const promptCard = (
    <div className="panel relative px-6 py-8 text-center">
      <p
        className={`font-display font-bold text-teal-600 leading-snug text-balance ${
          item.prompt.length <= 14 ? "text-6xl md:text-7xl" : item.prompt.length <= 60 ? "text-4xl md:text-5xl" : "text-3xl md:text-4xl"
        }`}
      >
        {item.prompt}
      </p>
      {canSpeak && (
        <button
          type="button"
          onClick={() => speak(item.prompt)}
          className="absolute top-2 right-2 w-11 h-11 rounded-full grid place-items-center text-xl text-teal-300 hover:bg-cream-100"
          aria-label="Read the question out loud"
        >
          🔊
        </button>
      )}
    </div>
  );

  return (
    <div className="safe-page min-h-[100dvh] max-w-4xl mx-auto flex flex-col">
      <header className="flex items-center gap-4 mb-4">
        <button
          onClick={() => (answered === 0 ? exitNow() : setConfirmExit(true))}
          className="w-12 h-12 shrink-0 rounded-full grid place-items-center text-2xl text-teal-300 hover:bg-cream-100"
          aria-label="Finish workout"
        >
          ✕
        </button>
        <RoundProgress answered={answered} target={meta.target} theme={meta.theme ?? DEFAULT_THEME} />
        <button
          onClick={toggleMute}
          className="w-12 h-12 shrink-0 rounded-full grid place-items-center text-2xl hover:bg-cream-100"
          aria-label={muted ? "Turn sounds on" : "Turn sounds off"}
        >
          {muted ? "🔇" : "🔈"}
        </button>
      </header>

      <div className="flex items-center gap-2 mb-4 text-teal-500">
        <span className="w-8 h-8 rounded-lg grid place-items-center" style={{ background: s.tint }} aria-hidden>
          {s.emoji}
        </span>
        <span className="font-semibold">{item.packTitle}</span>
        <span className="ml-auto text-teal-300 font-semibold">
          {Math.min(answered + 1, meta.target)} of {meta.target}
        </span>
      </div>

      <div key={item.id} className="animate-rise">
        {Question ? (
          <Question
            item={item}
            prompt={isSpelling ? null : promptCard}
            onAnswer={submitAnswer}
            disabled={busy || !!feedback}
            reveal={reveal}
          />
        ) : (
          <p>This question type isn't supported yet: {item.questionType}</p>
        )}
      </div>

      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-40 rounded-full bg-teal-500 text-white px-6 py-3 font-display font-semibold text-xl shadow-soft animate-pop-in">
          {toast}
        </div>
      )}

      {feedback?.kind === "correct" && (
        <div className="fixed inset-x-0 bottom-0 z-30 animate-sheet-up">
          <div className="mx-auto max-w-3xl px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] rounded-t-[2rem] bg-teal-50 border-t-4 border-teal-200 flex items-center gap-4">
            <span className="w-14 h-14 rounded-full bg-teal-300 text-white grid place-items-center text-3xl animate-pop-in" aria-hidden>
              ✓
            </span>
            <div className="flex-1">
              <p className="text-3xl font-display font-bold text-teal-500">{feedback.text}</p>
              {feedback.extra && <p className="text-lg font-semibold text-spud-500">{feedback.extra}</p>}
            </div>
            <span className="relative font-display font-bold text-2xl text-spud-500">
              +{feedback.xp} XP
              <span className="absolute inset-0 animate-float-up motion-reduce:hidden" aria-hidden>
                +{feedback.xp}
              </span>
            </span>
          </div>
        </div>
      )}

      {feedback?.kind === "teach" && (
        <div className="fixed inset-0 z-30 flex items-end bg-teal-600/20">
          <div className="w-full animate-sheet-up">
            <div className="mx-auto max-w-3xl px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] rounded-t-[2rem] bg-spud-50 border-t-4 border-spud-200">
              <TeachCard data={feedback.data} yourAnswer={feedback.yourAnswer} onContinue={loadNext} />
            </div>
          </div>
        </div>
      )}

      {confirmExit && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-teal-600/30 p-6">
          <div className="panel max-w-md w-full p-7 text-center animate-pop-in">
            <p className="text-3xl font-display font-bold text-teal-600">Finish for now?</p>
            <p className="text-teal-400 text-lg mt-2">
              You'll keep the XP from your {answered} answer{answered === 1 ? "" : "s"}.
            </p>
            <div className="mt-6 grid gap-3">
              <button onClick={() => setConfirmExit(false)} className="btn-primary !text-xl !py-4">
                Keep going
              </button>
              <button onClick={exitNow} className="btn-secondary !text-xl !py-4">
                Finish and save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// One segment per question, filled as they're answered. Shows how far
// along the round is, never how much time is left.
function RoundProgress({ answered, target, theme }: { answered: number; target: number; theme: Theme }) {
  const pct = Math.min(100, (answered / target) * 100);
  return (
    <div
      className="flex-1 h-5 rounded-full bg-cream-100 overflow-hidden"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={target}
      aria-valuenow={answered}
      aria-label={`${answered} of ${target} questions done`}
    >
      <div
        className="h-full rounded-full transition-[width] duration-500 ease-out"
        style={{
          width: `${pct}%`,
          background: theme.accent,
          boxShadow: "inset 0 -4px 0 rgba(0,0,0,0.18), inset 0 4px 0 rgba(255,255,255,0.3)",
        }}
      />
    </div>
  );
}
