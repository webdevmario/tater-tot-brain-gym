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
  name: string;
  displayName: string;
  avatarPath: string | null;
  curriculum: string | null;
  grade: number;
  sessionMinutes: number;
  weeklyGoal: number;
  enabledPacks?: Array<{ packId: string; enabled: boolean; pack: Pack }>;
};

export type Pack = {
  id: string;
  title: string;
  description: string | null;
  subject: string;
  questionType: string;
  curriculum: string | null;
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
  prompt: string;
  choices: string[] | null;
  audioText: string | null;
};

export type Session = {
  id: string;
  kidId: string;
  startedAt: string;
  endedAt: string | null;
  targetMinutes: number;
  xpEarned: number;
};
