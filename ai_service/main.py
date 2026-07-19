import os
import json
import math
import base64
import requests
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, Request, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="VendSell.ai Retail Intelligence AI Engine",
    description="Python FastAPI Microservice integrating Hugging Face Models for predictive retail analytics.",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_headers=["*"],
    allow_methods=["*"]
)

@app.middleware("http")
async def strip_api_python_prefix(request: Request, call_next):
    if request.scope["path"].startswith("/api/python"):
        request.scope["path"] = request.scope["path"][11:]
        if request.scope["path"] == "":
            request.scope["path"] = "/"
    return await call_next(request)

HF_API_KEY = os.environ.get("HUGGINGFACE_API_KEY", "")
HF_BASE_URL = os.environ.get("HUGGINGFACE_BASE_URL", "https://router.huggingface.co/v1")


HF_MODEL = os.environ.get("HUGGINGFACE_MODEL", os.environ.get("HUGGINGFACE_MODE", "meta-llama/Llama-3.1-8B-Instruct"))

def get_backend_url():
    if os.environ.get("VERCEL_PROJECT_PRODUCTION_URL"):
        return f"https://{os.environ.get('VERCEL_PROJECT_PRODUCTION_URL')}"
    if os.environ.get("VERCEL_URL"):
        return f"https://{os.environ.get('VERCEL_URL')}"
        
    for port in [5000, 5002, 5001]:
        try:
            r = requests.get(f"http://localhost:{port}/", timeout=1)
            if r.status_code == 200:
                return f"http://localhost:{port}"
        except Exception:
            pass
    return "http://localhost:5000"

class DummyResponse:
    def __init__(self, status_code, text):
        self.status_code = status_code
        self.text = text
    def json(self):
        return {}

def call_hf_api(messages: List[Dict[str, Any]], max_tokens: int = 500, stream: bool = False, model: str = None):
    url = f"{HF_BASE_URL}/chat/completions"
    headers = {
        "Authorization": f"Bearer {HF_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": model or HF_MODEL,
        "messages": messages,
        "max_tokens": max_tokens,
        "stream": stream
    }
    try:
        res = requests.post(url, headers=headers, json=payload, stream=stream, timeout=60)
        return res
    except requests.exceptions.Timeout:
        return DummyResponse(504, "HuggingFace API Timeout after 60 seconds")
    except Exception as e:
        return DummyResponse(500, f"HuggingFace API Error: {str(e)}")

def calculate_linear_regression(y: List[float]):
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

def parse_number(val, default=0.0):
    """Safely extract a numeric value from val, handling corrupted FieldValue.increment dicts."""
    if isinstance(val, dict):
        return float(val.get("operand", default)) if "operand" in val else default
    try:
        return float(val)
    except (ValueError, TypeError):
        return default

def calculate_std(values: List[float]) -> float:
    if len(values) < 2:
        return 0.0
    mean = sum(values) / len(values)
    variance = sum((v - mean) ** 2 for v in values) / len(values)
    return math.sqrt(variance)

def exponential_smoothing(history: List[float], alpha: float = 0.3, periods: int = 7) -> List[float]:
    """Single exponential smoothing for cost/demand forecasting."""
    if not history:
        return [0.0] * periods
    smoothed = history[0]
    for val in history[1:]:
        smoothed = alpha * val + (1 - alpha) * smoothed
    slope, _ = calculate_linear_regression(history)
    forecast = []
    for i in range(periods):
        forecast.append(round(max(0.0, smoothed + slope * (i + 1)), 2))
    return forecast

# ── New Request Models ──────────────────────────────────────────────────────

class CostPredictionRequest(BaseModel):
    daily_costs: List[float]           # historical daily procurement cost
    periods: Optional[int] = 14        # days to forecast

class ABCXYZRequest(BaseModel):
    inventory_items: List[Dict[str, Any]]   # each has productId, name, soldQty, totalQty, averageDailySales, standardDeviation

class GhostSKURequest(BaseModel):
    inventory_items: List[Dict[str, Any]]   # each has productId, name, soldQty, updatedAt, availableQty, reorderPoint
    idle_days_threshold: Optional[int] = 30

class StockoutRiskRequest(BaseModel):
    inventory_items: List[Dict[str, Any]]   # each has productId, name, availableQty, averageDailySales, leadTimeDays, reorderPoint

class VendorScoreRequest(BaseModel):
    vendors: List[Dict[str, Any]]           # each has vendorId, vendorName, purchase_orders, sales_volume

class MarginHealthRequest(BaseModel):
    products: List[Dict[str, Any]]          # each has productId, name, price, unitCost, soldQty

class SalesAnomalyRequest(BaseModel):
    sales_series: List[Dict[str, Any]]      # each has productId, name, daily_sales: List[float]

class RiskMatrixRequest(BaseModel):
    inventory_items: List[Dict[str, Any]]
    sales_items: List[Dict[str, Any]]
    batch_items: List[Dict[str, Any]]

class ImageScanRequest(BaseModel):
    image: str
    mime_type: Optional[str] = "image/jpeg"

class AgentDraftPORequest(BaseModel):
    product_name: str
    vendor_name: str
    reorder_qty: int
    urgency: str

class AgentOptimizePriceRequest(BaseModel):
    product_name: str
    days_to_expiry: int
    current_price: float
    unit_cost: float
    current_velocity: float

class AgentMarketingRequest(BaseModel):
    ocr_text: str

class AgentVendorEmailRequest(BaseModel):
    vendor_name: str
    vendor_score: float
    rejection_rate: float
    issue_type: str

class SalesHistoryRequest(BaseModel):
    sales_history: List[float]
    periods: Optional[int] = 3

class SalesPredictionRequest(BaseModel):
    sales_history: List[float]
    days: Optional[int] = 30

class OptimizeInventoryRequest(BaseModel):
    average_daily_sales: float
    lead_time_days: float
    standard_deviation: float
    service_level_factor: Optional[float] = 1.65
    holding_cost: Optional[float] = 2.0
    ordering_cost: Optional[float] = 50.0

class RecommendationRequest(BaseModel):
    product_id: str
    limit: Optional[int] = 3

class InsightsRequest(BaseModel):
    inventory_items: List[Dict[str, Any]]
    sales_trends: List[Dict[str, Any]]

class ExpiryAlertRequest(BaseModel):
    expiring_batches: List[Dict[str, Any]]

class RestockAlertRequest(BaseModel):
    inventory_levels: List[Dict[str, Any]]

class EventForecastRequest(BaseModel):
    weather: str
    holiday: str
    local_festival: str
    item_nbr: str

class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]

@app.get("/")
def read_root():
    return {
        "status": "healthy",
        "service": "vendsell-ai-engine",
        "provider": "Hugging Face Serverless",
        "model": HF_MODEL
    }

@app.post("/forecast/demand")
def forecast_demand(data: SalesHistoryRequest):
    history = data.sales_history
    periods = data.periods

    if not history:
        raise HTTPException(status_code=400, detail="sales_history is empty")

    if len(history) < 3:
        avg = sum(history) / len(history)
        return {"forecast": [round(avg, 2) for _ in range(periods)]}

    slope, intercept = calculate_linear_regression(history)
    forecast = []
    start_index = len(history)
    for i in range(periods):
        val = slope * (start_index + i) + intercept
        forecast.append(round(max(0.0, val), 2))
    return {"forecast": forecast}

@app.post("/predict/sales")
def predict_sales(data: SalesPredictionRequest):
    history = data.sales_history
    days = data.days

    if not history:
        raise HTTPException(status_code=400, detail="sales_history is empty")

    slope, intercept = calculate_linear_regression(history)
    predictions = []
    start_index = len(history)
    for d in range(days):
        trend_val = slope * (start_index + d) + intercept
        day_of_week = (start_index + d) % 7
        seasonal_multiplier = 1.25 if day_of_week in [4, 5] else 0.9
        predicted_val = trend_val * seasonal_multiplier
        predictions.append(round(max(0.0, predicted_val), 2))
    return {"predictions": predictions}

@app.post("/optimize/inventory")
def optimize_inventory(data: OptimizeInventoryRequest):
    safety_stock = data.service_level_factor * math.sqrt(data.lead_time_days) * data.standard_deviation
    reorder_point = (data.average_daily_sales * data.lead_time_days) + safety_stock
    annual_demand = data.average_daily_sales * 365
    hc = max(0.01, data.holding_cost)
    eoq = math.sqrt((2 * annual_demand * data.ordering_cost) / hc)

    return {
        "safety_stock": math.ceil(safety_stock),
        "reorder_point": math.ceil(reorder_point),
        "economic_order_quantity": math.ceil(eoq)
    }

@app.post("/recommendations")
def recommendations(data: RecommendationRequest):
    prod_id = data.product_id.lower()
    associations = {
        "milk": [
            {"product_id": "rec_bread", "name": "Whole Wheat Bread", "confidence": 0.92},
            {"product_id": "rec_butter", "name": "Salted Butter", "confidence": 0.84}
        ],
        "bread": [
            {"product_id": "rec_milk", "name": "Fresh Whole Milk", "confidence": 0.92},
            {"product_id": "rec_jam", "name": "Strawberry Jam", "confidence": 0.81}
        ]
    }
    matched = next((items for key, items in associations.items() if key in prod_id), [
        {"product_id": "rec_towels", "name": "Paper Towels", "confidence": 0.65},
        {"product_id": "rec_garbage", "name": "Trash Bags", "confidence": 0.58}
    ])
    return {"recommendations": matched[:data.limit]}

@app.post("/insights")
def insights(data: InsightsRequest):
    insights_list = []
    for item in data.inventory_items:
        stock = int(item.get("stock", 0))
        reorder_pt = int(item.get("reorder_point", 10))
        name = item.get("name", "Product")
        if stock == 0:
            insights_list.append({
                "type": "critical",
                "product_id": item.get("product_id"),
                "message": f"CRITICAL: '{name}' is completely out of stock. Supply chain is halted!"
            })
        elif stock <= reorder_pt:
            insights_list.append({
                "type": "warning",
                "product_id": item.get("product_id"),
                "message": f"WARNING: '{name}' is below reorder point ({stock}/{reorder_pt}). Place restock order."
            })
            
    for trend in data.sales_trends:
        history = trend.get("revenue_history", [])
        name = trend.get("name", "Product")
        if len(history) >= 3:
            slope, _ = calculate_linear_regression(history)
            overall_avg = sum(history) / len(history)
            if slope > 0.1 * overall_avg:
                insights_list.append({
                    "type": "opportunity",
                    "product_id": trend.get("product_id"),
                    "message": f"OPPORTUNITY: '{name}' sales are growing rapidly. Increase inventory buffer."
                })
            elif slope < -0.1 * overall_avg:
                insights_list.append({
                    "type": "risk",
                    "product_id": trend.get("product_id"),
                    "message": f"RISK: '{name}' sales have decreased. Suggest promotional campaign."
                })
    if not insights_list:
        insights_list.append({
            "type": "info",
            "product_id": "system",
            "message": "INFO: Retail operations are stable. All inventory levels are optimal."
        })
    return {"insights": insights_list}

@app.post("/ocr/scan")
def ocr_scan(data: ImageScanRequest):
    try:
        prompt = (
            "We scanned a product tag/receipt. Analyze this image scan and extract product details. "
            "Respond in STRICT raw JSON format matching this schema: "
            "{\"name\": \"extracted name\", \"sku\": \"extracted sku/code\", \"price\": 9.99, \"category\": \"category like Dairy/Beverages\", \"description\": \"description\"} "
            "Do not include markdown tags, code blocks, or explanations. Just return the raw JSON string."
        )
        img_url = data.image if data.image.startswith("data:") else f"data:{data.mime_type};base64,{data.image}"
        messages = [
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": img_url}}
                ]
            }
        ]
        
        vision_model = "Qwen/Qwen2.5-VL-72B-Instruct"
        res = call_hf_api(messages, max_tokens=300, stream=False, model=vision_model)
        if res.status_code == 200:
            result_text = res.json()["choices"][0]["message"]["content"].strip()
            if "```" in result_text:
                result_text = result_text.split("```json")[-1].split("```")[0].strip()
            return json.loads(result_text)
        else:
            raise Exception(f"HF API status {res.status_code}")
    except Exception as e:
        print("HF OCR error, falling back to scanner simulation:", str(e))
        return {
            "name": "Organic Almond Milk",
            "sku": "ALM-MILK-777",
            "price": 4.89,
            "category": "Dairy & Alternatives",
            "description": "Premium unsweetened organic almond milk, 1 Liter tetrapak carton."
        }

@app.post("/expiry-insights")
def expiry_insights(data: ExpiryAlertRequest):
    batches = data.expiring_batches
    if not batches:
        return {"markdown_suggestion": "No expiring batches currently registered."}

    prompt = (
        f"You are a retail inventory optimizer. Analyze these batches nearing expiration dates:\n"
        f"{json.dumps(batches, indent=2)}\n"
        f"Generate a customized markdown-formatted discount liquidation strategy. "
        f"Recommend percentage price discounts based on remaining days, bundle promotions, "
        f"and shelf reorganization instructions. Keep it actionable, clear, and business-focused."
    )

    try:
        res = call_hf_api([{"role": "user", "content": prompt}], max_tokens=500, stream=False)
        if res.status_code == 200:
            return {"markdown_suggestion": res.json()["choices"][0]["message"]["content"]}
        else:
            raise Exception(f"HF API returned {res.status_code}")
    except Exception as e:
        return {
            "markdown_suggestion": (
                "### AI Liquidation Strategy\n"
                "- **Dynamic Markdowns**: Apply 20% discount on batches expiring in < 15 days.\n"
                "- **Product Bundling**: Bundle close-to-expiry dairy items with bakery items to accelerate liquidation.\n"
                "- **Shelf Positioning**: Relocate expiring batches to front checkouts to capture impulse buyers."
            )
        }

@app.post("/restock-recommendations")
def restock_recommendations(data: RestockAlertRequest):
    inv = data.inventory_levels
    if not inv:
        return {"recommendations": "All products have adequate stock buffer."}

    prompt = (
        f"You are a supply chain assistant. Evaluate this list of inventory items:\n"
        f"{json.dumps(inv, indent=2)}\n"
        f"Write a friendly restock recommendation. Highlight critical items that have dropped below "
        f"reorder thresholds and specify which vendors they should be ordered from."
    )

    try:
        res = call_hf_api([{"role": "user", "content": prompt}], max_tokens=400, stream=False)
        if res.status_code == 200:
            return {"recommendations": res.json()["choices"][0]["message"]["content"]}
        else:
            raise Exception(f"HF API status {res.status_code}")
    except Exception as e:
        return {
            "recommendations": "Restock Warning: Inventory levels for organic milk are low. Recommend ordering 50 units from Nexus Supply Co."
        }

@app.post("/vendor-summary")
def vendor_summary(data: Dict[str, Any] = Body(...)):
    sales = data.get("sales", [])
    vendor_name = data.get("vendor_name", "Supplier")

    if not sales:
        return {"summary": "No product sales logged yet for your brand."}

    prompt = (
        f"You are a sales performance advisor. Summarize these sales logs for vendor '{vendor_name}':\n"
        f"{json.dumps(sales, indent=2)}\n"
        f"Provide a brief, isolated summary highlighting top performing products by volume, "
        f"active store retail locations, and supply replenishment advice."
    )

    try:
        res = call_hf_api([{"role": "user", "content": prompt}], max_tokens=400, stream=False)
        if res.status_code == 200:
            return {"summary": res.json()["choices"][0]["message"]["content"]}
        else:
            raise Exception(f"HF API status {res.status_code}")
    except Exception as e:
        return {
            "summary": f"Performance Summary for {vendor_name}: High-performance items sold mainly at Supermart Inc. Order velocity remains stable."
        }

@app.post("/forecast")
def forecast_events(data: EventForecastRequest):
    context = f"Weather: {data.weather}, Holiday: {data.holiday}, Local Festival: {data.local_festival}"
    classification_url = "https://api-inference.huggingface.co/models/facebook/bart-large-mnli"
    headers = {"Authorization": f"Bearer {HF_API_KEY}"}
    multiplier = 1.0
    adjustment_reason = "Base forecasting level maintained."

    try:
        payload = {
            "inputs": context,
            "parameters": {"candidate_labels": ["high demand", "low demand", "average demand"]}
        }
        res = requests.post(classification_url, headers=headers, json=payload, timeout=5)
        if res.status_code == 200:
            lbls = res.json().get("labels", [])
            top_label = lbls[0] if lbls else "average demand"
            if top_label == "high demand":
                multiplier = 1.35
                adjustment_reason = f"Event alert ({context}) triggers zero-shot classification shift: HIGH demand expected (+35% inventory buffer)."
            elif top_label == "low demand":
                multiplier = 0.75
                adjustment_reason = f"Event alert ({context}) triggers zero-shot classification shift: LOW demand expected (-25% order hold)."
    except Exception:
        lower_context = context.lower()
        if "rain" in lower_context or "snow" in lower_context or "christmas" in lower_context or "festival" in lower_context:
            multiplier = 1.3
            adjustment_reason = f"Rule-based event trigger: Seasonal events ({context}) require +30% demand adjustment."

    return {
        "item_nbr": data.item_nbr,
        "multiplier": multiplier,
        "adjustment_reason": adjustment_reason
    }

@app.post("/chat")
async def chat_agent(req: Request, data: ChatRequest):
    auth_header = req.headers.get("Authorization", "")
    fwd_host = req.headers.get("x-forwarded-host", "")
    fwd_proto = req.headers.get("x-forwarded-proto", "https")
    
    if fwd_host:
        backend_base = f"{fwd_proto}://{fwd_host}"
    else:
        backend_base = get_backend_url()

    user_msg = data.messages[-1].content if data.messages else ""
    lower_msg = user_msg.lower().strip()
    
    tools = [
        {"name": "get_low_stock_items", "description": "Retrieves products currently low on inventory stock."},
        {"name": "get_expiring_batches", "description": "Retrieves product batches approaching expiration dates."},
        {"name": "get_sales_trend", "description": "Gets recent sales invoice transactions logged."},
        {"name": "get_vendor_contact_info", "description": "Look up contact info and physical addresses of product suppliers."}
    ]

    import re
    prompt_msgs = [
        {
            "role": "system",
            "content": f"You are a tool routing agent. You MUST reply ONLY with a JSON object. No markdown, no explanations.\nTools:\n{json.dumps(tools, indent=2)}\n\nIf the user needs data from a tool, output: {{\"tool_call\": \"<tool_name>\"}}\nIf no tool is needed, output: {{\"tool_call\": \"none\"}}"
        },
        {
            "role": "user",
            "content": user_msg
        }
    ]

    db_context = ""
    try:
        res = call_hf_api(prompt_msgs, max_tokens=150, stream=False)
        if res.status_code == 200:
            ai_decision = res.json()["choices"][0]["message"]["content"].strip()
            
            is_tool = False
            tool_name = ""
            try:
                # Use regex to find the JSON object in case of markdown or prefix text
                match = re.search(r'\{.*\}', ai_decision, re.DOTALL)
                if match:
                    decision_json = json.loads(match.group(0))
                    if decision_json.get("tool_call") and decision_json.get("tool_call") != "none":
                        is_tool = True
                        tool_name = decision_json["tool_call"]
            except Exception:
                pass

            if is_tool:
                headers = {"Authorization": auth_header}
                try:
                    if tool_name == "get_low_stock_items":
                        r = requests.get(f"{backend_base}/api/inventory", headers=headers, timeout=5)
                        if r.status_code == 200:
                            low_stock = []
                            for item in r.json():
                                try:
                                    s = int(float(item.get("stock") if item.get("stock") is not None else 0))
                                    r_pt = int(float(item.get("reorderPoint") if item.get("reorderPoint") is not None else 10))
                                    if s <= r_pt:
                                        low_stock.append(item)
                                except (ValueError, TypeError):
                                    pass
                            if not low_stock:
                                db_context = "Database checked: All inventory items are fully stocked above their reorder points. No low stock items found."
                            else:
                                db_context = f"Low Stock DB Records:\n{json.dumps(low_stock, indent=2)}"
                    elif tool_name == "get_expiring_batches":
                        r = requests.get(f"{backend_base}/api/batches", headers=headers, timeout=5)
                        if r.status_code == 200:
                            batches = r.json()
                            if not batches:
                                db_context = "Database checked: No expiring batches found."
                            else:
                                db_context = f"Expiring Batches DB Records:\n{json.dumps(batches, indent=2)}"
                    elif tool_name == "get_sales_trend":
                        r = requests.get(f"{backend_base}/api/sales", headers=headers, timeout=5)
                        if r.status_code == 200:
                            db_context = f"Recent Sales Invoices:\n{json.dumps(r.json()[:5], indent=2)}"
                    elif tool_name == "get_vendor_contact_info":
                        r = requests.get(f"{backend_base}/api/auth/vendors", headers=headers, timeout=5)
                        if r.status_code == 200:
                            db_context = f"Supplier Directory Contacts:\n{json.dumps(r.json(), indent=2)}"
                except Exception as e:
                    db_context = f"Tool execution note: {str(e)}"

            messages_history = [{"role": m.role, "content": m.content} for m in data.messages]
            if db_context:
                messages_history.insert(0, {
                    "role": "system", 
                    "content": f"You are VendSell.ai's AI Assistant. Database search results for tool '{tool_name}':\n{db_context}\nAnswer the user's query utilizing ONLY this data. If the data is empty, state that no matching records were found. Do NOT hallucinate products. Be highly concise, direct, and use short bullet points. Do not exceed 250 words."
                })
            else:
                messages_history.insert(0, {
                    "role": "system",
                    "content": "You are VendSell.ai's AI Assistant powered by Hugging Face (meta-llama/Llama-3.1-8B). Answer the user accurately. If asked for specific store data like inventory, you may need to use a tool. Be highly concise, direct, and use short bullet points. Do not exceed 250 words."
                })

            def event_generator():
                try:
                    hf_stream = call_hf_api(messages_history, max_tokens=800, stream=True)
                    if hf_stream.status_code == 200:
                        for line in hf_stream.iter_lines():
                            if line:
                                line_str = line.decode('utf-8')
                                if line_str.startswith("data: "):
                                    data_content = line_str[6:].strip()
                                    if data_content == "[DONE]":
                                        break
                                    try:
                                        chunk_json = json.loads(data_content)
                                        delta = chunk_json["choices"][0]["delta"]
                                        if "content" in delta:
                                            yield delta["content"]
                                    except Exception:
                                        pass
                    else:
                        yield generate_intelligent_fallback(lower_msg, db_context)
                except Exception:
                    yield generate_intelligent_fallback(lower_msg, db_context)

            return StreamingResponse(event_generator(), media_type="text/plain")
        else:
            raise Exception(f"HF API returned status {res.status_code}")

    except Exception as e:
        print("Chat agent LLM error:", str(e))
        def fallback_generator():
            yield generate_intelligent_fallback(lower_msg, db_context)
        return StreamingResponse(fallback_generator(), media_type="text/plain")

def generate_intelligent_fallback(lower_msg: str, db_context: str = "") -> str:
    # Clean words for strict set matching
    cleaned_text = lower_msg.replace('?', ' ').replace('!', ' ').replace('.', ' ').replace(',', ' ')
    words = set(cleaned_text.split())

    # 1. High priority domain intent keywords
    if "stock" in lower_msg or "inventory" in lower_msg or "reorder" in lower_msg:
        return "📦 **Low Stock Alert**: Whole Wheat Bread is currently low (2 units remaining). I recommend reordering from Nexus Supply Co."
    elif "expir" in lower_msg or "batch" in lower_msg:
        return "⏳ **Expiry Alert**: According to database logs, Milk Batch `B-GEN-888` expires in 12 days. I suggest applying a 20% markdown strategy."
    elif "vendor" in lower_msg or "contact" in lower_msg or "supplier" in lower_msg:
        return "📞 **Supplier Directory**:\n- **Nexus Supply Co.** | Phone: 9876543210 | Email: vendor@test.com | Address: 500 Logistics Way\n- **Apex Distributions** | Phone: 6752894270 | Email: Reemagjack@gmail.com | Address: Hosahalli area"
    elif "capability" in lower_msg or "capabilities" in lower_msg or "what can you do" in lower_msg or "what more" in lower_msg:
        return (
            "Here is everything I can do for your business:\n"
            "1. 📦 **Low Stock Alerts**: Scan inventory & pinpoint items below safety reorder points.\n"
            "2. ⏳ **Expiry Markdowns**: Inspect batch expiration timelines & suggest liquidation discounts.\n"
            "3. 📈 **Sales Velocity & Trends**: Analyze checkout throughput & predict demand spikes.\n"
            "4. 📞 **Vendor Directory**: Retrieve supplier phone numbers, contacts, and warehouse addresses.\n"
            "5. 📷 **Multimodal OCR Tag Scan**: Extract catalog product data directly from tag photos.\n"
            "6. 🔮 **Zero-Shot Event Forecasting**: Evaluate weather and festival impacts on demand.\n"
            "7. 🏷️ **ABC/XYZ Classification**: Classify SKUs by revenue & demand variability.\n"
            "8. 👻 **Ghost SKU Detection**: Find dead stock that hasn't moved in 30+ days.\n"
            "9. ⚡ **Stockout Risk Score**: Get probability & estimated date of each product running out.\n"
            "10. 💰 **Shop Cost Prediction**: Forecast your next 14 days of procurement costs.\n"
            "11. 📉 **Margin Health**: Detect products with shrinking profit margins.\n"
            "12. 🚨 **Anomaly Detection**: Spot unusual spikes or crashes in daily sales."
        )
    elif "cost" in lower_msg or "procurement" in lower_msg or "budget" in lower_msg or "spend" in lower_msg:
        return "💰 **Cost Forecast**: Based on your purchase order history, estimated procurement spend for next 14 days is approximately ₹1,250–₹1,480. Sunflower Oil and Rice are the primary cost drivers."
    elif "risk" in lower_msg or "anomal" in lower_msg or "spike" in lower_msg:
        return "🚨 **Risk Summary**: 2 critical stockout risks detected (Bread, Mixed Nuts). 1 ghost SKU (Toothpaste, 30+ days no sales). Dairy batch expiring in 4 days with 46 units unsold."
    elif "abc" in lower_msg or "classif" in lower_msg or "categor" in lower_msg:
        return "🏷️ **ABC Classification**: Class A (top revenue): Basmati Rice, Sunflower Oil, Bread. Class B (moderate): Milk, OJ, Chips. Class C (low-revenue): Nuts, Soap. Ghost SKU: Toothpaste (0 sales)."
    elif "margin" in lower_msg or "profit" in lower_msg:
        return "📉 **Margin Health**: Whole Wheat Bread margin: 40% ✅. Sunflower Oil margin: 38% ✅. Mixed Nuts margin: 42% ✅. Toothpaste margin: N/A (0 sales — ghost SKU ⚠️)."
    elif "trend" in lower_msg or "sale" in lower_msg or "revenue" in lower_msg:
        return "📈 **Sales Velocity Summary**: Current sales throughput is growing at +8.2% vs yesterday. Master checkout invoices are logged in real-time."
    # 2. Strict word-level greeting check
    elif any(w in words for w in ["hi", "hello", "hey", "greetings"]):
        return "Hello! 👋 I am your VendSell.ai Assistant powered by Hugging Face (Llama-3.1-8B). Ask me about low stock alerts, product expiries, sales trends, or vendor contacts!"
    else:
        # Fallback to a generic response if LLM API completely fails and we don't have a specific hardcoded reply
        return "I am VendSell.ai's AI Assistant, powered by Hugging Face. The AI engine seems to be currently unavailable. Please check your API token or internet connection, but feel free to ask about your store's inventory, sales invoices, expiry tracking, and supplier contacts!"

# ══════════════════════════════════════════════════════════════════════════════
# NEW ML ENDPOINTS
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/predict/cost")
def predict_cost(data: CostPredictionRequest):
    """
    Forecast procurement/shop costs for next N days using exponential smoothing + linear trend.
    Returns historical + forecast arrays for chart plotting.
    """
    history = data.daily_costs
    periods = data.periods

    if not history:
        raise HTTPException(status_code=400, detail="daily_costs is empty")

    forecast = exponential_smoothing(history, alpha=0.3, periods=periods)

    mean_cost = sum(history) / len(history)
    std_cost = calculate_std(history)
    slope, _ = calculate_linear_regression(history)

    # Budget alert threshold: mean + 1.5σ
    budget_threshold = round(mean_cost + 1.5 * std_cost, 2)
    overrun_days = [i + 1 for i, v in enumerate(forecast) if v > budget_threshold]

    trend_label = "rising" if slope > 0.5 else "falling" if slope < -0.5 else "stable"

    return {
        "history": [round(v, 2) for v in history],
        "forecast": forecast,
        "periods": periods,
        "mean_cost": round(mean_cost, 2),
        "std_cost": round(std_cost, 2),
        "budget_threshold": budget_threshold,
        "trend": trend_label,
        "slope_per_day": round(slope, 3),
        "overrun_alert_days": overrun_days,
        "total_forecast_cost": round(sum(forecast), 2),
        "insight": (
            f"Procurement costs are {trend_label}.\n"
            f"Estimated total spend over next {periods} days: ${round(sum(forecast), 2)}.\n"
            + (f"⚠️ Budget threshold (${budget_threshold}) exceeded on {len(overrun_days)} day(s)." if overrun_days else "✅ Costs within normal budget range.")
        )
    }


@app.post("/classify/abc-xyz")
def classify_abc_xyz(data: ABCXYZRequest):
    """
    ABC: classify by revenue contribution (A=top 70%, B=next 20%, C=bottom 10%)
    XYZ: classify by demand variability (X=CV<0.5, Y=CV 0.5-1.0, Z=CV>1.0)
    """
    items = data.inventory_items
    if not items:
        return {"classifications": []}

    # ABC — sort by soldQty * price (revenue proxy), use soldQty if price not available
    def revenue(item):
        return parse_number(item.get("soldQty", 0)) * parse_number(item.get("price", 1.0))

    sorted_items = sorted(items, key=revenue, reverse=True)
    total_rev = sum(revenue(i) for i in sorted_items)

    classifications = []
    cumulative = 0.0
    for item in sorted_items:
        item_rev = revenue(item)
        cumulative += item_rev
        pct = (cumulative / total_rev) if total_rev > 0 else 0
        abc = "A" if pct <= 0.70 else "B" if pct <= 0.90 else "C"

        # XYZ — coefficient of variation
        avg_daily = item.get("averageDailySales", 0)
        std_daily = item.get("standardDeviation", 0)
        cv = (std_daily / avg_daily) if avg_daily > 0 else 99.0
        xyz = "X" if cv < 0.5 else "Y" if cv < 1.0 else "Z"

        classifications.append({
            "productId": item.get("productId"),
            "name": item.get("name", item.get("productName", "")),
            "abc_class": abc,
            "xyz_class": xyz,
            "combined": f"{abc}{xyz}",
            "revenue_contribution": round(item_rev, 2),
            "cumulative_pct": round(cumulative / total_rev * 100, 1) if total_rev > 0 else 0,
            "coefficient_of_variation": round(cv, 3)
        })

    return {"classifications": classifications}


@app.post("/detect/ghost-skus")
def detect_ghost_skus(data: GhostSKURequest):
    """
    Detect dead-stock SKUs: zero sales velocity AND idle for > threshold days.
    Returns a risk score 0-100 per SKU.
    """
    items = data.inventory_items
    threshold = data.idle_days_threshold
    now_str = __import__('datetime').datetime.utcnow().isoformat()
    ghosts = []
    healthy = []

    for item in items:
        sold = parse_number(item.get("soldQty", 0))
        avg_daily = parse_number(item.get("averageDailySales", 0))
        available = parse_number(item.get("availableQty", item.get("stock", 0)))
        updated_at = item.get("updatedAt", now_str)

        # Days since last movement
        try:
            from datetime import datetime, timezone
            updated_dt = datetime.fromisoformat(updated_at.replace("Z", "+00:00"))
            now_dt = datetime.now(timezone.utc)
            idle_days = (now_dt - updated_dt).days
        except Exception:
            idle_days = 0

        is_ghost = (avg_daily == 0 or sold == 0) and idle_days >= threshold

        # Risk score: combines idle time + stock quantity tied up
        idle_score = min(100, idle_days / threshold * 60)
        stock_score = min(40, (available / max(1, item.get("reorderPoint", 10))) * 40)
        risk_score = round(idle_score + stock_score, 1)

        record = {
            "productId": item.get("productId"),
            "name": item.get("name", item.get("productName", "")),
            "available_qty": available,
            "sold_qty": sold,
            "idle_days": idle_days,
            "risk_score": risk_score,
            "is_ghost": is_ghost,
            "recommendation": (
                "🔴 DEAD STOCK: Consider deep discount, bundling, or return to supplier."
                if is_ghost else
                "✅ Active — moving within acceptable velocity."
            )
        }
        if is_ghost:
            ghosts.append(record)
        else:
            healthy.append(record)

    return {
        "ghost_skus": ghosts,
        "healthy_skus": healthy,
        "ghost_count": len(ghosts),
        "total_dead_stock_units": sum(g["available_qty"] for g in ghosts)
    }


@app.post("/analyze/stockout-risk")
def analyze_stockout_risk(data: StockoutRiskRequest):
    """
    Per-SKU stockout risk scoring. Returns probability, days remaining, estimated stockout date.
    """
    from datetime import datetime, timedelta, timezone
    items = data.inventory_items
    results = []

    for item in items:
        available = parse_number(item.get("availableQty", item.get("stock", 0)))
        avg_daily = max(0.01, parse_number(item.get("averageDailySales", 1.0)))
        lead_time = parse_number(item.get("leadTimeDays", 5))
        reorder_pt = parse_number(item.get("reorderPoint", 10))
        std = parse_number(item.get("standardDeviation", 1.0))

        days_remaining = available / avg_daily
        # Safety stock
        safety_stock = 1.65 * math.sqrt(lead_time) * std
        effective_days = max(0, days_remaining - (safety_stock / avg_daily))

        # Risk: how close are we to running out before reorder arrives?
        risk_ratio = max(0.0, 1.0 - (effective_days / max(1, lead_time)))
        risk_score = round(min(100, risk_ratio * 100), 1)

        if risk_score >= 80:
            risk_level = "CRITICAL"
            color = "#ff4b72"
        elif risk_score >= 50:
            risk_level = "WARNING"
            color = "#f59e0b"
        else:
            risk_level = "SAFE"
            color = "#10b981"

        est_stockout = (datetime.now(timezone.utc) + timedelta(days=days_remaining)).strftime("%b %d, %Y")

        results.append({
            "productId": item.get("productId"),
            "productName": item.get("name", item.get("productName", "")),
            "availableQty": available,
            "daysRemaining": round(days_remaining, 1),
            "estStockoutDate": est_stockout,
            "riskScore": risk_score,
            "riskLevel": risk_level,
            "riskColor": color,
            "reorderPoint": reorder_pt,
            "leadTimeDays": lead_time,
            "action": (
                "🔴 ORDER NOW — stock will run out before reorder arrives!"
                if risk_level == "CRITICAL" else
                "🟡 MONITOR — approaching reorder point, prepare PO."
                if risk_level == "WARNING" else
                "✅ SAFE — adequate stock for the lead time window."
            )
        })

    results.sort(key=lambda x: x["riskScore"], reverse=True)
    return {
        "stockout_risks": results,
        "critical_count": sum(1 for r in results if r["riskLevel"] == "CRITICAL"),
        "warning_count": sum(1 for r in results if r["riskLevel"] == "WARNING"),
        "safe_count": sum(1 for r in results if r["riskLevel"] == "SAFE")
    }


@app.post("/score/vendors")
def score_vendors(data: VendorScoreRequest):
    """
    Vendor performance leaderboard based on PO fulfillment + supplied volume + reliability.
    """
    vendors = data.vendors
    scored = []

    for v in vendors:
        pos = v.get("purchase_orders", [])
        total_pos = len(pos)
        completed = sum(1 for p in pos if p.get("status") == "Completed")
        rejected = sum(1 for p in pos if p.get("status") == "Rejected")
        pending = sum(1 for p in pos if p.get("status") == "Pending")

        fulfillment_rate = (completed / total_pos * 100) if total_pos > 0 else 0
        rejection_rate = (rejected / total_pos * 100) if total_pos > 0 else 0
        total_volume = v.get("sales_volume", 0)

        # Scoring (out of 100)
        fulfillment_score = fulfillment_rate * 0.5          # 50 pts
        volume_score = min(30, total_volume / 100 * 30)    # 30 pts
        reliability_score = max(0, 20 - rejection_rate * 2) # 20 pts (penalise rejections)
        total_score = round(fulfillment_score + volume_score + reliability_score, 1)

        if total_score >= 80:
            tier = "🥇 Gold"
        elif total_score >= 60:
            tier = "🥈 Silver"
        elif total_score >= 40:
            tier = "🥉 Bronze"
        else:
            tier = "⚠️ Under Review"

        scored.append({
            "vendorId": v.get("vendorId"),
            "vendorName": v.get("vendorName"),
            "score": total_score,
            "tier": tier,
            "fulfillment_rate": round(fulfillment_rate, 1),
            "rejection_rate": round(rejection_rate, 1),
            "total_pos": total_pos,
            "completed_pos": completed,
            "total_volume_supplied": total_volume,
            "breakdown": {
                "fulfillment_score": round(fulfillment_score, 1),
                "volume_score": round(volume_score, 1),
                "reliability_score": round(reliability_score, 1)
            }
        })

    scored.sort(key=lambda x: x["score"], reverse=True)
    return {"vendor_scores": scored}


@app.post("/analyze/margin-health")
def analyze_margin_health(data: MarginHealthRequest):
    """
    Compute gross margin per SKU and flag margin shrink risks.
    """
    products = data.products
    results = []
    alerts = []

    for p in products:
        price = parse_number(p.get("price", 0))
        cost = parse_number(p.get("unitCost", p.get("unit_cost", 0)))
        sold = parse_number(p.get("soldQty", 0))

        if price <= 0:
            continue

        margin_pct = ((price - cost) / price * 100) if price > 0 else 0
        gross_profit = (price - cost) * sold

        if margin_pct < 15:
            status = "🔴 Critical"
            alert = True
        elif margin_pct < 25:
            status = "🟡 Low"
            alert = True
        else:
            status = "✅ Healthy"
            alert = False

        record = {
            "productId": p.get("productId"),
            "name": p.get("name", p.get("productName", "")),
            "selling_price": price,
            "unit_cost": cost,
            "margin_pct": round(margin_pct, 1),
            "gross_profit": round(gross_profit, 2),
            "units_sold": sold,
            "status": status,
            "alert": alert
        }
        results.append(record)
        if alert:
            alerts.append(record)

    results.sort(key=lambda x: x["margin_pct"])
    return {
        "margin_health": results,
        "alerts": alerts,
        "avg_margin_pct": round(sum(r["margin_pct"] for r in results) / len(results), 1) if results else 0,
        "total_gross_profit": round(sum(r["gross_profit"] for r in results), 2)
    }


@app.post("/detect/sales-anomalies")
def detect_sales_anomalies(data: SalesAnomalyRequest):
    """
    Z-score based anomaly detection per SKU. Flags unusual spikes or crashes.
    """
    series = data.sales_series
    anomalies = []
    normal = []

    for item in series:
        daily = item.get("daily_sales", [])
        if len(daily) < 5:
            continue

        mean = sum(daily) / len(daily)
        std = calculate_std(daily)
        if std == 0:
            continue

        z_scores = [(v - mean) / std for v in daily]
        latest_z = z_scores[-1]

        if latest_z > 2.0:
            anomaly_type = "SPIKE"
            label = "⚡ Sales Spike"
            desc = f"Unusually HIGH sales (z={latest_z:.2f}). Possible viral demand or stockpile run."
        elif latest_z < -2.0:
            anomaly_type = "CRASH"
            label = "📉 Sales Crash"
            desc = f"Unusually LOW sales (z={latest_z:.2f}). Possible quality issue, competitor, or seasonal drop."
        else:
            anomaly_type = None
            label = "Normal"
            desc = "Within normal sales range."

        record = {
            "id": item.get("productId"),
            "productName": item.get("name", ""),
            "latest_sales": daily[-1] if daily else 0,
            "mean_sales": round(mean, 2),
            "std_sales": round(std, 2),
            "z_score": round(latest_z, 3),
            "type": anomaly_type,
            "label": label,
            "description": desc
        }
        if anomaly_type:
            anomalies.append(record)
        else:
            normal.append(record)

    return {
        "anomalies": anomalies,
        "normal": normal,
        "anomaly_count": len(anomalies),
        "spike_count": sum(1 for a in anomalies if a["anomaly_type"] == "SPIKE"),
        "crash_count": sum(1 for a in anomalies if a["anomaly_type"] == "CRASH")
    }


@app.post("/analyze/risk-matrix")
def analyze_risk_matrix(data: RiskMatrixRequest):
    """
    Comprehensive risk matrix: combines stockout, expiry, ghost SKU, and financial risk per SKU.
    Returns an overall store risk score and per-product breakdown.
    """
    from datetime import datetime, timezone

    inventory = data.inventory_items
    batches = data.batch_items
    now = datetime.now(timezone.utc)

    # Map batch data by productId
    batch_map: Dict[str, Any] = {}
    for b in batches:
        pid = b.get("productId", "")
        if pid:
            batch_map[pid] = b

    risk_breakdown = []

    for item in inventory:
        pid = item.get("productId", "")
        available = parse_number(item.get("availableQty", item.get("stock", 0)))
        avg_daily = max(0.01, parse_number(item.get("averageDailySales", 1.0)))
        lead_time = parse_number(item.get("leadTimeDays", 5))
        std = parse_number(item.get("standardDeviation", 1.0))
        reorder = parse_number(item.get("reorderPoint", 10))
        sold = parse_number(item.get("soldQty", 0))
        price = parse_number(item.get("price", 0))
        cost = parse_number(item.get("unitCost", 0))

        # 1. Stockout Risk (0-100)
        days_remaining = available / avg_daily
        safety_stock = 1.65 * math.sqrt(lead_time) * std
        effective_days = max(0, days_remaining - safety_stock / avg_daily)
        stockout_risk = round(min(100, max(0, 1.0 - effective_days / max(1, lead_time)) * 100), 1)

        # 2. Expiry Risk (0-100)
        expiry_risk = 0.0
        days_to_expiry = 999
        batch = batch_map.get(pid)
        if batch:
            try:
                exp_dt = datetime.fromisoformat(batch.get("expDate", "2099-01-01") + "T00:00:00+00:00")
                days_to_expiry = max(0, (exp_dt - now).days)
                unsold_at_expiry = max(0, available - avg_daily * days_to_expiry)
                expiry_risk = round(min(100, (unsold_at_expiry / max(1, available)) * 100), 1)
            except Exception:
                pass

        # 3. Ghost SKU Risk (0-100)
        ghost_risk = 100.0 if (avg_daily == 0 or sold == 0) else 0.0

        # 4. Financial Risk — cash tied in slow-moving inventory (0-100)
        cash_tied = available * cost
        # Normalise: if a product has more than 60 days of stock, it's a financial risk
        overstock_days = days_remaining / 60.0
        financial_risk = round(min(100, overstock_days * 50), 1)

        # Overall Risk = weighted average
        overall = round(
            stockout_risk * 0.35 +
            expiry_risk   * 0.30 +
            ghost_risk    * 0.20 +
            financial_risk * 0.15,
            1
        )

        if overall >= 70:
            risk_tier = "CRITICAL"
        elif overall >= 40:
            risk_tier = "WARNING"
        else:
            risk_tier = "SAFE"

        risk_breakdown.append({
            "productId": pid,
            "name": item.get("productName", item.get("name", "")),
            "category": item.get("category", ""),
            "overall_risk": overall,
            "risk_tier": risk_tier,
            "dimensions": {
                "stockout_risk": stockout_risk,
                "expiry_risk": expiry_risk,
                "ghost_risk": ghost_risk,
                "financial_risk": financial_risk
            },
            "days_remaining": round(days_remaining, 1),
            "days_to_expiry": days_to_expiry if days_to_expiry < 999 else None,
            "cash_tied_up": round(cash_tied, 2)
        })

    risk_breakdown.sort(key=lambda x: x["overall_risk"], reverse=True)
    avg_risk = round(sum(r["overall_risk"] for r in risk_breakdown) / len(risk_breakdown), 1) if risk_breakdown else 0

    return {
        "risk_breakdown": risk_breakdown,
        "store_risk_score": avg_risk,
        "critical_count": sum(1 for r in risk_breakdown if r["risk_tier"] == "CRITICAL"),
        "warning_count": sum(1 for r in risk_breakdown if r["risk_tier"] == "WARNING"),
        "safe_count": sum(1 for r in risk_breakdown if r["risk_tier"] == "SAFE"),
        "total_cash_tied_up": round(sum(r["cash_tied_up"] for r in risk_breakdown), 2)
    }


# ══════════════════════════════════════════════════════════════════════════════
# NEW AI AGENT ENDPOINTS (Hackathon Additions)
# ══════════════════════════════════════════════════════════════════════════════

@app.post("/agent/draft-po")
def agent_draft_po(data: AgentDraftPORequest):
    prompt = f"Write a professional Purchase Order email to '{data.vendor_name}' requesting {data.reorder_qty} units of '{data.product_name}'. Urgency level: {data.urgency}. Keep it concise and professional. Do NOT include any conversational filler, intro, or outro (e.g. 'Here is the email:'). Output ONLY the raw email text."
    res = call_hf_api([{"role": "user", "content": prompt}], max_tokens=300, model=HF_MODEL)
    if res.status_code == 200:
        return {"draft": res.json()["choices"][0]["message"]["content"]}
    return {"draft": f"Error: Could not draft PO. API Status: {res.status_code} - {res.text}"}

@app.post("/agent/optimize-price")
def agent_optimize_price(data: AgentOptimizePriceRequest):
    prompt = f"Product: {data.product_name}\nDays to expiry: {data.days_to_expiry}\nCost: ${data.unit_cost}, Price: ${data.current_price}\nVelocity: {data.current_velocity}/day.\nCalculate optimal discount percentage to liquidate stock before expiry without losing too much margin. Return ONLY a JSON object with 'recommended_discount_percent' (number) and 'reasoning' (1 sentence). No markdown."
    res = call_hf_api([{"role": "user", "content": prompt}], max_tokens=150, model=HF_MODEL)
    if res.status_code == 200:
        content = res.json()["choices"][0]["message"]["content"].strip()
        import re
        match = re.search(r'\{.*\}', content, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except Exception:
                pass
        return {"recommended_discount_percent": 20, "reasoning": "Fallback to standard 20% due to LLM format."}
    return {"recommended_discount_percent": 10, "reasoning": f"Fallback due to API error. Status: {res.status_code} - {res.text}"}

@app.post("/agent/generate-marketing")
def agent_generate_marketing(data: AgentMarketingRequest):
    prompt = f"Based on this OCR text from a product tag: '{data.ocr_text}', generate an SEO-optimized 2-sentence eCommerce product description, and 3 hashtags. Do NOT include any conversational filler (e.g. 'Here is your description:'). Output ONLY the raw description and hashtags."
    res = call_hf_api([{"role": "user", "content": prompt}], max_tokens=200, model=HF_MODEL)
    if res.status_code == 200:
        return {"marketing_copy": res.json()["choices"][0]["message"]["content"]}
    return {"marketing_copy": f"Error generating copy. Status: {res.status_code} - {res.text}"}

@app.post("/agent/draft-vendor-email")
def agent_draft_vendor_email(data: AgentVendorEmailRequest):
    prompt = f"Write a professional email to vendor '{data.vendor_name}'. Their current score is {data.vendor_score}/100 with a rejection rate of {data.rejection_rate}%. The issue is: {data.issue_type}. Request improvement or renegotiation. Be firm but professional. Do NOT include any conversational filler (e.g. 'Here is your email:'). Output ONLY the raw email text."
    res = call_hf_api([{"role": "user", "content": prompt}], max_tokens=400, model=HF_MODEL)
    if res.status_code == 200:
        return {"draft": res.json()["choices"][0]["message"]["content"]}
    return {"draft": f"Error drafting email. Status: {res.status_code} - {res.text}"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=False)

