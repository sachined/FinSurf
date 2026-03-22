import { useState } from 'react';
import { differenceInDays, parseISO } from 'date-fns';

export function useFormState() {
  const [ticker, setTicker] = useState('');
  const [purchaseDate, setPurchaseDate] = useState('');
  const [sellDate, setSellDate] = useState('');
  const [shares, setShares] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const validateAll = () => {
    const tickerRegex = /^[A-Z0-9.^=-]{1,10}$/;
    if (!tickerRegex.test(ticker)) {
      setError('Invalid Ticker format. Use up to 10 characters (A-Z, 0-9, ., ^, =, -).');
      return false;
    }

    // Advanced fields are optional — only validate when at least one is filled
    const hasAnyAdvanced = !!(purchaseDate || sellDate || shares);

    if (hasAnyAdvanced) {
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
    }

    setError(null);
    return true;
  };

  const setTickerUpper = (val: string) => setTicker(val.toUpperCase());

  return {
    ticker,
    setTicker: setTickerUpper,
    purchaseDate,
    setPurchaseDate,
    sellDate,
    setSellDate,
    shares,
    setShares,
    error,
    setError,
    validateAll,
  };
}
