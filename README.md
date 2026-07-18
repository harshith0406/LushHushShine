# 🏬 Retail Intel & Supply Chain AI Engine (LushHushShine)

> A state-of-the-art, AI-powered Retail Analytics & Supply Chain Management platform integrating **Hugging Face Llama-3.1-8B**, Neon Serverless Postgres, predictive inventory analytics (ABC/XYZ, Risk Matrix), and high-contrast glassmorphic dashboards. Built for the modern retail ecosystem.

---

## 🌟 Key Features

### 📦 1. Automated Inventory Analytics & Risk Management
* **ABC/XYZ Classification**: Automatically categorizes products by revenue contribution (ABC) and demand volatility (XYZ) to help prioritize capital allocation.
* **Stockout Risk Matrix**: Predicts exact stockout dates based on daily run rates, factoring in lead times, and highlights critical shortages with actionable insights (e.g., *🔴 ORDER NOW* vs *🟡 MONITOR*).
* **Margin Health & Ghost SKUs**: Identifies dead stock (zero sales) and flags low-profit margin items to trigger automated markdown liquidation strategies.
* **EOQ & Safety Stock Calculation**: AI determines the Economic Order Quantity and dynamic reorder points based on rolling average daily sales velocity.

### 📷 2. Multimodal OCR Vision Catalog Scanning
* **Product Tag Recognition**: Eliminate manual data entry. Scan physical product tags, supplier barcodes, or receipt photos to automatically extract product titles, SKUs, prices, categories, and batch numbers.
* **Seamless Database Sync**: Extracted product metrics are automatically pushed to the Neon Postgres database.

### 🤖 3. Conversational Retail AI Assistant
* **Hugging Face Llama-3.1-8B Engine**: Connected directly to the Vercel Edge configuration and Neon database for real-time inventory queries, supplier contact lookups, and sales trend analysis.
* **Context-Aware Recommendations**: Chat with the AI to ask "Which products are running low?" or "Give me a liquidation strategy for Ghost SKUs" and receive actionable, data-backed plans.
* **Formatted Markdown Parsing**: The UI streams bold section headers, bullet points, tables, and dynamic strategic suggestions directly from the LLM.

### 📊 4. Executive Dashboards (Dark Glassmorphism)
* **Stock Availability & ABC Intelligence**: Visualizes inventory proportions, revenue contribution by class, and dynamic pie charts.
* **SVG Gradient Area Curves**: Smooth, animated sales throughput charts and expiry timeline visualizations.
* **Modern Typography**: Google Plus Jakarta Sans with a tailored, premium dark theme design featuring glassmorphism micro-animations.

---

## 🏗️ Architecture & Technology Stack

The platform is designed around a modern Serverless microservices architecture, completely optimized for deployment on Vercel.

* **Frontend**: React 18, Vite 5, Material-UI (MUI v5), Recharts.
* **Backend API**: Node.js / Express fallback, seamlessly transpiled into Vercel Serverless Functions.
* **Database**: **Neon Serverless Postgres** integrated via the standard `pg` driver, offering instantaneous cold starts and connection pooling for serverless environments.
* **AI Engine Microservice**: Python 3.10+, FastAPI (Serverless), Uvicorn.
* **LLM Provider**: Hugging Face Inference Router (`meta-llama/Llama-3.1-8B-Instruct`).
* **Deployment**: Vercel (Edge Config, Serverless Node.js, and Serverless Python Functions).

---

## 🗄️ Database Schema (Neon Postgres)

The platform utilizes a structured relational database model:
* **`users`**: Manages Selling Places (Retailers) and Vendors (Suppliers).
* **`inventory`**: Tracks real-time stock, available quantity, total sold, average daily sales, lead time days, and assigned vendors.
* **`item_list`**: Global catalog of standard items and product profiles.
* **`checkouts`**: Transaction ledger tracking product outflow and sales velocity.

---

## 🚀 Getting Started

### Prerequisites
* **Node.js**: v18.0.0 or higher
* **Python**: v3.9 or higher
* **PostgreSQL**: A local Postgres instance or a free Neon.tech Postgres cluster.

### 1. Installation
Clone the repository and install dependencies across all microservices:
```bash
git clone https://github.com/harshith0406/LushHushShine.git
cd LushHushShine

# Install Express backend dependencies
cd backend && npm install

# Install React frontend dependencies
cd ../frontend && npm install

# Install Python FastAPI dependencies
cd ../ai_service && pip install -r requirements.txt
```

### 2. Running Locally (Development Mode)
You can run all three services simultaneously using the root startup script:
```bash
npm start
```
*or double-click `start-all.bat` on Windows.*

The services will bind to the following local ports:
* **Express Core API**: `http://localhost:5000`
* **Python AI Microservice**: `http://127.0.0.1:8000`
* **Vite React Frontend**: `http://localhost:5173`

---

## 🌐 Deployment to Vercel

This repository is fully optimized for **Vercel Serverless Deployment**. It features a custom `vercel.json` and a `vc_init.py` adapter to natively host the FastAPI python service on Vercel's Python runtime without requiring Docker or a dedicated VM.

### Environment Variables Setup on Vercel
In your Vercel Project Settings $\rightarrow$ Environment Variables, you must configure the following:

| Variable Name | Description | Example / Value |
| :--- | :--- | :--- |
| `DATABASE_URL` | Neon Postgres Connection String (with `?sslmode=require`) | `postgresql://neondb_owner:password@ep-...neon.tech/neondb` |
| `HUGGINGFACE_API_KEY` | Masked Hugging Face API Token with Inference permissions | `hf_xxxxxxxxxxxxxxxxxxx` |
| `HUGGINGFACE_MODEL` | Hugging Face LLM Model identifier | `meta-llama/Llama-3.1-8B-Instruct` |
| `JWT_SECRET` | Secret key for JWT Authentication signing | `supersecret_retail_key_2026` |

### Deployment Steps
1. Connect your GitHub repository to Vercel.
2. Vercel will automatically detect the Vite frontend and the Serverless backend based on `vercel.json`.
3. Add the Environment Variables listed above.
4. Click **Deploy**. Vercel will build the frontend, deploy the Node.js API to `/api/*`, and deploy the FastAPI endpoints to `/api/python/*`.

---

## 📜 License
MIT License © 2026 LushHushShine Team.
