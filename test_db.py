"""
Test script to verify database creation and basic operations.
"""
import sys
import os

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

# Import modules
from database import engine, Base
import models

# Create all tables
Base.metadata.create_all(bind=engine)
print("Database tables created successfully!")

# Test basic operations
from database import SessionLocal
import crud
import schemas

# Create a session
db = SessionLocal()

try:
    # Test creating a user
    user_data = schemas.UserCreate(
        full_name="Test User",
        email="test@example.com",
        password="password123",
        confirm_password="password123"
    )

    # Check if user already exists
    existing_user = crud.get_user_by_email(db, email=user_data.email)
    if existing_user:
        print("User already exists, deleting...")
        crud.delete_user(db, existing_user.id)

    # Create new user
    user = crud.create_user(db, user_data)
    print(f"Created user: {user.full_name} with ID {user.id}")

    # Test creating a list for the user
    list_data = schemas.ListCreate(
        name="Test List",
        color="#FF0000",
        is_default=1
    )

    test_list = crud.create_list(db, list_data, user_id=user.id)
    print(f"Created list: {test_list.name} with ID {test_list.id}")

    # Test creating a task
    task_data = schemas.TaskCreate(
        title="Test Task",
        description="This is a test task",
        priority="medium",
        status="pending",
        list_id=test_list.id
    )

    task = crud.create_task(db, task_data, user_id=user.id)
    print(f"Created task: {task.title} with ID {task.id}")

    # Test creating a tag
    tag_data = schemas.TagCreate(
        name="important"
    )

    tag = crud.create_tag(db, tag_data, user_id=user.id)
    print(f"Created tag: {tag.name} with ID {tag.id}")

    # Test associating tag with task
    crud.add_tag_to_task(db, task_id=task.id, tag_id=tag.id)
    print(f"Associated tag {tag.name} with task {task.title}")

    # Retrieve and display the task with its tags
    db_task = crud.get_task(db, task_id=task.id)
    print(f"Task '{db_task.title}' has {[t.name for t in db_task.tags]} tags")

    print("\nAll tests passed successfully!")

finally:
    db.close()