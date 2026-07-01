import requests

url = "http://localhost:8000/api/v1/auth/login"
data = {
    "email": "ffyjtfppdf@example.com",
    "password": "Testpass123"
}

try:
    response = requests.post(url, json=data)
    print(f"Status Code: {response.status_code}")
    print(f"Response JSON: {response.json()}")
except requests.exceptions.RequestException as e:
    print(f"Error: {e}")