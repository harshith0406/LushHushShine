# 🏬 Retail Intel & Supply Chain AI Engine (LushHushShine)

> A modern, AI-powered Retail Analytics & Supply Chain Management platform integrating **Hugging Face Llama-3.1-8B**, multimodal OCR catalog scanning, predictive inventory run-rate analytics, and high-contrast glassmorphic dashboards.

---

## 🌟 Key Features

### 📦 1. Automated Inventory Optimization & Expiry Analytics
* **EOQ & Safety Stock Calculation**: Calculates Economic Order Quantity and dynamic reorder points based on daily sales velocity.
* **Batch Expiry Liquidation**: Evaluates product expiration dates and generates automated markdown discount strategies to eliminate dead stock.
* **Low Stock Alerts**: Automatically flags products below reorder thresholds.

### 📷 2. Multimodal OCR Vision Catalog Scanning
* **Product Tag Recognition**: Scan physical product tags or receipt photos to automatically extract product titles, SKUs, prices, and categories.

### 🤖 3. Conversational Retail AI Assistant (Tidio Style)
* **Hugging Face Llama-3.1-8B Engine**: Connected directly to database stores for real-time inventory queries, supplier contacts, and sales trends.
* **Formatted Markdown Parsing**: Streams bold section headers, bullet points, and dynamic suggestions.

### 📊 4. Executive Dashboards (Zendenta & UXBoost AI Design)
* **Stock Availability Donut Radial Gauge**: Visualizes inventory proportions (*Available*, *Low Stock*, *Out of Stock*).
* **SVG Gradient Area Curves**: Smooth animated sales throughput and expiry timeline charts.
* **Google Plus Jakarta Sans Typography**: Modern typography hierarchy.

---

## 🛠️ Technology Stack

* **Frontend**: React 18, Vite 5, Material-UI (MUI v5), Recharts, Google Fonts (*Plus Jakarta Sans*).
* **Backend**: Node.js, Express.js, Mock Firestore Database, JWT Authentication, Swagger OpenAPI.
* **AI Engine**: Python 3.10+, FastAPI, Uvicorn, Hugging Face Serverless Inference Router (`meta-llama/Llama-3.1-8B-Instruct:novita`).

---

## 🚀 Getting Started

### Prerequisites
* **Node.js**: v18.0.0 or higher
* **Python**: v3.9 or higher

### 1. Installation
Clone the repository and install dependencies:
```bash
git clone https://github.com/harshith0406/LushHushShine.git
cd LushHushShine

# Install root orchestrator dependencies
npm install

# Install sub-project dependencies
cd backend && npm install
cd ../frontend && npm install
cd ../ai_service && pip install -r requirements.txt
```

### 2. Running Locally (Single Command)
Run all 3 services simultaneously:
```bash
npm start
```
*or double-click `start-all.bat` on Windows.*

* **Express API**: `http://localhost:5000` (or fallback `http://localhost:5002`)
* **Python AI Microservice**: `http://127.0.0.1:8000`
* **Vite React Frontend**: `http://localhost:5173`

---

## 🌐 Deployment to Vercel

This repository includes a pre-configured `vercel.json` for serverless deployment.

### Environment Variables Setup on Vercel
In your Vercel Project Settings $\rightarrow$ Environment Variables, add:

| Variable Name | Description | Example / Value |
| :--- | :--- | :--- |
| `HUGGINGFACE_API_KEY` | Masked Hugging Face API Token | `hf_...` |
| `HUGGINGFACE_MODEL` | Hugging Face LLM Model | `meta-llama/Llama-3.1-8B-Instruct:novita` |
| `JWT_SECRET` | Secret key for JWT Auth | `supersecret_retail_key_2026` |
| `AI_SERVICE_URL` | Hosted FastAPI AI Service Endpoint | `https://your-ai-service.hf.space` |

---

## 📜 License
MIT License © 2026 LushHushShine Team.
