from typing import Generic, Literal, TypeVar

from pydantic import BaseModel


DataT = TypeVar("DataT")


class ApiResponse(BaseModel, Generic[DataT]):
    success: Literal[True] = True
    message: str = ""
    data: DataT


class ApiErrorResponse(BaseModel):
    success: Literal[False] = False
    message: str
    error: str


def success_response(data: DataT, message: str = "") -> ApiResponse[DataT]:
    return ApiResponse(data=data, message=message)


class MessageResponse(BaseModel):
    message: str


class HealthData(BaseModel):
    status: str
    service: str
