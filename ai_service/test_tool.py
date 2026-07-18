def test_parsing():
    mock_json = [
        {"name": "Valid String Ints", "stock": "5", "reorderPoint": "10"},
        {"name": "Valid Floats as Strings", "stock": "10.5", "reorderPoint": "15.0"},
        {"name": "Empty Strings", "stock": "", "reorderPoint": ""},
        {"name": "None Types", "stock": None, "reorderPoint": None},
        {"name": "Missing Keys"},
        {"name": "Malformed String", "stock": "N/A", "reorderPoint": "10"},
        {"name": "Valid Low Stock", "stock": 2, "reorderPoint": 5},
    ]

    low_stock = []
    for item in mock_json:
        try:
            s = int(float(item.get("stock") if item.get("stock") is not None and item.get("stock") != "" else 0))
            r_pt = int(float(item.get("reorderPoint") if item.get("reorderPoint") is not None and item.get("reorderPoint") != "" else 10))
            if s <= r_pt:
                low_stock.append(item)
                print(f"[{item.get('name')}] Added: {s} <= {r_pt}")
            else:
                print(f"[{item.get('name')}] Skipped: {s} > {r_pt}")
        except (ValueError, TypeError) as e:
            print(f"[{item.get('name')}] Dropped due to parse error: {e}")

test_parsing()
