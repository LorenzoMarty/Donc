export type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
  error?: string;
};

export type PublishedGameQuestion = {
  prompt: string;
  options: string[];
  answer_index: number;
  explanation: string;
};

export type PublishedGame = {
  id: number;
  name: string;
  category: string;
  skill: string;
  difficulty: string;
  engine: string;
  questions: PublishedGameQuestion[];
  payload: Record<string, unknown> | null;
  description: string | null;
  thumbnail: string | null;
  estimated_time: string | null;
};

export type ChartPoint = {
  label: string;
  value: number;
};

export type SupportingText = {
  title: string;
  content: string;
  type:
    | "motivador"
    | "dados"
    | "repertorio"
    | "imagem"
    | "grafico"
    | "infografico"
    | "postagem"
    | "manchete"
    | "tirinha"
    | "charge";
  chart_points?: ChartPoint[] | null;
  stat_items?: ChartPoint[] | null;
  comic_panels?: string[] | null;
  post_author?: string | null;
  post_handle?: string | null;
  headline_subtitle?: string | null;
  headline_source?: string | null;
  image_prompt?: string | null;
  image_url?: string | null;
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
  streak_days: number;
  daily_goal_minutes: number;
  created_at: string;
};

export type CognitiveIssueState = "DETECTED" | "TRAINING" | "IMPROVING" | "MASTERED";

export type CognitiveIssueConfidence = "low" | "medium" | "high";

export type CognitiveIssueRecord = {
  state: CognitiveIssueState;
  negative_count: number;
  positive_streak: number;
  updated_at: string | null;
  confidence: CognitiveIssueConfidence;
  detected_at: string | null;
  evidence_count: number;
  last_evidence_at: string | null;
};

export type LearningProfile = {
  weak_competencies: Record<string, number>;
  recurring_errors: string[];
  repertories_used: string[];
  recommendations: string[];
  latest_competencies: Record<string, number>;
  score_trend: number[];
  cognitive_issues: Record<string, CognitiveIssueRecord>;
  has_data: boolean;
};

export type TokenResponse = {
  access_token: string;
  token_type: string;
  user: User;
};

export type NextRecommendedAction = {
  type: "LESSON" | "EXERCISE" | "GAME" | "ESSAY";
  target_issue: string | null;
  target: string | null;
  reason: string;
  estimated_minutes: number;
};

export type Dashboard = {
  progress_general: number;
  essay_average: number;
  best_essay_score: number;
  streak_days: number;
  completed_lessons: number;
  correct_exercises_rate: number;
  essays_written: number;
  exercises_answered: boolean;
  mastery_map: { competency: string; label: string; value: number }[];
  recurrent_errors: string[];
  trend: { label: string; score: number }[];
  recent_lessons: { id: number; title: string; module: string; progress_percent: number }[];
  pending_exercises: { id: number; skill: string; difficulty: string }[];
  recent_essays: { id: number; title: string; theme_title: string; status: Essay["status"]; word_count: number; score: number | null; updated_at: string }[];
  suggested_lessons: { id: number; title: string; module: string; progress_percent: number }[];
  goals: { id: number; title: string; current: number; target: number; unit: string; completed: boolean; due_date?: string | null }[];
  next_action: NextRecommendedAction;
};

export type Lesson = {
  id: number;
  title: string;
  description: string;
  thumbnail_url: string;
  video_url: string;
  summary: string;
  pdf_url: string | null;
  duration_minutes: number;
  order: number;
  progress: {
    progress_percent: number;
    last_position_seconds: number;
    completed: boolean;
  };
  exercises: { id: number; statement: string; skill: string; difficulty: string }[];
  locked?: boolean;
};

export type Module = {
  id: number;
  title: string;
  slug: string;
  description: string;
  color: string;
  order: number;
  progress_percent: number;
  completed: boolean;
  lessons: Lesson[];
  items?: ModuleItem[];
  locked?: boolean;
  mastered?: boolean;
  unlock_requirements?: string[];
  target_competencies?: string[];
};

export type ModuleActivity = {
  id: number;
  statement: string;
  skill: string;
  difficulty: string;
  lesson_id: number | null;
  base_lesson_ids: number[];
};

export type ModuleItem = {
  id: number;
  kind: "lesson" | "activity";
  order: number;
  lesson?: Lesson | null;
  activity?: ModuleActivity | null;
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
  status: "pending" | "approved" | "rejected";
  created_at: string;
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

export type EssaySubmitResponse = {
  job_id: string;
  essay_id: number;
};

export type JobStatus = {
  job_id: string;
  status: "queued" | "running" | "completed" | "failed";
  essay?: Essay;
  error?: string;
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

export type AdminUser = {
  id: number;
  name: string;
  email: string;
  role: string;
  streak_days: number;
  daily_goal_minutes: number;
  essays: number;
  last_seen_at: string | null;
  total_tokens: number;
  event_count: number;
};

export type AdminLesson = {
  id: number;
  title: string;
  description: string;
  thumbnail_url: string;
  video_url: string;
  summary: string;
  pdf_url: string | null;
  duration_minutes: number;
  order: number;
  targets: string[];
};

export type AdminActivity = {
  id: number;
  statement: string;
  options: string[];
  correct_answer: "A" | "B" | "C" | "D" | "E";
  explanation: string;
  skill: string;
  difficulty: "easy" | "medium" | "hard";
  lesson_id: number | null;
  base_lesson_ids: number[];
  order: number;
  targets: string[];
};

export type AIGeneratedExercise = {
  id: number;
  module_id: number;
  lesson_id: number | null;
  statement: string;
  options: string[];
  correct_answer: "A" | "B" | "C" | "D" | "E";
  explanation: string;
  skill: string;
  difficulty: "easy" | "medium" | "hard";
  base_lesson_ids: number[];
  targets: string[];
  status: "pending" | "approved" | "rejected";
  admin_notes: string | null;
  edited_after_generation: boolean;
  created_at: string;
  reviewed_at: string | null;
};

export type ReviewQueueItem = {
  content_type: "game" | "exercise" | "theme";
  content_id: number;
  title: string;
  skill: string | null;
  difficulty: string | null;
  targets: string[];
  status: "pending" | "approved" | "rejected";
  created_at: string;
};

export type ContentVersion = {
  id: number;
  content_type: string;
  content_id: number;
  snapshot: Record<string, unknown>;
  edited_by: number | null;
  reason: string | null;
  created_at: string;
};

export type AIGenerationTrace = {
  id: number;
  workflow: string;
  agent: string;
  user_id: number | null;
  status: string;
  model: string | null;
  cost_micro_usd: number;
  prompt_hash: string | null;
  template_version: string | null;
  error: string | null;
  meta: Record<string, unknown>;
  created_at: string;
};

export type AdminModuleItem = {
  id: number;
  kind: "lesson" | "activity";
  order: number;
  lesson: AdminLesson | null;
  activity: AdminActivity | null;
};

export type AdminModule = {
  id: number;
  title: string;
  slug: string;
  description: string;
  color: string;
  order: number;
  lessons: AdminLesson[];
  items?: AdminModuleItem[];
};

export type AgentStats = {
  agent: string;
  workflow: string;
  total_calls: number;
  success_calls: number;
  error_calls: number;
  total_tokens: number;
  avg_latency_ms: number;
  cost_usd_cents: number;
  cost_usd_micros: number;
  cost_brl_cents: number;
};

export type WorkflowStats = {
  workflow: string;
  total_calls: number;
  error_calls: number;
  total_tokens: number;
  cost_usd_micros: number;
  cost_brl_cents: number;
  avg_cost_brl_cents: number;
};

export type ModelStats = {
  model: string;
  total_calls: number;
  total_tokens: number;
  cost_usd_micros: number;
  cost_brl_cents: number;
};

export type DailyUsage = {
  date: string;
  total_tokens: number;
  total_calls: number;
  error_calls: number;
  cost_usd_cents: number;
  cost_usd_micros: number;
  cost_brl_cents: number;
};

export type AITelemetry = {
  period_days: number;
  has_data: boolean;
  total_tokens: number;
  total_calls: number;
  error_calls: number;
  cost_usd_cents: number;
  cost_usd_micros: number;
  cost_brl_cents: number;
  usd_brl_rate: number;
  rate_source: string;
  agents: AgentStats[];
  workflows: WorkflowStats[];
  models: ModelStats[];
  daily: DailyUsage[];
  top_users: { user_id: number; label: string; total_tokens: number; cost_usd_cents: number; cost_usd_micros: number; cost_brl_cents: number }[];
};

export type UserActivity = {
  period_days: number;
  total_events: number;
  by_type: { event_type: string; count: number }[];
  online_now: number;
};

export type AdminUserProgress = {
  progress_general: number;
  essay_average: number;
  best_essay_score: number;
  completed_lessons: number;
  correct_exercises_rate: number;
  essays_written: number;
  mastery_map: { competency: string; label: string; value: number }[];
  recurrent_errors: string[];
};

export type AdminUserLearningProfile = {
  weak_competencies: Record<string, number>;
  recurring_errors: string[];
  repertories_used: string[];
  recommendations: string[];
};

export type ContentQualityItem = {
  id: number;
  label: string;
  kind: "lesson" | "exercise" | "game";
};

export type ContentByIssueRow = {
  code: string;
  lessons: number;
  exercises: number;
  games: number;
};

export type AdminContentQuality = {
  lessons_without_target: ContentQualityItem[];
  exercises_without_target: ContentQualityItem[];
  games_without_target: ContentQualityItem[];
  unused_lessons: ContentQualityItem[];
  unused_exercises: ContentQualityItem[];
  unused_games: ContentQualityItem[];
  rejected_games: ContentQualityItem[];
  edited_games: ContentQualityItem[];
  content_by_issue: ContentByIssueRow[];
};

export type StudentHealthItem = {
  user_id: number;
  name: string;
  email: string;
};

export type RecommendationWithoutContentItem = {
  id: number;
  user_id: number;
  action_type: string;
  target_issue: string | null;
};

export type IssueWithoutProgressItem = {
  user_id: number;
  code: string;
  state: string;
  updated_at: string;
};

export type AdminAdaptiveHealth = {
  students_without_diagnosis: StudentHealthItem[];
  students_without_recommendation: StudentHealthItem[];
  recommendations_without_content: RecommendationWithoutContentItem[];
  issues_without_content: string[];
  issues_without_progress: IssueWithoutProgressItem[];
};

export type AdminUserAIUsage = {
  total_tokens: number;
  total_calls: number;
  error_calls: number;
  cost_usd_cents: number;
  cost_usd_micros: number;
  cost_brl_cents: number;
  usd_brl_rate: number;
  rate_source: string;
  agents: AgentStats[];
  daily: DailyUsage[];
};

export type AdminUserDetail = {
  user: AdminUser;
  progress: AdminUserProgress;
  learning_profile: AdminUserLearningProfile;
  ai_usage: AdminUserAIUsage;
};

export type GameQuestion = {
  id: string;
  prompt: string;
  options: string[];
  answer_index: number;
  explanation: string;
  status: "pending" | "approved";
};

export type AIGeneratedGame = {
  id: number;
  name: string;
  category: string;
  skill: string;
  difficulty: string;
  engine: string;
  questions: GameQuestion[];
  payload: Record<string, unknown> | null;
  description: string | null;
  thumbnail: string | null;
  estimated_time: string | null;
  status: "pending" | "approved" | "rejected" | "archived";
  admin_notes: string | null;
  targets: string[];
  edited_after_generation: boolean;
  created_at: string;
  reviewed_at: string | null;
};
