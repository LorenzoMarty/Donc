"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Brain, CheckCircle2, FlaskConical, Lightbulb, PenTool, Sparkles, XCircle, Zap } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/utils";

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
      { title: "Byung-Chul Han", use: "Sociedade do cansaco para falar de produtividade e esgotamento.", tag: "contemporaneo" },
    ],
  },
  {
    category: "Tecnologia",
    items: [
      { title: "Black Mirror", use: "Serie util para discutir controle tecnologico, reputacao e vigilancia.", tag: "serie" },
      { title: "Cambridge Analytica", use: "Caso real para manipulacao de dados, bolhas e eleicoes.", tag: "evento" },
      { title: "O Dilema das Redes", use: "Documentario sobre algoritmos, engajamento e economia da atencao.", tag: "documentario" },
    ],
  },
  {
    category: "Direitos",
    items: [
      { title: "Constituicao de 1988", use: "Base para cidadania, dignidade, acesso a direitos e dever estatal.", tag: "lei" },
      { title: "Marco Civil da Internet", use: "Referencia para responsabilidade, privacidade e uso democratico da rede.", tag: "legislacao" },
      { title: "Iluminismo", use: "Valoriza razao, autonomia e educacao como emancipacao social.", tag: "historia" },
    ],
  },
];

const environmentSuggestions: Suggestion[] = [
  {
    category: "Pensadores",
    items: [
      { title: "Hans Jonas", use: "Principio responsabilidade para discutir dever etico com futuras geracoes.", tag: "etica" },
      { title: "Ulrich Beck", use: "Sociedade de risco para explicar consequencias globais da modernidade.", tag: "risco" },
      { title: "Milton Santos", use: "Globalizacao e desigualdade para relacionar territorio e cidadania.", tag: "brasil" },
    ],
  },
  {
    category: "Eventos",
    items: [
      { title: "Agenda 2030", use: "ODS como repertorio para sustentabilidade, educacao e reducao de desigualdades.", tag: "ONU" },
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
    explanation: "A segunda ideia contrasta com a primeira; o conectivo adversativo e o mais adequado.",
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
      "A manipulacao nas redes e complexa e deve ser enfrentada por escola, Estado e plataformas.",
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
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Repertorio</p>
          <h2 className="mt-1 text-2xl font-semibold tracking-normal">Referencias com funcao argumentativa</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Use apenas o que ajuda a provar a tese.</p>
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
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: groupIndex * 0.04, duration: 0.22 }}
            className="game-surface bg-card/82 p-4"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="font-semibold">{group.category}</h3>
              <BookOpen className="h-4 w-4 text-secondary" aria-hidden="true" />
            </div>
            <div className="space-y-3">
              {group.items.map((item) => (
                <div key={item.title} className="game-tile bg-background/54 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-sm font-semibold">{item.title}</p>
                    <span className="game-chip bg-primary/8 px-2 py-1 text-[11px] font-semibold text-muted-foreground">{item.tag}</span>
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
  const current = connectiveRounds[round % connectiveRounds.length];
  const correct = selected === current.answer;

  function confirm() {
    setResolved(true);
    if (correct) incrementStorage("donk.essay.lab.connective.wins");
  }

  function next() {
    setRound((value) => value + 1);
    setSelected(null);
    setResolved(false);
  }

  return (
    <LabCard eyebrow="Coesao" title="Acerte o conectivo" icon={Zap}>
      <div className="game-tile bg-background/58 p-4">
        <p className="text-sm leading-7">{current.text}</p>
      </div>
      <div className="mt-4 grid gap-2">
        {current.options.map((option) => (
          <OptionButton key={option} label={option} active={selected === option} disabled={resolved} correct={resolved && option === current.answer} wrong={resolved && selected === option && !correct} onClick={() => setSelected(option)} />
        ))}
      </div>
      <Feedback resolved={resolved} correct={correct} success="Conectivo adequado" error="Relacao logica imprecisa" explanation={current.explanation} />
      <Button className="mt-4 w-full" disabled={!selected} onClick={resolved ? next : confirm}>
        {resolved ? "Proximo trecho" : "Confirmar"}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Button>
    </LabCard>
  );
}

export function EssayPuzzle() {
  const [round, setRound] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [resolved, setResolved] = useState(false);
  const current = puzzleRounds[round % puzzleRounds.length];
  const correct = selected === current.answer;

  function confirm() {
    setResolved(true);
    if (correct) incrementStorage("donk.essay.lab.puzzle.wins");
  }

  function next() {
    setRound((value) => value + 1);
    setSelected(null);
    setResolved(false);
  }

  return (
    <LabCard eyebrow="Estrutura" title={current.title} icon={PenTool}>
      <div className="game-tile bg-background/58 p-4 text-sm leading-7">
        {current.stem.split("[blank]").map((part, index, parts) => (
          <span key={`${part}-${index}`}>
            {part}
            {index < parts.length - 1 && <span className="mx-1 inline-flex min-w-24 justify-center rounded-md border border-dashed border-border bg-muted/70 px-2 py-1 text-xs font-semibold text-muted-foreground">{selected ?? "lacuna"}</span>}
          </span>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        {current.options.map((option) => (
          <OptionButton key={option} label={option} active={selected === option} disabled={resolved} correct={resolved && option === current.answer} onClick={() => setSelected(option)} compact />
        ))}
      </div>
      <Feedback resolved={resolved} correct={correct} success="Encaixe coerente" error="A lacuna perdeu coesao" explanation={current.explanation} />
      <Button className="mt-4 w-full" disabled={!selected} onClick={resolved ? next : confirm}>
        {resolved ? "Novo desafio" : "Verificar encaixe"}
      </Button>
    </LabCard>
  );
}

export function EssayAnalysisViewer() {
  const annotations = [
    { label: "Tese", text: "Problema delimitado e defensavel." },
    { label: "Repertorio", text: "Referencia conectada ao argumento." },
    { label: "Conectivo", text: "Progressao logica entre ideias." },
    { label: "Intervencao", text: "Agente, acao, meio e finalidade." },
  ];

  return (
    <LabCard eyebrow="Analise" title="Redacao anotada" icon={FlaskConical}>
      <div className="game-tile bg-background/58 p-4 text-sm leading-8">
        <Marked> A manipulacao nas redes sociais compromete a autonomia dos usuarios </Marked>
        pois algoritmos priorizam conteudos capazes de reter atencao.
        <Marked> Como evidencia o caso Cambridge Analytica </Marked>
        dados pessoais podem orientar mensagens e influenciar decisoes coletivas.
        <Marked> Alem disso </Marked>
        a falta de educacao midiatica reduz a capacidade critica dos jovens.
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {annotations.map((annotation) => (
          <div key={annotation.label} className="game-tile bg-background/54 p-3">
            <span className="game-chip bg-primary/8 px-2 py-1 text-[11px] font-semibold text-primary">{annotation.label}</span>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{annotation.text}</p>
          </div>
        ))}
      </div>
    </LabCard>
  );
}

export function ArgumentChallenge() {
  const [round, setRound] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [resolved, setResolved] = useState(false);
  const current = argumentRounds[round % argumentRounds.length];
  const correct = selected === current.answer;

  function confirm() {
    setResolved(true);
    if (correct) incrementStorage("donk.essay.lab.argument.wins");
  }

  function next() {
    setRound((value) => value + 1);
    setSelected(null);
    setResolved(false);
  }

  return (
    <LabCard eyebrow="Argumentacao" title="Qual argumento vence?" icon={Brain}>
      <p className="game-tile bg-background/58 p-4 text-sm font-semibold leading-6">{current.question}</p>
      <div className="mt-4 space-y-3">
        {current.options.map((option, index) => (
          <OptionButton key={option} label={option} active={selected === index} disabled={resolved} correct={resolved && index === current.answer} wrong={resolved && selected === index && !correct} onClick={() => setSelected(index)} />
        ))}
      </div>
      <Feedback resolved={resolved} correct={correct} success="Argumento mais forte" error="Argumento pouco especifico" explanation={current.explanation} />
      <Button className="mt-4 w-full" disabled={selected === null} onClick={resolved ? next : confirm}>
        {resolved ? "Novo desafio" : "Confirmar escolha"}
      </Button>
    </LabCard>
  );
}

export function ConnectiveLibrary() {
  return (
    <LabCard eyebrow="Conectivos" title="Operadores por funcao" icon={Lightbulb}>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {connectiveCategories.map((category) => (
          <div key={category.title} className="game-tile bg-background/54 p-3">
            <p className="mb-2 text-sm font-semibold">{category.title}</p>
            <div className="flex flex-wrap gap-2">
              {category.items.map((item) => (
                <span key={item} className="game-chip bg-muted/70 px-2 py-1 text-xs font-medium text-muted-foreground">
                  {item}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </LabCard>
  );
}

function LabCard({ eyebrow, title, icon: Icon, children }: { eyebrow: string; title: string; icon: typeof Zap; children: React.ReactNode }) {
  return (
    <section className="game-surface bg-card/82 p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">{eyebrow}</p>
          <h2 className="mt-1 text-xl font-semibold tracking-normal">{title}</h2>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-md border border-primary/25 bg-primary/12 text-primary">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
      {children}
    </section>
  );
}

function OptionButton({
  label,
  active,
  disabled,
  correct,
  wrong,
  compact,
  onClick,
}: {
  label: string;
  active: boolean;
  disabled: boolean;
  correct?: boolean;
  wrong?: boolean;
  compact?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "game-tile flex items-center justify-between bg-background/54 text-left text-sm font-medium transition-all hover:bg-muted/64",
        compact ? "px-3 py-2" : "min-h-12 px-3",
        active && "bg-primary/20",
        correct && "bg-primary/12 text-primary",
        wrong && "bg-destructive/10 text-red-700",
      )}
    >
      {label}
      {correct && <CheckCircle2 className="h-4 w-4" aria-hidden="true" />}
      {wrong && <XCircle className="h-4 w-4" aria-hidden="true" />}
    </button>
  );
}

function Feedback({ resolved, correct, success, error, explanation }: { resolved: boolean; correct: boolean; success: string; error: string; explanation: string }) {
  if (!resolved) return null;
  return (
    <div className={cn("game-tile mt-4 p-3 text-sm leading-6", correct ? "bg-primary/10" : "bg-destructive/10")}>
      <p className="font-semibold">{correct ? success : error}</p>
      <p className="mt-1 text-muted-foreground">{explanation}</p>
    </div>
  );
}

function Marked({ children }: { children: React.ReactNode }) {
  return <span className="rounded-md border border-primary/20 bg-primary/10 px-1.5 py-1 font-semibold text-primary">{children}</span>;
}

function incrementStorage(key: string) {
  if (typeof window === "undefined") return;
  const next = Number(window.localStorage.getItem(key) ?? "0") + 1;
  window.localStorage.setItem(key, String(next));
  window.dispatchEvent(new StorageEvent("storage", { key, newValue: String(next) }));
}
