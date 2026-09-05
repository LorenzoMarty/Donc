"""MercadoPagoClient: wrapper fino sobre a API de Assinaturas (Preapproval) + validacao de
assinatura de webhook. Rede mockada via httpx.MockTransport — sem chamada real."""

from __future__ import annotations

import hashlib
import hmac
import json

import httpx
import pytest

from src.services.mercadopago_client import MercadoPagoClient

pytestmark = pytest.mark.unit


def test_create_preapproval_sends_expected_payload_and_parses_response():
    captured = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["method"] = request.method
        captured["url"] = str(request.url)
        captured["auth"] = request.headers.get("authorization")
        captured["body"] = json.loads(request.content)
        return httpx.Response(201, json={"id": "preapproval-123", "init_point": "https://mp.example/checkout/123", "status": "pending"})

    client = MercadoPagoClient(access_token="TEST-token", transport=httpx.MockTransport(handler))
    result = client.create_preapproval(
        payer_email="aluno@teste.com",
        reason="Assinatura Donc mensal",
        frequency_months=1,
        amount_cents=5_900,
        back_url="https://donc.example/assinatura/retorno",
        external_reference="user-42",
    )

    assert captured["method"] == "POST"
    assert captured["url"].endswith("/preapproval")
    assert captured["auth"] == "Bearer TEST-token"
    assert captured["body"]["payer_email"] == "aluno@teste.com"
    assert captured["body"]["auto_recurring"]["transaction_amount"] == 59.00
    assert captured["body"]["auto_recurring"]["frequency"] == 1
    assert captured["body"]["auto_recurring"]["frequency_type"] == "months"
    assert result == {"id": "preapproval-123", "init_point": "https://mp.example/checkout/123", "status": "pending"}


def test_get_preapproval_fetches_by_id():
    def handler(request: httpx.Request) -> httpx.Response:
        assert request.url.path.endswith("/preapproval/preapproval-123")
        return httpx.Response(200, json={"id": "preapproval-123", "status": "authorized", "next_payment_date": "2026-10-04T12:00:00.000-04:00"})

    client = MercadoPagoClient(access_token="TEST-token", transport=httpx.MockTransport(handler))
    result = client.get_preapproval("preapproval-123")
    assert result["status"] == "authorized"


def test_update_preapproval_patches_fields():
    captured = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["method"] = request.method
        captured["body"] = json.loads(request.content)
        return httpx.Response(200, json={"id": "preapproval-123", "status": "cancelled"})

    client = MercadoPagoClient(access_token="TEST-token", transport=httpx.MockTransport(handler))
    result = client.update_preapproval("preapproval-123", status="cancelled")
    assert captured["method"] == "PUT"
    assert captured["body"] == {"status": "cancelled"}
    assert result["status"] == "cancelled"


def test_verify_webhook_signature_accepts_valid_signature():
    secret = "webhook-secret"
    data_id = "123456"
    x_request_id = "req-abc"
    ts = "1700000000"
    manifest = f"id:{data_id};request-id:{x_request_id};ts:{ts};"
    v1 = hmac.new(secret.encode(), manifest.encode(), hashlib.sha256).hexdigest()
    x_signature = f"ts={ts},v1={v1}"

    client = MercadoPagoClient(access_token="TEST-token")
    assert client.verify_webhook_signature(
        x_signature=x_signature, x_request_id=x_request_id, data_id=data_id, secret=secret
    ) is True


def test_verify_webhook_signature_rejects_tampered_signature():
    client = MercadoPagoClient(access_token="TEST-token")
    assert client.verify_webhook_signature(
        x_signature="ts=1700000000,v1=deadbeef", x_request_id="req-abc", data_id="123456", secret="webhook-secret"
    ) is False


def test_verify_webhook_signature_rejects_malformed_header():
    client = MercadoPagoClient(access_token="TEST-token")
    assert client.verify_webhook_signature(
        x_signature="garbage", x_request_id="req-abc", data_id="123456", secret="webhook-secret"
    ) is False
