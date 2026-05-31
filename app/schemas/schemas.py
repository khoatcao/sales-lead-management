from datetime import datetime
from decimal import Decimal
from typing import Generic, TypeVar

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.models import (
    ConditionEnum,
    LeadStatusEnum,
    NoteTypeEnum,
    PriorityEnum,
    RoleEnum,
    SentimentEnum,
    UrgencyEnum,
)

T = TypeVar("T")


# ---------------------------------------------------------------------------
# User
# ---------------------------------------------------------------------------


class UserCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8)
    role: RoleEnum = RoleEnum.salesperson


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    role: RoleEnum
    created_at: datetime


# ---------------------------------------------------------------------------
# Car
# ---------------------------------------------------------------------------


class CarPhotoCreate(BaseModel):
    url: str
    label: str = "other"


class CarPhotoResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    url: str
    label: str
    sort_order: int


class CarFeatureResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    feature: str


class CarCreate(BaseModel):
    make: str = Field(min_length=1, max_length=50)
    model: str = Field(min_length=1, max_length=50)
    year: int = Field(ge=1900, le=2100)
    mileage: int = Field(ge=0)
    condition: ConditionEnum = ConditionEnum.good
    asking_price: Decimal = Field(gt=0, decimal_places=2)
    urgency: UrgencyEnum = UrgencyEnum.flexible
    notes: str | None = None
    features: list[str] = []
    photos: list[CarPhotoCreate] = []


class CarResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    make: str
    model: str
    year: int
    mileage: int
    condition: ConditionEnum
    asking_price: Decimal
    urgency: UrgencyEnum
    notes: str | None
    features: list[CarFeatureResponse] = []
    photos: list[CarPhotoResponse] = []


# ---------------------------------------------------------------------------
# Lead Note
# ---------------------------------------------------------------------------


class LeadNoteCreate(BaseModel):
    note: str = Field(min_length=1)


class LeadNoteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    note: str
    type: NoteTypeEnum | None
    sentiment: SentimentEnum | None
    next_action: str | None
    ai_enriched: bool
    created_at: datetime
    author: UserResponse


# ---------------------------------------------------------------------------
# Lead
# ---------------------------------------------------------------------------


class LeadCreate(BaseModel):
    seller_name: str = Field(min_length=1, max_length=100)
    seller_email: EmailStr
    seller_phone: str | None = None
    car: CarCreate


class LeadUpdate(BaseModel):
    status: LeadStatusEnum | None = None
    assigned_to: int | None = None


class LeadListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    seller_name: str
    seller_email: str
    seller_phone: str | None
    status: LeadStatusEnum
    priority: PriorityEnum
    ai_score: int | None
    created_at: datetime
    car: CarResponse | None = None


class LeadDetailResponse(LeadListItem):
    ai_summary: str | None
    salesperson: UserResponse | None = None
    notes: list[LeadNoteResponse] = []


# ---------------------------------------------------------------------------
# Auth
# ---------------------------------------------------------------------------


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


# ---------------------------------------------------------------------------
# Pagination
# ---------------------------------------------------------------------------


class PaginatedResponse(BaseModel, Generic[T]):
    total: int
    page: int
    per_page: int
    items: list[T]
