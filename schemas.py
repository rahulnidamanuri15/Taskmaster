"""
Pydantic schemas for TaskMaster entities.
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List as ListType
from datetime import datetime, date
import models


# User schemas
class UserBase(BaseModel):
    full_name: str
    email: EmailStr


class UserCreate(UserBase):
    password: str = Field(..., min_length=8)
    confirm_password: str = Field(..., min_length=8)


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    email: Optional[EmailStr] = None
    password: Optional[str] = Field(None, min_length=8)
    avatar_url: Optional[str] = None


class UserInDBBase(UserBase):
    id: int
    is_active: bool = True
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class UserInDB(UserInDBBase):
    pass


class User(UserInDBBase):
    pass


# List schemas
class ListBase(BaseModel):
    name: str
    color: Optional[str] = None
    is_default: Optional[int] = 0


class ListCreate(ListBase):
    pass


class ListUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    is_default: Optional[int] = None


class ListInDBBase(ListBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ListInDB(ListInDBBase):
    pass


class List(ListInDBBase):
    pass


# Task schemas
class TaskBase(BaseModel):
    title: str
    description: Optional[str] = None
    priority: models.PriorityEnum = models.PriorityEnum.MEDIUM
    status: models.StatusEnum = models.StatusEnum.PENDING
    due_date: Optional[date] = None
    is_important: bool = False


class TaskCreate(TaskBase):
    list_id: int


class TaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    priority: Optional[models.PriorityEnum] = None
    status: Optional[models.StatusEnum] = None
    due_date: Optional[date] = None
    completed_at: Optional[datetime] = None
    list_id: Optional[int] = None
    is_important: Optional[bool] = None


class TaskInDBBase(TaskBase):
    id: int
    user_id: int
    list_id: int
    completed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: Optional[datetime] = None
    is_important: bool

    class Config:
        from_attributes = True


class TaskInDB(TaskInDBBase):
    pass


class Task(TaskInDBBase):
    tags: ListType["Tag"] = []

    class Config:
        from_attributes = True


class TaskDetail(TaskInDBBase):
    tags: ListType["Tag"] = []

    class Config:
        from_attributes = True


# Tag schemas
class TagBase(BaseModel):
    name: str


class TagCreate(TagBase):
    pass


class TagUpdate(BaseModel):
    name: Optional[str] = None


class TagInDBBase(TagBase):
    id: int
    user_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class TagInDB(TagInDBBase):
    pass


class Tag(TagInDBBase):
    pass


# Token schemas
class Token(BaseModel):
    access_token: str
    token_type: str


class TokenData(BaseModel):
    email: Optional[str] = None


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    remember_me: bool = False