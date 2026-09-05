import hashlib
import hmac
import logging

import httpx

from src.middlewares.errors import AppError

logger = logging.getLogger("src.mercadopago")


class MercadoPagoClient:
    """Wrapper fino sobre a API de Assinaturas (Preapproval) do Mercado Pago. `transport` e
    so pra teste (httpx.MockTransport) — em runtime real fica None e o httpx.Client usa rede."""

    def __init__(self, *, access_token: str, base_url: str = "https://api.mercadopago.com", transport: httpx.BaseTransport | None = None) -> None:
        self._client = httpx.Client(
            base_url=base_url,
            headers={"Authorization": f"Bearer {access_token}", "Content-Type": "application/json"},
            transport=transport,
            timeout=15.0,
        )

    def _request(self, method: str, path: str, *, json_body: dict | None = None) -> dict:
        try:
            response = self._client.request(method, path, json=json_body)
        except httpx.HTTPError as exc:
            logger.exception("Falha de rede ao chamar Mercado Pago (%s %s)", method, path)
            raise AppError("Falha ao comunicar com o Mercado Pago.", status_code=502, code="mercadopago_unreachable") from exc
        if response.is_error:
            logger.error("Mercado Pago retornou erro %s em %s %s: %s", response.status_code, method, path, response.text)
            raise AppError("Mercado Pago recusou a requisição.", status_code=502, code="mercadopago_request_failed")
        return response.json()

    def create_preapproval(
        self,
        *,
        payer_email: str,
        reason: str,
        frequency_months: int,
        amount_cents: int,
        back_url: str,
        external_reference: str,
    ) -> dict:
        payload = {
            "reason": reason,
            "payer_email": payer_email,
            "external_reference": external_reference,
            "back_url": back_url,
            "auto_recurring": {
                "frequency": frequency_months,
                "frequency_type": "months",
                "transaction_amount": amount_cents / 100,
                "currency_id": "BRL",
            },
            "status": "pending",
        }
        return self._request("POST", "/preapproval", json_body=payload)

    def get_preapproval(self, preapproval_id: str) -> dict:
        return self._request("GET", f"/preapproval/{preapproval_id}")

    def update_preapproval(self, preapproval_id: str, **fields) -> dict:
        return self._request("PUT", f"/preapproval/{preapproval_id}", json_body=fields)

    @staticmethod
    def verify_webhook_signature(*, x_signature: str, x_request_id: str, data_id: str, secret: str) -> bool:
        """Formato de x-signature: "ts=<epoch>,v1=<hmac_sha256_hex>". Manifest conforme doc do
        Mercado Pago: "id:{data_id};request-id:{x-request-id};ts:{ts};"."""
        parts: dict[str, str] = {}
        for chunk in x_signature.split(","):
            if "=" not in chunk:
                continue
            key, _, value = chunk.partition("=")
            parts[key.strip()] = value.strip()

        ts = parts.get("ts")
        received_v1 = parts.get("v1")
        if not ts or not received_v1:
            return False

        manifest = f"id:{data_id};request-id:{x_request_id};ts:{ts};"
        expected_v1 = hmac.new(secret.encode(), manifest.encode(), hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected_v1, received_v1)
