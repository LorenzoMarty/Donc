export type AchievementCategory = "progressao" | "redacao" | "streak" | "dominio" | "secreta" | "platina";
type AchievementRarity = "comum" | "rara" | "epica" | "lendaria" | "platina";

export type AchievementMetrics = {
  completedExercises: number;
  totalExercises: number;
  completedTracks: number;
  level: number;
  xp: number;
  streakDays: number;
  essaysWritten: number;
  correctedEssays: number;
  bestEssayScore: number;
  averageEssayScore: number;
  connectiveWins: number;
  puzzleWins: number;
  argumentWins: number;
};

type AchievementDefinition = {
  id: string;
  title: string;
  description: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  target: number;
  metric: keyof AchievementMetrics;
  xp: number;
  icon: "trophy" | "pen" | "flame" | "target" | "brain" | "crown" | "shield" | "gem" | "book" | "zap";
  secret?: boolean;
};

export type AchievementProgress = AchievementDefinition & {
  current: number;
  progress: number;
  unlocked: boolean;
};

const catalog: AchievementDefinition[] = [
  {
    id: "primeira-fase",
    title: "Primeira fase",
    description: "Conclua sua primeira etapa de exercicios.",
    category: "progressao",
    rarity: "comum",
    target: 1,
    metric: "completedExercises",
    xp: 40,
    icon: "zap",
  },
  {
    id: "dez-exercicios",
    title: "Aquecimento serio",
    description: "Complete 10 exercicios em trilhas do ENEM.",
    category: "progressao",
    rarity: "comum",
    target: 10,
    metric: "completedExercises",
    xp: 90,
    icon: "target",
  },
  {
    id: "cem-questoes",
    title: "Maratonista de questoes",
    description: "Complete 100 questoes e prove consistencia.",
    category: "progressao",
    rarity: "epica",
    target: 100,
    metric: "completedExercises",
    xp: 360,
    icon: "trophy",
  },
  {
    id: "nivel-dez",
    title: "Consistencia 10",
    description: "Alcance o marco 10 de consistencia.",
    category: "progressao",
    rarity: "rara",
    target: 10,
    metric: "level",
    xp: 180,
    icon: "shield",
  },
  {
    id: "trilha-finalizada",
    title: "Trilha finalizada",
    description: "Conclua uma sequencia completa ate o desafio final.",
    category: "progressao",
    rarity: "rara",
    target: 1,
    metric: "completedTracks",
    xp: 220,
    icon: "book",
  },
  {
    id: "primeira-redacao",
    title: "Primeiro rascunho serio",
    description: "Registre sua primeira redacao no laboratorio.",
    category: "redacao",
    rarity: "comum",
    target: 1,
    metric: "essaysWritten",
    xp: 70,
    icon: "pen",
  },
  {
    id: "redacao-900",
    title: "Radar dos 900",
    description: "Tire 900 ou mais em uma redacao corrigida.",
    category: "redacao",
    rarity: "epica",
    target: 900,
    metric: "bestEssayScore",
    xp: 420,
    icon: "brain",
  },
  {
    id: "redacao-1000",
    title: "Mil absoluto",
    description: "Alcance nota 1000 em uma redacao ENEM.",
    category: "redacao",
    rarity: "lendaria",
    target: 1000,
    metric: "bestEssayScore",
    xp: 1000,
    icon: "crown",
  },
  {
    id: "trinta-redacoes",
    title: "Oficina imparavel",
    description: "Produza 30 redacoes ao longo da preparacao.",
    category: "redacao",
    rarity: "lendaria",
    target: 30,
    metric: "essaysWritten",
    xp: 700,
    icon: "pen",
  },
  {
    id: "sete-dias",
    title: "Semana blindada",
    description: "Estude por 7 dias seguidos.",
    category: "streak",
    rarity: "rara",
    target: 7,
    metric: "streakDays",
    xp: 140,
    icon: "flame",
  },
  {
    id: "trinta-dias",
    title: "Rotina de elite",
    description: "Mantenha uma sequencia de 30 dias.",
    category: "streak",
    rarity: "epica",
    target: 30,
    metric: "streakDays",
    xp: 520,
    icon: "flame",
  },
  {
    id: "cem-dias",
    title: "Constancia lendaria",
    description: "Chegue a 100 dias seguidos de estudo.",
    category: "streak",
    rarity: "lendaria",
    target: 100,
    metric: "streakDays",
    xp: 1100,
    icon: "crown",
  },
  {
    id: "rei-conectivos",
    title: "Rei dos conectivos",
    description: "Venca 10 rodadas na pratica de conectivos.",
    category: "dominio",
    rarity: "rara",
    target: 10,
    metric: "connectiveWins",
    xp: 210,
    icon: "zap",
  },
  {
    id: "mestre-coesao",
    title: "Mestre da coesao",
    description: "Complete 8 encaixes de redacao com ordem correta.",
    category: "dominio",
    rarity: "epica",
    target: 8,
    metric: "puzzleWins",
    xp: 330,
    icon: "gem",
  },
  {
    id: "mestre-argumentacao",
    title: "Mestre da argumentacao",
    description: "Acerte 8 desafios de tese e desenvolvimento.",
    category: "dominio",
    rarity: "epica",
    target: 8,
    metric: "argumentWins",
    xp: 330,
    icon: "brain",
  },
  {
    id: "media-850",
    title: "Consistencia de banca",
    description: "Mantenha media igual ou superior a 850.",
    category: "dominio",
    rarity: "epica",
    target: 850,
    metric: "averageEssayScore",
    xp: 450,
    icon: "shield",
  },
  {
    id: "secreto-cambridge",
    title: "Investigador de repertorio",
    description: "Use o laboratorio ate encontrar uma referencia estrategica rara.",
    category: "secreta",
    rarity: "rara",
    target: 4,
    metric: "puzzleWins",
    xp: 180,
    icon: "gem",
    secret: true,
  },
  {
    id: "secreto-combo",
    title: "Ritmo invisivel",
    description: "Some vitorias em conectivos e argumentacao para liberar um marco oculto.",
    category: "secreta",
    rarity: "epica",
    target: 14,
    metric: "connectiveWins",
    xp: 400,
    icon: "gem",
    secret: true,
  },
];

const categoryLabels: Record<AchievementCategory, string> = {
  progressao: "Progressao",
  redacao: "Redacao",
  streak: "Sequencia",
  dominio: "Dominio",
  secreta: "Secretas",
  platina: "Platina",
};

export const achievementCategories = Object.entries(categoryLabels).map(([id, label]) => ({ id: id as AchievementCategory, label }));

export function buildAchievements(metrics: AchievementMetrics): AchievementProgress[] {
  const regular = catalog.map((achievement) => {
    const current = Math.max(0, Number(metrics[achievement.metric]) || 0);
    return toProgress(achievement, current);
  });

  const secretComboIndex = regular.findIndex((achievement) => achievement.id === "secreto-combo");
  if (secretComboIndex >= 0) {
    const current = metrics.connectiveWins + metrics.argumentWins;
    regular[secretComboIndex] = toProgress(catalog.find((item) => item.id === "secreto-combo")!, current);
  }

  const platinumDefinition: AchievementDefinition = {
    id: "platina-donc",
    title: "Platina Donc ENEM",
    description: "Complete todas as conquistas, domine trilhas e prove excelencia em redacao.",
    category: "platina",
    rarity: "platina",
    target: regular.length,
    metric: "completedExercises",
    xp: 2500,
    icon: "crown",
  };

  return [...regular, toProgress(platinumDefinition, regular.filter((achievement) => achievement.unlocked).length)];
}

function toProgress(achievement: AchievementDefinition, current: number): AchievementProgress {
  return {
    ...achievement,
    current,
    progress: Math.max(0, Math.min(100, (current / Math.max(1, achievement.target)) * 100)),
    unlocked: current >= achievement.target,
  };
}
