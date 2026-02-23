import sys
import json
from backend.financial_agents import research_agent, tax_agent, dividend_agent, social_sentiment_agent

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: agents.py <mode> <args...>", file=sys.stderr)
        sys.exit(1)
        
    try:
        mode = sys.argv[1]
        if mode == "research":
            print(research_agent(sys.argv[2]))
        elif mode == "tax":
            print(tax_agent(sys.argv[2], sys.argv[3], sys.argv[4]))
        elif mode == "dividend":
            print(json.dumps(dividend_agent(sys.argv[2], float(sys.argv[3]), int(sys.argv[4]))))
        elif mode == "sentiment":
            print(social_sentiment_agent(sys.argv[2]))
        else:
            print(f"Unknown mode: {mode}", file=sys.stderr)
            sys.exit(1)
    except Exception as e:
        print(f"Critical Error: {e}", file=sys.stderr)
        sys.exit(1)
