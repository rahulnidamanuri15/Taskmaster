"""
SQLAlchemy models for TaskMaster entities.
"""
from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Enum, Index, Table,Date
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import enum
from database import Base


# Enums for priority and status
class PriorityEnum(str, enum.Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class StatusEnum(str, enum.Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    ARCHIVED = "archived"


# User model
class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    full_name = Column(String(100), nullable=False)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    avatar_url = Column(String(255), nullable=True)
    is_active = Column(Integer, default=1, nullable=False)  # Boolean as integer for SQLite
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    lists = relationship("List", back_populates="owner", cascade="all, delete-orphan")
    tasks = relationship("Task", back_populates="owner", cascade="all, delete-orphan")
    tags = relationship("Tag", back_populates="owner", cascade="all, delete-orphan")


# List model
class List(Base):
    __tablename__ = "lists"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(100), nullable=False)
    color = Column(String(20), nullable=True)  # UI color identifier
    is_default = Column(Integer, default=0)  # Boolean as integer for SQLite
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    owner = relationship("User", back_populates="lists")
    tasks = relationship("Task", back_populates="list", cascade="all, delete-orphan")

    # Indexes
    __table_args__ = (Index("idx_lists_user_id", "user_id"),)


# Task model
class Task(Base):
    __tablename__ = "tasks"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    list_id = Column(Integer, ForeignKey("lists.id"), nullable=False)
    title = Column(String(200), nullable=False)
    description = Column(Text, nullable=True)
    priority = Column(Enum(PriorityEnum), nullable=False)
    status = Column(Enum(StatusEnum), nullable=False, default=StatusEnum.PENDING)
    due_date = Column(Date, nullable=True)
    is_important = Column(Integer, default=0, nullable=False)  # Boolean as integer for SQLite
    completed_at = Column(DateTime(timezone=True), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    owner = relationship("User", back_populates="tasks")
    list = relationship("List", back_populates="tasks")
    tags = relationship(
        "Tag",
        secondary="task_tags",
        back_populates="tasks"
    )

    # Indexes
    __table_args__ = (
        Index("idx_tasks_user_id", "user_id"),
        Index("idx_tasks_list_id", "list_id"),
        Index("idx_tasks_status", "status"),
        Index("idx_tasks_due_date", "due_date"),
        Index("idx_tasks_is_important", "is_important"),
    )


# Tag model
class Tag(Base):
    __tablename__ = "tags"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    name = Column(String(50), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    owner = relationship("User", back_populates="tags")
    tasks = relationship(
        "Task",
        secondary="task_tags",
        back_populates="tags"
    )

    # Indexes
    __table_args__ = (Index("idx_tags_user_id", "user_id"),)


# TaskTag junction table for many-to-many relationship
task_tags = Table(
    "task_tags",
    Base.metadata,
    Column("task_id", Integer, ForeignKey("tasks.id"), primary_key=True),
    Column("tag_id", Integer, ForeignKey("tags.id"), primary_key=True),
    # Prevent duplicate associations
    # Unique constraint is handled by composite primary key
)