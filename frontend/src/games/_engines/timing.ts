/**
 * Folga (ms) entre o cronômetro visual chegar a zero e o jogo de fato registrar "tempo esgotado".
 * Não muda a dificuldade (a contagem exibida continua igual pra todo mundo) — só garante que um
 * toque/clique que já estava em andamento no instante do zero tenha tempo de ser processado antes
 * de virar derrota por timeout. Sem essa folga, dedo/caneta perdem por diferença de latência de
 * input, não por desempenho no jogo.
 */
export const INPUT_GRACE_MS = 250;
