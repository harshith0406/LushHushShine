from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

print("Testing /agent/draft-po...")
res = client.post("/agent/draft-po", json={
    "product_name": "Mixed Nuts",
    "vendor_name": "Nutty Farms",
    "reorder_qty": 100,
    "urgency": "High"
})
print("Status:", res.status_code)
print("Response:", res.json())

print("\nTesting /agent/optimize-price...")
res = client.post("/agent/optimize-price", json={
    "product_name": "Whole Wheat Bread",
    "days_to_expiry": 2,
    "current_price": 5.99,
    "unit_cost": 3.00,
    "current_velocity": 10
})
print("Status:", res.status_code)
print("Response:", res.json())

print("\nTesting /agent/generate-marketing...")
res = client.post("/agent/generate-marketing", json={
    "ocr_text": "Organic Almond Milk 1L. Unsweetened."
})
print("Status:", res.status_code)
print("Response:", res.json())

print("\nTesting /agent/draft-vendor-email...")
res = client.post("/agent/draft-vendor-email", json={
    "vendor_name": "Dairy Co",
    "vendor_score": 45.0,
    "rejection_rate": 20.0,
    "issue_type": "PO delayed by 3 days"
})
print("Status:", res.status_code)
print("Response:", res.json())
