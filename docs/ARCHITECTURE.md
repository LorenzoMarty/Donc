# Arquitetura

## Visao Geral

O projeto separa frontend e backend para manter evolucao independente.

- `frontend`: Next.js App Router com paginas protegidas, providers client-side, tema claro/escuro e componentes reutilizaveis.
- `backend`: FastAPI com camadas de routers, services, repositories, schemas e models.
- `db`: PostgreSQL com pgvector via Docker Compose.
- `redis`: broker/result backend do Celery, rate limit e eventos de jobs.

## Backend

Camadas:

- `routers`: expoem endpoints REST por dominio.
- `services`: concentram regras de negocio.
- `repositories`: isolam consultas SQLAlchemy.
- `schemas`: contratos Pydantic de entrada e saida.
- `models`: entidades SQLAlchemy.
- `core`: configuracao, banco e seguranca.
- `middlewares`: erros globais da aplicacao.
- `agents`: agentes Agno especializados.
- `workflows`: orquestracao interna de fluxos inteligentes.
- `memory`: perfil pedagogico persistente do estudante.
- `vectorstore`: seed RAG e integracao com pgvector.
- `queues`: Celery e jobs assincronos.
- `telemetry`: configuracao de observabilidade.

Dominios implementados:

- Auth e JWT.
- Painel.
- Aulas, cursos, modulos e progresso.
- Exercicios e respostas.
- Redacoes, temas, historico e correcoes.
- Tutor IA.
- Simulados.
- Gamificacao.
- Admin.

## IA

A camada de IA usa Agno como nucleo. Os agentes usam `Agent`, `OpenAIResponses`, `output_schema` Pydantic e, quando disponivel, `PostgresDb` para memoria/sessoes. O workflow principal de correcao chama agentes especializados de tese, gramatica, repertorio e competencias ENEM, depois consolida o resultado em um contrato compativel com o frontend atual.

Quando `OPENAI_API_KEY` nao esta definida ou a chamada falha, o sistema usa fallback deterministico baseado em tamanho, estrutura, conectivos, repertorio e proposta de intervencao. Esse fallback existe para desenvolvimento e demos, nao para nota oficial.

Endpoints REST:

- `POST /api/v1/ai/correct`
- `POST /api/v1/ai/generate-exercise`
- `POST /api/v1/ai/analyze`
- `POST /api/v1/ai/recommend`
- `POST /api/v1/ai/study-plan`
- `GET /api/v1/ai/jobs/{job_id}`
- `GET /api/v1/ai/jobs/{job_id}/stream`

O endpoint `POST /api/v1/essays/{id}/submit` continua retornando `EssayRead`, mas agora e alimentado pelo workflow Agno.

## Banco

Modelos principais:

- `User`
- `Course`, `Module`, `Lesson`, `LessonProgress`
- `Exercise`, `ExerciseAnswer`
- `EssayTheme`, `Essay`, `EssayCorrection`
- `MockExam`, `MockExamQuestion`, `MockExamAttempt`
- `Achievement`, `UserAchievement`, `Goal`
- `AIJob`, `StudentLearningProfile`, `AIKnowledgeDocument`, `AIKnowledgeChunk`, `AIInteractionLog`

No startup, o backend ainda mantem `create_all` para as tabelas existentes, cria a extensao `vector` quando usa PostgreSQL e executa seed inicial de aulas, exercicios, temas, RAG curado, simulado e conquistas. Usuarios e dados demo ficam condicionados a `SEED_DEMO_DATA=true`. As novas estruturas de IA tambem possuem migracao Alembic.

## Frontend

Areas:

- Auth: login, cadastro e recuperacao.
- App shell: sidebar, topbar, dark mode e usuario.
- Painel: metricas e graficos.
- Aulas: cursos separados em modulos e detalhe com player.
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

- Expandir migracoes Alembic para cobrir todos os modelos existentes.
- Persistir cache semantico de IA em Redis.
- Enviar recuperacao de senha por e-mail transacional.
- Aprofundar dashboards Langfuse/OpenTelemetry.
- Cobrir mais services com testes automatizados de unidade e integracao.
