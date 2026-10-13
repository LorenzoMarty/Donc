# Monitoramento mínimo e alertas

| O quê | Ferramenta | Cobre |
|---|---|---|
| Erros do frontend (navegador + servidor Next) | Sentry free | exceções não tratadas, error boundary |
| Erros do backend e do worker Celery | Sentry free | exceções, `logger.error/exception`, falha de task |
| Site/API fora do ar | UptimeRobot free | `https://<dominio>/` e `https://<dominio>/health` |
| Qualidade/custo de IA | Langfuse (já existe) | traces das correções |

Privacidade: texto de redação, corpo de request, cookies e headers de auth **não** vão pro Sentry
(`backend/src/telemetry/sentry.py` e `frontend/src/lib/sentry.ts`, ambos com teste).

## Configurar (uma vez)

1. Sentry: crie 2 projetos (Python/FastAPI e Next.js). Copie os DSNs para `.env.production`:
   `SENTRY_DSN` (backend + servidor Next) e `NEXT_PUBLIC_SENTRY_DSN` (navegador, embutido no **build** — refaça o deploy depois de mudar).
2. UptimeRobot: dois monitores HTTP(s), intervalo de 5 min, alerta por e-mail ao dono:
   - `https://<dominio>/` (frontend)
   - `https://<dominio>/health` (backend; responde **503** se banco ou Redis caírem)
3. Sentry → Alerts: regra "novo issue → e-mail ao dono" em cada projeto.

## Alertas que já saem prontos

- **Falha de webhook do Mercado Pago:** erro inesperado (`logger.exception`) e 5xx do MP (`logger.error`) viram evento.
  Filtre por `logger:src.routes.subscriptions`.
- **Falha de job de correção:** a task Celery relança a exceção depois de marcar o job como `failed`; a integração Celery do Sentry a captura.

## Teste de fumaça (após configurar)

- Backend: `docker compose --env-file .env.production -f docker-compose.prod.yml exec backend python -c "import sentry_sdk; from src.telemetry.sentry import configure_sentry; configure_sentry(); sentry_sdk.capture_message('teste-backend'); sentry_sdk.flush()"`
- Frontend: no navegador, com o site aberto, no console: `setTimeout(() => { throw new Error('teste-front') })`.
- Uptime: `docker compose ... stop frontend` por alguns minutos e confirmar o e-mail; subir de novo.
