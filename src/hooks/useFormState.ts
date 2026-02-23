import { useState } from 'react';
import { format, differenceInDays, parseISO } from 'date-fns';

export function useFormState() {
  const [ticker, setTicker] = useState('');
  const [purchaseDate, setPurchaseDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [sellDate, setSellDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [shares, setShares] = useState<string>('10');
  const [error, setError] = useState<string | null>(null);

  const sanitizeShares = (val: string) => {
    const num = parseFloat(val);
    if (isNaN(num)) return val;
    // Limit to 8 decimal places and cap at 1 billion
    const capped = Math.min(num, 1000000000);
    return Number(capped.toFixed(8)).toString();
  };

  const validateAll = () => {
    const tickerRegex = /^[A-Z0-9.^=-]{1,10}$/;
    if (!tickerRegex.test(ticker)) {
      setError('Invalid Ticker format. Use up to 10 characters (A-Z, 0-9, ., ^, =, -).');
      return false;
    }

    if (!purchaseDate || !sellDate) {
      setError('Both Purchase and Sell dates are required.');
      return false;
    }

    const pDate = parseISO(purchaseDate);
    const sDate = parseISO(sellDate);
    if (isNaN(pDate.getTime()) || isNaN(sDate.getTime())) {
      setError('Invalid date format.');
      return false;
    }

    if (differenceInDays(sDate, pDate) < 0) {
      setError('Sell Date cannot be before Purchase Date.');
      return false;
    }

    const shareNum = parseFloat(shares);
    if (isNaN(shareNum) || shareNum <= 0) {
      setError('Shares must be a positive number.');
      return false;
    }

    if (shareNum > 1000000000) {
      setError('Shares count exceeds maximum limit (1,000,000,000).');
      return false;
    }

    setError(null);
    return true;
  };

  return {
    ticker,
    setTicker,
    purchaseDate,
    setPurchaseDate,
    sellDate,
    setSellDate,
    shares,
    setShares,
    error,
    setError,
    validateAll,
    sanitizeShares
  };
}
