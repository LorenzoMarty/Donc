#!/usr/bin/env node
// REQ-4/REQ-5 (geracao-tema-retry-gramatica-enem): varre texto visivel ao usuario (JSX estatico do
// frontend + mensagens de AppError do backend) e falha se o LanguageTool (self-hosted, ver
// docker-compose.yml) encontrar erro de gramatica/ortografia em portugues. Chamado por
// `npm run quality` (frontend) e `.\quality.ps1` (backend) — precisa de
// `docker compose up -d languagetool` rodando antes.

import { readdirSync, statSync, readFileSync } from "node:fs";
import { join, extname, relative } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(import.meta.url), "..", "..");
const FRONTEND_DIR = join(ROOT, "frontend", "src");
const BACKEND_DIR = join(ROOT, "backend", "src");
const LANGUAGETOOL_URL = process.env.LANGUAGETOOL_URL || "http://localhost:8010/v2/check";

const SKIP_DIRS = new Set(["node_modules", ".next", "__pycache__", ".venv", "dist", "build", "coverage"]);

// Strings revisadas manualmente e confirmadas como falso-positivo do LanguageTool ou estilo
// intencional do produto — sem isso o gate falharia pra sempre nelas. Cada entrada tem o motivo
// ao lado; nao adicionar aqui so pra silenciar erro real.
const IGNORE_STRINGS = new Map([
  ["Latência avg", "abreviacao tecnica em ingles (avg), nao e erro de PT-BR"],
  ["Aulas base", "termo composto aceitavel em copy casual; hifenizacao e so sugestao de registro formal/academico"],
  ["ex: coesão entre parágrafos", "placeholder de formulario — minuscula e convencao de hint, nao inicio de frase"],
  ["ex.: tecnologia, saúde pública", "idem — placeholder de formulario"],
  ["ex: progressão, naturalidade", "idem — placeholder de formulario"],
  ["Nenhum outro jogo com perguntas disponível ainda.", "falso positivo de concordancia — \"disponivel\" concorda com \"jogo\", nao com \"perguntas\""],
  ["Thumbnail URL", "campo tecnico em ingles, tela de admin"],
  ["Bem-vinda ao Donc", "nome de marca"],
  ["Vídeo da Hydra, a mascote do Donc", "nomes proprios (marca/mascote)"],
  ["Aluno Donc", "nome de marca"],
  ["Jogue sua primeira fase pra começar seu mapa.", "\"pra\" casual intencional, voz de marca do produto"],
  ["Sem cartão pra começar a treinar", "idem — \"pra\" casual intencional"],
  ["de 1000", "fragmento de frase quebrado por interpolacao JSX vizinha, nao e frase real isolada"],
  ["Boletim · Donc", "nome de marca"],
  ["IA Donc", "nome de marca"],
  ["Mover dock", "termo de design ja documentado no CLAUDE.md do projeto"],
  ["Arrastar dock", "idem — termo de design documentado"],
  ["Voltar ao hub", "termo de navegacao hub-first ja documentado no CLAUDE.md"],
  ["Recomendado pra você", "\"pra\" casual intencional"],
  ["de domínio", "fragmento de frase quebrado por interpolacao JSX vizinha"],
  ["Gerar perguntas com IA ainda não é suportado para o engine \\", "artefato de extracao (aspas escapadas de f-string cortam a string) — mensagem completa no codigo esta correta"],
  ["Gerar conteúdo com IA não é suportado para o engine \\", "idem — artefato de extracao"],
  ["A redação ainda está curta para correção. Desenvolva melhor a tese antes de enviar.", "sugestao estilistica de prolixidade do LanguageTool, nao e erro gramatical"],
  ["Este módulo ainda está bloqueado. Conclua o módulo anterior para liberar esta aula.", "idem — sugestao estilistica, nao erro"],
]);

function walk(dir, exts) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      if (!SKIP_DIRS.has(entry)) out.push(...walk(full, exts));
    } else if (exts.includes(extname(entry))) {
      out.push(full);
    }
  }
  return out;
}

// Heuristica, nao parser: filtra fora identificadores/constantes/expressoes de codigo, fica so
// com o que parece frase em portugues visivel ao usuario. Sempre vai deixar passar algum
// fragmento de codigo e perder algum texto real (ex.: metade de frase quebrada por interpolacao
// JSX) — e o trade-off de nao usar um parser AST completo, documentado no topo do arquivo.
function isLikelyPortugueseText(str) {
  const trimmed = str.trim();
  if (trimmed.length < 6) return false;
  if (/[{}`()\[\]<>&|;]/.test(trimmed)) return false; // expressao/generico/interpolacao de codigo
  if (/^[:,]/.test(trimmed)) return false; // fragmento cortado (ex.: ": isWrongPick ?")
  if (/[a-zA-Z]\.[a-zA-Z]/.test(trimmed)) return false; // acesso a propriedade tipo "cell.foo"
  if (/\b(const|let|typeof|interface|as|is|=>|===|!==)\b/.test(trimmed)) return false;
  if (!/[a-zà-ÿ]/i.test(trimmed)) return false;
  if (!trimmed.includes(" ")) return false;
  if (/^[A-Z0-9_.:/\\-]+$/.test(trimmed)) return false; // CONSTANTE, path, enum
  return true;
}

function extractFrontendStrings(content) {
  const found = [];
  const patterns = [
    />([^<>{}\n]{6,200})</g,
    /(?:aria-label|placeholder|title|label|description)=["']([^"'{}]{6,200})["']/g,
    /toast\.(?:error|success|info|warning)\(\s*["']([^"'{}]{6,300})["']/g,
  ];
  for (const re of patterns) {
    let match;
    while ((match = re.exec(content))) {
      const text = match[1].trim();
      if (isLikelyPortugueseText(text)) found.push(text);
    }
  }
  return found;
}

function extractBackendStrings(content) {
  const found = [];
  const re = /AppError\(\s*f?["']([^"']{6,300})["']/g;
  let match;
  while ((match = re.exec(content))) {
    const text = match[1].trim();
    if (isLikelyPortugueseText(text)) found.push(text);
  }
  return found;
}

async function checkText(text) {
  const body = new URLSearchParams({ text, language: "pt-BR" });
  const res = await fetch(LANGUAGETOOL_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`LanguageTool respondeu ${res.status}`);
  const data = await res.json();
  return data.matches ?? [];
}

async function main() {
  const targets = [
    ...walk(FRONTEND_DIR, [".tsx", ".ts"]).map((file) => ({ file, kind: "frontend" })),
    ...walk(BACKEND_DIR, [".py"]).map((file) => ({ file, kind: "backend" })),
  ];

  let totalIssues = 0;
  for (const { file, kind } of targets) {
    const content = readFileSync(file, "utf8");
    const strings = kind === "frontend" ? extractFrontendStrings(content) : extractBackendStrings(content);
    const seen = new Set();
    for (const text of strings) {
      if (seen.has(text)) continue;
      seen.add(text);
      if (IGNORE_STRINGS.has(text)) continue;

      let matches;
      try {
        matches = await checkText(text);
      } catch (err) {
        console.error(`Nao foi possivel falar com o LanguageTool em ${LANGUAGETOOL_URL}: ${err.message}`);
        console.error("Rode `docker compose up -d languagetool` antes de rodar o gate.");
        process.exit(2);
      }

      for (const m of matches) {
        totalIssues += 1;
        const lineNumber = content.slice(0, content.indexOf(text)).split("\n").length;
        const suggestion = m.replacements?.[0]?.value;
        const relPath = relative(ROOT, file);
        console.error(
          `${relPath}:${lineNumber}: "${text}" — ${m.message}${suggestion ? ` (sugestao: "${suggestion}")` : ""}`,
        );
      }
    }
  }

  if (totalIssues > 0) {
    console.error(`\n${totalIssues} problema(s) de gramatica/ortografia em portugues encontrados.`);
    process.exit(1);
  }
  console.log("check-grammar: nenhum erro de gramatica/ortografia encontrado.");
}

main();
