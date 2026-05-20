export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api/backend";

export type User = {
  id: number;
  name: string;
  email: string;
  role: "student" | "admin";
  xp: number;
  level: number;
  streak_days: number;
  daily_goal_minutes: number;
};

export type TokenResponse = {
  access_token: string;
  token_type: string;
  user: User;
};

export type Dashboard = {
  progress_general: number;
  essay_average: number;
  streak_days: number;
  xp: number;
  level: number;
  completed_lessons: number;
  correct_exercises_rate: number;
  essays_written: number;
  trend: { label: string; score: number }[];
  recent_lessons: { id: number; title: string; module: string; progress_percent: number }[];
  pending_exercises: { id: number; skill: string; difficulty: string }[];
  recent_exams: { id: number; title: string; score: number }[];
  goals: { id: number; title: string; current: number; target: number; unit: string; completed: boolean }[];
  achievements: { id: number; title: string; description: string; icon: string }[];
};

export type Lesson = {
  id: number;
  title: string;
  description: string;
  thumbnail_url: string;
  video_url: string;
  summary: string;
  duration_minutes: number;
  order: number;
  progress: { progress_percent: number; last_position_seconds: number; completed: boolean };
  exercises: { id: number; statement: string; skill: string; difficulty: string }[];
};

export type Subject = {
  id: number;
  title: string;
  slug: string;
  description: string;
  color: string;
  modules: { id: number; title: string; description: string; order: number; lessons: Lesson[] }[];
};

export type Exercise = {
  id: number;
  statement: string;
  options: string[];
  skill: string;
  difficulty: string;
  module_id: number;
  lesson_id: number | null;
};

export type EssayTheme = {
  id: number;
  title: string;
  context: string;
  source: string;
};

export type Essay = {
  id: number;
  title: string;
  content: string;
  status: "draft" | "submitted" | "corrected";
  word_count: number;
  line_count: number;
  score: number | null;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  theme: EssayTheme;
  correction: EssayCorrection | null;
  versions: EssayVersion[];
};

export type EssayCorrection = {
  id: number;
  total_score: number;
  competency_1: number;
  competency_2: number;
  competency_3: number;
  competency_4: number;
  competency_5: number;
  strengths: string[];
  errors: string[];
  suggestions: string[];
  feedback: string;
  recurrent_patterns: string[];
  created_at: string;
};

export type EssayVersion = {
  id: number;
  version_number: number;
  title: string;
  content: string;
  status: "draft" | "submitted" | "corrected";
  word_count: number;
  line_count: number;
  score: number | null;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  correction: EssayCorrection | null;
};

export type EssayHistory = {
  essays: Essay[];
  average_score: number;
  weakest_competency: string;
  recurrent_errors: string[];
  evolution: { label: string; score: number; c1: number; c2: number; c3: number; c4: number; c5: number }[];
};

export type MockExam = {
  id: number;
  title: string;
  description: string;
  area: string;
  duration_minutes: number;
  questions: { id: number; statement: string; options: string[]; skill: string }[];
};

export type AdminMetrics = {
  users: number;
  essays: number;
  corrected_essays: number;
  lessons: number;
  exercises: number;
  average_score: number;
  active_themes: number;
};

function getToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("access_token");
}

export async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    credentials: "include",
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({ detail: "Erro inesperado." }));
    throw new Error(payload.detail ?? "Erro inesperado.");
  }

  return response.json() as Promise<T>;
}

export const authApi = {
  login: (email: string, password: string) =>
    apiFetch<TokenResponse>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) }),
  register: (name: string, email: string, password: string) =>
    apiFetch<TokenResponse>("/auth/register", { method: "POST", body: JSON.stringify({ name, email, password }) }),
  me: () => apiFetch<User>("/auth/me"),
  recover: (email: string) => apiFetch<{ message: string }>("/auth/password-recovery", { method: "POST", body: JSON.stringify({ email }) }),
};
