/**
 * Formats a numeric or string monetary amount using Indian Rupee (INR) notation
 * with the standard Indian numbering system (e.g. ₹1,25,430.50).
 */
export function formatINR(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') {
    return '₹0.00';
  }

  const numericValue = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numericValue)) {
    return '₹0.00';
  }

  // Format with Intl.NumberFormat in Indian locale
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericValue);
}

/**
 * Returns plain formatted number with Indian numbering system without currency symbol.
 */
export function formatIndianNumber(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') {
    return '0.00';
  }

  const numericValue = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numericValue)) {
    return '0.00';
  }

  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(numericValue);
}

/**
 * Formats a monetary amount according to the specified currency code.
 * Defaults to INR with Indian number formatting.
 */
export function formatCurrency(amount: number | string | null | undefined, currency: string = 'INR'): string {
  if (amount === null || amount === undefined || amount === '') {
    return currency.toUpperCase() === 'INR' ? '₹0.00' : `${currency.toUpperCase()} 0.00`;
  }
  const numericValue = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(numericValue)) {
    return currency.toUpperCase() === 'INR' ? '₹0.00' : `${currency.toUpperCase()} 0.00`;
  }
  if (currency.toUpperCase() === 'INR') {
    return formatINR(numericValue);
  }
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(numericValue);
  } catch {
    return `${currency.toUpperCase()} ${numericValue.toFixed(2)}`;
  }
}


