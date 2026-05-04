import { useEffect, useState, useRef } from "react";
import { Link, useParams } from "react-router-dom";
import { api, type SessionItem } from "../lib/api";
import { playSound } from "../lib/sounds";
import MultipleChoice from "../components/questions/MultipleChoice";
import TypeAnswer from "../components/questions/TypeAnswer";
import SpellingBee from "../components/questions/SpellingBee";
import MathDrill from "../components/questions/MathDrill";
import TeachCard from "../components/TeachCard";

type Pack = { questionType: string };

type TeachData = {
  answer: string;
  context: string | null;
  mnemonic: string | null;
};

type AttemptResponse = {
  correct: boolean;
  teachCard: TeachData | null;
};

const TIMEOUT_MS = 30000;

export default function Session() {
  const { sessionId } = useParams();
  const [item, setItem] = useState<SessionItem | null>(null);
  const [pack, setPack] = useState<Pack | null>(null);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [teachCard, setTeachCard] = useState<TeachData | null>(null);
  const [stats, setStats] = useState({ correct: 0, total: 0 });
  const [lastResult, setLastResult] = useState<"correct" | "wrong" | null>(null);
  const [timeLeft, setTimeLeft] = useState(TIMEOUT_MS);
  const questionStart = useRef<number>(Date.now());
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    loadNext();
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!item || teachCard) return;
    questionStart.current = Date.now();
    setTimeLeft(TIMEOUT_MS);
    if (timerRef.current) window.clearInterval(timerRef.current);
    timerRef.current = window.setInterval(() => {
      const remaining = TIMEOUT_MS - (Date.now() - questionStart.current);
      if (remaining <= 0) {
        window.clearInterval(timerRef.current!);
        handleTimeout();
      } else {
        setTimeLeft(remaining);
      }
    }, 200);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [item?.id, teachCard]);

  async function loadNext() {
    if (!sessionId) return;
    setLastResult(null);
    try {
      const data = await api.get<{ done: boolean; item?: SessionItem }>(
        `/api/sessions/${sessionId}/next-item`
      );
      if (data.done || !data.item) {
        await finishSession();
        return;
      }
      setItem(data.item);
      const packData = await api.get<Pack>(`/api/packs/${data.item.packId}`);
      setPack(packData);
    } catch (err) {
      alert(`Error: ${(err as Error).message}`);
    }
  }

  async function submitAnswer(userAnswer: string) {
    if (!item || !sessionId || submitting) return;
    if (timerRef.current) window.clearInterval(timerRef.current);
    setSubmitting(true);

    const responseMs = Date.now() - questionStart.current;

    try {
      const result = await api.post<AttemptResponse>(
        `/api/sessions/${sessionId}/attempts`,
        {
          itemId: item.id,
          userAnswer,
          timedOut: false,
          responseMs,
          shownTeachCard: false,
        }
      );

      setStats((s) => ({
        correct: s.correct + (result.correct ? 1 : 0),
        total: s.total + 1,
      }));
      setLastResult(result.correct ? "correct" : "wrong");
      playSound(result.correct ? "correct" : "wrong");

      if (!result.correct && result.teachCard) {
        setTimeout(() => {
          setTeachCard(result.teachCard);
          setSubmitting(false);
        }, 900);
      } else {
        setTimeout(() => {
          setSubmitting(false);
          loadNext();
        }, 900);
      }
    } catch (err) {
      alert(`Error: ${(err as Error).message}`);
      setSubmitting(false);
    }
  }

  async function handleTimeout() {
    if (!item || !sessionId || submitting) return;
    setSubmitting(true);
    try {
      const result = await api.post<AttemptResponse>(
        `/api/sessions/${sessionId}/attempts`,
        {
          itemId: item.id,
          userAnswer: null,
          timedOut: true,
          responseMs: TIMEOUT_MS,
          shownTeachCard: true,
        }
      );
      setStats((s) => ({ correct: s.correct, total: s.total + 1 }));
      setLastResult("wrong");
      playSound("wrong");
      setTimeout(() => {
        setTeachCard(result.teachCard);
        setSubmitting(false);
      }, 500);
    } catch (err) {
      alert(`Error: ${(err as Error).message}`);
      setSubmitting(false);
    }
  }

  async function finishSession() {
    if (!sessionId) return;
    setDone(true);
    playSound("session-end");
    try {
      await api.patch(`/api/sessions/${sessionId}`, {});
    } catch {
      // no-op
    }
  }

  function dismissTeachCard() {
    setTeachCard(null);
    loadNext();
  }

  function renderQuestion() {
    if (!item || !pack) return null;
    const qt = pack.questionType;
    if (qt === "multiple-choice") {
      return <MultipleChoice item={item} onAnswer={submitAnswer} disabled={submitting} />;
    }
    if (qt === "type-answer") {
      return <TypeAnswer item={item} onAnswer={submitAnswer} disabled={submitting} />;
    }
    if (qt === "spelling-bee") {
      return <SpellingBee item={item} onAnswer={submitAnswer} disabled={submitting} />;
    }
    if (qt === "math-drill") {
      return <MathDrill item={item} onAnswer={submitAnswer} disabled={submitting} />;
    }
    return <p>Unknown question type: {qt}</p>;
  }

  if (done) {
    const accuracy =
      stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6">
        <div className="card max-w-xl w-full text-center">
          <div className="text-6xl mb-4">🥔</div>
          <h1 className="text-4xl font-display font-bold text-teal-500 mb-4">
            Workout complete!
          </h1>
          <div className="grid grid-cols-3 gap-4 my-6">
            <div>
              <p className="text-5xl font-display font-bold text-teal-400">{stats.correct}</p>
              <p className="text-sm text-teal-400 uppercase tracking-wider">Correct</p>
            </div>
            <div>
              <p className="text-5xl font-display font-bold text-spud-400">{stats.total}</p>
              <p className="text-sm text-teal-400 uppercase tracking-wider">Total</p>
            </div>
            <div>
              <p className="text-5xl font-display font-bold text-coral-400">{accuracy}%</p>
              <p className="text-sm text-teal-400 uppercase tracking-wider">Accuracy</p>
            </div>
          </div>
          <Link to="/" className="btn-primary">
            Back to Start
          </Link>
        </div>
      </div>
    );
  }

  if (!item) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }

  const timePercent = (timeLeft / TIMEOUT_MS) * 100;
  const isLowTime = timeLeft < 8000;
  const isSpelling = pack?.questionType === "spelling-bee";

  return (
    <div className="min-h-screen px-6 py-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <Link to="/" className="text-teal-400 text-sm hover:text-teal-500">
          ← End workout
        </Link>
        <span className="text-teal-400 text-sm">
          ✓ {stats.correct} / {stats.total}
        </span>
      </div>

      <div className="h-2 rounded-full bg-cream-100 overflow-hidden mb-8">
        <div
          className={`h-full transition-all duration-200 ${
            isLowTime ? "bg-coral-400" : "bg-teal-300"
          }`}
          style={{ width: `${timePercent}%` }}
        />
      </div>

      {teachCard ? (
        <TeachCard data={teachCard} onContinue={dismissTeachCard} />
      ) : (
        <>
          <div
            className={`card mb-6 text-center !py-10 transition-all ${
              lastResult === "correct"
                ? "!bg-teal-50 !border-teal-300"
                : lastResult === "wrong"
                ? "!bg-coral-400/10 !border-coral-400"
                : ""
            }`}
          >
            <p className="text-sm uppercase tracking-widest text-teal-400 mb-4">
              {isSpelling ? "Spell the word" : "Question"}
            </p>
            <p className="text-4xl md:text-5xl font-display font-bold text-teal-600">
              {isSpelling ? "🔊" : item.prompt}
            </p>
          </div>
          {renderQuestion()}
        </>
      )}
    </div>
  );
}
