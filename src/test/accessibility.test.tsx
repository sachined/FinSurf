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
