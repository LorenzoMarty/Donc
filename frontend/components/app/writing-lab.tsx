"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Brain, CheckCircle2, FlaskConical, Lightbulb, PenTool, Quote, Sparkles, Trophy, Wand2, XCircle, Zap } from "lucide-react";

import { ProgressTracker, XPRewardModal } from "@/components/app/achievements-system";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

type Suggestion = {
  category: string;
  items: { title: string; use: string; tag: string }[];
};

const defaultSuggestions: Suggestion[] = [
  {
    category: "Filosofia e sociologia",
    items: [
      { title: "Zygmunt Bauman", use: "Modernidade liquida para discutir relacoes instaveis e consumo de atencao.", tag: "sociedade" },
      { title: "Guy Debord", use: "Sociedade do Espetaculo para analisar midiatizacao e performance social.", tag: "midia" },
      { title: "Byung-Chul Han", use: "Sociedade do cansaco para falar de produtividade, autocobranca e burnout.", tag: "contemporaneo" },
    ],
  },
  {
    category: "Cultura pop e tecnologia",
    items: [
      { title: "Black Mirror", use: "Episodios sobre controle social, vigilancia, reputacao e dependencia digital.", tag: "serie" },
      { title: "Cambridge Analytica", use: "Caso real para manipulacao de dados, bolhas informacionais e eleicoes.", tag: "evento" },
      { title: "O Dilema das Redes", use: "Documentario sobre algoritmos, engajamento e economia da atencao.", tag: "documentario" },
    ],
  },
  {
    category: "Historia e direitos",
    items: [
      { title: "Constituicao de 1988", use: "Base para cidadania, dignidade, acesso a direitos e dever estatal.", tag: "lei" },
      { title: "Marco Civil da Internet", use: "Referencia para responsabilidade, privacidade e uso democratico da rede.", tag: "legislacao" },
      { title: "Iluminismo", use: "Valorizacao da razao, autonomia e educacao como emancipacao social.", tag: "historia" },
    ],
  },
];

const environmentSuggestions: Suggestion[] = [
  {
    category: "Pensadores",
    items: [
      { title: "Hans Jonas", use: "Principio responsabilidade para discutir dever etico com futuras geracoes.", tag: "etica" },
      { title: "Ulrich Beck", use: "Sociedade de risco para explicar consequencias globais da modernidade.", tag: "risco" },
      { title: "Milton Santos", use: "Globalizacao e desigualdade para relacionar territorio, consumo e cidadania.", tag: "brasil" },
    ],
  },
  {
    category: "Eventos e acordos",
    items: [
      { title: "Agenda 2030", use: "ODS como repertorio para sustentabilidade, educacao e reducao de desigualdades.", tag: "onu" },
      { title: "Acordo de Paris", use: "Cooperacao internacional contra mudancas climaticas.", tag: "clima" },
      { title: "Crise hidrica", use: "Exemplo brasileiro de gestao publica, consumo e impacto ambiental.", tag: "evento" },
    ],
  },
];

const connectiveCategories = [
  { title: "Introducao", items: ["Inicialmente", "Sob essa perspectiva", "Nesse contexto"] },
  { title: "Continuidade", items: ["Alem disso", "Ademais", "Outrossim"] },
  { title: "Contraste", items: ["Entretanto", "No entanto", "Todavia"] },
  { title: "Causa", items: ["Visto que", "Uma vez que", "Em virtude disso"] },
  { title: "Consequencia", items: ["Consequentemente", "Dessa forma", "Logo"] },
  { title: "Conclusao", items: ["Portanto", "Assim", "Em suma"] },
];

const connectiveRounds = [
  {
    text: "A tecnologia amplia o acesso a informacao. ___, tambem pode intensificar bolhas de opiniao.",
    options: ["Entretanto", "Portanto", "Inicialmente"],
    answer: "Entretanto",
    explanation: "A segunda ideia contrasta com a primeira, entao o conectivo adversativo e o mais forte.",
  },
  {
    text: "O Estado deve ampliar a educacao midiatica. ___, escolas e familias precisam orientar o uso critico das redes.",
    options: ["Alem disso", "Todavia", "Em suma"],
    answer: "Alem disso",
    explanation: "A frase soma uma nova acao ao mesmo eixo argumentativo.",
  },
  {
    text: "A proposta envolve governo, escolas e plataformas digitais. ___, torna-se possivel reduzir danos sem censurar usuarios.",
    options: ["Dessa forma", "Apesar disso", "Primeiramente"],
    answer: "Dessa forma",
    explanation: "O trecho apresenta uma consequencia da proposta anterior.",
  },
];

const puzzleRounds = [
  {
    title: "Complete a coesao",
    stem: "A manipulacao digital cresce quando usuarios desconhecem o funcionamento dos algoritmos. [blank] a educacao midiatica deve ser fortalecida nas escolas.",
    options: ["Portanto", "Embora", "Por outro lado"],
    answer: "Portanto",
    explanation: "A segunda frase conclui uma medida a partir do problema apresentado.",
  },
  {
    title: "Encaixe o repertorio",
    stem: "A serie [blank] evidencia como tecnologias podem modular comportamentos e transformar pessoas em produtos de engajamento.",
    options: ["Black Mirror", "Dom Casmurro", "Vidas Secas"],
    answer: "Black Mirror",
    explanation: "Black Mirror dialoga diretamente com controle tecnologico e vigilancia.",
  },
  {
    title: "Fortaleca a tese",
    stem: "A persistencia do problema ocorre pela omissao estatal e pela [blank], que dificultam uma cidadania digital plena.",
    options: ["baixa alfabetizacao midiatica", "valorizacao da leitura", "expansao do transporte"],
    answer: "baixa alfabetizacao midiatica",
    explanation: "A lacuna precisa manter relacao direta com o tema e com a causa argumentativa.",
  },
];

const argumentRounds = [
  {
    question: "Qual argumento e mais forte para defender educacao midiatica?",
    options: [
      "Algoritmos priorizam engajamento, logo o aluno precisa reconhecer vieses, fontes e interesses economicos por tras do conteudo.",
      "As redes sociais existem ha muitos anos e muitas pessoas usam todos os dias.",
      "A internet pode ser boa ou ruim dependendo de cada pessoa.",
    ],
    answer: 0,
    explanation: "O melhor argumento apresenta causa, consequencia e vocabulario analitico.",
  },
  {
    question: "Qual tese esta mais alinhada ao modelo ENEM?",
    options: [
      "A manipulacao nas redes e complexa e deve ser analisada por escola, Estado e plataformas.",
      "As redes sociais sao ruins e todo mundo deveria parar de usar.",
      "Hoje em dia a internet e muito popular no Brasil.",
    ],
    answer: 0,
    explanation: "A tese delimita problema e agentes sem cair em generalizacao.",
  },
];

export function RepertoireSuggestions({ themeTitle }: { themeTitle?: string }) {
  const suggestions = useMemo(() => {
    const title = themeTitle?.toLowerCase() ?? "";
    if (title.includes("ambient") || title.includes("clima") || title.includes("sustent")) return environmentSuggestions;
    return defaultSuggestions;
  }, [themeTitle]);

  return (
    <section className="space-y-4">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
        <div>
          <p className="text-xs font-black uppercase text-muted-foreground">Ajuda com repertorio</p>
          <h2 className="mt-1 text-2xl font-black tracking-normal">Banco inteligente por tema</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Use referencias com funcao argumentativa clara, nao como citacao solta.</p>
        </div>
        <Badge variant="secondary" className="w-fit gap-2">
          <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
          {themeTitle ? "Tema ativo" : "Tema geral"}
        </Badge>
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        {suggestions.map((group, groupIndex) => (
          <motion.div
            key={group.category}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: groupIndex * 0.06 }}
            className="rounded-lg border bg-card/82 p-4 shadow-sm"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="font-black">{group.category}</h3>
              <BookOpen className="h-4 w-4 text-secondary" aria-hidden="true" />
            </div>
            <div className="space-y-3">
              {group.items.map((item) => (
                <div key={item.title} className="rounded-lg border bg-background/54 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-sm font-black">{item.title}</p>
                    <span className="rounded-md bg-accent/12 px-2 py-1 text-[11px] font-black text-accent">{item.tag}</span>
                  </div>
                  <p className="text-xs leading-5 text-muted-foreground">{item.use}</p>
                </div>
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

export function ConnectiveGame() {
  const [round, setRound] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [resolved, setResolved] = useState(false);
  const [rewardOpen, setRewardOpen] = useState(false);
  const current = connectiveRounds[round % connectiveRounds.length];
  const correct = selected === current.answer;

  function confirm() {
    setResolved(true);
    if (correct) {
      incrementStorage("donk.essay.lab.connective.wins");
      setRewardOpen(true);
    }
  }

  function next() {
    setRound((value) => value + 1);
    setSelected(null);
    setResolved(false);
  }

  return (
    <section className="rounded-lg border bg-card/82 p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-muted-foreground">Mini game</p>
          <h2 className="mt-1 text-xl font-black tracking-normal">Acerte o conectivo</h2>
        </div>
        <div className="rounded-lg bg-secondary/18 p-3 text-secondary">
          <Zap className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
      <div className="rounded-lg border bg-background/58 p-4">
        <p className="text-sm leading-7">{current.text}</p>
      </div>
      <div className="mt-4 grid gap-2">
        {current.options.map((option) => {
          const active = selected === option;
          const isCorrect = resolved && option === current.answer;
          const isWrong = resolved && active && !correct;
          return (
            <button
              type="button"
              key={option}
              disabled={resolved}
              onClick={() => setSelected(option)}
              className={cn(
                "flex min-h-12 items-center justify-between rounded-lg border bg-background/54 px-3 text-left text-sm font-bold transition-all hover:-translate-y-0.5 hover:bg-muted/64",
                active && "border-primary bg-primary/8",
                isCorrect && "border-accent bg-accent/12 text-accent",
                isWrong && "border-destructive bg-destructive/10 text-destructive",
              )}
            >
              {option}
              {isCorrect && <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
              {isWrong && <XCircle className="h-4 w-4" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
      {resolved && (
        <div className={cn("mt-4 rounded-lg border p-3 text-sm leading-6", correct ? "bg-accent/10" : "bg-destructive/10")}>
          <p className="font-black">{correct ? "Combo mantido" : "Quase. Revise a relacao logica."}</p>
          <p className="mt-1 text-muted-foreground">{current.explanation}</p>
        </div>
      )}
      <Button className="mt-4 w-full" disabled={!selected} onClick={resolved ? next : confirm}>
        {resolved ? "Proximo trecho" : "Confirmar"}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Button>
      <XPRewardModal
        open={rewardOpen}
        title="Conectivo dominado"
        description="Voce escolheu o operador argumentativo correto e fortaleceu a coesao."
        xp={35}
        rarity="rara"
        onClose={() => setRewardOpen(false)}
      />
    </section>
  );
}

export function EssayPuzzle() {
  const [round, setRound] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [resolved, setResolved] = useState(false);
  const [rewardOpen, setRewardOpen] = useState(false);
  const current = puzzleRounds[round % puzzleRounds.length];
  const correct = selected === current.answer;

  function confirm() {
    setResolved(true);
    if (correct) {
      incrementStorage("donk.essay.lab.puzzle.wins");
      setRewardOpen(true);
    }
  }

  function next() {
    setRound((value) => value + 1);
    setSelected(null);
    setResolved(false);
  }

  return (
    <section className="rounded-lg border bg-card/82 p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-muted-foreground">Complete a redacao</p>
          <h2 className="mt-1 text-xl font-black tracking-normal">{current.title}</h2>
        </div>
        <div className="rounded-lg bg-accent/12 p-3 text-accent">
          <PenTool className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
      <div className="rounded-lg border bg-background/58 p-4 text-sm leading-7">
        {current.stem.split("[blank]").map((part, index, parts) => (
          <span key={`${part}-${index}`}>
            {part}
            {index < parts.length - 1 && (
              <span className="mx-1 inline-flex min-w-24 justify-center rounded-md border border-dashed bg-muted px-2 py-1 text-xs font-black text-muted-foreground">
                {selected ?? "lacuna"}
              </span>
            )}
          </span>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {current.options.map((option) => (
          <button
            type="button"
            key={option}
            disabled={resolved}
            onClick={() => setSelected(option)}
            className={cn(
              "rounded-md border bg-background/62 px-3 py-2 text-sm font-bold transition-all hover:-translate-y-0.5 hover:bg-muted",
              selected === option && "border-primary bg-primary/8",
              resolved && option === current.answer && "border-accent bg-accent/12 text-accent",
            )}
          >
            {option}
          </button>
        ))}
      </div>
      {resolved && (
        <div className={cn("mt-4 rounded-lg border p-3 text-sm leading-6", correct ? "bg-accent/10" : "bg-destructive/10")}>
          <p className="font-black">{correct ? "Encaixe perfeito" : "A lacuna perdeu coesao"}</p>
          <p className="mt-1 text-muted-foreground">{current.explanation}</p>
        </div>
      )}
      <Button className="mt-4 w-full" disabled={!selected} onClick={resolved ? next : confirm}>
        {resolved ? "Novo puzzle" : "Verificar encaixe"}
      </Button>
      <XPRewardModal
        open={rewardOpen}
        title="Peca encaixada"
        description="Voce completou a estrutura com coerencia e progressao textual."
        xp={45}
        rarity="epica"
        onClose={() => setRewardOpen(false)}
      />
    </section>
  );
}

export function EssayAnalysisViewer() {
  const annotations = [
    { label: "Tese", className: "bg-primary/10 text-primary", text: "A manipulacao nas redes sociais compromete a autonomia dos usuarios" },
    { label: "Repertorio", className: "bg-secondary/16 text-secondary", text: "como evidencia o caso Cambridge Analytica" },
    { label: "Conectivo", className: "bg-accent/12 text-accent", text: "Alem disso" },
    { label: "Intervencao", className: "bg-muted text-foreground", text: "o Ministerio da Educacao deve ampliar programas de letramento midiatico" },
  ];

  return (
    <section className="rounded-lg border bg-card/82 p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-muted-foreground">Modo analise</p>
          <h2 className="mt-1 text-xl font-black tracking-normal">Redacao anotada</h2>
        </div>
        <div className="rounded-lg bg-primary/12 p-3 text-primary">
          <FlaskConical className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
      <div className="rounded-lg border bg-background/58 p-4 text-sm leading-8">
        <span className="rounded-md bg-primary/10 px-1.5 py-1 font-semibold text-primary">A manipulacao nas redes sociais compromete a autonomia dos usuarios</span>, pois algoritmos priorizam conteudos capazes de reter atencao.
        <span className="mx-1 rounded-md bg-secondary/16 px-1.5 py-1 font-semibold text-secondary">Como evidencia o caso Cambridge Analytica</span>, dados pessoais podem orientar mensagens e influenciar decisoes coletivas.
        <span className="mx-1 rounded-md bg-accent/12 px-1.5 py-1 font-semibold text-accent">Alem disso</span>, a falta de educacao midiatica reduz a capacidade critica dos jovens.
        Portanto,
        <span className="mx-1 rounded-md bg-muted px-1.5 py-1 font-semibold text-foreground">o Ministerio da Educacao deve ampliar programas de letramento midiatico</span>
        por meio de aulas e campanhas permanentes.
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {annotations.map((annotation) => (
          <div key={annotation.label} className="rounded-lg border bg-background/54 p-3">
            <span className={cn("rounded-md px-2 py-1 text-[11px] font-black uppercase", annotation.className)}>{annotation.label}</span>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{annotation.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function WritingLevelSystem({ content, score }: { content: string; score?: number | null }) {
  const metrics = useMemo(() => computeWritingMetrics(content, score), [content, score]);

  return (
    <section className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr]">
      <div className="relative overflow-hidden rounded-lg border bg-primary p-5 text-primary-foreground shadow-premium">
        <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,.16),transparent_44%),radial-gradient(circle_at_85%_15%,rgba(201,162,39,.28),transparent_14rem)]" />
        <div className="relative">
          <div className="mb-4 inline-flex items-center gap-2 rounded-md bg-white/12 px-3 py-1 text-xs font-black text-white/76">
            <Wand2 className="h-3.5 w-3.5 text-secondary" aria-hidden="true" />
            Evolucao de escrita
          </div>
          <p className="text-4xl font-black tracking-normal">Nivel {metrics.level}</p>
          <p className="mt-3 text-sm leading-6 text-white/74">Sua escrita sobe de nivel ao combinar volume, coesao, repertorio e competencia argumentativa.</p>
          <div className="mt-5">
            <div className="mb-2 flex items-center justify-between text-xs">
              <span className="font-bold text-white/70">Proximo nivel</span>
              <span className="font-black text-secondary">{metrics.overall}%</span>
            </div>
            <Progress value={metrics.overall} className="bg-white/16" />
          </div>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <ProgressTracker title="Coesao" value={`Nivel ${metrics.cohesionLevel}`} progress={metrics.cohesion} icon={Zap} tone="accent" />
        <ProgressTracker title="Argumentacao" value={`Nivel ${metrics.argumentLevel}`} progress={metrics.argumentation} icon={Brain} tone="primary" />
        <ProgressTracker title="Repertorio" value={`Nivel ${metrics.repertoireLevel}`} progress={metrics.repertoire} icon={Quote} tone="gold" />
        <ProgressTracker title="Competencia geral" value={score ? `${score}` : "Rascunho"} progress={score ? score / 10 : metrics.overall} icon={Trophy} tone="gold" />
      </div>
    </section>
  );
}

export function ArgumentChallenge() {
  const [round, setRound] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [resolved, setResolved] = useState(false);
  const [rewardOpen, setRewardOpen] = useState(false);
  const current = argumentRounds[round % argumentRounds.length];
  const correct = selected === current.answer;

  function confirm() {
    setResolved(true);
    if (correct) {
      incrementStorage("donk.essay.lab.argument.wins");
      setRewardOpen(true);
    }
  }

  function next() {
    setRound((value) => value + 1);
    setSelected(null);
    setResolved(false);
  }

  return (
    <section className="rounded-lg border bg-card/82 p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-muted-foreground">Treino de argumentacao</p>
          <h2 className="mt-1 text-xl font-black tracking-normal">Qual argumento vence?</h2>
        </div>
        <div className="rounded-lg bg-primary/12 p-3 text-primary">
          <Brain className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
      <p className="rounded-lg border bg-background/58 p-4 text-sm font-bold leading-6">{current.question}</p>
      <div className="mt-4 space-y-3">
        {current.options.map((option, index) => {
          const active = selected === index;
          const isCorrect = resolved && index === current.answer;
          const isWrong = resolved && active && !correct;
          return (
            <button
              type="button"
              key={option}
              disabled={resolved}
              onClick={() => setSelected(index)}
              className={cn(
                "w-full rounded-lg border bg-background/54 p-3 text-left text-sm leading-6 transition-all hover:-translate-y-0.5 hover:bg-muted/64",
                active && "border-primary bg-primary/8",
                isCorrect && "border-accent bg-accent/12",
                isWrong && "border-destructive bg-destructive/10",
              )}
            >
              {option}
            </button>
          );
        })}
      </div>
      {resolved && (
        <div className={cn("mt-4 rounded-lg border p-3 text-sm leading-6", correct ? "bg-accent/10" : "bg-destructive/10")}>
          <p className="font-black">{correct ? "Argumento mais forte" : "Esse argumento esta fraco"}</p>
          <p className="mt-1 text-muted-foreground">{current.explanation}</p>
        </div>
      )}
      <Button className="mt-4 w-full" disabled={selected === null} onClick={resolved ? next : confirm}>
        {resolved ? "Novo desafio" : "Confirmar escolha"}
      </Button>
      <XPRewardModal
        open={rewardOpen}
        title="Argumentacao evoluiu"
        description="Voce escolheu a tese mais especifica, defensavel e adequada ao ENEM."
        xp={50}
        rarity="epica"
        onClose={() => setRewardOpen(false)}
      />
    </section>
  );
}

export function ConnectiveLibrary() {
  return (
    <section className="rounded-lg border bg-card/82 p-4 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-muted-foreground">Banco de conectivos</p>
          <h2 className="mt-1 text-xl font-black tracking-normal">Operadores por funcao</h2>
        </div>
        <Lightbulb className="h-5 w-5 text-secondary" aria-hidden="true" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {connectiveCategories.map((category) => (
          <div key={category.title} className="rounded-lg border bg-background/54 p-3">
            <p className="mb-2 text-sm font-black">{category.title}</p>
            <div className="flex flex-wrap gap-2">
              {category.items.map((item) => (
                <span key={item} className="rounded-md bg-muted px-2 py-1 text-xs font-bold text-muted-foreground">
                  {item}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function computeWritingMetrics(content: string, score?: number | null) {
  const normalized = content.toLowerCase();
  const words = normalized.trim() ? normalized.trim().split(/\s+/).length : 0;
  const connectives = connectiveCategories.flatMap((category) => category.items).filter((item) => normalized.includes(item.toLowerCase())).length;
  const repertories = ["bauman", "black mirror", "cambridge analytica", "constituicao", "debord", "byung-chul", "milton santos"].filter((item) =>
    normalized.includes(item),
  ).length;
  const interventionSignals = ["ministerio", "governo", "escola", "campanha", "deve", "por meio"].filter((item) => normalized.includes(item)).length;

  const cohesion = Math.min(100, connectives * 18 + words / 8);
  const argumentation = Math.min(100, words / 3.2 + interventionSignals * 9);
  const repertoire = Math.min(100, repertories * 28 + words / 10);
  const scoreProgress = score ? score / 10 : 0;
  const overall = Math.round((cohesion + argumentation + repertoire + scoreProgress) / 4);

  return {
    level: Math.max(1, Math.floor(overall / 14) + 1),
    overall,
    cohesion,
    argumentation,
    repertoire,
    cohesionLevel: Math.max(1, Math.floor(cohesion / 16) + 1),
    argumentLevel: Math.max(1, Math.floor(argumentation / 16) + 1),
    repertoireLevel: Math.max(1, Math.floor(repertoire / 16) + 1),
  };
}

function incrementStorage(key: string) {
  if (typeof window === "undefined") return;
  const next = Number(window.localStorage.getItem(key) ?? "0") + 1;
  window.localStorage.setItem(key, String(next));
  window.dispatchEvent(new StorageEvent("storage", { key, newValue: String(next) }));
}
