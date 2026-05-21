import psycopg2
import random
import math
from datetime import datetime, timedelta
from faker import Faker
import os
from dotenv import load_dotenv

# ---------------------------
# CONFIG
# ---------------------------
load_dotenv('.env.local')
DB_URL = os.getenv("POSTGRES_URL")
DAYS_OF_HISTORY = 120
DAYS_OF_FORECAST = 30
fake = Faker()

# Define Product Profiles
# Type: "stable", "seasonal", "trending", "sporadic"
PRODUCTS = [
    {"name": "Bananas", "category": "Produce", "price": 1.20, "profile": "stable", "base": 100, "variance": 10},
    {"name": "Apples", "category": "Produce", "price": 1.50, "profile": "stable", "base": 80, "variance": 15},
    {"name": "Ice Cream", "category": "Dairy", "price": 5.50, "profile": "seasonal", "base": 50, "variance": 20},
    {"name": "Hot Chocolate", "category": "Beverage", "price": 3.50, "profile": "seasonal_inverse", "base": 40, "variance": 10},
    {"name": "New Protein Bar", "category": "Snacks", "price": 2.50, "profile": "trending", "base": 10, "growth": 0.8, "variance": 5},
    {"name": "Milk", "category": "Dairy", "price": 2.80, "profile": "weekly_spike", "base": 60, "variance": 5},
    {"name": "Saffron", "category": "Spices", "price": 25.00, "profile": "sporadic", "base": 2, "variance": 1},
    {"name": "Bread", "category": "Bakery", "price": 2.50, "profile": "stable", "base": 150, "variance": 20},
]

# ---------------------------
# LOGIC
# ---------------------------
def generate_demand(profile, date_obj, day_index_from_start):
    """
    Returns integer demand based on profile and date.
    day_index_from_start: 0 to (HISTORY + FORECAST)
    """
    base = profile.get("base", 50)
    var = profile.get("variance", 10)
    
    # 1. Base calculation
    val = base
    
    # 2. Pattern Application
    if profile["profile"] == "seasonal":
        # Sine wave peaking roughly in middle of range (or summer)
        # Let's say peak is day 60
        val += 30 * math.sin((day_index_from_start / 30) + 1)
        
    elif profile["profile"] == "seasonal_inverse":
        # Cosine/Inverse Sine
        val += 25 * math.cos((day_index_from_start / 30) + 1)

    elif profile["profile"] == "trending":
        # Linear growth
        growth = profile.get("growth", 0.5)
        val += (day_index_from_start * growth)

    elif profile["profile"] == "weekly_spike":
        # Weekend spike (Fri=4, Sat=5, Sun=6)
        if date_obj.weekday() >= 4:
            val *= 1.4

    elif profile["profile"] == "sporadic":
        if random.random() > 0.8: # Only buy 20% of days
            val = random.randint(5, 15)
        else:
            val = 0
            
    # 3. Random noise (unless sporadic, which handled it)
    if profile["profile"] != "sporadic":
        noise = random.randint(-var, var)
        val += noise

    return max(0, int(val))

# ---------------------------
# MAIN
# ---------------------------
def main():
    if not DB_URL:
        print("Error: POSTGRES_URL not found.")
        return

    conn = psycopg2.connect(DB_URL)
    cur = conn.cursor()

    print("Cleaning up old data...")
    cur.execute("TRUNCATE transactions, forecasts, alerts, products RESTART IDENTITY CASCADE;")
    
    print("Inserting products...")
    product_map = {} # name -> id
    
    for p in PRODUCTS:
        cur.execute(
            """
            INSERT INTO products (name, category, stock_level, reorder_point, price)
            VALUES (%s, %s, 0, %s, %s)
            RETURNING id
            """,
            (p["name"], p["category"], random.randint(20, 50), p["price"]),
        )
        pid = cur.fetchone()[0]
        product_map[p["name"]] = pid

    conn.commit()

    print("Generating history & forecasts...")
    
    # Time setup
    today = datetime.now().date()
    start_date = today - timedelta(days=DAYS_OF_HISTORY)
    total_days = DAYS_OF_HISTORY + DAYS_OF_FORECAST

    for p in PRODUCTS:
        pid = product_map[p["name"]]
        current_stock = random.randint(50, 200) # Initial
        
        # Loop through ENTIRE timeline (History -> Today -> Forecast)
        for i in range(total_days):
            date = start_date + timedelta(days=i)
            is_history = date < today
            is_forecast = date >= today
            
            # 1. Calculate TRUE Demand (The "God Value")
            true_demand = generate_demand(p, date, i)
            
            if is_history:
                # RECORD TRANSACTION
                # Calculate TRUE Demand (The "God Value")
                true_demand = generate_demand(p, date, i)
                sold_qty = true_demand
                
                # Deduct Stock
                # Verify we have stock (simplified)
                # In real life, if stock=0, sales=0. 
                # Let's allow negative stock to simulate backorders or just force restock immediately.
                if current_stock < sold_qty:
                    # Urgent Restock happened "yesterday"
                    restock_amt = max(200, sold_qty * 2)
                    current_stock += restock_amt
                    cur.execute(
                        "INSERT INTO transactions (type, product_id, quantity, description, created_at) VALUES ('INBOUND', %s, %s, %s, %s)",
                        (pid, restock_amt, "Emergency Restock", date - timedelta(hours=12))
                    )
                
                current_stock -= sold_qty
                
                # Insert Sale ONLY if there is actual demand
                if sold_qty > 0:
                    # Add random hour to created_at
                    sale_time = datetime.combine(date, datetime.min.time()) + timedelta(hours=random.randint(8, 20))
                    
                    cur.execute(
                        "INSERT INTO transactions (type, product_id, quantity, description, created_at) VALUES ('OUTBOUND', %s, %s, 'Daily Sales', %s)",
                        (pid, sold_qty, sale_time)
                    )
                
                # Check for Regular Restock
                # If stock below reorder point (say 50), restock in 2 days (simulate logic)
                # For simplicity, we just restock immediately if low
                if current_stock < 50:
                     restock_amt = 150
                     current_stock += restock_amt
                     cur.execute(
                        "INSERT INTO transactions (type, product_id, quantity, description, created_at) VALUES ('INBOUND', %s, %s, 'Supplier Restock', %s)",
                        (pid, restock_amt, sale_time + timedelta(hours=2))
                     )

            if is_forecast:
                # RECORD FORECAST
                # Forecast is True Demand +/- Uncertainty
                # Distance from today increases uncertainty
                days_out = (date - today).days
                uncertainty_pct = 0.1 + (days_out * 0.01) # 10% base + 1% per day
                
                forecast_val = true_demand
                # Flatten forecast slightly to represent "mean"? Or keep wiggle?
                # Let's keep wiggle but centered
                
                lower = int(forecast_val * (1 - uncertainty_pct))
                upper = int(forecast_val * (1 + uncertainty_pct))
                
                cur.execute(
                    """
                    INSERT INTO forecasts (product_id, date, predicted_demand, lower_bound, upper_bound, confidence_score)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    """,
                    (pid, date, forecast_val, lower, upper, max(50, 99 - days_out))
                )

        # Final Update
        cur.execute("UPDATE products SET stock_level = %s WHERE id = %s", (current_stock, pid))

    # Add Enhanced Alerts
    print("Generating intelligent alerts...")
    for p in PRODUCTS:
        pid = product_map[p["name"]]
        
        # 1. Low Stock Alerts (Logic: Check DB for current level or use simulated final)
        # We know 'current_stock' from the loop above, but we only have variable scope if we track it.
        # Let's query the DB for the final/current stock level we just set.
        cur.execute("SELECT stock_level FROM products WHERE id = %s", (pid,))
        final_stock = cur.fetchone()[0]
        
        if final_stock < 20:
            cur.execute("INSERT INTO alerts (product_id, type, message, severity) VALUES (%s, 'low_stock', 'Critical stock level (<20 units)', 'critical')", (pid,))
        elif final_stock < 50:
            cur.execute("INSERT INTO alerts (product_id, type, message, severity) VALUES (%s, 'low_stock', 'Stock approaching reorder point', 'warning')", (pid,))

        # 2. Demand Spike Alerts (Opportunity)
        # Check forecasts for next 7 days
        cur.execute("SELECT MAX(predicted_demand) FROM forecasts WHERE product_id = %s AND date > %s AND date < %s", (pid, datetime.now().date(), datetime.now().date() + timedelta(days=7)))
        max_demand = cur.fetchone()[0]
        if max_demand and max_demand > p.get("base", 50) * 1.2: # Lower threshold to 1.2x
             cur.execute("INSERT INTO alerts (product_id, type, message, severity) VALUES (%s, 'demand_spike', 'Unusual demand surge detected for next week', 'warning')", (pid,))

        # 3. Expiry Risk (Perishables) - BOOSTED
        if p["category"] in ["Produce", "Dairy", "Meat", "Bakery"]: # Added Bakery
             # 80% chance of an expiring batch
             if random.random() < 0.8:
                 batch_id = f"B-{random.randint(100,999)}"
                 cur.execute("INSERT INTO alerts (product_id, type, message, severity) VALUES (%s, 'expiry_risk', %s, 'warning')", (pid, f'Batch #{batch_id} expiring in 3 days'))

        # 4. Supplier Delays (Random) - BOOSTED
        if random.random() < 0.4: # 40% chance
             cur.execute("INSERT INTO alerts (product_id, type, message, severity) VALUES (%s, 'supplier_delay', 'Logistics delay reported by distributor', 'info')", (pid,))
        
        # 5. Market Intel (Filler)
        if random.random() < 0.3:
            cur.execute("INSERT INTO alerts (product_id, type, message, severity) VALUES (%s, 'market_intel', 'Competitor price drop detected', 'info')", (pid,))

    # Ensure we have at least 10 alerts
    cur.execute("SELECT COUNT(*) FROM alerts")
    count = cur.fetchone()[0]
    
    if count < 10:
        print(f"Only {count} alerts generated. Adding fillers...")
        items = list(product_map.items()) # [(name, id)...]
        for i in range(10 - count):
            pname, pid = random.choice(items)
            res = random.choice([
                ('system', 'System maintenance scheduled', 'info'),
                ('review', 'New customer review requires attention', 'info'),
                ('stock_quality', 'Quality check recommended', 'warning')
            ])
            cur.execute("INSERT INTO alerts (product_id, type, message, severity) VALUES (%s, %s, %s, %s)", (pid, res[0], res[1], res[2]))



    conn.commit()
    cur.close()
    conn.close()
    print("Ideal Data Generation Complete.")

if __name__ == "__main__":
    main()