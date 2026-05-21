import os
import pandas as pd
from prophet import Prophet
import psycopg2
from psycopg2.extras import execute_values
from dotenv import load_dotenv

# Load env variables including POSTGRES_URL
load_dotenv('.env.local')

def get_db_connection():
    return psycopg2.connect(process.env.POSTGRES_URL)

def train_and_forecast():
    conn = psycopg2.connect(os.getenv('POSTGRES_URL'))
    
    try:
        # 1. Fetch Data
        print("Fetching transaction data...")
        query = """
            SELECT 
                DATE(t.created_at) as ds, 
                t.product_id,
                p.name as product_name,
                SUM(t.quantity) as y 
            FROM transactions t
            JOIN products p ON t.product_id = p.id
            WHERE t.type = 'OUTBOUND' 
            GROUP BY 1, 2, 3
            ORDER BY 1
        """
        df = pd.read_sql(query, conn)
        
        if df.empty:
            print("No outbound transactions found to model.")
            return

        products = df['product_id'].unique()
        
        for pid in products:
            product_df = df[df['product_id'] == pid].copy()
            product_name = product_df['product_name'].iloc[0]
            
            # Need at least a few points to train
            if len(product_df) < 5:
                print(f"Skipping {product_name} (ID: {pid}): Not enough data points ({len(product_df)})")
                continue
                
            print(f"Training model for {product_name}...")
            
            # Prophet requires 'ds' and 'y' columns
            m = Prophet(daily_seasonality=True)
            m.fit(product_df)
            
            # Forecast 30 days into the future
            future = m.make_future_dataframe(periods=30)
            forecast = m.predict(future)
            
            # Filter for future dates only
            # In a real scenario, we might want to store history too, but let's stick to future forecasts for the UI
            last_date = product_df['ds'].max()
            future_forecast = forecast[forecast['ds'] > pd.Timestamp(last_date)]
            
            # Prepare data for insertion
            # We will DELETE existing forecasts for this product to avoid duplicates/stale data
            with conn.cursor() as cur:
                cur.execute("DELETE FROM forecasts WHERE product_id = %s", (int(pid),))
                
                rows_to_insert = []
                for _, row in future_forecast.iterrows():
                    rows_to_insert.append((
                        int(pid),
                        row['ds'],
                        int(row['yhat']),
                        0.95, # Mock confidence score or use interval_width
                        int(row['yhat_lower']),
                        int(row['yhat_upper'])
                    ))
                
                insert_query = """
                    INSERT INTO forecasts 
                    (product_id, date, predicted_demand, confidence_score, lower_bound, upper_bound)
                    VALUES %s
                """
                
                execute_values(cur, insert_query, rows_to_insert)
                conn.commit()
                print(f"Saved {len(rows_to_insert)} forecast days for {product_name}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    train_and_forecast()
