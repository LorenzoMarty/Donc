# Donk ENEM

Plataforma fullstack premium de Portugues e Redacao focada exclusivamente no ENEM.

## Stack

- Frontend: Next.js 16, TypeScript, TailwindCSS, ShadCN UI, componentes visuais estilo Aceternity UI e Framer Motion
- Backend: FastAPI, Python 3.13, SQLAlchemy
- Banco: PostgreSQL
- Autenticacao: JWT
- IA: OpenAI Responses API com Structured Outputs
- Infra: Docker e Docker Compose

## Como executar

### Docker

1. Opcionalmente, crie o arquivo `.env` na raiz para sobrescrever segredos e configurar OpenAI:

```bash
cp .env.example .env
```

2. Preencha `OPENAI_API_KEY` se quiser correcao real por IA. Sem chave, o backend usa um avaliador local de fallback para manter o fluxo funcional.

3. Suba tudo:

```bash
docker-compose up --build
```

4. Acesse:

- Frontend: http://localhost:3000
- API: http://localhost:8000
- Swagger: http://localhost:8000/docs

### Desenvolvimento local sem Docker

Backend:

```bash
cd backend
python -m venv .venv
.\.venv\Scripts\pip install -r requirements.txt
$env:DATABASE_URL="sqlite:///./local_dev.db"
.\.venv\Scripts\python -m uvicorn app.main:app --reload --port 8000
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

## Contas demo

- Aluno: `aluno@demo.com` / `12345678`
- Admin: `admin@demo.com` / `12345678`

## Funcionalidades entregues

- Login, cadastro, logout, recuperacao de senha e rotas protegidas.
- Painel do aluno com progresso, media de redacao, sequencia, XP, metas, grafico e estados de carregamento.
- Estrutura Materia -> Modulo -> Aula, player, progresso salvo e aulas concluidas.
- Exercicios ENEM com correcao automatica, explicacao e dificuldade dinamica.
- Editor de redacao com contador de linhas, contador de palavras, autosave, modo foco e spellcheck.
- Correcao de redacao ENEM com nota total, competencias 1 a 5, pontos fortes, erros, sugestoes e feedback.
- Historico de redacoes com evolucao, competencias e erros recorrentes.
- IA tutora para duvidas de Portugues e Redacao.
- Simulados com cronometro, correcao automatica e desempenho por habilidade.
- Gamificacao com XP, nivel, streak, conquistas e metas.
- Painel administrativo com usuarios e metricas.
- Onboarding inicial e tela de boas-vindas.
- Landing page, paginas publicas de plataforma, trilhas, pricing e sobre.
- Perfil com navegacao web horizontal.

## Estrutura

```text
/frontend  Aplicacao Next.js em src/
  /src/app         Rotas publicas, auth e area protegida
  /src/components  ui, sections, game, writing e shared
  /src/services    Cliente de API
  /src/providers   Providers da aplicacao
  /src/contexts    Contextos React
  /src/utils       Utilitarios
/backend   API FastAPI
/docker    Notas e extensoes de infraestrutura
/docs      Documentacao tecnica
```

## Variaveis principais

- `DATABASE_URL`: conexao SQLAlchemy para PostgreSQL.
- `JWT_SECRET_KEY`: segredo de assinatura JWT.
- `OPENAI_API_KEY`: chave da OpenAI.
- `OPENAI_MODEL`: modelo usado para tutor e correcao. Padrao: `gpt-5.5`.
- `NEXT_PUBLIC_API_URL`: URL publica da API para o frontend.

## Validacao local realizada

- `python -m compileall backend/app`
- Testes de smoke da API com `TestClient`: health, login, dashboard, aulas, temas, redacao, exercicio, simulado e admin.
- `npm run typecheck`
- `npm run build`
- `docker compose up -d --build frontend`
- Smoke HTTP em rotas publicas e protegidas.
