from src.agents.repertoire_v2.agent import RepertoireAnalyzerV2Agent


def _fallback(content: str):
    return RepertoireAnalyzerV2Agent()._fallback(content=content)


def test_flags_unknown_authority_attribution_as_false_citation():
    result = _fallback(
        "Segundo o renomado filósofo John Blackwood, a sociedade moderna sofre com isso."
    )
    assert result.false_citations is True
    assert result.quality == "INVALIDO"


def test_does_not_flag_known_author_attribution():
    result = _fallback(
        "Segundo o sociólogo Zygmunt Bauman, vivemos em uma modernidade líquida "
        "que demonstra a fragilidade dos vínculos sociais contemporâneos."
    )
    assert result.false_citations is False


def test_flags_unsourced_statistic():
    result = _fallback("Cerca de 87% das pessoas concordam que a educação precisa mudar.")
    assert result.false_citations is True
    assert result.quality == "INVALIDO"


def test_does_not_flag_sourced_statistic():
    result = _fallback(
        "Segundo dados do IBGE, 87% das pessoas concordam que a educação precisa mudar, "
        "o que demonstra a urgência do tema."
    )
    assert result.false_citations is False


def test_generic_essay_without_repertoire_stays_fraco():
    result = _fallback("Nesse sentido, a sociedade precisa se conscientizar sobre o tema.")
    assert result.false_citations is False
    assert result.quality == "FRACO"
