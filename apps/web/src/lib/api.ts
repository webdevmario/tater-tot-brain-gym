async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  isFormData = false
): Promise<T> {
  const opts: RequestInit = { method, headers: {} };
  if (body !== undefined) {
    if (isFormData) {
      opts.body = body as FormData;
    } else {
      (opts.headers as Record<string, string>)["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
  }
  const res = await fetch(path, opts);
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
  upload: <T>(path: string, formData: FormData) => request<T>("POST", path, formData, true),
};

export type Kid = {
  id: string;
  firstName: string;
  lastName: string;
  username: string;
  avatarPath: string | null;
  avatarEmoji: string | null;
  grade: number;
  sessionMinutes: number;
  roundSize: number;
  theme: string;
  titleBadge: string | null;
  weeklyGoal: number;
  enabledPacks?: Array<{ packId: string; enabled: boolean; pack: Pack }>;
  summary?: {
    rank: Rank;
    totalXp: number;
    streak: number;
    practicedToday: boolean;
    theme: Theme;
    title: string | null;
  } | null;
};

export type Theme = {
  id: string;
  name: string;
  minLevel: number;
  gradient: string;
  accent: string;
  shade: string;
  pattern?: "stars" | "sparkles";
};

export type Rank = {
  level: number;
  name: string;
  emoji: string;
  color: string;
  stars: number;
  minXp: number;
  next: { name: string; emoji: string; minXp: number } | null;
  xpIntoRank: number;
  xpForRank: number;
};

export type BadgeProgress = {
  code: string;
  label: string;
  emoji: string;
  description: string;
  earnedAt: string | null;
  progress: number;
  target: number;
};

export type Week = { done: number; goal: number; days: boolean[] };

export type PackProgress = {
  id: string;
  title: string;
  subject: string;
  questionType: string;
  total: number;
  learned: number;
  mastered: number;
};

export type KidProgress = {
  kid: Kid;
  totalXp: number;
  rank: Rank;
  streak: number;
  practicedToday: boolean;
  week: Week;
  stats: { workouts: number; correct: number; learned: number; mastered: number };
  badges: BadgeProgress[];
  packs: PackProgress[];
  ranks: Array<{ level: number; name: string; emoji: string; color: string; minXp: number }>;
  theme: Theme;
  title: string | null;
  themes: Array<Theme & { unlocked: boolean }>;
};

export type FinishResult = {
  correct: number;
  total: number;
  completedRound: boolean;
  xpEarned: number;
  breakdown: { correct: number; tried: number; finish: number; perfect: number; total: number };
  totalXp: number;
  rankBefore: Rank;
  rank: Rank;
  rankUp: boolean;
  streak: number;
  week: Week;
  newBadges: Array<{ code: string; label: string; emoji: string; description: string }>;
  newThemes: Theme[];
};

export type Pack = {
  id: string;
  title: string;
  description: string | null;
  subject: string;
  questionType: string;
  source: string | null;
  gradeMin: number;
  gradeMax: number;
  archived: boolean;
  _count?: { items: number };
};

export type Item = {
  id: string;
  packId: string;
  gradeLevel: number;
  prompt: string;
  answer: string;
  choices: string[] | null;
  context: string | null;
  mnemonic: string | null;
  audioText: string | null;
  tags: string[] | null;
};

export type SessionItem = {
  id: string;
  packId: string;
  packTitle: string;
  subject: string;
  questionType: string;
  prompt: string;
  choices: string[] | null;
  audioText: string | null;
  sentence: string | null; // spelling bee example sentence
};

export type Session = {
  id: string;
  kidId: string;
  startedAt: string;
  endedAt: string | null;
  targetMinutes: number;
  targetCount: number;
  packId: string | null;
  xpEarned: number;
};
