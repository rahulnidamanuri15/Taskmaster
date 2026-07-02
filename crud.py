"""
CRUD operations for TaskMaster entities.
"""
from sqlalchemy.orm import Session
from typing import List, Optional
import models
import schemas
from auth import get_password_hash
import bcrypt
import secrets
from datetime import datetime, timedelta


# User CRUD
def get_user(db: Session, user_id: int):
    return db.query(models.User).filter(models.User.id == user_id).first()


def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()


def get_users(db: Session, skip: int = 0, limit: int = 100):
    return db.query(models.User).offset(skip).limit(limit).all()


def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = get_password_hash(user.password)
    db_user = models.User(
        full_name=user.full_name,
        email=user.email,
        password_hash=hashed_password,
        is_active=1  # Active by default
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def update_user(db: Session, user_id: int, user: schemas.UserUpdate):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if db_user:
        update_data = user.model_dump(exclude_unset=True)
        if "password" in update_data:
            update_data["password_hash"] = get_password_hash(update_data.pop("password"))
        for key, value in update_data.items():
            setattr(db_user, key, value)
        db.commit()
        db.refresh(db_user)
    return db_user


def delete_user(db: Session, user_id: int):
    db_user = db.query(models.User).filter(models.User.id == user_id).first()
    if db_user:
        db.delete(db_user)
        db.commit()
    return db_user


# List CRUD
def get_list(db: Session, list_id: int):
    return db.query(models.List).filter(models.List.id == list_id).first()


def get_lists_by_user(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.List).filter(models.List.user_id == user_id).offset(skip).limit(limit).all()


def create_list(db: Session, list_: schemas.ListCreate, user_id: int):
    db_list = models.List(
        **list_.model_dump(),
        user_id=user_id
    )

    db.add(db_list)
    db.commit()
    db.refresh(db_list)
    return db_list

def update_list(db: Session, list_id: int, list_: schemas.ListUpdate):
    db_list = db.query(models.List).filter(models.List.id == list_id).first()
    if db_list:
        update_data = list_.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_list, key, value)
        db.commit()
        db.refresh(db_list)
    return db_list


def delete_list(db: Session, list_id: int):
    db_list = db.query(models.List).filter(models.List.id == list_id).first()
    if db_list:
        db.delete(db_list)
        db.commit()
    return db_list


# Task CRUD
def get_task(db: Session, task_id: int):
    from sqlalchemy.orm import joinedload
    return db.query(models.Task).options(joinedload(models.Task.tags)).filter(models.Task.id == task_id).first()


def get_tasks_by_user(
    db: Session,
    user_id: int,
    skip: int = 0,
    limit: int = 100,
    status: Optional[models.StatusEnum] = None,
    priority: Optional[models.PriorityEnum] = None,
    list_id: Optional[int] = None
):
    from sqlalchemy.orm import joinedload
    query = db.query(models.Task).options(joinedload(models.Task.tags)).filter(models.Task.user_id == user_id)

    if status:
        query = query.filter(models.Task.status == status)
    if priority:
        query = query.filter(models.Task.priority == priority)
    if list_id:
        query = query.filter(models.Task.list_id == list_id)

    return query.offset(skip).limit(limit).all()


def create_task(db: Session, task: schemas.TaskCreate, user_id: int):
    db_task = models.Task(**task.model_dump(),user_id=user_id)
    db.add(db_task)
    db.commit()
    db.refresh(db_task)
    return db_task


def update_task(db: Session, task_id: int, task: schemas.TaskUpdate):
    db_task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if db_task:
        update_data = task.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_task, key, value)
        db.commit()
        db.refresh(db_task)
    return db_task


def delete_task(db: Session, task_id: int):
    db_task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if db_task:
        db.delete(db_task)
        db.commit()
    return db_task


# Tag CRUD
def get_tag(db: Session, tag_id: int):
    return db.query(models.Tag).filter(models.Tag.id == tag_id).first()


def get_tags_by_user(db: Session, user_id: int, skip: int = 0, limit: int = 100):
    return db.query(models.Tag).filter(models.Tag.user_id == user_id).offset(skip).limit(limit).all()


def create_tag(db: Session, tag: schemas.TagCreate, user_id: int):
    db_tag = models.Tag(**tag.model_dump(),user_id=user_id)
    db.add(db_tag)
    db.commit()
    db.refresh(db_tag)
    return db_tag


def update_tag(db: Session, tag_id: int, tag: schemas.TagUpdate):
    db_tag = db.query(models.Tag).filter(models.Tag.id == tag_id).first()
    if db_tag:
        update_data = tag.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_tag, key, value)
        db.commit()
        db.refresh(db_tag)
    return db_tag


def delete_tag(db: Session, tag_id: int):
    db_tag = db.query(models.Tag).filter(models.Tag.id == tag_id).first()
    if db_tag:
        db.delete(db_tag)
        db.commit()
    return db_tag


# TaskTag operations
def add_tag_to_task(db: Session, task_id: int, tag_id: int):
    # Check if association already exists
    existing = db.execute(
        models.task_tags.select().where(
            models.task_tags.c.task_id == task_id,
            models.task_tags.c.tag_id == tag_id
        )
    ).first()

    if not existing:
        db.execute(
            models.task_tags.insert().values(
                task_id=task_id,
                tag_id=tag_id
            )
        )
        db.commit()


def remove_tag_from_task(db: Session, task_id: int, tag_id: int):
    db.execute(
        models.task_tags.delete().where(
            models.task_tags.c.task_id == task_id,
            models.task_tags.c.tag_id == tag_id
        )
    )
    db.commit()


def get_tags_for_task(db: Session, task_id: int):
    return db.query(models.Tag).join(
        models.task_tags,
        models.Tag.id == models.task_tags.c.tag_id
    ).filter(models.task_tags.c.task_id == task_id).all()


def get_tasks_for_tag(db: Session, tag_id: int):
    return db.query(models.Task).join(
        models.task_tags,
        models.Task.id == models.task_tags.c.task_id
    ).filter(models.task_tags.c.tag_id == tag_id).all()


# Password Reset Token CRUD
def create_password_reset_token(db: Session, email: str, user_id: int, otp_hash: str, expires_at: datetime) -> models.PasswordResetToken:
    """
    Create a new password reset token.

    Args:
        db: Database session
        email: User's email address
        user_id: User ID
        otp_hash: Hashed OTP code
        expires_at: Expiration timestamp

    Returns:
        Created PasswordResetToken object
    """
    # First invalidate any existing unused tokens for this user/email
    db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.user_id == user_id,
        models.PasswordResetToken.email == email,
        models.PasswordResetToken.is_used == 0
    ).update({"is_used": 1})

    db_token = models.PasswordResetToken(
        email=email,
        user_id=user_id,
        otp_hash=otp_hash,
        expires_at=expires_at,
        attempts=0,
        is_used=0
    )
    db.add(db_token)
    db.commit()
    db.refresh(db_token)
    return db_token


def get_password_reset_token_by_email_and_hash(db: Session, email: str, otp_hash: str) -> Optional[models.PasswordResetToken]:
    """
    Get a password reset token by email and OTP hash.

    Args:
        db: Database session
        email: User's email address
        otp_hash: Hashed OTP code to match

    Returns:
        PasswordResetToken object if found and valid, None otherwise
    """
    return db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.email == email,
        models.PasswordResetToken.otp_hash == otp_hash,
        models.PasswordResetToken.is_used == 0
    ).first()


def increment_password_reset_attempts(db: Session, token_id: int) -> Optional[models.PasswordResetToken]:
    """
    Increment the attempt counter for a password reset token.

    Args:
        db: Database session
        token_id: Token ID

    Returns:
        Updated PasswordResetToken object if found, None otherwise
    """
    db_token = db.query(models.PasswordResetToken).filter(models.PasswordResetToken.id == token_id).first()
    if db_token:
        db_token.attempts += 1
        db.commit()
        db.refresh(db_token)
    return db_token


def mark_password_reset_token_as_used(db: Session, token_id: int) -> Optional[models.PasswordResetToken]:
    """
    Mark a password reset token as used.

    Args:
        db: Database session
        token_id: Token ID

    Returns:
        Updated PasswordResetToken object if found, None otherwise
    """
    db_token = db.query(models.PasswordResetToken).filter(models.PasswordResetToken.id == token_id).first()
    if db_token:
        db_token.is_used = 1
        db.commit()
        db.refresh(db_token)
    return db_token


def cleanup_expired_reset_tokens(db: Session) -> int:
    """
    Clean up expired password reset tokens.

    Args:
        db: Database session

    Returns:
        Number of tokens deleted
    """
    result = db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.expires_at < datetime.utcnow()
    ).delete()
    db.commit()
    return result