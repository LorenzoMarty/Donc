# Analytics de produto (funil e retenção)

**Decisão (2026-10-19):** PostHog Cloud (região EU, plano free) recebendo eventos **do backend**.

| | PostHog cloud free | Plausible | PostHog self-host |
|---|---|---|---|
| Funil e coortes D1/D7 | sim | não (só páginas) | sim |
| Custo | R$ 0 (1M eventos/mês) | pago | R$ 0, mas ~4 GB de RAM extra: não cabe no VPS de 4 GB |
| LGPD | eventos sem PII, sem cookie | ok | ok |

Plausible não faz retenção/funil por usuário; self-host estoura a RAM do VPS. Daí PostHog cloud.

## Como funciona

- `backend/src/services/analytics.py`: `capture(evento, user_id, **props)` em thread daemon, sem `POSTHOG_API_KEY` não faz nada, erro de rede é engolido.
- Eventos: `signup`, `subscription_activated` (prop `cycle`), `essay_submitted` e todos os eventos de `POST /admin/events` (só `entity_type` e `duration_ms`).
- **Privacidade:** `distinct_id` é um HMAC do id do usuário (sem e-mail/nome). Texto de redação e `meta` nunca saem. Não há script nem cookie no navegador, então não há banner de consentimento a tratar; se um dia incluir o JS do PostHog, será preciso consentimento.

## Configurar (uma vez, ação do dono)

1. Crie conta em posthog.com (região EU) e um projeto; copie a *Project API key* (`phc_...`).
2. `.env.production`: `POSTHOG_API_KEY=phc_...` (e `POSTHOG_HOST` se não usar a EU) e `./deploy/deploy.sh`.
3. PostHog → *Product analytics*:
   - **Funil:** `signup` → `essay_submitted` → `subscription_activated`.
   - **Retenção D1/D7:** *Retention*, evento inicial `signup`, evento de retorno `essay_submitted` (ou qualquer evento), intervalo em dias.
4. Verificar: cadastrar uma conta de teste e ver `signup` em *Activity → Live events*.
