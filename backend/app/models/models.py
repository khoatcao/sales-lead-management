import enum
from datetime import datetime
from decimal import Decimal

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class RoleEnum(str, enum.Enum):
    salesperson = "salesperson"
    manager = "manager"
    admin = "admin"


class LeadStatusEnum(str, enum.Enum):
    new = "new"
    contacted = "contacted"
    negotiating = "negotiating"
    closed = "closed"
    lost = "lost"


class LeadSourceEnum(str, enum.Enum):
    website = "website"
    walk_in = "walk_in"
    referral = "referral"
    phone = "phone"


class PriorityEnum(str, enum.Enum):
    hot = "hot"
    warm = "warm"
    cold = "cold"


class ConditionEnum(str, enum.Enum):
    excellent = "excellent"
    good = "good"
    fair = "fair"
    poor = "poor"


class UrgencyEnum(str, enum.Enum):
    urgent = "urgent"
    flexible = "flexible"
    no_rush = "no_rush"


class NoteTypeEnum(str, enum.Enum):
    phone_call = "phone_call"
    email = "email"
    meeting = "meeting"
    other = "other"


class SentimentEnum(str, enum.Enum):
    positive = "positive"
    neutral = "neutral"
    negative = "negative"


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[RoleEnum] = mapped_column(Enum(RoleEnum), default=RoleEnum.salesperson)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    assigned_leads: Mapped[list["Lead"]] = relationship(
        "Lead", back_populates="salesperson", foreign_keys="Lead.assigned_to"
    )
    notes: Mapped[list["LeadNote"]] = relationship("LeadNote", back_populates="author")


class Lead(Base):
    __tablename__ = "leads"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    seller_name: Mapped[str] = mapped_column(String(100))
    seller_email: Mapped[str] = mapped_column(String(255), index=True)
    seller_phone: Mapped[str | None] = mapped_column(String(20))
    status: Mapped[LeadStatusEnum] = mapped_column(Enum(LeadStatusEnum), default=LeadStatusEnum.new)
    priority: Mapped[PriorityEnum] = mapped_column(Enum(PriorityEnum), default=PriorityEnum.warm)
    source: Mapped[LeadSourceEnum] = mapped_column(
        Enum(LeadSourceEnum), default=LeadSourceEnum.website
    )
    assigned_to: Mapped[int | None] = mapped_column(Integer, ForeignKey("users.id"))
    ai_score: Mapped[int | None] = mapped_column(Integer)
    ai_summary: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    salesperson: Mapped["User | None"] = relationship(
        "User", back_populates="assigned_leads", foreign_keys=[assigned_to]
    )
    car: Mapped["Car | None"] = relationship("Car", back_populates="lead", uselist=False)
    notes: Mapped[list["LeadNote"]] = relationship(
        "LeadNote",
        back_populates="lead",
        order_by="LeadNote.created_at",
        cascade="all, delete-orphan",
    )


class Car(Base):
    __tablename__ = "cars"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    lead_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("leads.id", ondelete="CASCADE"), unique=True
    )
    make: Mapped[str] = mapped_column(String(50))
    model: Mapped[str] = mapped_column(String(50))
    year: Mapped[int] = mapped_column(Integer)
    mileage: Mapped[int] = mapped_column(Integer)
    condition: Mapped[ConditionEnum] = mapped_column(
        Enum(ConditionEnum), default=ConditionEnum.good
    )
    asking_price: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    urgency: Mapped[UrgencyEnum] = mapped_column(Enum(UrgencyEnum), default=UrgencyEnum.flexible)
    notes: Mapped[str | None] = mapped_column(Text)

    lead: Mapped["Lead"] = relationship("Lead", back_populates="car")
    features: Mapped[list["CarFeature"]] = relationship(
        "CarFeature", back_populates="car", cascade="all, delete-orphan"
    )
    photos: Mapped[list["CarPhoto"]] = relationship(
        "CarPhoto",
        back_populates="car",
        cascade="all, delete-orphan",
        order_by="CarPhoto.sort_order",
    )


class CarFeature(Base):
    __tablename__ = "car_features"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    car_id: Mapped[int] = mapped_column(Integer, ForeignKey("cars.id", ondelete="CASCADE"))
    feature: Mapped[str] = mapped_column(String(100))

    car: Mapped["Car"] = relationship("Car", back_populates="features")


class CarPhoto(Base):
    __tablename__ = "car_photos"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    car_id: Mapped[int] = mapped_column(Integer, ForeignKey("cars.id", ondelete="CASCADE"))
    url: Mapped[str] = mapped_column(String(500))
    label: Mapped[str] = mapped_column(String(50), default="other")
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    car: Mapped["Car"] = relationship("Car", back_populates="photos")


class LeadNote(Base):
    __tablename__ = "lead_notes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    lead_id: Mapped[int] = mapped_column(Integer, ForeignKey("leads.id", ondelete="CASCADE"))
    author_id: Mapped[int] = mapped_column(Integer, ForeignKey("users.id"))
    note: Mapped[str] = mapped_column(Text)
    type: Mapped[NoteTypeEnum | None] = mapped_column(Enum(NoteTypeEnum))
    sentiment: Mapped[SentimentEnum | None] = mapped_column(Enum(SentimentEnum))
    next_action: Mapped[str | None] = mapped_column(Text)
    ai_enriched: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    lead: Mapped["Lead"] = relationship("Lead", back_populates="notes")
    author: Mapped["User"] = relationship("User", back_populates="notes")
