import os
import pandas as pd
from prophet import Prophet
import psycopg2
from sklearn.metrics import mean_absolute_error, mean_squared_error
from dotenv import load_dotenv
import numpy as np

load_dotenv('.env.local')

def evaluate_forecast():
    conn = psycopg2.connect(os.getenv('POSTGRES_URL'))
    
    try:
        # 1. Fetch Data (Same query as training)
        print("Fetching transaction data for evaluation...")
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
            print("No data to evaluate.")
            return

        products = df['product_id'].unique()
        
        print("\n--- Model Evaluation Report ---")
        print(f"{'Product':<20} | {'MAE':<10} | {'RMSE':<10} | {'Test Size':<10}")
        print("-" * 60)
        
        for pid in products:
            product_df = df[df['product_id'] == pid].copy()
            product_name = product_df['product_name'].iloc[0]
            
            # Need strict minimum for train/test split
            if len(product_df) < 10:
                print(f"{product_name:<20} | {'SKIPPED (Not enough data)':<30}")
                continue
                
            # split 80/20
            cutoff = int(len(product_df) * 0.8)
            train_df = product_df.iloc[:cutoff]
            test_df = product_df.iloc[cutoff:]
            
            m = Prophet(daily_seasonality=True)
            m.fit(train_df)
            
            # Make dates for test set
            future = pd.DataFrame(test_df['ds'])
            forecast = m.predict(future)
            
            # Extract yhat
            y_pred = forecast['yhat'].values
            y_true = test_df['y'].values
            
            # Calculate metrics
            mae = mean_absolute_error(y_true, y_pred)
            rmse = np.sqrt(mean_squared_error(y_true, y_pred))
            
            print(f"{product_name:<20} | {mae:<10.2f} | {rmse:<10.2f} | {len(test_df):<10}")

    except Exception as e:
        print(f"Error: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    evaluate_forecast()
