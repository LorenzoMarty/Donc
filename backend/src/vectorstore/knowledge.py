from __future__ import annotations

from src.config.settings import settings


def build_agno_knowledge():
    if not (settings.enable_pgvector and settings.openai_api_key and settings.database_url.startswith("postgres")):
        return None
    try:
        from agno.embedder.openai import OpenAIEmbedder
        from agno.knowledge.knowledge import Knowledge
        from agno.vectordb.pgvector import PgVector

        vector_db = PgVector(
            table_name="ai_knowledge_chunks",
            db_url=settings.database_url,
            embedder=OpenAIEmbedder(id=settings.openai_embedding_model, dimensions=settings.openai_embedding_dimensions),
        )
        return Knowledge(vector_db=vector_db)
    except Exception:
        return None
