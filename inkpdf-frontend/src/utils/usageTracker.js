/**
 * Utility to verify and log WASM PDF operations against backend quota.
 * @param {string} actionType - 'edit', 'merge', 'sign', 'split', 'compress'
 * @returns {Promise<boolean>} True if allowed and logged; throws error if 429 quota reached.
 */
export async function trackPdfOperation(actionType) {
  const token = localStorage.getItem('inkpdf_token');
  if (!token) return true;

  const res = await fetch('http://localhost:5000/api/usage/log', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ actionType })
  });

  const data = await res.json();

  if (res.status === 429) {
    throw new Error(data.error || 'Daily usage limit reached. Please upgrade to Pro.');
  }

  if (!res.ok) {
    console.warn('Could not log usage action:', data.error);
  }

  return true;
}