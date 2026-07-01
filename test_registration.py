import requests
import random
import string

def random_email():
    return ''.join(random.choices(string.ascii_lowercase, k=10)) + "@example.com"

url = "http://localhost:8000/api/v1/auth/register"
data = {
    "email": random_email(),
    "password": "Testpass123",
    "confirm_password": "Testpass123",
    "full_name": "Test User"
}

try:
    response = requests.post(url, json=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response JSON: {response.json()}")
except requests.exceptions.RequestException as e:
    print(f"Error: {e}")