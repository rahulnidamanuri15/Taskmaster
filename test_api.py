
"""
Test script to verify API endpoints work correctly.
"""
import sys
import os
import uuid

# Add the current directory to Python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
import app
import models
from database import engine, Base
import crud
import schemas

# Create test client
client = TestClient(app.app)

def test_create_user():
    """Test creating a user via API."""
    unique_id = uuid.uuid4().hex[:8]
    user_data = {
        "full_name": "API Test User",
        "email": f"apitest_{unique_id}@example.com",
        "password": "password123",
        "confirm_password": "password123"
    }

    response = client.post("/api/v1/auth/register", json=user_data)
    print(f"Create user response status: {response.status_code}")
    print(f"Create user response body: {response.json()}")

    assert response.status_code == 200
    data = response.json()
    assert data["full_name"] == user_data["full_name"]
    assert data["email"] == user_data["email"]
    assert "id" in data
    return data["id"], data["email"]

def test_get_users():
    """Test getting users via API."""
    response = client.get("/users/")
    print(f"Get users response status: {response.status_code}")
    print(f"Get users response body: {response.json()}")

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    return data

def test_login(email: str):
    """Test login endpoint."""
    login_data = {
        "email": email,
        "password": "password123",
        "remember_me": False
    }

    response = client.post("/api/v1/auth/login", json=login_data)
    print(f"Login response status: {response.status_code}")
    print(f"Login response body: {response.json()}")

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    return data["access_token"]


def test_delete_task():
    """Test deleting a task via API."""
    # Create a user
    user_id, email = test_create_user()
    print(f"Created user with ID: {user_id} and email: {email}")

    # Login to get token
    token = test_login(email)
    headers = {"Authorization": f"Bearer {token}"}

    # Create a list for the user
    list_data = {
        "name": "Test List for Task",
        "color": "#FF0000",
        "is_default": 1
    }
    response = client.post("/users/{}/lists/".format(user_id), json=list_data, headers=headers)
    print(f"Create list response status: {response.status_code}")
    print(f"Create list response body: {response.json()}")
    assert response.status_code == 200
    list_data_response = response.json()
    list_id = list_data_response["id"]

    # Create a task in the list
    task_data = {
        "title": "Test Task to Delete",
        "description": "This task will be deleted",
        "priority": "medium",
        "status": "pending",
        "list_id": list_id
    }
    response = client.post("/users/{}/tasks/".format(user_id), json=task_data, headers=headers)
    print(f"Create task response status: {response.status_code}")
    print(f"Create task response body: {response.json()}")
    assert response.status_code == 200
    task_data_response = response.json()
    task_id = task_data_response["id"]

    # Delete the task
    response = client.delete("/tasks/{}".format(task_id), headers=headers)
    print(f"Delete task response status: {response.status_code}")
    print(f"Delete task response body: {response.json()}")
    assert response.status_code == 200
    deleted_task = response.json()
    assert deleted_task["id"] == task_id
    assert deleted_task["title"] == task_data["title"]

    # Verify the task is deleted by trying to get it
    response = client.get("/tasks/{}".format(task_id), headers=headers)
    print(f"Get deleted task response status: {response.status_code}")
    assert response.status_code == 404

    print("Delete task test passed!")


if __name__ == "__main__":
    print("Testing API endpoints...")

    # Test creating a user
    user_id, email = test_create_user()
    print(f"Created user with ID: {user_id} and email: {email}")

    # Test getting users
    users = test_get_users()
    print(f"Retrieved {len(users)} users")

    # Test login
    token = test_login(email)
    print(f"Received token: {token[:10]}...")

    # Test deleting a task
    test_delete_task()

    print("\nAll API tests passed!")