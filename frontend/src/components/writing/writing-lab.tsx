"use client";

import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, BookOpen, Brain, CheckCircle2, FlaskConical, Lightbulb, PenTool, Sparkles, XCircle, Zap } from "lucide-react";

import { XPRewardModal } from "@/components/game/achievements-system";
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
      { title: "Zygmunt Bauman", use: "Modernidade líquida para discutir relações instáveis e consumo de atenção.", tag: "sociedade" },
      { title: "Guy Debord", use: "Sociedade do Espetáculo para analisar midiatização e performance social.", tag: "mídia" },
      { title: "Byung-Chul Han", use: "Sociedade do cansaço para falar de produtividade, autocobrança e esgotamento.", tag: "contemporâneo" },
    ],
  },
  {
    category: "Cultura pop e tecnologia",
    items: [
      { title: "Black Mirror", use: "Episódios sobre controle social, vigilância, reputação e dependência digital.", tag: "série" },
      { title: "Cambridge Analytica", use: "Caso real para manipulação de dados, bolhas informacionais e eleições.", tag: "evento" },
      { title: "O Dilema das Redes", use: "Documentário sobre algoritmos, engajamento e economia da atenção.", tag: "documentário" },
    ],
  },
  {
    category: "História e direitos",
    items: [
      { title: "Constituição de 1988", use: "Base para cidadania, dignidade, acesso a direitos e dever estatal.", tag: "lei" },
      { title: "Marco Civil da Internet", use: "Referência para responsabilidade, privacidade e uso democrático da rede.", tag: "legislação" },
      { title: "Iluminismo", use: "Valorização da razão, autonomia e educação como emancipação social.", tag: "história" },
    ],
  },
];

const environmentSuggestions: Suggestion[] = [
  {
    category: "Pensadores",
    items: [
      { title: "Hans Jonas", use: "Princípio responsabilidade para discutir dever ético com futuras gerações.", tag: "ética" },
      { title: "Ulrich Beck", use: "Sociedade de risco para explicar consequências globais da modernidade.", tag: "risco" },
      { title: "Milton Santos", use: "Globalização e desigualdade para relacionar território, consumo e cidadania.", tag: "brasil" },
    ],
  },
  {
    category: "Eventos e acordos",
    items: [
      { title: "Agenda 2030", use: "ODS como repertório para sustentabilidade, educação e redução de desigualdades.", tag: "ONU" },
      { title: "Acordo de Paris", use: "Cooperação internacional contra mudanças climáticas.", tag: "clima" },
      { title: "Crise hídrica", use: "Exemplo brasileiro de gestão pública, consumo e impacto ambiental.", tag: "evento" },
    ],
  },
];

const connectiveCategories = [
  { title: "Introdução", items: ["Inicialmente", "Sob essa perspectiva", "Nesse contexto"] },
  { title: "Continuidade", items: ["Além disso", "Ademais", "Outrossim"] },
  { title: "Contraste", items: ["Entretanto", "No entanto", "Todavia"] },
  { title: "Causa", items: ["Visto que", "Uma vez que", "Em virtude disso"] },
  { title: "Consequência", items: ["Consequentemente", "Dessa forma", "Logo"] },
  { title: "Conclusão", items: ["Portanto", "Assim", "Em suma"] },
];

const connectiveRounds = [
  {
    text: "A tecnologia amplia o acesso à informação. ___, também pode intensificar bolhas de opinião.",
    options: ["Entretanto", "Portanto", "Inicialmente"],
    answer: "Entretanto",
    explanation: "A segunda ideia contrasta com a primeira, então o conectivo adversativo é o mais forte.",
  },
  {
    text: "O Estado deve ampliar a educação midiática. ___, escolas e famílias precisam orientar o uso crítico das redes.",
    options: ["Além disso", "Todavia", "Em suma"],
    answer: "Além disso",
    explanation: "A frase soma uma nova ação ao mesmo eixo argumentativo.",
  },
  {
    text: "A proposta envolve governo, escolas e plataformas digitais. ___, torna-se possível reduzir danos sem censurar usuários.",
    options: ["Dessa forma", "Apesar disso", "Primeiramente"],
    answer: "Dessa forma",
    explanation: "O trecho apresenta uma consequência da proposta anterior.",
  },
];

const puzzleRounds = [
  {
    title: "Complete a coesão",
    stem: "A manipulação digital cresce quando usuários desconhecem o funcionamento dos algoritmos. [blank] a educação midiática deve ser fortalecida nas escolas.",
    options: ["Portanto", "Embora", "Por outro lado"],
    answer: "Portanto",
    explanation: "A segunda frase conclui uma medida a partir do problema apresentado.",
  },
  {
    title: "Encaixe o repertório",
    stem: "A serie [blank] evidencia como tecnologias podem modular comportamentos e transformar pessoas em produtos de engajamento.",
    options: ["Black Mirror", "Dom Casmurro", "Vidas Secas"],
    answer: "Black Mirror",
    explanation: "Black Mirror dialoga diretamente com controle tecnológico e vigilância.",
  },
  {
    title: "Fortaleça a tese",
    stem: "A persistência do problema ocorre pela omissão estatal e pela [blank], que dificultam uma cidadania digital plena.",
    options: ["baixa alfabetização midiática", "valorização da leitura", "expansão do transporte"],
    answer: "baixa alfabetização midiática",
    explanation: "A lacuna precisa manter relação direta com o tema e com a causa argumentativa.",
  },
];

const argumentRounds = [
  {
    question: "Qual argumento é mais forte para defender educação midiática?",
    options: [
      "Algoritmos priorizam engajamento, logo o aluno precisa reconhecer vieses, fontes e interesses econômicos por trás do conteúdo.",
      "As redes sociais existem ha muitos anos e muitas pessoas usam todos os dias.",
      "A internet pode ser boa ou ruim dependendo de cada pessoa.",
    ],
    answer: 0,
    explanation: "O melhor argumento apresenta causa, consequência e vocabulário analítico.",
  },
  {
    question: "Qual tese está mais alinhada ao modelo ENEM?",
    options: [
      "A manipulação nas redes é complexa e deve ser analisada por escola, Estado e plataformas.",
      "As redes sociais são ruins e todo mundo deveria parar de usar.",
      "Hoje em dia a internet é muito popular no Brasil.",
    ],
    answer: 0,
    explanation: "A tese delimita problema e agentes sem cair em generalização.",
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
          <p className="text-xs font-black uppercase text-muted-foreground">Ajuda com repertório</p>
          <h2 className="mt-1 text-2xl font-black tracking-normal">Banco inteligente por tema</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Use referências com função argumentativa clara, não como citação solta.</p>
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
            className="game-surface bg-card/82 p-4"
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="font-black">{group.category}</h3>
              <BookOpen className="h-4 w-4 text-secondary" aria-hidden="true" />
            </div>
            <div className="space-y-3">
              {group.items.map((item) => (
                <div key={item.title} className="game-tile bg-background/54 p-3">
                  <div className="mb-2 flex items-center justify-between gap-2">
                    <p className="text-sm font-black">{item.title}</p>
                    <span className="rounded-full border-2 border-foreground bg-accent/12 px-2 py-1 text-[11px] font-black text-accent">{item.tag}</span>
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
    <section className="game-surface bg-card/82 p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-muted-foreground">Mini jogo</p>
          <h2 className="mt-1 text-xl font-black tracking-normal">Acerte o conectivo</h2>
        </div>
        <div className="rounded-2xl border-2 border-foreground bg-secondary p-3 text-secondary-foreground shadow-[0_3px_0_hsl(var(--foreground))]">
          <Zap className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
      <div className="game-tile bg-background/58 p-4">
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
                "game-tile flex min-h-12 items-center justify-between bg-background/54 px-3 text-left text-sm font-bold transition-all hover:bg-muted/64",
                active && "bg-primary/20",
                isCorrect && "bg-accent/12 text-accent",
                isWrong && "bg-destructive/10 text-destructive",
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
        <div className={cn("game-tile mt-4 p-3 text-sm leading-6", correct ? "bg-accent/10" : "bg-destructive/10")}>
          <p className="font-black">{correct ? "Combo mantido" : "Quase. Revise a relação lógica."}</p>
          <p className="mt-1 text-muted-foreground">{current.explanation}</p>
        </div>
      )}
      <Button className="mt-4 w-full" disabled={!selected} onClick={resolved ? next : confirm}>
        {resolved ? "Próximo trecho" : "Confirmar"}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Button>
      <XPRewardModal
        open={rewardOpen}
        title="Conectivo dominado"
        description="Você escolheu o operador argumentativo correto e fortaleceu a coesão."
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
    <section className="game-surface bg-card/82 p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-muted-foreground">Complete a redação</p>
          <h2 className="mt-1 text-xl font-black tracking-normal">{current.title}</h2>
        </div>
        <div className="rounded-2xl border-2 border-foreground bg-accent p-3 text-accent-foreground shadow-[0_3px_0_hsl(var(--foreground))]">
          <PenTool className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
      <div className="game-tile bg-background/58 p-4 text-sm leading-7">
        {current.stem.split("[blank]").map((part, index, parts) => (
          <span key={`${part}-${index}`}>
            {part}
            {index < parts.length - 1 && (
              <span className="mx-1 inline-flex min-w-24 justify-center rounded-xl border-2 border-dashed border-foreground bg-muted px-2 py-1 text-xs font-black text-muted-foreground">
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
              "game-tile bg-background/62 px-3 py-2 text-sm font-bold transition-all hover:bg-muted",
              selected === option && "bg-primary/20",
              resolved && option === current.answer && "bg-accent/12 text-accent",
            )}
          >
            {option}
          </button>
        ))}
      </div>
      {resolved && (
        <div className={cn("game-tile mt-4 p-3 text-sm leading-6", correct ? "bg-accent/10" : "bg-destructive/10")}>
          <p className="font-black">{correct ? "Encaixe perfeito" : "A lacuna perdeu coesão"}</p>
          <p className="mt-1 text-muted-foreground">{current.explanation}</p>
        </div>
      )}
      <Button className="mt-4 w-full" disabled={!selected} onClick={resolved ? next : confirm}>
        {resolved ? "Novo desafio" : "Verificar encaixe"}
      </Button>
      <XPRewardModal
        open={rewardOpen}
        title="Peça encaixada"
        description="Você completou a estrutura com coerência e progressão textual."
        xp={45}
        rarity="epica"
        onClose={() => setRewardOpen(false)}
      />
    </section>
  );
}

export function EssayAnalysisViewer() {
  const annotations = [
    { label: "Tese", className: "bg-primary/10 text-primary", text: "A manipulação nas redes sociais compromete a autonomia dos usuários" },
    { label: "Repertorio", className: "bg-secondary/16 text-secondary", text: "como evidencia o caso Cambridge Analytica" },
    { label: "Conectivo", className: "bg-accent/12 text-accent", text: "Alem disso" },
    { label: "Intervenção", className: "bg-muted text-foreground", text: "o Ministério da Educação deve ampliar programas de letramento midiático" },
  ];

  return (
    <section className="game-surface bg-card/82 p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-muted-foreground">Modo análise</p>
          <h2 className="mt-1 text-xl font-black tracking-normal">Redação anotada</h2>
        </div>
        <div className="rounded-2xl border-2 border-foreground bg-primary p-3 text-primary-foreground shadow-[0_3px_0_hsl(var(--foreground))]">
          <FlaskConical className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
      <div className="game-tile bg-background/58 p-4 text-sm leading-8">
        <span className="rounded-xl border-2 border-foreground bg-primary/10 px-1.5 py-1 font-semibold text-primary">A manipulação nas redes sociais compromete a autonomia dos usuários</span>, pois algoritmos priorizam conteúdos capazes de reter atenção.
        <span className="mx-1 rounded-xl border-2 border-foreground bg-secondary/16 px-1.5 py-1 font-semibold text-secondary">Como evidencia o caso Cambridge Analytica</span>, dados pessoais podem orientar mensagens e influenciar decisões coletivas.
        <span className="mx-1 rounded-xl border-2 border-foreground bg-accent/12 px-1.5 py-1 font-semibold text-accent">Além disso</span>, a falta de educação midiática reduz a capacidade crítica dos jovens.
        Portanto,
        <span className="mx-1 rounded-xl border-2 border-foreground bg-muted px-1.5 py-1 font-semibold text-foreground">o Ministério da Educação deve ampliar programas de letramento midiático</span>
        por meio de aulas e campanhas permanentes.
      </div>
      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        {annotations.map((annotation) => (
          <div key={annotation.label} className="game-tile bg-background/54 p-3">
            <span className={cn("rounded-full border-2 border-foreground px-2 py-1 text-[11px] font-black uppercase", annotation.className)}>{annotation.label}</span>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">{annotation.text}</p>
          </div>
        ))}
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
    <section className="game-surface bg-card/82 p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-muted-foreground">Treino de argumentação</p>
          <h2 className="mt-1 text-xl font-black tracking-normal">Qual argumento vence?</h2>
        </div>
        <div className="rounded-2xl border-2 border-foreground bg-primary p-3 text-primary-foreground shadow-[0_3px_0_hsl(var(--foreground))]">
          <Brain className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
      <p className="game-tile bg-background/58 p-4 text-sm font-bold leading-6">{current.question}</p>
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
                "game-tile w-full bg-background/54 p-3 text-left text-sm leading-6 transition-all hover:bg-muted/64",
                active && "bg-primary/20",
                isCorrect && "bg-accent/12",
                isWrong && "bg-destructive/10",
              )}
            >
              {option}
            </button>
          );
        })}
      </div>
      {resolved && (
        <div className={cn("game-tile mt-4 p-3 text-sm leading-6", correct ? "bg-accent/10" : "bg-destructive/10")}>
          <p className="font-black">{correct ? "Argumento mais forte" : "Esse argumento está fraco"}</p>
          <p className="mt-1 text-muted-foreground">{current.explanation}</p>
        </div>
      )}
      <Button className="mt-4 w-full" disabled={selected === null} onClick={resolved ? next : confirm}>
        {resolved ? "Novo desafio" : "Confirmar escolha"}
      </Button>
      <XPRewardModal
        open={rewardOpen}
        title="Argumentação evoluiu"
        description="Você escolheu a tese mais específica, defensável e adequada ao ENEM."
        xp={50}
        rarity="epica"
        onClose={() => setRewardOpen(false)}
      />
    </section>
  );
}

export function ConnectiveLibrary() {
  return (
    <section className="game-surface bg-card/82 p-4">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase text-muted-foreground">Banco de conectivos</p>
          <h2 className="mt-1 text-xl font-black tracking-normal">Operadores por função</h2>
        </div>
        <Lightbulb className="h-5 w-5 text-secondary" aria-hidden="true" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {connectiveCategories.map((category) => (
          <div key={category.title} className="game-tile bg-background/54 p-3">
            <p className="mb-2 text-sm font-black">{category.title}</p>
            <div className="flex flex-wrap gap-2">
              {category.items.map((item) => (
                <span key={item} className="rounded-full border-2 border-foreground bg-muted px-2 py-1 text-xs font-bold text-muted-foreground">
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

function incrementStorage(key: string) {
  if (typeof window === "undefined") return;
  const next = Number(window.localStorage.getItem(key) ?? "0") + 1;
  window.localStorage.setItem(key, String(next));
  window.dispatchEvent(new StorageEvent("storage", { key, newValue: String(next) }));
}
