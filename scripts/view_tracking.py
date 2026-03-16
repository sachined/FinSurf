import sqlite3
import json
from datetime import datetime
import os

DB_PATH = "finsurf_telemetry.db"

def format_ts(ts):
    return datetime.fromtimestamp(ts).strftime('%Y-%m-%d %H:%M:%S')

def view_tracking():
    if not os.path.exists(DB_PATH):
        print(f"Error: {DB_PATH} not found.")
        return

    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    
    print("\n--- FinSurf Usage Tracking (VIP Access & IP/GPS) ---")
    print("-" * 80)
    
    # Query high-level request events
    # We join with token_events to see costs if available
    query = """
    SELECT 
        r.ts, r.ticker, r.user_id, r.ip_address, r.lat, r.lon,
        (SELECT SUM(cost_usd) FROM token_events WHERE run_id = r.run_id) as total_cost
    FROM request_events r
    ORDER BY r.ts DESC
    LIMIT 100
    """
    
    try:
        rows = con.execute(query).fetchall()
    except sqlite3.OperationalError as e:
        if "no such table: request_events" in str(e):
            print("No tracking data available yet (table has not been initialized).")
            print("Tracking will start after the first agent analysis is performed.")
            return
        else:
            raise e
    
    if not rows:
        print("No tracking data available yet.")
        return

    print(f"{'Timestamp':<20} | {'Ticker':<6} | {'VIP Code':<20} | {'IP Address':<15} | {'Location (Lat/Lon)':<25}")
    print("-" * 110)
    
    for row in rows:
        ts = format_ts(row['ts'])
        ticker = row['ticker']
        user_id = row['user_id'] if row['user_id'] else "GUEST"
        ip = row['ip_address'] if row['ip_address'] else "Unknown"
        
        loc = "Unknown"
        if row['lat'] is not None and row['lon'] is not None:
            loc = f"{row['lat']:.4f}, {row['lon']:.4f}"
            
        print(f"{ts:<20} | {ticker:<6} | {user_id:<20} | {ip:<15} | {loc:<25}")

    con.close()

if __name__ == "__main__":
    view_tracking()
