import http.server
import json
import math
import sys
import urllib.parse

PORT = 8000
HOST = "127.0.0.1"

# --- Core Helper Functions (Pure Python Math) ---

def calculate_linear_regression(y):
    """Calculates slope and intercept of linear regression for a series of values."""
    n = len(y)
    if n < 2:
        return 0.0, (y[0] if n == 1 else 0.0)
    
    x = list(range(n))
    mean_x = sum(x) / n
    mean_y = sum(y) / n
    
    numerator = sum((x[i] - mean_x) * (y[i] - mean_y) for i in range(n))
    denominator = sum((x[i] - mean_x) ** 2 for i in range(n))
    
    if denominator == 0:
        return 0.0, mean_y
        
    slope = numerator / denominator
    intercept = mean_y - slope * mean_x
    return slope, intercept


# --- Request Handler ---

class AIServiceHandler(http.server.BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Silence default logger to keep terminal output clean
        sys.stderr.write("%s - - [%s] %s\n" % (self.address_string(), self.log_date_time_string(), format % args))

    def send_json_response(self, data, status_code=200):
        response_bytes = json.dumps(data).encode("utf-8")
        self.send_response(status_code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.send_header("Content-Length", str(len(response_bytes)))
        self.end_headers()
        self.wfile.write(response_bytes)

    def do_OPTIONS(self):
        # Handle CORS preflight
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        if parsed_url.path == "/":
            self.send_json_response({"status": "healthy", "service": "retail-analytics-ai-engine"})
        else:
            self.send_json_response({"error": "Not Found"}, 404)

    def do_POST(self):
        parsed_url = urllib.parse.urlparse(self.path)
        content_length = int(self.headers.get("Content-Length", 0))
        
        # Read body
        if content_length > 0:
            try:
                body_content = self.rfile.read(content_length).decode("utf-8")
                body_data = json.loads(body_content)
            except Exception as e:
                self.send_json_response({"error": f"Invalid JSON payload: {str(e)}"}, 400)
                return
        else:
            body_data = {}

        # Route matching
        path = parsed_url.path
        
        if path == "/forecast/demand":
            self.handle_forecast_demand(body_data)
        elif path == "/predict/sales":
            self.handle_predict_sales(body_data)
        elif path == "/optimize/inventory":
            self.handle_optimize_inventory(body_data)
        elif path == "/recommendations":
            self.handle_recommendations(body_data)
        elif path == "/insights":
            self.handle_insights(body_data)
        else:
            self.send_json_response({"error": "Path Not Found"}, 404)

    # --- Router Handlers ---

    def handle_forecast_demand(self, data):
        history = data.get("sales_history")
        periods = data.get("periods", 3)

        if not history or not isinstance(history, list):
            self.send_json_response({"error": "sales_history must be a non-empty list"}, 400)
            return

        # Simple average if list is too small
        if len(history) < 3:
            avg = sum(history) / len(history)
            self.send_json_response({"forecast": [round(avg, 2) for _ in range(periods)]})
            return

        slope, intercept = calculate_linear_regression(history)
        forecast = []
        start_index = len(history)
        
        for i in range(periods):
            val = slope * (start_index + i) + intercept
            val = max(0.0, val)
            forecast.append(round(val, 2))

        self.send_json_response({"forecast": forecast})

    def handle_predict_sales(self, data):
        history = data.get("sales_history")
        days = data.get("days", 30)

        if not history or not isinstance(history, list):
            self.send_json_response({"error": "sales_history must be a non-empty list"}, 400)
            return

        slope, intercept = calculate_linear_regression(history)
        predictions = []
        start_index = len(history)

        for d in range(days):
            trend_val = slope * (start_index + d) + intercept
            # Simulate a weekly cycle (indices 4 and 5 represent weekends)
            day_of_week = (start_index + d) % 7
            seasonal_multiplier = 1.25 if day_of_week in [4, 5] else 0.9
            
            predicted_val = trend_val * seasonal_multiplier
            predicted_val = max(0.0, predicted_val)
            predictions.append(round(predicted_val, 2))

        self.send_json_response({"predictions": predictions})

    def handle_optimize_inventory(self, data):
        try:
            avg_daily_sales = float(data.get("average_daily_sales", 0))
            lead_time_days = float(data.get("lead_time_days", 0))
            std_dev = float(data.get("standard_deviation", 0))
            service_factor = float(data.get("service_level_factor", 1.65))
            holding_cost = float(data.get("holding_cost", 2.0))
            ordering_cost = float(data.get("ordering_cost", 50.0))
        except (ValueError, TypeError) as e:
            self.send_json_response({"error": f"Invalid numerical inputs: {str(e)}"}, 400)
            return

        safety_stock = service_factor * math.sqrt(lead_time_days) * std_dev
        reorder_point = (avg_daily_sales * lead_time_days) + safety_stock
        annual_demand = avg_daily_sales * 365
        
        # Economic Order Quantity
        hc = max(0.01, holding_cost)
        eoq = math.sqrt((2 * annual_demand * ordering_cost) / hc)

        self.send_json_response({
            "safety_stock": math.ceil(safety_stock),
            "reorder_point": math.ceil(reorder_point),
            "economic_order_quantity": math.ceil(eoq)
        })

    def handle_recommendations(self, data):
        prod_id = str(data.get("product_id", "")).lower()
        limit = int(data.get("limit", 3))

        associations = {
            "milk": [
                {"product_id": "rec_bread", "name": "Whole Wheat Bread", "confidence": 0.92},
                {"product_id": "rec_butter", "name": "Salted Butter", "confidence": 0.84},
                {"product_id": "rec_cereal", "name": "Corn Flakes Cereal", "confidence": 0.79}
            ],
            "bread": [
                {"product_id": "rec_milk", "name": "Fresh Whole Milk", "confidence": 0.92},
                {"product_id": "rec_butter", "name": "Salted Butter", "confidence": 0.88},
                {"product_id": "rec_jam", "name": "Strawberry Jam", "confidence": 0.81}
            ],
            "shampoo": [
                {"product_id": "rec_conditioner", "name": "Hair Conditioner", "confidence": 0.95},
                {"product_id": "rec_soap", "name": "Body Wash Soap", "confidence": 0.72}
            ]
        }

        matched = []
        for key, items in associations.items():
            if key in prod_id:
                matched = items
                break

        if not matched:
            matched = [
                {"product_id": "rec_paper_towels", "name": "Paper Towels Roll", "confidence": 0.65},
                {"product_id": "rec_garbage_bags", "name": "Heavy Duty Trash Bags", "confidence": 0.58},
                {"product_id": "rec_water_bottle", "name": "Purified Water Pack", "confidence": 0.52}
            ]

        self.send_json_response({"recommendations": matched[:limit]})

    def handle_insights(self, data):
        inventory_items = data.get("inventory_items", [])
        sales_trends = data.get("sales_trends", [])
        insights = []

        # Evaluate stock levels
        for item in inventory_items:
            try:
                prod_id = item.get("product_id")
                name = item.get("name")
                stock = int(item.get("stock", 0))
                reorder_pt = int(item.get("reorder_point", 0))
                avg_sales = float(item.get("average_daily_sales", 0))
            except Exception:
                continue

            if stock == 0:
                insights.append({
                    "type": "critical",
                    "product_id": prod_id,
                    "message": f"CRITICAL: '{name}' is out of stock! Estimated daily sales loss: {avg_sales} units."
                })
            elif stock <= reorder_pt:
                days_left = stock / max(0.1, avg_sales)
                insights.append({
                    "type": "warning",
                    "product_id": prod_id,
                    "message": f"WARNING: '{name}' is below reorder point (Stock: {stock}, Reorder Pt: {reorder_pt}). Depletion in {days_left:.1f} days. Reorder now!"
                })

        # Evaluate sales trends
        for trend in sales_trends:
            try:
                prod_id = trend.get("product_id")
                name = trend.get("name")
                history = [float(val) for val in trend.get("revenue_history", [])]
            except Exception:
                continue

            if len(history) >= 3:
                slope, _ = calculate_linear_regression(history)
                overall_avg = sum(history) / len(history)
                
                if slope > 0.1 * overall_avg:
                    insights.append({
                        "type": "opportunity",
                        "product_id": prod_id,
                        "message": f"OPPORTUNITY: '{name}' has a strong positive sales growth trend. Recommend increasing stock buffers by 20% to prevent stockouts."
                    })
                elif slope < -0.1 * overall_avg:
                    insights.append({
                        "type": "risk",
                        "product_id": prod_id,
                        "message": f"RISK: '{name}' sales are declining. Recommend running markdown promotions or bundling to clear excess inventory."
                    })

        if not insights:
            insights.append({
                "type": "info",
                "product_id": "system",
                "message": "INFO: All stock levels are currently healthy and sales are stable. No immediate actions required."
            })

        self.send_json_response({"insights": insights})


def run(server_class=http.server.HTTPServer, handler_class=AIServiceHandler):
    server_address = (HOST, PORT)
    httpd = server_class(server_address, handler_class)
    print(f"Python AI Service running at http://{HOST}:{PORT}/ ...")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        httpd.server_close()
        print("Server stopped.")

if __name__ == "__main__":
    run()
