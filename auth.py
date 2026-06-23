"""
Authentication utilities for TaskMaster.
"""
from datetime import datetime, timedelta
from typing import Optional
import bcrypt
from jose import JWTError, jwt
import schemas
import models
from database import SessionLocal
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

# Configuration
import os
from dotenv import load_dotenv

load_dotenv()  # Load environment variables from .env file

SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here-change-in-production")  # Should be from environment variable
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30  # 30 minutes for non-remember-me
REFRESH_TOKEN_EXPIRE_DAYS = 30  # 30 days for remember-me

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plain password against its hash."""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


def get_password_hash(password: str) -> str:
    """Generate bcrypt hash of a password."""
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed.decode('utf-8')


def authenticate_user(db: Session, email: str, password: str):
    """Authenticate a user with email and password."""
    user = db.query(models.User).filter(models.User.email == email).first()
    if not user:
        return False
    if not verify_password(password, user.password_hash):
        return False
    return user


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    """Create a JWT access token."""
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def create_access_token_for_user(user_data: dict, remember_me: bool = False):
    """Create an access token for a user with expiration based on remember_me flag."""
    if remember_me:
        expire_delta = timedelta(days=REFRESH_TOKEN_EXPIRE_DAYS)  # 30 days
    else:
        expire_delta = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)  # 30 minutes

    return create_access_token(user_data, expires_delta=expire_delta)


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(lambda: SessionLocal())
):
    """Get the current authenticated user from JWT token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
        token_data = schemas.TokenData(email=email)
    except JWTError:
        raise credentials_exception
    user = db.query(models.User).filter(models.User.email == token_data.email).first()
    if user is None:
        raise credentials_exception
    return user


def get_db():
    """Database dependency."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()