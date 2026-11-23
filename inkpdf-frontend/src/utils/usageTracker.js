const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Utility to verify and log WASM PDF operations against backend quota.
 * @param {string} actionType - 'edit', 'merge', 'sign', 'split', 'compress'
 * @returns {Promise<boolean>} True if allowed and logged; throws quota error if 429 limit reached.
 */
export async function trackPdfOperation(actionType) {
  const token = localStorage.getItem('inkpdf_token');
  if (!token) return true;

  const res = await fetch(`${API_BASE_URL}/api/usage/log`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ actionType })
  });

  const data = await res.json().catch(() => ({}));

  if (res.status === 429 || data.isQuotaExceeded) {
    const err = new Error(data.error || 'Daily usage limit reached. Please upgrade to Pro.');
    err.name = 'QuotaExceededError';
    err.isQuotaExceeded = true;
    err.dailyUsageCount = data.dailyUsageCount ?? 3;
    err.dailyLimit = data.dailyLimit ?? 3;
    throw err;
  }

  if (!res.ok) {
    console.warn('Could not log usage action:', data.error);
  }

  return true;
}