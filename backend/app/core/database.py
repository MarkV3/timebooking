from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from app.models.database import Base

# Create the SQLAlchemy engine
engine = create_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG if hasattr(settings, 'DEBUG') else False,
    pool_pre_ping=True,
    pool_recycle=300,
)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

def get_db():
    """Dependency to get database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def _migrate_sqlite_schema_if_needed():
    """Perform minimal, in-place SQLite migrations for existing tables.

    This adds any missing columns that were introduced after the initial table creation,
    without dropping data. Currently focuses on the `users` table to ensure login works.
    """
    try:
        # Only handle SQLite here; other databases should rely on proper migrations.
        if engine.url.get_backend_name() != "sqlite":
            return

        with engine.connect() as connection:
            # Identify existing columns on users table
            result = connection.exec_driver_sql("PRAGMA table_info(users)")
            columns = [row[1] for row in result.fetchall()]  # row[1] = column name

            if not columns:
                # users table doesn't exist yet; nothing to migrate here
                return

            # Define expected columns and their ALTER statements if missing
            alter_statements = {
                "auth_provider": "ALTER TABLE users ADD COLUMN auth_provider VARCHAR DEFAULT 'email'",
                "stripe_customer_id": "ALTER TABLE users ADD COLUMN stripe_customer_id VARCHAR",
                "google_calendar_token": "ALTER TABLE users ADD COLUMN google_calendar_token TEXT",
                "google_calendar_enabled": "ALTER TABLE users ADD COLUMN google_calendar_enabled BOOLEAN DEFAULT 0",
                "created_at": "ALTER TABLE users ADD COLUMN created_at DATETIME",
                "updated_at": "ALTER TABLE users ADD COLUMN updated_at DATETIME",
            }

            for column_name, alter_sql in alter_statements.items():
                if column_name not in columns:
                    connection.exec_driver_sql(alter_sql)

            # Ensure auth_provider is set for pre-existing rows
            connection.exec_driver_sql(
                "UPDATE users SET auth_provider = COALESCE(auth_provider, 'email') WHERE auth_provider IS NULL"
            )
    except Exception:
        # Avoid blocking app startup if a best-effort migration fails
        # (e.g., concurrent migrations or permissions). The error will still be visible in logs.
        pass

def create_tables():
    """Create all tables in the database"""
    Base.metadata.create_all(bind=engine)
    # Apply best-effort, non-destructive migrations for SQLite if existing tables are outdated
    _migrate_sqlite_schema_if_needed()

def drop_tables():
    """Drop all tables in the database (for development only)"""
    Base.metadata.drop_all(bind=engine) 