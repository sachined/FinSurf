export interface AgentResponse {
  agentName: string;
  content: string;
  sources?: { title: string; uri: string }[];
}

export interface DividendResponse extends AgentResponse {
  isDividendStock: boolean;
  hasDividendHistory: boolean;
}

export const researchAgent = async (ticker: string): Promise<AgentResponse> => {
  const response = await fetch("/api/research", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ticker }),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Backend error");
  }
  return response.json();
};

export const taxAgent = async (ticker: string, purchaseDate: string, sellDate: string): Promise<AgentResponse> => {
  const response = await fetch("/api/tax", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ticker, purchaseDate, sellDate }),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Backend error");
  }
  return response.json();
};

export const dividendAgent = async (ticker: string, shares: number, years: number): Promise<DividendResponse> => {
  const response = await fetch("/api/dividend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ticker, shares, years }),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Backend error");
  }
  return response.json();
};

export const sentimentAgent = async (ticker: string): Promise<AgentResponse> => {
  const response = await fetch("/api/sentiment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ticker }),
  });
  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error || "Backend error");
  }
  return response.json();
};
