# Hospedagem de vídeo das aulas

**Decisão (2026-10-12):** vídeos ficam no **YouTube como "não listado"**. Custo zero e já funciona com o player do Donc (`CustomYouTubePlayer`).

## Prós e contras

| | YouTube não listado | Bunny Stream (alternativa) |
|---|---|---|
| Custo | R$ 0 | ~US$ 1/mês por TB |
| Integração | Pronta (player custom) | Exige ramo HLS/embed no `lesson-player.tsx` |
| Pirataria | Quem tem o link consegue repassar | Token/URL assinada e restrição por domínio |
| Marca e anúncios | Logo do YouTube; sem anúncios em vídeo não monetizado | Sem marca de terceiros |

## Gatilho de migração para o Bunny

Migrar se acontecer **qualquer um**:

1. Um link de aula aparecer vazado/compartilhado fora da plataforma.
2. For preciso remover a marca do YouTube ou controlar o acesso por assinante.
3. O YouTube bloquear ou restringir os vídeos do canal.

Ao migrar: o admin continua aceitando a URL; só o `lesson-player.tsx` ganha um ramo para o embed/HLS do Bunny.

## Guia para quem sobe o vídeo

1. No YouTube Studio, envie o vídeo e em **Visibilidade** escolha **Não listado**.
2. Copie o link (**Compartilhar → Copiar**). Serve `https://youtu.be/ID` ou `https://www.youtube.com/watch?v=ID`.
3. No admin do Donc: **Módulo → Nova aula**, cole o link em **Vídeo URL** e confira a pré-visualização.
4. A aula nasce como **rascunho**. Edite a aula e ligue **Publicada** — sem a URL real do vídeo a publicação é bloqueada.
5. Para PDF de apoio, cole a URL em **PDF (URL)**.
