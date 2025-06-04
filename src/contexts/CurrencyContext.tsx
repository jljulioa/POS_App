
"use client";

import React, { createContext, useState, useEffect, useContext, ReactNode, useCallback } from 'react';

interface CurrencyContextType {
  currency: string;
  setCurrency: (currencyCode: string) => void;
  formatCurrency: (value: number, currencyCodeOverride?: string) => string;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

const getLocaleForCurrency = (currencyCode: string): string => {
  switch (currencyCode.toUpperCase()) {
    case 'USD': return 'en-US';
    case 'COP': return 'es-CO';
    case 'EUR': return 'de-DE'; // Example, can be adjusted
    case 'GBP': return 'en-GB';
    default: return typeof navigator !== 'undefined' ? navigator.language : 'en-US'; // Fallback
  }
};

export const CurrencyProvider = ({ children }: { children: ReactNode }) => {
  const [currency, setCurrencyState] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const storedCurrency = localStorage.getItem('app-currency');
      return storedCurrency || 'USD';
    }
    return 'USD'; // Default for SSR or if localStorage is not available
  });

  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('app-currency', currency);
    }
  }, [currency]);

  const setCurrency = (currencyCode: string) => {
    setCurrencyState(currencyCode);
  };

  const formatCurrency = useCallback((value: number, currencyCodeOverride?: string): string => {
    const codeToUse = currencyCodeOverride || currency;
    const locale = getLocaleForCurrency(codeToUse);

    const options: Intl.NumberFormatOptions = {
      style: 'currency',
      currency: codeToUse,
    };

    if (codeToUse === 'COP') {
      options.minimumFractionDigits = 0;
      options.maximumFractionDigits = 0;
    } else {
      options.minimumFractionDigits = 2;
      options.maximumFractionDigits = 2;
    }
    
    const numericValue = Number(value);
    if (isNaN(numericValue)) {
        console.warn(`formatCurrency: Invalid value provided: ${value}. Using 0.`);
        // Format 0 with the intended currency code
        try {
          return new Intl.NumberFormat(locale, options).format(0);
        } catch (e) {
          return `${codeToUse === 'COP' ? 'COP' : '$'}0`; // Basic fallback
        }
    }

    try {
      return new Intl.NumberFormat(locale, options).format(numericValue);
    } catch (e) {
      console.warn(`Currency formatting error for ${codeToUse} with locale ${locale}:`, (e as Error).message);
      // Simplified fallback, more robust than just $
      const symbol = codeToUse === 'COP' ? 'COP ' : codeToUse === 'EUR' ? '€' : codeToUse === 'GBP' ? '£' : '$';
      const formattedValue = codeToUse === 'COP' ? numericValue.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ".") : numericValue.toFixed(2);
      return `${symbol}${formattedValue}`;
    }
  }, [currency]);

  return (
    <CurrencyContext.Provider value={{ currency, setCurrency, formatCurrency }}>
      {children}
    </CurrencyContext.Provider>
  );
};

export const useCurrency = (): CurrencyContextType => {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
};
