# Arquitetura

## Visao Geral

O projeto separa frontend e backend para manter evolucao independente.

- `frontend`: Next.js App Router com paginas protegidas, providers client-side, tema claro/escuro e componentes reutilizaveis.
- `backend`: FastAPI com camadas de routers, services, repositories, schemas e models.
- `db`: PostgreSQL via Docker Compose.

## Backend

Camadas:

- `routers`: expõem endpoints REST por dominio.
- `services`: concentram regras de negocio.
- `repositories`: isolam consultas SQLAlchemy.
- `schemas`: contratos Pydantic de entrada e saida.
- `models`: entidades SQLAlchemy.
- `core`: configuracao, banco e seguranca.
- `middlewares`: erros globais da aplicacao.

Dominios implementados:

- Auth e JWT.
- Dashboard.
- Aulas, modulos, materias e progresso.
- Exercicios e respostas.
- Redacoes, temas, historico e correcoes.
- Tutor IA.
- Simulados.
- Gamificacao.
- Admin.

## IA

A correcao de redacao usa OpenAI Responses API com Structured Outputs e schema Pydantic (`EssayAIResult`). Isso reduz risco de resposta fora do contrato e facilita persistencia no banco.

Quando `OPENAI_API_KEY` nao esta definida ou a chamada falha, o sistema usa fallback deterministico baseado em tamanho, estrutura, conectivos e proposta de intervencao. Esse fallback existe para desenvolvimento e demos, nao para nota oficial.

## Banco

Modelos principais:

- `User`
- `Subject`, `Module`, `Lesson`, `LessonProgress`
- `Exercise`, `ExerciseAnswer`
- `EssayTheme`, `Essay`, `EssayCorrection`
- `MockExam`, `MockExamQuestion`, `MockExamAttempt`
- `Achievement`, `UserAchievement`, `Goal`

No startup, o backend cria as tabelas e executa seed inicial com usuarios, aulas, exercicios, temas, simulado, metas e conquistas.

## Frontend

Areas:

- Auth: login, cadastro e recuperacao.
- App shell: sidebar, topbar, dark mode e usuario.
- Dashboard: metricas e graficos.
- Aulas: trilhas e detalhe com player.
- Exercicios: treino objetivo com feedback.
- Redacao: editor principal com autosave e correcao.
- Redacoes: historico e analytics.
- Tutor: chat IA.
- Simulados: cronometro e resultado por habilidade.
- Admin: metricas e usuarios.
- Onboarding: boas-vindas e roteiro inicial.

## Seguranca

- JWT assinado por `JWT_SECRET_KEY`.
- Hash de senha com `bcrypt`, usando pre-hash SHA-256 para evitar limite de 72 bytes do bcrypt.
- CORS limitado ao frontend configurado.
- Endpoints administrativos exigem papel `admin`.

## Proximos Passos de Producao

- Adicionar Alembic para migracoes versionadas.
- Persistir cache de IA em Redis.
- Enviar recuperacao de senha por e-mail transacional.
- Adicionar observabilidade, logs estruturados e rate limiting.
- Cobrir services com testes automatizados de unidade e integracao.

