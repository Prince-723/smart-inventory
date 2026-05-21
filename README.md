# AI Smart Inventory System

An AI-powered Inventory Management and Demand Forecasting System. This application leverages a modern web frontend (**Next.js**), a relational database (**PostgreSQL**), Generative AI (**Google Gemini**), and statistical machine learning (**Facebook Prophet**) to provide real-time stock control, demand prediction, and a conversational intelligent business assistant.

---

## Key Features

1. **Intelligent conversational Chatbot**: A RAG (Retrieval-Augmented Generation) assistant powered by **Google Gemini 2.5 Flash** that queries current stock, historical transactions, alerts, and forecasts to provide context-aware, natural language restock suggestions.
2. **Statistical Demand Forecasting**: Standalone machine learning forecasting engine using **Facebook Prophet** to predict outbound sales demand 30 days into the future.
3. **Interactive Visual Dashboard**: High-fidelity UI featuring charts (built with **Recharts**), stock notifications, and real-time transaction activity feeds.
4. **Comprehensive Data Seeding & Simulator**: Realistic transaction simulation engine with seasonal trends, weekly spikes, and market anomalies.

---

## Technology Stack

* **Frontend**: Next.js 16 (App Router), TypeScript, Tailwind CSS, Shadcn UI, Recharts, Lucide Icons.
* **Backend**: Node.js API routes (Next.js serverless handlers) querying the database directly via `node-postgres` (`pg`).
* **AI Engine**: Google Gemini 2.5 Flash API (RAG flow).
* **Machine Learning**: Python 3, Facebook Prophet, Pandas, NumPy, Scikit-Learn, Psycopg2.
* **Database**: PostgreSQL (relational model with cascading tables).

---

## Directory Layout

Core Next.js/React files are kept organized and clean under the standard `src/` layout:

```text
ai-smart-inventory/
├── src/                    # Next.js Application Core
│   ├── app/                # App Router controllers and API routes
│   │   ├── api/            # API Endpoints (chat, forecasts, alerts, etc.)
│   │   ├── globals.css     # Global CSS variables and styles
│   │   ├── layout.tsx      # Main layout template
│   │   └── page.tsx        # Main dashboard controller
│   ├── components/         # Reusable Shadcn UI & custom React components
│   ├── hooks/              # Custom React Hooks (e.g. mobile/toast states)
│   └── lib/                # Shared utilities & database pooling client (db.ts)
├── ml/                     # Python Forecasting Engine
│   ├── evaluate_model.py   # Splits historical data 80/20 to validate models
│   └── train_forecast.py   # Fits Prophet models and inserts 30-day forecast rows
├── scripts/                # Database Utilities & Seeding Scripts
│   ├── generate_data.py    # Python simulator generating seasonal history
│   └── seed.js             # Initial schema setup and quick database seeding
├── public/                 # Static public assets and graphics
├── .venv/                  # Python 3 Virtual Environment
├── .env.local              # Local environmental configurations
├── package.json            # Node.js dependencies & scripts
├── tsconfig.json           # TypeScript configuration
└── requirements.txt        # Python dependency manifest
```

---

## Installation & Setup

### Prerequisites
* **Node.js** (v18+ recommended)
* **PostgreSQL** running locally or hosted
* **Python** (v3.9 - v3.14)
* **Google Gemini API Key**

---

### Step 1: Clone and Configure Environment Variables
Create a file named `.env.local` in the project root:

```env
GEMINI_API_KEY=your_gemini_api_key_here
POSTGRES_URL=postgres://username:password@localhost:5432/smart_inventory
```

---

### Step 2: Set up Database & Mock Data
Initialize the database tables and populate them with realistic, multi-month transaction data using the simulation generator:

```bash
# 1. Activate the Python virtual environment
source .venv/bin/activate

# 2. Run the simulator to clear old data, seed tables, and generate history
python3 scripts/generate_data.py
```

---

### Step 3: Train Forecasting Models
Train the **Prophet** forecasting models on the generated history. This will run time-series regressions for each product and insert 30-day forecasted demand values into the database:

```bash
# Activate virtual environment if not already done
source .venv/bin/activate

# Train and forecast
python3 ml/train_forecast.py
```

To run a validation metrics test showing Mean Absolute Error (MAE) and Root Mean Squared Error (RMSE) against a test split, execute:
```bash
python3 ml/evaluate_model.py
```

---

### Step 4: Run the Web Dashboard
Install the frontend node packages and start the Next.js development server:

```bash
# 1. Install Node.js dependencies
pnpm install

# 2. Start the development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your web browser to access the interactive dashboard.

---

## Machine Learning Forecasting Logic
The predictive forecasting pipeline (`ml/train_forecast.py`) operates as follows:
1. **Aggregates Sales**: Connects to the database and groups outbound transactions by product and date.
2. **Sufficiency Check**: Skips products with less than 5 historic sales days.
3. **Prophet Fit**: Instantiates a new Prophet model with daily seasonality, fitting it on the transaction timeline.
4. **Predicts 30 Days**: Generates confidence intervals (`yhat_lower`, `yhat_upper`) and standard predicted demands.
5. **Upserts**: Deletes previous predictions for the product to prevent staleness and writes new values.

---

## Intelligent Conversational RAG Pipeline
The AI chatbot (`app/api/chat/route.ts`) answers conversational queries by performing a local Retrieval-Augmented Generation workflow:
1. **Context Extraction**: Identifies the primary product mentioned in the user message.
2. **Parallel SQL Retrieval**:
   - Queries current stock level and pricing.
   - Queries historical sales activity (last 7 days).
   - Queries predicted demand for the upcoming week.
   - Queries relevant active alerts (expiry, supplier delay, low stock).
3. **Prompt Composition**: Assembles a system instruction and injects the retrieved database data as structured JSON.
4. **Gemini Ingestion**: Dispatches the context-rich prompt to **Gemini 2.5 Flash**, rendering a fully accurate and mathematically aligned inventory recommendation for the user.
