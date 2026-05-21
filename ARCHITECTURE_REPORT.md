# AI Smart Inventory System - Architecture Report

## 1. Executive Summary
This project is an AI-powered Inventory Management System designed to provide real-time stock tracking, demand forecasting, and an intelligent conversational assistant. It leverages a modern web stack (Next.js), a relational database (PostgreSQL), generative AI (Google Gemini), and statistical machine learning (Facebook Prophet) to deliver actionable insights.

## 2. Technology Stack

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS, Shadcn UI (Component Library), Lucide React (Icons)
- **Visualization**: Recharts (for demand and trend charts)
- **State Management**: React Server Components + Client-side `useState` for local interaction.

### Backend
- **Runtime**: Node.js (via Next.js API Routes)
- **Database**: PostgreSQL
- **ORM/Driver**: `pg` (node-postgres) for raw SQL queries.
- **AI Integration**: Google Gemini 2.5 Flash API.

### Machine Learning
- **Language**: Python 3
- **Forecasting Model**: Facebook Prophet
- **Data Processing**: Pandas, NumPy
- **Database Driver**: `psycopg2`

---

## 3. Frontend Architecture

The frontend is a Single Page Application (SPA) feel, hosted within the Next.js App Router structure.

### Key Components
- **`app/page.tsx`**: The main dashboard controller. It manages the global `selectedProduct` state (e.g., "Bananas") and orchestrates the layout of sub-components.
- **`components/chat-interface.tsx`**: A complex client component that handles the chat history (`messages` array), user input, and communicates with the `/api/chat` endpoint. It renders markdown responses from the AI.
- **`components/forecast-chart.tsx`**: Fetches and visualizes prediction data. It likely polls or fetches data from `/api/forecasts` when `selectedProduct` changes.
- **`components/inventory-summary.tsx`**: Displays high-level stats (Total Stock, Value) and allows product selection.
- **`components/stock-alerts.tsx`**: Shows critical system messages (Low Stock, High Demand).
- **`components/activity-log.tsx`**: Displays a chronological list of inventory transactions (Inbound/Outbound).
- **`components/forecast-insights.tsx`**: Provides text-based analysis and summaries of the forecasting data alongside the chart.

### Data Flow
1. **User Interaction**: User selects a product in `InventorySummary`.
2. **State Update**: `selectedProduct` state updates in `Page`.
3. **Prop Propagation**: The new product name is passed down to `ChatInterface` and `ForecastChart`.
4. **Data Refetch**: Child components trigger `useEffect` or SWR hooks (implied) to fetch fresh data for the selected product.

---

## 4. Backend Architecture

The backend consists of serverless-ready API routes located in `app/api/`.

### API Endpoints
- **`POST /api/chat`**: The core AI logic.
    - Accepts: `{ message: string, product: string }`
    - Logic: Performs RAG (Retrieval Augmented Generation) by fetching relevant data from Postgres, then prompting Gemini.
    - Returns: `{ reply: string }`
- **`GET /api/forecasts`**: RETRIEVES predictive data.
    - Query Param: `?product=Name`
    - Logic: Joiins `forecasts` and `products` tables to return time-series data for charts.
- **`GET /api/products` (Inferred)**: Lists available products for the UI.
- **`GET /api/transactions` (Inferred)**: Returns history for the "Activity Log".
- **`GET /api/alerts`**: Manages system alerts and notifications.
- **`GET /api/history`**: Retrieves chat history for the conversational interface.
- **`GET /api/insights`**: Fetches specific forecasting insights and summary statistics.

### Database Layer (`lib/db.ts`)
- Implements a singleton connection pool using `pg.Pool`.
- Handles environment-specific logic to prevent connection exhaustion during development hot-reloading.

---

## 5. Machine Learning & Forecasting Engine

The predictive capabilities are decoupled from the web server, running as standalone Python scripts in the `ml/` directory.

### Core Logic (`ml/train_forecast.py`)
1. **Data Ingestion**: Connects to Postgres and queries aggregated `OUTBOUND` transactions (Sales) grouped by date.
2. **Model Training**:
    - Iterates through every unique product.
    - Checks for data sufficiency (Minimum > 5 data points).
    - Initializes and fits a **Prophet** model (`daily_seasonality=True`).
3. **Forecasting**:
    - Generates a future dataframe for **30 days**.
    - Predicts `yhat` (demand), `yhat_lower`, and `yhat_upper` (confidence intervals).
4. **Persistance**:
    - Deletes old forecasts for the product to prevent staleness.
    - Bulk inserts new forecasts into the `forecasts` table.

### Validation (`ml/evaluate_model.py`)
- Splits historical data (80% Train / 20% Test).
- Trains a shadow model on the 80% split.
- Compares predictions against the hidden 20% actuals.
- Outputs **MAE** (Mean Absolute Error) and **RMSE** to console for developer verification.

---

## 6. Database Schema

The system relies on a relational model in PostgreSQL.

### Tables
1. **`products`**
    - `id` (PK): UUID/Integer
    - `name`: String (e.g., "Bananas")
    - `price`: Decimal
    - `stock`: Integer

2. **`transactions`**
    - `id` (PK)
    - `product_id` (FK -> products.id)
    - `type`: Enum ('INBOUND', 'OUTBOUND')
    - `quantity`: Integer
    - `created_at`: Timestamp

3. **`forecasts`**
    - `id` (PK)
    - `product_id` (FK -> products.id)
    - `date`: Date
    - `predicted_demand`: Float
    - `confidence_score`: Float
    - `lower_bound`: Float
    - `upper_bound`: Float

4. **`alerts`**
    - `id` (PK)
    - `product_id` (FK -> products.id)
    - `type`: String
    - `message`: Text
    - `severity`: String ('LOW', 'MEDIUM', 'HIGH')
    - `created_at`: Timestamp

---

## 7. AI Integration (RAG Pipeline)

The "Smart" aspect of the inventory system is implemented via a Retrieval-Augmented Generation flow in `api/chat`.

### The "Thought Process"
When a user asks "Should I restock bananas?":
1. **Identify Context**: The system detects the user is asking about "Bananas".
2. **Gather Support Data** (Parallel DB Queries):
    - *What is the current stock?* (from `products`)
    - *What have we sold recently?* (from `transactions`)
    - *What do we expect to sell?* (from `forecasts`)
    - *Are there any warnings?* (from `alerts`)
3. **Prompt Engineering**:
    - The system constructs a prompt containing all this raw JSON data.
    - System Instruction: "You are an AI inventory assistant... Answer based ONLY on the provided data."
4. **Generative Response**:
    - Gemini processes the prompt and returns a natural language advice: "Yes, predicted demand is high (50 units) but current stock is low (10 units)."

---

## 8. Integration Points

1.  **Web <-> DB**: Direct SQL queries via `pg`.
2.  **Web <-> LLM**: REST API calls to Google Generative Language API.
3.  **ML <-> DB**: Python scripts read raw transaction history and write back processed forecast rows. The Web App then reads these forecasts; it does **not** call the Python scripts directly.

---

## 9. Development Utilities

### Scripts (`scripts/`)
- **`generate_data.py`**: A Python utility to generate realistic mock transaction data (with seasonality and trends) for development and testing.
- **`seed.js`**: A Node.js script to seed the PostgreSQL database with initial products and data.

