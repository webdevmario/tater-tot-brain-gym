import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { api, type FinishResult, type SessionItem } from "../lib/api";
import { isMuted, playSound, setMuted } from "../lib/sounds";
import { canSpeak, prefetchSpeech, speak, speakable, stopSpeaking } from "../lib/speech";
import { useActiveClock } from "../lib/activeClock";
import MultipleChoice from "../components/questions/MultipleChoice";
import TypeAnswer from "../components/questions/TypeAnswer";
import MathDrill from "../components/questions/MathDrill";
import type { QuestionProps, Reveal } from "../components/questions/types";
import TeachCard from "../components/TeachCard";
import FinishScreen from "../components/FinishScreen";
import { QuestionSkeleton, Bone } from "../components/Loading";
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

type NextItem = {
  done: boolean;
  item?: SessionItem;
  answered: number;
  target: number;
  // Why a round ended before its target: "cleared" = they've done every
  // question available right now; "empty" = nothing at their grade.
  reason?: "cleared" | "empty";
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
  "math-drill": MathDrill,
};

export default function Session() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
  const [meta, setMeta] = useState<SessionMeta | null>(null);
  const [item, setItem] = useState<SessionItem | null>(null);
  const [answered, setAnswered] = useState(0);
  const [busy, setBusy] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [reveal, setReveal] = useState<Reveal>(null);
  const [feedback, setFeedback] = useState<
    | { kind: "correct"; text: string; xp: number; extra: string | null }
    | { kind: "teach"; data: NonNullable<AttemptResponse["teachCard"]>; yourAnswer: string | null }
    | null
  >(null);
  const [confirmExit, setConfirmExit] = useState(false);
  const [result, setResult] = useState<FinishResult | null>(null);
  const [cleared, setCleared] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stopped, setStopped] = useState<"empty" | "cleared" | null>(null);
  const [muted, setMutedState] = useState(isMuted());
  const combo = useRef(0);
  const clock = useActiveClock();
  const finishing = useRef(false);
  // The next question is fetched while the "Nice!" / "Let's learn it"
  // sheet is up, so moving on is instant with no blank flash.
  const upcoming = useRef<Promise<NextItem> | null>(null);

  function fetchNext() {
    return api.get<NextItem>(`/api/sessions/${sessionId}/next-item`).then((d) => {
      if (d.item) prefetchSpeech(speakable(d.item.prompt));
      return d;
    });
  }

  // No rubber-band bounce while a round is on screen.
  useEffect(() => {
    document.documentElement.classList.add("no-bounce");
    return () => document.documentElement.classList.remove("no-bounce");
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    Promise.all([api.get<SessionMeta>(`/api/sessions/${sessionId}`), fetchNext()])
      .then(([m, next]) => {
        if (m.ended) return navigate(`/kid/${m.kidId}`, { replace: true });
        setMeta(m);
        setAnswered(m.answered);
        return show(next);
      })
      .catch((e) => setError(e.message));
    return stopSpeaking;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  /** Swap in the next question (or end the round) in one render. */
  async function show(next: NextItem) {
    if (next.done || !next.item) {
      if (next.answered === 0) {
        setStopped(next.reason === "cleared" ? "cleared" : "empty");
        return;
      }
      setCleared(next.reason === "cleared");
      await finish();
      return;
    }
    setItem(next.item);
    setReveal(null);
    setFeedback(null);
    clock.restart();
  }

  async function advance() {
    if (advancing) return;
    setAdvancing(true);
    try {
      const next = await (upcoming.current ?? fetchNext());
      upcoming.current = null;
      await show(next);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setAdvancing(false);
    }
  }

  async function submitAnswer(userAnswer: string) {
    if (!item || busy) return;
    setBusy(true);
    try {
      const r = await api.post<AttemptResponse>(`/api/sessions/${sessionId}/attempts`, {
        itemId: item.id,
        userAnswer,
        responseMs: clock.read(),
      });
      upcoming.current = fetchNext();
      upcoming.current.catch(() => {}); // surfaced when advance() awaits it
      const n = answered + 1;
      setAnswered(n);
      setReveal({ picked: userAnswer, answer: r.answer, correct: r.correct });

      const halfway = !!meta && meta.target >= 6 && n === Math.floor(meta.target / 2);
      if (halfway) playSound("halftime");

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
            : halfway
            ? "Halfway there! 💪"
            : null,
        });
        window.setTimeout(() => {
          setBusy(false);
          advance();
        }, r.bounceBack || comboHit || halfway ? 1500 : 1000);
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

  function toggleMute() {
    setMuted(!muted);
    setMutedState(!muted);
  }

  async function exitNow() {
    if (answered === 0) return navigate(`/kid/${meta?.kidId ?? ""}`);
    setAdvancing(true);
    await finish();
    setConfirmExit(false);
    setAdvancing(false);
  }

  async function anotherRound() {
    if (!meta) return;
    try {
      const s = await api.post<{ id: string }>("/api/sessions", { kidId: meta.kidId, packId: meta.packId });
      // The route is keyed by session id, so this mounts a fresh round.
      navigate(`/session/${s.id}`, { replace: true });
    } catch (e) {
      setError((e as Error).message);
    }
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

  if (stopped && meta) {
    const isCleared = stopped === "cleared";
    return (
      <div className="safe-page min-h-[100dvh] grid place-items-center text-center">
        <div className="panel max-w-md p-8 animate-rise">
          <p className="text-5xl mb-3" aria-hidden>
            {isCleared ? "🎉" : "🌱"}
          </p>
          <p className="text-2xl font-display font-semibold text-teal-600 text-balance">
            {isCleared
              ? meta.packTitle
                ? "You've done everything in this pack for now!"
                : "You've done everything for now!"
              : "Nothing to practice here yet"}
          </p>
          <p className="text-teal-400 mt-2 text-balance">
            {isCleared
              ? "These questions come back for review in a day or two. Try a different pack today!"
              : "Try a different pack, or ask a grown-up to add more."}
          </p>
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
        cleared={cleared}
        onAgain={anotherRound}
        onDone={() => navigate(`/kid/${meta.kidId}`)}
      />
    );
  }

  const theme = meta?.theme ?? DEFAULT_THEME;
  const target = meta?.target ?? 10;

  const header = (
    <header className="flex items-center gap-4 mb-4">
      <button
        onClick={() => (answered === 0 ? exitNow() : setConfirmExit(true))}
        disabled={!meta}
        className="w-12 h-12 shrink-0 rounded-full grid place-items-center text-2xl text-teal-300 hover:bg-cream-100"
        aria-label="Finish workout"
      >
        ✕
      </button>
      <RoundProgress answered={answered} target={target} theme={theme} />
      <button
        onClick={toggleMute}
        className="w-12 h-12 shrink-0 rounded-full grid place-items-center text-2xl hover:bg-cream-100"
        aria-label={muted ? "Turn sounds on" : "Turn sounds off"}
      >
        {muted ? "🔇" : "🔈"}
      </button>
    </header>
  );

  if (!meta || !item) {
    return (
      <div className="safe-page min-h-[100dvh] max-w-4xl mx-auto flex flex-col">
        {header}
        <div className="flex items-center gap-2 mb-4 h-8">
          <Bone className="w-8 h-8 !rounded-lg" />
          <Bone className="w-40 h-5" />
        </div>
        <QuestionSkeleton />
      </div>
    );
  }

  const Question = QUESTION_TYPES[item.questionType];
  const s = subjectStyle(item.subject);
  const promptCard = (
    <div className="panel relative px-14 py-8 text-center">
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
          onClick={() => speak(speakable(item.prompt))}
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
      {header}

      <div className="flex items-center gap-2 mb-4 h-8 text-teal-500">
        <span className="w-8 h-8 rounded-lg grid place-items-center" style={{ background: s.tint }} aria-hidden>
          {s.emoji}
        </span>
        <span className="font-semibold">{item.packTitle}</span>
        <span className="ml-auto text-teal-300 font-semibold">
          {Math.min(answered + (reveal ? 0 : 1), meta.target)} of {meta.target}
        </span>
      </div>

      <div key={item.id} className="animate-rise">
        {Question ? (
          <Question
            item={item}
            prompt={promptCard}
            onAnswer={submitAnswer}
            disabled={busy || !!feedback}
            reveal={reveal}
          />
        ) : (
          <p>This question type isn't supported yet: {item.questionType}</p>
        )}
      </div>

      {feedback?.kind === "correct" && (
        // Full-width band (edge to edge, top border only) so there are no
        // side edges to look off; the content is centered inside it.
        <div className="fixed inset-x-0 bottom-0 z-30 animate-sheet-up bg-teal-50 border-t-4 border-teal-200">
          <div className="mx-auto max-w-3xl px-5 pt-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] flex items-center gap-4">
            <span className="w-14 h-14 shrink-0 rounded-full bg-teal-300 text-white grid place-items-center text-3xl animate-confirm" aria-hidden>
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
          <div className="w-full animate-sheet-up bg-spud-50 border-t-4 border-spud-200">
            <div className="mx-auto max-w-3xl px-6 pt-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              <TeachCard data={feedback.data} yourAnswer={feedback.yourAnswer} onContinue={advance} busy={advancing} />
            </div>
          </div>
        </div>
      )}

      {confirmExit && (
        <div className="fixed inset-0 z-40 grid place-items-center bg-teal-600/30 p-6">
          <div className="panel max-w-md w-full p-7 text-center animate-rise">
            <p className="text-3xl font-display font-bold text-teal-600">Finish for now?</p>
            <p className="text-teal-400 text-lg mt-2">
              You'll keep the XP from your {answered} answer{answered === 1 ? "" : "s"}.
            </p>
            <div className="mt-6 grid gap-3">
              <button onClick={() => setConfirmExit(false)} disabled={advancing} className="btn-primary !text-xl !py-4">
                Keep going
              </button>
              <button onClick={exitNow} disabled={advancing} className="btn-secondary !text-xl !py-4">
                {advancing ? "Saving…" : "Finish and save"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// One bar filled as questions are answered, with a halfway marker that
// lights up when they pass it. Shows how far along the round is, never
// how much time is left.
function RoundProgress({ answered, target, theme }: { answered: number; target: number; theme: Theme }) {
  const pct = Math.min(100, (answered / target) * 100);
  const showHalf = target >= 6;
  const passedHalf = answered >= Math.floor(target / 2);
  return (
    <div
      className="relative flex-1 h-8 flex items-center"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={target}
      aria-valuenow={answered}
      aria-label={`${answered} of ${target} questions done`}
    >
      <div className="w-full h-5 rounded-full bg-cream-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{
            width: `${pct}%`,
            background: theme.accent,
            boxShadow: "inset 0 -4px 0 rgba(0,0,0,0.18), inset 0 4px 0 rgba(255,255,255,0.3)",
          }}
        />
      </div>
      {showHalf && (
        <span
          key={passedHalf ? "on" : "off"}
          className={`absolute top-1/2 w-8 h-8 -mt-4 -ml-4 rounded-full grid place-items-center text-base border-[3px] transition-colors ${
            passedHalf ? "text-white animate-confirm" : "bg-white border-cream-200 grayscale opacity-70"
          }`}
          style={{
            left: `${(Math.floor(target / 2) / target) * 100}%`,
            ...(passedHalf ? { background: theme.accent, borderColor: "#fff" } : {}),
          }}
          aria-hidden
        >
          ⭐
        </span>
      )}
    </div>
  );
}
