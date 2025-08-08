from datetime import time
import random
import uuid

from faker import Faker

from app.core.auth import get_password_hash
from app.core.database import SessionLocal
from app.models.database import (
    User,
    ServiceProvider,
    Service,
    AvailabilityTemplate,
)

fake = Faker()

DEFAULT_CUSTOMER_PASSWORD = "customer123"
DEFAULT_PROVIDER_PASSWORD = "provider123"


def seed_random_data(num_customers: int = 8, num_providers: int = 4) -> None:
    """Populate the database with *random* but realistic demo content.

    The seeding runs *once* – if any users already exist we assume the
    database was previously initialised and exit early.

    Parameters
    ----------
    num_customers: int, default **8**
        Amount of customer accounts to create.
    num_providers: int, default **4**
        Amount of service providers/businesses to create.
    """

    db = SessionLocal()

    try:
        # Guard-clause: don't create duplicates if the DB is already populated
        if db.query(User).first():
            return

        # ------------------------------------------------------------------
        # Customers
        # ------------------------------------------------------------------
        for _ in range(num_customers):
            full_name = fake.name()
            email = fake.unique.email()
            db.add(
                User(
                    email=email,
                    full_name=full_name,
                    hashed_password=get_password_hash(DEFAULT_CUSTOMER_PASSWORD),
                    user_type="customer",
                )
            )

        db.commit()

        # ------------------------------------------------------------------
        # Service Providers and related entities
        # ------------------------------------------------------------------
        service_categories = [
            "Beauty & Wellness",
            "Home Services",
            "Automotive",
            "Health & Fitness",
            "Professional Services",
            "Pet Care",
        ]

        for _ in range(num_providers):
            # Create the underlying user account first
            provider_user = User(
                email=fake.unique.company_email(),
                full_name=fake.name(),
                hashed_password=get_password_hash(DEFAULT_PROVIDER_PASSWORD),
                user_type="service_provider",
            )
            db.add(provider_user)
            db.commit()  # Need PK for FK below

            # Business profile
            business_profile = ServiceProvider(
                user_id=provider_user.id,
                business_name=fake.company(),
                description=fake.text(max_nb_chars=180),
                phone=fake.phone_number(),
                address=fake.street_address(),
                city=fake.city(),
                state=fake.state_abbr(),
                zip_code=fake.zipcode(),
                profile_image_url=f"https://picsum.photos/seed/{uuid.uuid4()}/400/400",
                rating=round(random.uniform(3.5, 5.0), 1),
                total_reviews=random.randint(5, 350),
            )
            db.add(business_profile)
            db.commit()  # Need PK for FK below

            # Between 2-5 services per provider
            for _ in range(random.randint(2, 5)):
                db.add(
                    Service(
                        provider_id=business_profile.id,
                        name=fake.catch_phrase(),
                        description=fake.text(max_nb_chars=120),
                        duration=random.choice([30, 45, 60, 90, 120]),
                        price=round(random.uniform(20.0, 250.0), 2),
                        category=random.choice(service_categories),
                    )
                )

            # Availability template – Mon-Fri 9-17 (optionally Sat 10-14)
            for day in range(1, 6):  # 1=Mon … 5=Fri
                db.add(
                    AvailabilityTemplate(
                        provider_id=business_profile.id,
                        day_of_week=day,
                        start_time=time(9, 0),
                        end_time=time(17, 0),
                        slot_duration=random.choice([30, 45, 60]),
                        is_enabled=True,
                    )
                )

            # 30 % chance provider also works Saturday
            if random.random() < 0.3:
                db.add(
                    AvailabilityTemplate(
                        provider_id=business_profile.id,
                        day_of_week=6,  # Saturday
                        start_time=time(10, 0),
                        end_time=time(14, 0),
                        slot_duration=60,
                        is_enabled=True,
                    )
                )

            db.commit()

    finally:
        db.close() 