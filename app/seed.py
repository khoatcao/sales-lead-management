"""
Seed script — populates the database with realistic sample data for demo and testing.

Usage:
    docker-compose exec app python -m app.seed
    # or locally:
    poetry run python -m app.seed
"""

import asyncio
from typing import Any

import structlog
from passlib.context import CryptContext
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import AsyncSessionLocal
from app.models.models import (
    Car,
    CarFeature,
    ConditionEnum,
    Lead,
    LeadNote,
    LeadStatusEnum,
    PriorityEnum,
    RoleEnum,
    UrgencyEnum,
    User,
)

logger = structlog.get_logger()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ---------------------------------------------------------------------------
# Sample data
# ---------------------------------------------------------------------------

USERS: list[dict[str, Any]] = [
    {
        "name": "Alice Johnson",
        "email": "alice@dealer.com",
        "password": "password123",
        "role": RoleEnum.manager,
    },
    {
        "name": "Bob Smith",
        "email": "bob@dealer.com",
        "password": "password123",
        "role": RoleEnum.salesperson,
    },
    {
        "name": "Carol White",
        "email": "carol@dealer.com",
        "password": "password123",
        "role": RoleEnum.salesperson,
    },
]

LEADS: list[dict[str, Any]] = [
    {
        "seller_name": "James Brown",
        "seller_email": "james.brown@example.com",
        "seller_phone": "+44 7700 100001",
        "status": LeadStatusEnum.new,
        "priority": PriorityEnum.hot,
        "ai_score": 88,
        "car": {
            "make": "BMW",
            "model": "3 Series",
            "year": 2021,
            "mileage": 28000,
            "condition": ConditionEnum.excellent,
            "asking_price": 22000,
            "urgency": UrgencyEnum.urgent,
            "features": ["Leather Seats", "Sunroof", "Navigation", "Heated Seats"],
        },
        "notes": [
            "Called seller, very motivated to sell quickly due to relocation.",
            "Sent initial offer of £21,000. Seller is considering.",
        ],
        "assigned_to_index": 1,  # Bob
    },
    {
        "seller_name": "Sarah Connor",
        "seller_email": "sarah.connor@example.com",
        "seller_phone": "+44 7700 100002",
        "status": LeadStatusEnum.contacted,
        "priority": PriorityEnum.warm,
        "ai_score": 65,
        "car": {
            "make": "Toyota",
            "model": "Camry",
            "year": 2020,
            "mileage": 45000,
            "condition": ConditionEnum.good,
            "asking_price": 16500,
            "urgency": UrgencyEnum.flexible,
            "features": ["Bluetooth", "Backup Camera", "Cruise Control"],
        },
        "notes": [
            "Emailed seller with our valuation. Waiting for response.",
        ],
        "assigned_to_index": 2,  # Carol
    },
    {
        "seller_name": "Mike Davis",
        "seller_email": "mike.davis@example.com",
        "seller_phone": "+44 7700 100003",
        "status": LeadStatusEnum.negotiating,
        "priority": PriorityEnum.hot,
        "ai_score": 92,
        "car": {
            "make": "Mercedes-Benz",
            "model": "C-Class",
            "year": 2022,
            "mileage": 15000,
            "condition": ConditionEnum.excellent,
            "asking_price": 35000,
            "urgency": UrgencyEnum.urgent,
            "features": ["AMG Package", "Panoramic Roof", "Burmester Sound", "Night Package"],
        },
        "notes": [
            "Met seller at the dealership. Car is in perfect condition.",
            "Negotiating price — seller wants £34,000, we offered £32,500.",
            "Seller agreed to £33,000. Preparing paperwork.",
        ],
        "assigned_to_index": 1,  # Bob
    },
    {
        "seller_name": "Emma Wilson",
        "seller_email": "emma.wilson@example.com",
        "seller_phone": "+44 7700 100004",
        "status": LeadStatusEnum.new,
        "priority": PriorityEnum.cold,
        "ai_score": 30,
        "car": {
            "make": "Ford",
            "model": "Focus",
            "year": 2016,
            "mileage": 95000,
            "condition": ConditionEnum.fair,
            "asking_price": 6500,
            "urgency": UrgencyEnum.no_rush,
            "features": ["Air Conditioning"],
        },
        "notes": [
            "Left voicemail, no response yet.",
        ],
        "assigned_to_index": 2,  # Carol
    },
    {
        "seller_name": "David Lee",
        "seller_email": "david.lee@example.com",
        "seller_phone": "+44 7700 100005",
        "status": LeadStatusEnum.closed,
        "priority": PriorityEnum.warm,
        "ai_score": 75,
        "car": {
            "make": "Audi",
            "model": "A4",
            "year": 2019,
            "mileage": 52000,
            "condition": ConditionEnum.good,
            "asking_price": 19000,
            "urgency": UrgencyEnum.flexible,
            "features": ["S-Line Package", "Virtual Cockpit", "Adaptive Cruise"],
        },
        "notes": [
            "Called seller, they are open to negotiation.",
            "Deal closed at £18,500. Collecting car tomorrow.",
        ],
        "assigned_to_index": 1,  # Bob
    },
]


# ---------------------------------------------------------------------------
# Seed functions
# ---------------------------------------------------------------------------


async def seed_users(db: AsyncSession) -> list[User]:
    users = []
    for data in USERS:
        existing = await db.scalar(select(User).where(User.email == data["email"]))
        if existing:
            logger.info("user_already_exists", email=data["email"])
            users.append(existing)
            continue

        user = User(
            name=data["name"],
            email=data["email"],
            password_hash=pwd_context.hash(data["password"]),
            role=data["role"],
        )
        db.add(user)
        await db.flush()
        users.append(user)
        logger.info("user_created", email=data["email"], role=data["role"])

    await db.commit()
    return users


async def seed_leads(db: AsyncSession, users: list[User]) -> None:
    for data in LEADS:
        existing = await db.scalar(select(Lead).where(Lead.seller_email == data["seller_email"]))
        if existing:
            logger.info("lead_already_exists", seller_email=data["seller_email"])
            continue

        assigned_user = users[data["assigned_to_index"]]

        lead = Lead(
            seller_name=data["seller_name"],
            seller_email=data["seller_email"],
            seller_phone=data["seller_phone"],
            status=data["status"],
            priority=data["priority"],
            ai_score=data["ai_score"],
            assigned_to=assigned_user.id,
        )
        db.add(lead)
        await db.flush()

        car_data = data["car"]
        car = Car(
            lead_id=lead.id,
            make=car_data["make"],
            model=car_data["model"],
            year=car_data["year"],
            mileage=car_data["mileage"],
            condition=car_data["condition"],
            asking_price=car_data["asking_price"],
            urgency=car_data["urgency"],
        )
        db.add(car)
        await db.flush()

        for feature in car_data.get("features", []):
            db.add(CarFeature(car_id=car.id, feature=feature))

        for note_text in data["notes"]:
            db.add(
                LeadNote(
                    lead_id=lead.id,
                    author_id=assigned_user.id,
                    note=note_text,
                    ai_enriched=False,
                )
            )

        await db.commit()
        logger.info(
            "lead_created",
            seller=data["seller_name"],
            car=f"{car_data['make']} {car_data['model']}",
        )


async def main() -> None:
    logger.info("seeding_started")
    async with AsyncSessionLocal() as db:
        users = await seed_users(db)
        await seed_leads(db, users)
    logger.info("seeding_complete", users=len(USERS), leads=len(LEADS))
    print("\n✓ Seed complete!")
    print("\nLogin credentials:")
    for u in USERS:
        print(f"  {u['role'].value:12} | {u['email']:30} | password: {u['password']}")


if __name__ == "__main__":
    asyncio.run(main())
