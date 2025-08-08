
"""
Seed the database with initial test data
"""
from datetime import time
from app.core.database import SessionLocal, create_tables
from app.core.auth import get_password_hash
from app.models.database import User, ServiceProvider, Service, AvailabilityTemplate

def create_test_data():
    """Create test users, service providers, and services"""
    db = SessionLocal()
    
    try:
        # Check if data already exists
        if db.query(User).first():
            print("Data already exists, skipping seed...")
            return
        
        # Create 5 customer users
        customers = []
        customer_data = [
            ("john.doe@email.com", "John Doe", "customer123"),
            ("jane.smith@email.com", "Jane Smith", "customer456"),
            ("mike.johnson@email.com", "Mike Johnson", "customer789"),
            ("sarah.wilson@email.com", "Sarah Wilson", "customer012"),
            ("alex.brown@email.com", "Alex Brown", "customer345"),
        ]
        
        for email, name, password in customer_data:
            user = User(
                email=email,
                full_name=name,
                hashed_password=get_password_hash(password),
                user_type="customer"
            )
            db.add(user)
            customers.append(user)
        
        # Create 2 service provider users
        provider_users = []
        provider_user_data = [
            ("bella.salon@email.com", "Maria Rodriguez", "provider123"),
            ("techfix.pro@email.com", "David Chen", "provider456"),
        ]
        
        for email, name, password in provider_user_data:
            user = User(
                email=email,
                full_name=name,
                hashed_password=get_password_hash(password),
                user_type="service_provider"
            )
            db.add(user)
            provider_users.append(user)
        
        # Commit users first
        db.commit()
        
        # Create service provider profiles
        providers = []
        
        # Bella's Beauty Salon
        bella_salon = ServiceProvider(
            user_id=provider_users[0].id,
            business_name="Bella's Beauty Salon",
            description="Premium beauty services including hair styling, manicures, and spa treatments. We use only the highest quality products and techniques.",
            phone="(555) 123-4567",
            address="123 Beauty Avenue",
            city="New York",
            state="NY",
            zip_code="10001",
            profile_image_url="https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400",
            rating=4.8,
            total_reviews=156
        )
        db.add(bella_salon)
        providers.append(bella_salon)
        
        # TechFix Pro
        tech_fix = ServiceProvider(
            user_id=provider_users[1].id,
            business_name="TechFix Pro",
            description="Professional computer and mobile device repair services. Fast, reliable, and affordable solutions for all your tech problems.",
            phone="(555) 987-6543",
            address="456 Tech Street",
            city="San Francisco",
            state="CA",
            zip_code="94102",
            profile_image_url="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=400",
            rating=4.6,
            total_reviews=89
        )
        db.add(tech_fix)
        providers.append(tech_fix)
        
        # Commit providers
        db.commit()
        
        # Create services for Bella's Beauty Salon
        bella_services = [
            ("Haircut & Style", "Professional haircut and styling service", 60, 65.00, "Beauty & Wellness"),
            ("Manicure & Pedicure", "Complete nail care with polish and design", 90, 45.00, "Beauty & Wellness"),
            ("Facial Treatment", "Deep cleansing and rejuvenating facial", 75, 80.00, "Beauty & Wellness"),
            ("Hair Coloring", "Professional hair coloring and highlights", 120, 120.00, "Beauty & Wellness"),
        ]
        
        for name, desc, duration, price, category in bella_services:
            service = Service(
                provider_id=bella_salon.id,
                name=name,
                description=desc,
                duration=duration,
                price=price,
                category=category
            )
            db.add(service)
        
        # Create services for TechFix Pro
        tech_services = [
            ("Computer Diagnosis", "Comprehensive computer diagnostic and repair", 45, 75.00, "Professional Services"),
            ("Phone Screen Repair", "Professional smartphone screen replacement", 30, 89.00, "Professional Services"),
            ("Laptop Cleaning", "Deep cleaning and maintenance for laptops", 60, 55.00, "Professional Services"),
            ("Data Recovery", "Professional data recovery for damaged devices", 90, 150.00, "Professional Services"),
        ]
        
        for name, desc, duration, price, category in tech_services:
            service = Service(
                provider_id=tech_fix.id,
                name=name,
                description=desc,
                duration=duration,
                price=price,
                category=category
            )
            db.add(service)
        
        # Create availability templates for both providers
        # Bella's Salon - Mon-Fri 9AM-6PM, Sat 9AM-5PM
        bella_availability = [
            (1, time(9, 0), time(18, 0), 60, time(12, 0), time(13, 0)),  # Monday
            (2, time(9, 0), time(18, 0), 60, time(12, 0), time(13, 0)),  # Tuesday
            (3, time(9, 0), time(18, 0), 60, time(12, 0), time(13, 0)),  # Wednesday
            (4, time(9, 0), time(18, 0), 60, time(12, 0), time(13, 0)),  # Thursday
            (5, time(9, 0), time(18, 0), 60, time(12, 0), time(13, 0)),  # Friday
            (6, time(9, 0), time(17, 0), 60, None, None),                # Saturday
        ]
        
        for day, start, end, duration, break_start, break_end in bella_availability:
            template = AvailabilityTemplate(
                provider_id=bella_salon.id,
                day_of_week=day,
                start_time=start,
                end_time=end,
                slot_duration=duration,
                break_start_time=break_start,
                break_end_time=break_end,
                is_enabled=True
            )
            db.add(template)
        
        # TechFix Pro - Mon-Fri 8AM-6PM, Sat 10AM-4PM
        tech_availability = [
            (1, time(8, 0), time(18, 0), 45, time(12, 0), time(13, 0)),  # Monday
            (2, time(8, 0), time(18, 0), 45, time(12, 0), time(13, 0)),  # Tuesday
            (3, time(8, 0), time(18, 0), 45, time(12, 0), time(13, 0)),  # Wednesday
            (4, time(8, 0), time(18, 0), 45, time(12, 0), time(13, 0)),  # Thursday
            (5, time(8, 0), time(18, 0), 45, time(12, 0), time(13, 0)),  # Friday
            (6, time(10, 0), time(16, 0), 45, None, None),               # Saturday
        ]
        
        for day, start, end, duration, break_start, break_end in tech_availability:
            template = AvailabilityTemplate(
                provider_id=tech_fix.id,
                day_of_week=day,
                start_time=start,
                end_time=end,
                slot_duration=duration,
                break_start_time=break_start,
                break_end_time=break_end,
                is_enabled=True
            )
            db.add(template)
        
        # Commit all data
        db.commit()
        
        print("✅ Database seeded successfully!")
        print("\n📋 Created Users:")
        print("👥 Customers:")
        for email, name, password in customer_data:
            print(f"   - {email} | {name} | Password: {password}")
        
        print("\n🏢 Service Providers:")
        for i, (email, name, password) in enumerate(provider_user_data):
            business_name = bella_salon.business_name if i == 0 else tech_fix.business_name
            print(f"   - {email} | {name} | {business_name} | Password: {password}")
        
        print(f"\n💼 Created {len(bella_services + tech_services)} services")
        print(f"📅 Created {len(bella_availability + tech_availability)} availability templates")
        
    except Exception as e:
        print(f"❌ Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()

def save_credentials_to_file():
    """Save user credentials to a text file for easy reference"""
    credentials = """# TimeBooking App Test Credentials

## Customer Accounts
1. Email: john.doe@email.com | Password: customer123 | Name: John Doe
2. Email: jane.smith@email.com | Password: customer456 | Name: Jane Smith  
3. Email: mike.johnson@email.com | Password: customer789 | Name: Mike Johnson
4. Email: sarah.wilson@email.com | Password: customer012 | Name: Sarah Wilson
5. Email: alex.brown@email.com | Password: customer345 | Name: Alex Brown

## Service Provider Accounts
1. Email: bella.salon@email.com | Password: provider123 | Business: Bella's Beauty Salon
   - Location: New York, NY
   - Services: Haircut & Style, Manicure & Pedicure, Facial Treatment, Hair Coloring
   - Hours: Mon-Fri 9AM-6PM, Sat 9AM-5PM

2. Email: techfix.pro@email.com | Password: provider456 | Business: TechFix Pro
   - Location: San Francisco, CA  
   - Services: Computer Diagnosis, Phone Screen Repair, Laptop Cleaning, Data Recovery
   - Hours: Mon-Fri 8AM-6PM, Sat 10AM-4PM

## Usage Instructions
1. Use customer accounts to search for providers, view services, and book appointments
2. Use provider accounts to manage services, view bookings, and update availability
3. All accounts are pre-configured with realistic data for testing

## API Endpoints
- Base URL: http://localhost:8000/api/v1
- Login: POST /auth/login
- Search Providers: GET /providers/search
- View Time Slots: GET /bookings/providers/{provider_id}/time-slots
- Create Booking: POST /bookings/book
"""
    
    try:
        with open("test_credentials.txt", "w") as f:
            f.write(credentials)
        print("💾 Credentials saved to test_credentials.txt")
    except Exception as e:
        print(f"❌ Error saving credentials: {e}")

if __name__ == "__main__":
    import os
    db_file = "timebooking.db"
    if os.path.exists(db_file):
        os.remove(db_file)
    from app.core.database import create_tables
    create_tables()
    create_test_data()
    save_credentials_to_file()
