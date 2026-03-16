import sqlite3
import json
from datetime import datetime
import os
import sys

# Priority for database location:
# 1. Environment variable TELEMETRY_DB
# 2. Local finsurf_telemetry.db (for host-mode development)
# 3. /app/data/finsurf_telemetry.db (standard production container path)
DEFAULT_PATH = os.environ.get("TELEMETRY_DB") or "finsurf_telemetry.db"
if not os.path.exists(DEFAULT_PATH) and os.path.exists("/app/data/finsurf_telemetry.db"):
    DEFAULT_PATH = "/app/data/finsurf_telemetry.db"

DB_PATH = DEFAULT_PATH

def format_ts(ts):
    return datetime.fromtimestamp(ts).strftime('%Y-%m-%d %H:%M:%S')

def view_tracking():
    # Diagnostic: print current configuration
    print(f"DEBUG: TELEMETRY_DB env: {os.environ.get('TELEMETRY_DB')}")
    print(f"DEBUG: DB_PATH: {DB_PATH}")
    
    # If DB_PATH points to a file that exists, we continue.
    # Otherwise, if it was default, explain.
    if not os.path.exists(DB_PATH):
        print("\n--- FinSurf Usage Tracking (VIP Access & IP/GPS) ---")
        print("-" * 80)
        print(f"No tracking data available yet (DB not found at {DB_PATH}).")
        
        # Check if directory exists
        db_dir = os.path.dirname(os.path.abspath(DB_PATH))
        if not os.path.exists(db_dir):
            print(f"ERROR: Directory {db_dir} does not exist!")
        elif not os.access(db_dir, os.W_OK):
            print(f"ERROR: Directory {db_dir} is NOT writable!")
        else:
            print(f"The directory {db_dir} exists and is writable, but {os.path.basename(DB_PATH)} has not been created yet.")
            print("Tracking starts after the first agent analysis ('Research' button) is performed.")
        
        print("\nNote: In production, run this command INSIDE the Docker container:")
        print("  docker compose exec finsurf npm run view-tracking")
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
