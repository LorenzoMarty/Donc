import logging

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

logger = logging.getLogger("src.api")


class AppError(Exception):
    def __init__(self, message: str, status_code: int = 400, code: str = "application_error") -> None:
        self.message = message
        self.status_code = status_code
        self.code = code
        super().__init__(message)


def register_error_handlers(app: FastAPI) -> None:
    def error_response(status_code: int, message: str, code: str) -> JSONResponse:
        return JSONResponse(
            status_code=status_code,
            content={"success": False, "message": message, "error": code},
        )

    @app.exception_handler(AppError)
    async def app_error_handler(_: Request, exc: AppError) -> JSONResponse:
        return error_response(exc.status_code, exc.message, exc.code)

    @app.exception_handler(HTTPException)
    async def http_error_handler(_: Request, exc: HTTPException) -> JSONResponse:
        message = exc.detail if isinstance(exc.detail, str) else "Erro HTTP."
        return error_response(exc.status_code, message, "http_error")

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(_: Request, exc: RequestValidationError) -> JSONResponse:
        errors = exc.errors()
        message = "Dados enviados são inválidos."
        first = errors[0] if errors else {}
        if first.get("type") == "value_error":
            # model_validator/field_validator que levantam ValueError chegam aqui prefixados
            # com "Value error, " pelo pydantic v2 — a mensagem especifica que escrevemos no
            # validador (ex.: "A proposta pode ter no maximo 4 textos de apoio.") fica presa
            # nesse prefixo e nunca alcancava o usuario antes desta extracao. Outros tipos de
            # erro (campo faltando, tipo errado) ficam com a mensagem generica — sao menos
            # acionaveis como frase unica quando varios campos podem estar errados.
            cleaned = str(first.get("msg") or "").removeprefix("Value error, ").strip()
            if cleaned:
                message = cleaned
        return error_response(422, message, "validation_error")

    @app.exception_handler(Exception)
    async def unhandled_error_handler(request: Request, exc: Exception) -> JSONResponse:
        logger.exception("Unhandled API error", extra={"path": request.url.path, "method": request.method})
        return error_response(500, "Erro interno inesperado.", "internal_error")
