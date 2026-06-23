"""TaskMaster — FastAPI server with database integration.

Includes REST API endpoints for Users, Lists, Tasks, and Tags.
Run with:

    python -m uvicorn app:app --reload
"""
# Reload trigger - fix for create_access_token_for_user parameter name

from fastapi import FastAPI, Depends, HTTPException, status, Request
from fastapi.staticfiles import StaticFiles
from fastapi.security import OAuth2PasswordRequestForm
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from typing import List, Optional
import uvicorn
from datetime import timedelta

import models
import schemas
import crud
import auth
import database

# Create database tables
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="TaskMaster")

# Setup templates
import os
templates = Jinja2Templates(directory=os.path.join(os.path.dirname(__file__), "templates"))

# Dependency
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Authentication endpoints
@app.post("/api/v1/auth/login", response_model=schemas.Token)
async def login_for_access_token(
    login_data: schemas.LoginRequest,
    db: Session = Depends(get_db)
):
    user = auth.authenticate_user(db, login_data.email, login_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is inactive",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = auth.create_access_token_for_user(
        user_data={"sub": user.email}, remember_me=login_data.remember_me
    )
    return {"access_token": access_token, "token_type": "bearer"}


# User endpoints
@app.post("/api/v1/auth/register", response_model=schemas.User)
def create_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    if user.password != user.confirm_password:
        raise HTTPException(status_code=400, detail="Passwords do not match")
    db_user = crud.get_user_by_email(db, email=user.email)
    if db_user:
        raise HTTPException(status_code=400, detail="Email already registered")
    return crud.create_user(db=db, user=user)


@app.get("/api/v1/auth/me", response_model=schemas.User)
def read_current_user(current_user: schemas.User = Depends(auth.get_current_user)):
    return current_user


@app.post("/api/v1/auth/logout")
def logout():
    # In a more secure implementation, we might add the token to a blacklist
    # For now, we just return a success message since JWT is stateless
    return {"message": "Logged out successfully"}


@app.get("/users/", response_model=List[schemas.User])
def read_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    users = crud.get_users(db, skip=skip, limit=limit)
    return users


@app.get("/users/{user_id}", response_model=schemas.User)
def read_user(user_id: int, db: Session = Depends(get_db)):
    db_user = crud.get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return db_user


# List endpoints
@app.post("/users/{user_id}/lists/", response_model=schemas.List)
def create_list_for_user(
    user_id: int, list_: schemas.ListCreate, db: Session = Depends(get_db)
):
    # Verify user exists
    db_user = crud.get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return crud.create_list(db=db, list_=list_, user_id=user_id)


@app.get("/users/{user_id}/lists/", response_model=List[schemas.List])
def read_lists_for_user(
    user_id: int, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)
):
    # Verify user exists
    db_user = crud.get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    lists = crud.get_lists_by_user(db, user_id=user_id, skip=skip, limit=limit)
    return lists


@app.get("/lists/{list_id}", response_model=schemas.List)
def read_list(list_id: int, db: Session = Depends(get_db)):
    db_list = crud.get_list(db, list_id=list_id)
    if db_list is None:
        raise HTTPException(status_code=404, detail="List not found")
    return db_list


# Task endpoints
@app.post("/users/{user_id}/tasks/", response_model=schemas.Task)
def create_task_for_user(
    user_id: int, task: schemas.TaskCreate, db: Session = Depends(get_db)
):
    # Verify user exists
    db_user = crud.get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    # Verify list exists and belongs to user
    db_list = crud.get_list(db, list_id=task.list_id)
    if db_list is None or db_list.user_id != user_id:
        raise HTTPException(status_code=404, detail="List not found")
    return crud.create_task(db=db, task=task, user_id=user_id)


@app.get("/users/{user_id}/tasks/", response_model=List[schemas.Task])
def read_tasks_for_user(
    user_id: int,
    skip: int = 0,
    limit: int = 100,
    status: Optional[models.StatusEnum] = None,
    priority: Optional[models.PriorityEnum] = None,
    list_id: Optional[int] = None,
    db: Session = Depends(get_db)
):
    # Verify user exists
    db_user = crud.get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    tasks = crud.get_tasks_by_user(
        db, user_id=user_id, skip=skip, limit=limit,
        status=status, priority=priority, list_id=list_id
    )
    return tasks


@app.get("/tasks/{task_id}", response_model=schemas.Task)
def read_task(task_id: int, db: Session = Depends(get_db)):
    db_task = crud.get_task(db, task_id=task_id)
    if db_task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return db_task


# Tag endpoints
@app.post("/users/{user_id}/tags/", response_model=schemas.Tag)
def create_tag_for_user(
    user_id: int, tag: schemas.TagCreate, db: Session = Depends(get_db)
):
    # Verify user exists
    db_user = crud.get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return crud.create_tag(db=db, tag=tag, user_id=user_id)


@app.get("/users/{user_id}/tags/", response_model=List[schemas.Tag])
def read_tags_for_user(
    user_id: int, skip: int = 0, limit: int = 100, db: Session = Depends(get_db)
):
    # Verify user exists
    db_user = crud.get_user(db, user_id=user_id)
    if db_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    tags = crud.get_tags_by_user(db, user_id=user_id, skip=skip, limit=limit)
    return tags


@app.get("/tags/{tag_id}", response_model=schemas.Tag)
def read_tag(tag_id: int, db: Session = Depends(get_db)):
    db_tag = crud.get_tag(db, tag_id=tag_id)
    if db_tag is None:
        raise HTTPException(status_code=404, detail="Tag not found")
    return db_tag

# Home page
@app.get("/", response_class=HTMLResponse)
async def home(request: Request):
     return templates.TemplateResponse(
    request=request,
    name="index.html"
)


# Serve login and registration pages
@app.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
   return templates.TemplateResponse(
    request=request,
    name="login.html"
)


@app.get("/register", response_class=HTMLResponse)
async def register_page(request: Request):
    return templates.TemplateResponse(
    request=request,
    name="register.html"
)


# Mount the static frontend at /. html=True lets StaticFiles resolve "/" to
# index.html automatically, so we get a clean SPA-style entry point.
app.mount("/static", StaticFiles(directory="static"), name="static")

 
