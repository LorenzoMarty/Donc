from __future__ import annotations


SCORING_RULES = """
<scoring levels="0,40,80,120,160,200">
  <c1 name="norma" light="160-200:poucos_desvios" med="120-160:recorrencia" severe="0-120:oralidade/compreensao"/>
  <c2 name="tema_genero" light="160-200:aprofundamento_limitado" med="80-160:fuga_parcial/superficial" severe="0:fuga_total/genero"/>
  <c3 name="argumentacao" weight="critico_900+" light="160-200:pouco_aprofunda" med="120-160:raso/contradicao" severe="80-120:sem_desenvolvimento"/>
  <c4 name="coesao" light="160-200:repeticao_leve" med="120-160:conectivo_ruim" severe="80-120:frases_soltas"/>
  <c5 name="intervencao" req="agente,acao,meio,finalidade" light="160-200:pouco_detalhe" med="120-160:vaga" severe="80-120:incompleta/desconectada"/>
</scoring>
"""


SCORING_METHOD = """
<method>zero_check->evidencias->gravidade->nivel->score;priorizar:c3,c4,c5,c1</method>
"""
