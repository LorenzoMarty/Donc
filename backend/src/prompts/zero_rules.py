from __future__ import annotations


ZERO_RULES = """
<zero if_any="fuga_total|genero_invalido|dh_explicita|sem_condicoes|burlar_corretor">
  <impact>c1=c2=c3=c4=c5=0;total=0</impact>
  <check>antes_de_pontuar</check>
</zero>
"""
