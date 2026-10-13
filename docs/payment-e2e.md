# Roteiro de validação do pagamento (Mercado Pago)

Executar **duas vezes**: primeiro em sandbox (usuários e cartões de teste do Mercado Pago), depois em produção com o menor
valor real possível (cupom que zere quase tudo, ou plano ajustado temporariamente). Anexar prints/logs de cada etapa na issue #29.

## Pré-requisitos

- Deploy no ar com HTTPS (`docs/deploy.md`).
- `.env.production` com `MERCADOPAGO_ACCESS_TOKEN` e `MERCADOPAGO_WEBHOOK_SECRET` (sem o secret o backend recusa subir em produção).
- No painel do Mercado Pago, webhook de **Assinaturas (preapproval)** apontando para `https://<dominio>/api/backend/subscriptions/webhook`.
- Um cupom ativo criado no admin (ex.: `TESTE50`, 50%) e um aluno novo (e-mail real, para receber os e-mails transacionais).

## Roteiro

| # | Etapa | Como | Resultado esperado | Evidência |
|---|---|---|---|---|
| 1 | Cadastro | `/cadastro` marcando o aceite dos termos | Conta criada, e-mail de boas-vindas, redirecionado para `/assinatura` | print + e-mail |
| 2 | Paywall | Abrir `/dashboard` sem assinar | Redireciona para `/assinatura` | print |
| 3 | Checkout com cupom | Escolher plano, aplicar o cupom, **Ir para pagamento** | Valor no Mercado Pago = preço com desconto (`price_charged_cents`) | print do checkout MP |
| 4 | Pagamento aprovado | Pagar | Webhook chega; assinatura `active`; acesso liberado; e-mail "Pagamento aprovado"; cupom com `used_count` +1 | log do backend + print do dashboard |
| 5 | Webhook assinado | Reenviar o mesmo evento pelo painel do MP | Segunda entrega ignorada (idempotente): cupom **não** conta duas vezes | log (`ProcessedWebhookEvent`) |
| 6 | Assinatura inválida | `curl -X POST .../subscriptions/webhook -H 'x-signature: ts=1,v1=00' -d '{"id":"x","data":{"id":"1"}}'` | HTTP 401 `invalid_webhook_signature` | saída do curl |
| 7 | Renovação | Aguardar a próxima cobrança (sandbox: simular no painel) | `current_period_end` avança; sem corte de acesso | consulta ao banco |
| 8 | Falha de cobrança | Pausar a assinatura no painel do MP | Status `grace`, e-mail "Falha na cobrança", acesso mantido até `grace_until` | print + e-mail |
| 9 | Fim da graça | Passar de `grace_until` | Acesso cortado (`suspended`), cai no paywall | print |
| 10 | Cancelamento | `/assinatura` → cancelar | E-mail "Assinatura cancelada"; acesso até o fim do período pago, depois paywall | print + e-mail |

## Consultas úteis no VPS

```bash
docker compose --env-file .env.production -f docker-compose.prod.yml logs --tail=200 backend | grep -i -E "webhook|mercado"
docker compose --env-file .env.production -f docker-compose.prod.yml exec db \
  psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" \
  -c "select user_id, status, cycle, price_charged_cents, current_period_end, grace_until, canceled_at, coupon_applied from subscriptions order by id desc limit 5"
```

## Se algo falhar

- Webhook não chega: URL no painel do MP, DNS/HTTPS, e `logs backend`. Falhas na consulta ao MP devolvem 5xx de propósito: o MP reentrega e o evento é reprocessado.
- 401 `invalid_webhook_signature`: `MERCADOPAGO_WEBHOOK_SECRET` diferente do painel.
- Pagou e não liberou: conferir a linha em `subscriptions` e o `mp_preapproval_id`; reenviar o evento pelo painel.
