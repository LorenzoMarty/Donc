"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { BookOpen, Lightbulb, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";

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
      {
        title: "Marco Civil da Internet",
        use: "Referencia para responsabilidade, privacidade e uso democratico da rede.",
        tag: "legislacao",
      },
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
      <div className="fluid-grid gap-3 [--grid-min:17rem]">
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

export function ConnectiveLibrary() {
  return (
    <LabCard eyebrow="Conectivos" title="Operadores por funcao" icon={Lightbulb}>
      <div className="fluid-grid gap-3 [--grid-min:15rem]">
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

function LabCard({
  eyebrow,
  title,
  icon: Icon,
  children,
}: {
  eyebrow: string;
  title: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
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
