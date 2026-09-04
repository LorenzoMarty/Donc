"""Paginacao server-side de /admin/users (auditoria de UX #6.2) — sem isso, a tabela de admin
crescia proporcional ao total de alunos cadastrados, tanto na resposta HTTP quanto no DOM."""

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from src.config.security import get_password_hash
from src.database.session import SessionLocal, get_db
from src.dependencies import require_admin
from src.main import app
from src.models import User, UserRole


def api_data(response):
    payload = response.json()
    assert payload["success"] is True
    return payload["data"]


def override_admin(db: Session = Depends(get_db)) -> User:
    user = db.scalar(select(User).where(User.email == "admin@demo.com"))
    assert user is not None
    return user


def _seed_students(n: int, *, prefix: str) -> None:
    db = SessionLocal()
    try:
        for i in range(n):
            db.add(
                User(
                    name=f"{prefix} {i}",
                    email=f"{prefix.lower()}{i}@paginacao.test",
                    hashed_password=get_password_hash("12345678"),
                    role=UserRole.STUDENT,
                )
            )
        db.commit()
    finally:
        db.close()


def test_users_list_respects_limit_and_reports_total(client):
    _seed_students(5, prefix="PagAlpha")
    app.dependency_overrides[require_admin] = override_admin
    try:
        response = client.get("/api/v1/admin/users?limit=3&offset=0")
        assert response.status_code == 200
        data = api_data(response)
        assert len(data["items"]) == 3
        assert data["total"] >= 5
    finally:
        app.dependency_overrides.pop(require_admin, None)


def test_users_list_offset_pages_through_without_overlap(client):
    _seed_students(5, prefix="PagBeta")
    app.dependency_overrides[require_admin] = override_admin
    try:
        page1 = api_data(client.get("/api/v1/admin/users?limit=3&offset=0&search=PagBeta"))
        page2 = api_data(client.get("/api/v1/admin/users?limit=3&offset=3&search=PagBeta"))
    finally:
        app.dependency_overrides.pop(require_admin, None)

    ids_page1 = {item["id"] for item in page1["items"]}
    ids_page2 = {item["id"] for item in page2["items"]}
    assert page1["total"] == 5
    assert len(ids_page1) == 3
    assert len(ids_page2) == 2
    assert ids_page1.isdisjoint(ids_page2)


def test_users_list_search_filters_by_name_or_email(client):
    _seed_students(2, prefix="PagGamma")
    app.dependency_overrides[require_admin] = override_admin
    try:
        response = client.get("/api/v1/admin/users?search=paggamma")
    finally:
        app.dependency_overrides.pop(require_admin, None)

    data = api_data(response)
    assert data["total"] == 2
    assert all("paggamma" in item["name"].lower() for item in data["items"])


def test_reviewers_list_only_returns_admins_not_paginated(client):
    """Temas/Jogos usam essa lista pra traduzir reviewed_by em nome — nao pode depender da
    paginacao da tabela de Alunos (achado de UX, acoplamento resolvido separando os dois)."""
    _seed_students(30, prefix="PagDelta")
    app.dependency_overrides[require_admin] = override_admin
    try:
        response = client.get("/api/v1/admin/reviewers")
    finally:
        app.dependency_overrides.pop(require_admin, None)

    assert response.status_code == 200
    reviewers = api_data(response)
    assert all("id" in r and "name" in r for r in reviewers)
    assert len(reviewers) < 30
    db = SessionLocal()
    try:
        admin_count = len(list(db.scalars(select(User).where(User.role == UserRole.ADMIN, User.deleted_at.is_(None)))))
    finally:
        db.close()
    assert len(reviewers) == admin_count
