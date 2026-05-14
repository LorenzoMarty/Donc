# Docker

O `docker-compose.yml` da raiz sobe:

- `db`: PostgreSQL 16
- `backend`: FastAPI em Python 3.13
- `frontend`: Next.js em Node 22

Use:

```bash
docker-compose up --build
```

O backend aguarda o healthcheck do PostgreSQL antes de iniciar. As tabelas e dados demo sao criados automaticamente no startup da API.

