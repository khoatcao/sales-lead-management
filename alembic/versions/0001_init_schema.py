"""init schema

Revision ID: 0001
Revises:
Create Date: 2026-05-29

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- Enums ---
    role_enum = sa.Enum("salesperson", "manager", "admin", name="roleenum")
    lead_status_enum = sa.Enum(
        "new", "contacted", "negotiating", "closed", "lost", name="leadstatusenum"
    )
    lead_source_enum = sa.Enum(
        "website", "walk_in", "referral", "phone", name="leadsourceenum"
    )
    priority_enum = sa.Enum("hot", "warm", "cold", name="priorityenum")
    condition_enum = sa.Enum(
        "excellent", "good", "fair", "poor", name="conditionenum"
    )
    urgency_enum = sa.Enum("urgent", "flexible", "no_rush", name="urgencyenum")
    note_type_enum = sa.Enum(
        "phone_call", "email", "meeting", "other", name="notetypeenum"
    )
    sentiment_enum = sa.Enum(
        "positive", "neutral", "negative", name="sentimentenum"
    )

    # --- users ---
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("email", sa.String(255), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column(
            "role",
            role_enum,
            nullable=False,
            server_default="salesperson",
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)

    # --- leads ---
    op.create_table(
        "leads",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("seller_name", sa.String(100), nullable=False),
        sa.Column("seller_email", sa.String(255), nullable=False),
        sa.Column("seller_phone", sa.String(20), nullable=True),
        sa.Column(
            "status",
            lead_status_enum,
            nullable=False,
            server_default="new",
        ),
        sa.Column(
            "priority",
            priority_enum,
            nullable=False,
            server_default="warm",
        ),
        sa.Column(
            "source",
            lead_source_enum,
            nullable=False,
            server_default="website",
        ),
        sa.Column(
            "assigned_to",
            sa.Integer(),
            sa.ForeignKey("users.id"),
            nullable=True,
        ),
        sa.Column("ai_score", sa.Integer(), nullable=True),
        sa.Column("ai_summary", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )
    op.create_index("ix_leads_seller_email", "leads", ["seller_email"])

    # --- cars ---
    op.create_table(
        "cars",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "lead_id",
            sa.Integer(),
            sa.ForeignKey("leads.id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("make", sa.String(50), nullable=False),
        sa.Column("model", sa.String(50), nullable=False),
        sa.Column("year", sa.Integer(), nullable=False),
        sa.Column("mileage", sa.Integer(), nullable=False),
        sa.Column(
            "condition",
            condition_enum,
            nullable=False,
            server_default="good",
        ),
        sa.Column("asking_price", sa.Numeric(10, 2), nullable=False),
        sa.Column(
            "urgency",
            urgency_enum,
            nullable=False,
            server_default="flexible",
        ),
        sa.Column("notes", sa.Text(), nullable=True),
    )

    # --- car_features ---
    op.create_table(
        "car_features",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "car_id",
            sa.Integer(),
            sa.ForeignKey("cars.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("feature", sa.String(100), nullable=False),
    )

    # --- car_photos ---
    op.create_table(
        "car_photos",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "car_id",
            sa.Integer(),
            sa.ForeignKey("cars.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("url", sa.String(500), nullable=False),
        sa.Column("label", sa.String(50), nullable=False, server_default="other"),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
    )

    # --- lead_notes ---
    op.create_table(
        "lead_notes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "lead_id",
            sa.Integer(),
            sa.ForeignKey("leads.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "author_id",
            sa.Integer(),
            sa.ForeignKey("users.id"),
            nullable=False,
        ),
        sa.Column("note", sa.Text(), nullable=False),
        sa.Column("type", note_type_enum, nullable=True),
        sa.Column("sentiment", sentiment_enum, nullable=True),
        sa.Column("next_action", sa.Text(), nullable=True),
        sa.Column(
            "ai_enriched", sa.Boolean(), nullable=False, server_default="false"
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("now()"),
            nullable=False,
        ),
    )


def downgrade() -> None:
    op.drop_table("lead_notes")
    op.drop_table("car_photos")
    op.drop_table("car_features")
    op.drop_table("cars")
    op.drop_table("leads")
    op.drop_table("users")

    # Drop enums
    sa.Enum(name="sentimentenum").drop(op.get_bind())
    sa.Enum(name="notetypeenum").drop(op.get_bind())
    sa.Enum(name="urgencyenum").drop(op.get_bind())
    sa.Enum(name="conditionenum").drop(op.get_bind())
    sa.Enum(name="priorityenum").drop(op.get_bind())
    sa.Enum(name="leadsourceenum").drop(op.get_bind())
    sa.Enum(name="leadstatusenum").drop(op.get_bind())
    sa.Enum(name="roleenum").drop(op.get_bind())
