
"""
Test script to verify API endpoints work correctly.
"""
import sys
import os

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
    user_data = {
        "full_name": "API Test User",
        "email": "apitest@example.com",
        "password": "password123"
    }

    response = client.post("/users/", json=user_data)
    print(f"Create user response status: {response.status_code}")
    print(f"Create user response body: {response.json()}")

    assert response.status_code == 200
    data = response.json()
    assert data["full_name"] == user_data["full_name"]
    assert data["email"] == user_data["email"]
    assert "id" in data
    return data["id"]

def test_get_users():
    """Test getting users via API."""
    response = client.get("/users/")
    print(f"Get users response status: {response.status_code}")
    print(f"Get users response body: {response.json()}")

    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    return data

def test_login():
    """Test login endpoint."""
    login_data = {
        "username": "apitest@example.com",
        "password": "password123"
    }

    response = client.post("/token", data=login_data)
    print(f"Login response status: {response.status_code}")
    print(f"Login response body: {response.json()}")

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["token_type"] == "bearer"
    return data["access_token"]

if __name__ == "__main__":
    print("Testing API endpoints...")

    # Test creating a user
    user_id = test_create_user()
    print(f"Created user with ID: {user_id}")

    # Test getting users
    users = test_get_users()
    print(f"Retrieved {len(users)} users")

    # Test login
    token = test_login()
    print(f"Received token: {token[:10]}...")

    print("\nAll API tests passed!")