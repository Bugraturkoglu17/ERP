import requests

url = "http://localhost:8000/api/v1/whatsapp/test-template"
payload = {
    "tenant_id": "00000000-0000-0000-0000-000000000001",
    "phone_number": "905550000000",
    "technician_name": "Test Uzmani",
    "project_name": "Canli Santiyesi",
    "form_url": "https://erp.golabstek.com/forms/srv-1234"
}
headers = {"Content-Type": "application/json"}

try:
    response = requests.post(url, json=payload, headers=headers)
    print("Status Code:", response.status_code)
    print("Response Body:", response.json())
except Exception as e:
    print("Error:", str(e))
