"""
Database configuration and session management for TaskMaster.
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker,declarative_base
from sqlalchemy.pool import StaticPool
import os
from dotenv import load_dotenv
import logging
from urllib.parse import quote_plus

logger = logging.getLogger(__name__)

# Load environment variables from .env
load_dotenv()

# Fetch variables
USER = os.getenv("user")
PASSWORD = os.getenv("password")
HOST = os.getenv("host")
PORT = os.getenv("port")
DBNAME = os.getenv("dbname")

# Construct the SQLAlchemy connection string
required_vars = {
    "user": USER,
    "password": PASSWORD,
    "host": HOST,
    "port": PORT,
    "dbname": DBNAME,
}

missing = [name for name, value in required_vars.items() if not value]

if missing:
    raise RuntimeError(
        f"Missing required database environment variables: {', '.join(missing)}"
    )


ENCODED_PASSWORD = quote_plus(PASSWORD)

# Construct the SQLAlchemy connection string
DATABASE_URL = f"postgresql+psycopg2://{USER}:{ENCODED_PASSWORD}@{HOST}:{PORT}/{DBNAME}?sslmode=require"


engine = create_engine(
    DATABASE_URL,
    echo=False,
)

# Test the connection
# Test the database connection
try:
    with engine.connect() as connection:
        logger.info("Database connection established successfully.")
except Exception:
    logger.exception("Failed to connect to the database.")
    raise

# Create sessionmaker
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create base class for declarative models
Base = declarative_base()

# Dependency to get database session
def get_db():
    """
    Dependency function that yields a database session.
    Ensures the session is closed after use.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# Function to create all tables
def create_tables():
    """Create all database tables."""
    Base.metadata.create_all(bind=engine)