"""TaskMaster — FastAPI server with database integration.

Includes REST API endpoints for Users, Lists, Tasks, and Tags.
Run with:

    python -m uvicorn app:app --reload
"""
# Reload trigger - fix for create_access_token_for_user parameter name

from fastapi import FastAPI, Depends, HTTPException, status, Request, Response
from fastapi.staticfiles import StaticFiles
from fastapi.responses import HTMLResponse, RedirectResponse, JSONResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session
from typing import List, Optional
import uvicorn
from datetime import datetime, timedelta
import secrets
import bcrypt

import models
import schemas
import crud
import auth
import database
from utils.email import send_verification_email

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
    response: Response,
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
    # Create access token (short-lived)
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    # Determine refresh token expiration based on remember_me
    remember_me = login_data.remember_me
    if remember_me:
        refresh_token_expires = timedelta(days=auth.REFRESH_TOKEN_EXPIRE_DAYS)
    else:
        # If not remembering, make refresh token short-lived (same as access token)
        refresh_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    # Include remember_me flag in refresh token payload for potential use
    refresh_token_data = {"sub": user.email, "remember_me": remember_me}
    refresh_token = auth.create_refresh_token(
        data=refresh_token_data, expires_delta=refresh_token_expires
    )
    # Set cookies
    # In production, set secure=True, samesite='lax' or 'strict'
    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=True,
        max_age=int(access_token_expires.total_seconds()),
        expires=int(access_token_expires.total_seconds()),
        path="/",
        secure=False,  # set True when using HTTPS
        samesite="lax",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        max_age=int(refresh_token_expires.total_seconds()),
        expires=int(refresh_token_expires.total_seconds()),
        path="/",
        secure=False,
        samesite="lax",
    )
    # Return token info (optional, could just return success)
    return {"access_token": access_token, "token_type": "bearer"}


@app.post("/api/v1/auth/refresh")
async def refresh_token(request: Request, response: Response, db: Session = Depends(get_db)):
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token missing",
        )
    try:
        payload = jwt.decode(refresh_token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid refresh token",
            )
        token_data = schemas.TokenData(email=email)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )
    user = db.query(models.User).filter(models.User.email == token_data.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )
    # Issue new access token
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    new_access_token = auth.create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    # Set new access token cookie
    response.set_cookie(
        key="access_token",
        value=new_access_token,
        httponly=True,
        max_age=int(access_token_expires.total_seconds()),
        expires=int(access_token_expires.total_seconds()),
        path="/",
        secure=False,
        samesite="lax",
    )
    return JSONResponse(content={"msg": "Token refreshed"})


@app.post("/api/v1/auth/logout")
def logout(request: Request, response: Response):
    # Clear cookies
    response = RedirectResponse(url="/", status_code=303)
    response.delete_cookie(key="access_token", path="/")
    response.delete_cookie(key="refresh_token", path="/")
    return response


# Password reset endpoints
@app.post("/api/v1/auth/forgot-password", response_model=schemas.PasswordResetTokenResponse)
async def forgot_password(
    request: schemas.ForgotPasswordRequest,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Handle forgot password request - sends verification code to email.
    Always returns the same message to prevent email enumeration.
    """
    print(f"DEBUG: forgot_password function called with email: {request.email}")  # Debug line

    # Always return the same message to prevent email enumeration
    message = "If an account exists, a verification code has been sent."

    # Check if user exists (but don't reveal this)
    print(f"DEBUG: Checking for user with email: {request.email}")  # Debug line
    user = crud.get_user_by_email(db, request.email)
    print(f"DEBUG: User found: {user is not None}")  # Debug line

    if user:
        # Generate 6-digit cryptographically secure random code
        code = ''.join([str(secrets.randbelow(10)) for _ in range(6)])
        print(f"DEBUG: Generated code: {code}")  # Debug line

        # Hash the code using bcrypt (same as password hashing)
        # bcrypt expects bytes, so we encode the string
        hashed_code = bcrypt.hashpw(code.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        print(f"DEBUG: Hashed code: {hashed_code}")  # Debug line

        # Set expiration to 10 minutes from now
        expires_at = datetime.utcnow() + timedelta(minutes=10)
        print(f"DEBUG: Expires at: {expires_at}")  # Debug line

        # Create password reset token record
        print(f"DEBUG: Creating password reset token for user {user.id}")  # Debug line
        crud.create_password_reset_token(
            db=db,
            email=request.email,
            user_id=user.id,
            otp_hash=hashed_code,
            expires_at=expires_at
        )
        print(f"DEBUG: Password reset token created")  # Debug line

        # Send email with verification code
        print(f"DEBUG: Sending verification email to {request.email}")  # Debug line
        email_sent = send_verification_email(request.email, code)
        print(f"DEBUG: Email sent result: {email_sent}")  # Debug line
        if not email_sent:
            # Log the error but don't fail the request for security reasons
            # In production, you might want to use a proper logging framework
            print(f"Warning: Failed to send verification email to {request.email}")

    # Always return the same message regardless of whether email exists
    return {"message": message}


@app.post("/api/v1/auth/verify-reset-code")
async def verify_reset_code(
    request: schemas.VerifyCodeRequest,
    db: Session = Depends(get_db)
):
    """
    Verify the reset code sent to user's email.
    """
    # Validate email format (Pydantic already does this, but double-check)
    # Validate code is exactly 6 digits
    if not request.code.isdigit() or len(request.code) != 6:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code format"
        )

    # Find the token by email (we'll verify the code separately)
    token = db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.email == request.email,
        models.PasswordResetToken.is_used == 0
    ).first()

    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code"
        )

    # Check if token has expired
    if token.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired"
        )

    # Check if token has already been used
    if token.is_used:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has already been used"
        )

    # Check if too many attempts
    if token.attempts >= 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Too many incorrect attempts. Please request a new verification code."
        )

    # Verify the code using bcrypt.checkpw (similar to password verification)
    if not bcrypt.checkpw(request.code.encode('utf-8'), token.otp_hash.encode('utf-8')):
        # Increment attempt counter for failed attempt
        crud.increment_password_reset_attempts(db, token.id)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code"
        )

    # If we get here, the code is valid
    return {"verified": True}


@app.post("/api/v1/auth/reset-password")
async def reset_password(
    request: schemas.ResetPasswordRequest,
    response: Response,
    db: Session = Depends(get_db)
):
    """
    Reset password using verification code.
    """
    # Validate passwords match
    if request.new_password != request.confirm_new_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Passwords do not match"
        )

    # Validate password strength (Pydantic already checks min length 8)
    # Additional validation could be added here if needed

    # Find the token by email (we'll verify the code separately)
    token = db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.email == request.email,
        models.PasswordResetToken.is_used == 0
    ).first()

    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code"
        )

    # Check if token has expired
    if token.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has expired"
        )

    # Check if token has already been used
    if token.is_used:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification code has already been used"
        )

    # Check if too many attempts
    if token.attempts >= 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Too many incorrect attempts. Please request a new verification code."
        )

    # Verify the code using bcrypt.checkpw (similar to password verification)
    if not bcrypt.checkpw(request.code.encode('utf-8'), token.otp_hash.encode('utf-8')):
        # Increment attempt counter for failed attempt
        crud.increment_password_reset_attempts(db, token.id)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification code"
        )

    # If we get here, the code is valid - proceed with password reset

    # Get the user
    user = crud.get_user(db, token.user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    # Hash the new password
    hashed_password = auth.get_password_hash(request.new_password)

    # Update user's password
    user.password_hash = hashed_password
    user.updated_at = datetime.utcnow()

    # Mark the token as used
    crud.mark_password_reset_token_as_used(db, token.id)

    # Invalidate any other reset tokens for this user (security measure)
    db.query(models.PasswordResetToken).filter(
        models.PasswordResetToken.user_id == user.id,
        models.PasswordResetToken.id != token.id
    ).update({"is_used": 1})

    # Invalidate all active sessions by updating a token version or similar
    # For simplicity, we'll just update the user's updated_at timestamp
    # In a production app, you might want to implement a token versioning system
    # or maintain a list of invalidated tokens

    db.commit()

    return {"message": "Password updated successfully. Please log in with your new password."}


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


@app.get("/tasks/{task_id}", response_model=schemas.TaskDetail)
def read_task(task_id: int, db: Session = Depends(get_db)):
    db_task = crud.get_task(db, task_id=task_id)
    if db_task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    return db_task


@app.patch("/tasks/{task_id}", response_model=schemas.Task)
def update_task(
    task_id: int,
    task: schemas.TaskUpdate,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user)
):
    # Verify task exists and belongs to current user
    db_task = crud.get_task(db, task_id=task_id)
    if db_task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    if db_task.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this task")
    return crud.update_task(db=db, task_id=task_id, task=task)


@app.delete("/tasks/{task_id}", response_model=schemas.Task)
def delete_task(
    task_id: int,
    db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user)
):
    # Verify task exists and belongs to current user
    db_task = crud.get_task(db, task_id=task_id)
    if db_task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    if db_task.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this task")
    return crud.delete_task(db=db, task_id=task_id)


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


@app.delete("/tags/{tag_id}", response_model=schemas.Tag)
def delete_tag(tag_id: int, db: Session = Depends(get_db), current_user: schemas.User = Depends(auth.get_current_user)):
    # Verify tag exists and belongs to current user
    db_tag = crud.get_tag(db, tag_id=tag_id)
    if db_tag is None:
        raise HTTPException(status_code=404, detail="Tag not found")
    if db_tag.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to delete this tag")
    return crud.delete_tag(db=db, tag_id=tag_id)


# Task-tag endpoints
@app.post("/tasks/{task_id}/tags/{tag_id}", response_model=schemas.Tag)
def add_tag_to_task(
    task_id: int, tag_id: int, db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user)
):
    # Verify task exists and belongs to current user
    db_task = crud.get_task(db, task_id=task_id)
    if db_task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    if db_task.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this task")

    # Verify tag exists and belongs to current user
    db_tag = crud.get_tag(db, tag_id=tag_id)
    if db_tag is None:
        raise HTTPException(status_code=404, detail="Tag not found")
    if db_tag.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to use this tag")

    # Add tag to task
    crud.add_tag_to_task(db=db, task_id=task_id, tag_id=tag_id)
    return db_tag


@app.delete("/tasks/{task_id}/tags/{tag_id}", response_model=schemas.Tag)
def remove_tag_from_task(
    task_id: int, tag_id: int, db: Session = Depends(get_db),
    current_user: schemas.User = Depends(auth.get_current_user)
):
    # Verify task exists and belongs to current user
    db_task = crud.get_task(db, task_id=task_id)
    if db_task is None:
        raise HTTPException(status_code=404, detail="Task not found")
    if db_task.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to update this task")

    # Verify tag exists and belongs to current user
    db_tag = crud.get_tag(db, tag_id=tag_id)
    if db_tag is None:
        raise HTTPException(status_code=404, detail="Tag not found")
    if db_tag.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized to use this tag")

    # Remove tag from task
    crud.remove_tag_from_task(db=db, task_id=task_id, tag_id=tag_id)
    return db_tag


# Landing page (home page)
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


# Main application interface (requires authentication)
@app.get("/app", response_class=HTMLResponse)
async def app_index(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="app.html"
    )


# Password reset pages
@app.get("/forgot-password.html", response_class=HTMLResponse)
async def forgot_password_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="forgot-password.html"
    )


@app.get("/verify-code.html", response_class=HTMLResponse)
async def verify_code_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="verify-code.html"
    )


@app.get("/reset-password.html", response_class=HTMLResponse)
async def reset_password_page(request: Request):
    return templates.TemplateResponse(
        request=request,
        name="reset-password.html"
    )


# Mount the static frontend at /. html=True lets StaticFiles resolve "/" to
# index.html"># Mount the static frontend at /. html=True lets StaticFiles resolve "/" to
# index.html automatically, so we get a clean SPA-style entry point.
app.mount("/static", StaticFiles(directory="static"), name="static")