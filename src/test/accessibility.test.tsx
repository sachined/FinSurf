import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe, toHaveNoViolations } from 'jest-axe';
import { expect } from 'vitest';

expect.extend(toHaveNoViolations);

// Mock motion/react — AnimatePresence and motion.* render as plain HTML elements
vi.mock('motion/react', () => ({
  motion: new Proxy(
    {},
    {
      get: (_target, tag: string) =>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ({ children, ...props }: any) => React.createElement(tag, props, children),
    }
  ),
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

// Mock AgentCard — uses recharts which needs canvas
vi.mock('../components/cards/AgentCard', () => ({
  AgentCard: () => <div data-testid="agent-card" />,
}));

// Mock pdfGenerator — not relevant to accessibility tests
vi.mock('../utils/pdfGenerator', () => ({ downloadPDF: vi.fn() }));

import { Header } from '../components/layout/Header';
import { SearchForm } from '../components/forms/SearchForm';
import { ResultsGrid } from '../components/results/ResultsGrid';
import { TickerSummaryBar } from '../components/ui/TickerSummaryBar';

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const headerProps = {
  theme: 'light' as const,
  toggleTheme: vi.fn(),
  onAboutClick: vi.fn(),
  onUpgradeClick: vi.fn(),
};

const searchFormProps = {
  ticker: '',
  setTicker: vi.fn(),
  purchaseDate: '',
  setPurchaseDate: vi.fn(),
  sellDate: '',
  setSellDate: vi.fn(),
  shares: '',
  setShares: vi.fn(),
  onSearch: vi.fn(),
  isLoading: false,
  onTickerSelect: vi.fn(),
};

const emptyLoading = { research: false, tax: false, dividend: false, sentiment: false, summary: false };
const emptyResponses = { research: null, tax: null, dividend: null, sentiment: null, summary: null };

// ─── Test 1 — axe: no accessibility violations ────────────────────────────────

describe('axe: no accessibility violations', () => {
  it('Header passes axe', async () => {
    const { container } = render(<Header {...headerProps} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('SearchForm passes axe', async () => {
    const { container } = render(<SearchForm {...searchFormProps} />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

});

// ─── Test 2 — touch targets: theme toggle has min-size classes ────────────────

describe('touch targets', () => {
  it('theme toggle button has min-w-[44px] and min-h-[44px]', () => {
    render(<Header {...headerProps} />);
    const btn = screen.getByTitle(/Switch to Dark Mode/i);
    expect(btn.className).toMatch(/min-w-\[44px\]/);
    expect(btn.className).toMatch(/min-h-\[44px\]/);
  });
});

// ─── Test 3 — aria-expanded: SearchForm advanced toggle ──────────────────────

describe('aria-expanded: SearchForm advanced toggle', () => {
  it('starts collapsed', () => {
    render(<SearchForm {...searchFormProps} />);
    const btn = screen.getByRole('button', { name: /add dates/i });
    expect(btn).toHaveAttribute('aria-expanded', 'false');
  });

  it('updates to true after click', async () => {
    render(<SearchForm {...searchFormProps} />);
    const btn = screen.getByRole('button', { name: /add dates/i });
    await userEvent.click(btn);
    expect(btn).toHaveAttribute('aria-expanded', 'true');
  });
});

// ─── Test 4 — aria-busy + aria-live: ResultsGrid ─────────────────────────────

describe('aria-busy + aria-live: ResultsGrid', () => {
  it('has aria-live region', () => {
    const { container } = render(
      <ResultsGrid responses={emptyResponses} loading={emptyLoading} />
    );
    expect(container.querySelector('[aria-live]')).toBeInTheDocument();
  });

  it('aria-busy is true when loading', () => {
    const { container } = render(
      <ResultsGrid
        responses={emptyResponses}
        loading={{ ...emptyLoading, research: true }}
      />
    );
    expect(container.querySelector('[aria-busy="true"]')).toBeInTheDocument();
  });

  it('aria-busy is false when not loading', () => {
    const { container } = render(
      <ResultsGrid responses={emptyResponses} loading={emptyLoading} />
    );
    expect(container.querySelector('[aria-busy="false"]')).toBeInTheDocument();
  });
});

// ─── Test 6 — cursor-pointer: chip buttons ───────────────────────────────────

describe('cursor-pointer: chip buttons', () => {
  it('example ticker chips have cursor-pointer', () => {
    render(<SearchForm {...searchFormProps} />);
    // AAPL chip is always present in the example tickers list
    const chip = screen.getByRole('button', { name: 'AAPL' });
    expect(chip.className).toContain('cursor-pointer');
  });
});

// ─── TickerSummaryBar fixtures ──────────────────────────────────────────────

const today = new Date().toISOString().slice(0, 10);
const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

const samplePriceHistory = [
  { date: '2025-06-01', close: 140.00 },
  { date: '2025-09-01', close: 160.00 },
  { date: '2025-12-01', close: 180.00 },
  { date: '2026-01-15', close: 185.00 },
  { date: '2026-02-15', close: 190.00 },
  { date: yesterday, close: 195.00 },
  { date: today, close: 198.00 },
];

const quickSearchProps = {
  ticker: 'AAPL',
  currentPrice: 200.00,
  pnlSummary: null,
  priceHistory: samplePriceHistory,
  shares: 0,
  purchaseDate: '',
  sellDate: '',
};

const fullPnlSummary = {
  buy_price: 150.00,
  sell_price: 200.00,
  current_price: 200.00,
  shares: 10,
  realized_gain: 500.00,
  realized_gain_pct: 33.33,
  unrealized_gain: null,
  unrealized_gain_pct: null,
  holding_days: 180,
  is_long_term: false,
  total_dividends: 25.00,
};

const detailedSearchProps = {
  ticker: 'AAPL',
  currentPrice: 200.00,
  pnlSummary: fullPnlSummary,
  priceHistory: samplePriceHistory,
  shares: 10,
  purchaseDate: '2025-09-01',
  sellDate: '2026-03-01',
};

// ─── Test 7 — TickerSummaryBar: quick search filtering ──────────────────────

describe('TickerSummaryBar: quick search filtering', () => {
  it('always shows ticker label', () => {
    render(<TickerSummaryBar {...quickSearchProps} />);
    expect(screen.getByText('AAPL')).toBeInTheDocument();
  });

  it('always shows current price', () => {
    render(<TickerSummaryBar {...quickSearchProps} />);
    expect(screen.getByText('Current Price')).toBeInTheDocument();
    expect(screen.getByText('$200.00')).toBeInTheDocument();
  });

  it('shows 52wk Range for quick search', () => {
    render(<TickerSummaryBar {...quickSearchProps} />);
    expect(screen.getByText('52wk Range')).toBeInTheDocument();
  });

  it('shows Today change for quick search', () => {
    render(<TickerSummaryBar {...quickSearchProps} />);
    expect(screen.getByText('Today')).toBeInTheDocument();
  });

  it('does NOT show Buy Price for quick search', () => {
    render(<TickerSummaryBar {...quickSearchProps} />);
    expect(screen.queryByText(/Buy Price/)).not.toBeInTheDocument();
  });

  it('does NOT show Sell Price for quick search', () => {
    render(<TickerSummaryBar {...quickSearchProps} />);
    expect(screen.queryByText(/Sell Price/)).not.toBeInTheDocument();
  });

  it('does NOT show P&L for quick search', () => {
    render(<TickerSummaryBar {...quickSearchProps} />);
    expect(screen.queryByText(/P&L/)).not.toBeInTheDocument();
  });

  it('does NOT show dividends for quick search even if pnlSummary has them', () => {
    render(<TickerSummaryBar {...quickSearchProps} pnlSummary={fullPnlSummary} />);
    expect(screen.queryByText(/Est. Total Dividends/)).not.toBeInTheDocument();
  });
});

// ─── Test 8 — TickerSummaryBar: detailed search filtering ───────────────────

describe('TickerSummaryBar: detailed search filtering', () => {
  it('shows Buy Price for detailed search', () => {
    render(<TickerSummaryBar {...detailedSearchProps} />);
    expect(screen.getByText(/Buy Price/)).toBeInTheDocument();
  });

  it('shows Sell Price for detailed search', () => {
    render(<TickerSummaryBar {...detailedSearchProps} />);
    expect(screen.getByText(/Sell Price/)).toBeInTheDocument();
  });

  it('shows Realized P&L for detailed search', () => {
    render(<TickerSummaryBar {...detailedSearchProps} />);
    expect(screen.getByText(/Realized P&L/)).toBeInTheDocument();
  });

  it('shows Est. Total Dividends when available', () => {
    render(<TickerSummaryBar {...detailedSearchProps} />);
    expect(screen.getByText('Est. Total Dividends')).toBeInTheDocument();
  });

  it('does NOT show 52wk Range for detailed search', () => {
    render(<TickerSummaryBar {...detailedSearchProps} />);
    expect(screen.queryByText('52wk Range')).not.toBeInTheDocument();
  });

  it('does NOT show Today change for detailed search', () => {
    render(<TickerSummaryBar {...detailedSearchProps} />);
    expect(screen.queryByText('Today')).not.toBeInTheDocument();
  });
});

// ─── Test 9 — TickerSummaryBar: edge cases ──────────────────────────────────

describe('TickerSummaryBar: edge cases', () => {
  it('handles null currentPrice gracefully', () => {
    render(<TickerSummaryBar {...quickSearchProps} currentPrice={null} />);
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('N/A')).toBeInTheDocument();
  });

  it('handles empty priceHistory — no 52wk or Today shown', () => {
    render(<TickerSummaryBar {...quickSearchProps} priceHistory={[]} />);
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.queryByText('52wk Range')).not.toBeInTheDocument();
    expect(screen.queryByText('Today')).not.toBeInTheDocument();
  });

  it('handles single-entry priceHistory — no Today shown', () => {
    render(<TickerSummaryBar {...quickSearchProps} priceHistory={[{ date: today, close: 198 }]} />);
    expect(screen.queryByText('Today')).not.toBeInTheDocument();
  });

  it('dates-only (no shares) is NOT quick search — shows buy/sell, hides P&L', () => {
    render(
      <TickerSummaryBar
        {...quickSearchProps}
        purchaseDate="2025-09-01"
        sellDate="2026-03-01"
        shares={0}
        pnlSummary={fullPnlSummary}
      />
    );
    expect(screen.getByText(/Buy Price/)).toBeInTheDocument();
    expect(screen.getByText(/Sell Price/)).toBeInTheDocument();
    expect(screen.queryByText(/P&L/)).not.toBeInTheDocument();
    expect(screen.queryByText('52wk Range')).not.toBeInTheDocument();
  });

  it('shares-only (no dates) is NOT quick search — shows P&L, hides buy/sell', () => {
    render(
      <TickerSummaryBar
        {...quickSearchProps}
        shares={5}
        pnlSummary={{ ...fullPnlSummary, realized_gain: null, realized_gain_pct: null, unrealized_gain: 100, unrealized_gain_pct: 10 }}
      />
    );
    expect(screen.getByText(/Unrealized P&L/)).toBeInTheDocument();
    expect(screen.queryByText(/Buy Price/)).not.toBeInTheDocument();
    expect(screen.queryByText('52wk Range')).not.toBeInTheDocument();
  });

  it('does not show dividends when total_dividends is null', () => {
    render(
      <TickerSummaryBar
        {...detailedSearchProps}
        pnlSummary={{ ...fullPnlSummary, total_dividends: null }}
      />
    );
    expect(screen.queryByText('Est. Total Dividends')).not.toBeInTheDocument();
  });
});
