import type { GameDefinition } from "@/features/gamification/types";
import { enrichGame } from "@/features/gamification/catalog";
import { challengeGames } from "@/games/challenges";
import { competencyGames } from "@/games/competencies";
import { connectiveGames } from "@/games/connectives";
import { grammarGames } from "@/games/grammar";
import { repertoireGames } from "@/games/repertoire";
import { structureGames } from "@/games/structure";
import { thesisGames } from "@/games/thesis";
import { duelGames } from "@/games/duel";
import { escalationGames } from "@/games/escalation";
import { artificialityGames } from "@/games/artificiality";
import { correctorGames } from "@/games/corrector";
import { surgeryGames } from "@/games/text-surgery";
import { survivalGames } from "@/games/survival";

/**
 * Spec migrar-jogos-estaticos-para-banco REQ-4: o catálogo estático saiu do runtime de produção
 * (`catalog.ts` não importa mais `frontend/src/games/*` — só o banco alimenta `GamesHub`/
 * `CategoryPage`/`GameSession`). Esses arquivos continuam existindo só como massa de dado real
 * pros testes de contrato cognitivo (`hubs.test.ts`, `snapshots.test.ts`, `game-store.test.ts`),
 * que dependiam do conteúdo curado (hubs/tags/ids específicos) pra validar `enrichGame`/
 * `recommendHub`/`missionForHub`. Nunca importar este arquivo fora de `*.test.ts`.
 */
export const testGamesCatalog: GameDefinition[] = [
  ...structureGames,
  ...connectiveGames,
  ...thesisGames,
  ...repertoireGames,
  ...grammarGames,
  ...competencyGames,
  ...challengeGames,
  ...duelGames,
  ...escalationGames,
  ...artificialityGames,
  ...correctorGames,
  ...surgeryGames,
  ...survivalGames,
];

export const enrichedTestCatalog: GameDefinition[] = testGamesCatalog.map(enrichGame);
