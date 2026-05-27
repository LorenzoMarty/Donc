export type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
  error?: string;
};

export type SupportingText = {
  title: string;
  content: string;
  type: "motivador" | "perspectiva";
};

export type InlineAnnotation = {
  paragraph_index: number;
  quote: string;
  comment: string;
  competency: string;
  type: "error" | "strength";
};

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

export type RankSummary = {
  name: string;
  xp: number;
  next_rank_xp: number | null;
  exercise_difficulty: string;
};

export type TokenResponse = {
  access_token: string;
  token_type: string;
  user: User;
};

export type Dashboard = {
  progress_general: number;
  essay_average: number;
  best_essay_score: number;
  streak_days: number;
  xp: number;
  level: number;
  completed_lessons: number;
  correct_exercises_rate: number;
  essays_written: number;
  mastery_map: { competency: string; label: string; value: number }[];
  recurrent_errors: string[];
  trend: { label: string; score: number }[];
  recent_lessons: { id: number; title: string; module: string; progress_percent: number }[];
  pending_exercises: { id: number; skill: string; difficulty: string }[];
  recent_exams: { id: number; title: string; score: number }[];
  suggested_lessons: { id: number; title: string; module: string; progress_percent: number }[];
  goals: { id: number; title: string; current: number; target: number; unit: string; completed: boolean }[];
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
  xp_reward: number;
  progress: {
    progress_percent: number;
    last_position_seconds: number;
    completed: boolean;
    xp_earned?: number;
    reward_events?: string[];
    total_xp?: number | null;
    rank_name?: string | null;
    next_rank_xp?: number | null;
    exercise_difficulty?: string | null;
  };
  exercises: { id: number; statement: string; skill: string; difficulty: string }[];
};

export type Course = {
  id: number;
  title: string;
  slug: string;
  description: string;
  color: string;
  progress_percent: number;
  completed: boolean;
  xp_reward: number;
  user_rank: RankSummary | null;
  modules: { id: number; title: string; description: string; order: number; progress_percent: number; completed: boolean; xp_reward: number; lessons: Lesson[] }[];
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
  supporting_texts?: SupportingText[];
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
  inline_annotations?: InlineAnnotation[];
  created_at: string;
};

export type Essay = {
  id: number;
  title: string;
  content: string;
  status: "draft" | "submitted" | "corrected";
  word_count: number;
  line_count: number;
  paragraph_count: number;
  score: number | null;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  theme: EssayTheme;
  correction: EssayCorrection | null;
  versions: EssayVersion[];
};

export type EssayVersion = {
  id: number;
  version_number: number;
  title: string;
  content: string;
  status: "draft" | "submitted" | "corrected";
  word_count: number;
  line_count: number;
  paragraph_count: number;
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
