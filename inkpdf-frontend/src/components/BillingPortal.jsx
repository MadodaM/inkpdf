import React, { useState, useEffect } from 'react';
import { CreditCard, ExternalLink, Zap, ShieldCheck } from 'lucide-react';

export default function BillingPortal() {
  const [subscription, setSubscription] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchSubscription();
  }, []);

  const fetchSubscription = async () => {
    try {
      const token = localStorage.getItem('inkpdf_token');
      const res = await fetch('http://localhost:5000/api/subscription', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch subscription');
      setSubscription(data);
    } catch (err) {
      console.error(err);
      setError('Unable to connect to backend server. Ensure backend is running on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpgradeCheckout = async () => {
    setCheckoutLoading(true);
    setError('');
    try {
      const token = localStorage.getItem('inkpdf_token');
      const res = await fetch('http://localhost:5000/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to initialize Walletdoc payment session.');
      }
      
      if (data.url) {
        window.location.href = data.url;
      } else {
        throw new Error('No payment URL returned from gateway.');
      }
    } catch (err) {
      console.error(err);
      setError(err.message || 'Could not redirect to Walletdoc checkout.');
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto p-6 bg-[#fdfbf7] rounded-2xl text-slate-900 border border-slate-200 shadow-xl">
      <div className="flex items-center justify-between w-full mb-6 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-indigo-600">Billing & ZAR Subscriptions</h2>
          <p className="text-sm text-slate-600">Manage your South African Rand (ZAR) plan and local payment methods via Walletdoc.</p>
        </div>
      </div>

      {loading ? (
        <div className="py-12 text-sm text-slate-500">Loading subscription details...</div>
      ) : (
        <div className="w-full space-y-6">
          <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-600">
                  <Zap className="w-6 h-6" />
                </div>
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">Current Plan</div>
                  <h3 className="text-lg font-bold text-indigo-900">
                    {subscription?.plan_name || 'InkPDF Free Plan'}
                  </h3>
                </div>
              </div>
              <span className="text-xs px-3 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-full font-medium">
                Status: {subscription?.status || 'Active'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100 text-sm">
              <div>
                <span className="text-slate-500 block text-xs">Gateway Processor</span>
                <strong className="text-slate-800">Walletdoc (Secure ZAR)</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-xs">Renewal / Expiry Date</span>
                <strong className="text-slate-800">
                  {subscription?.current_period_end 
                    ? new Date(subscription.current_period_end).toLocaleDateString() 
                    : 'N/A'}
                </strong>
              </div>
            </div>
          </div>

          <div className="p-6 bg-white border border-slate-200 rounded-xl shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
              <CreditCard className="w-5 h-5 text-indigo-600" />
              <span>Walletdoc Secure Checkout</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Upgrade to InkPDF Pro for R150/month using local South African payment methods (Capitec Pay, Nedbank EFT, Visa/Mastercard).
            </p>

            {error && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 font-medium">
                {error}
              </div>
            )}

            <div className="flex justify-end pt-2">
              <button
                disabled={checkoutLoading}
                onClick={handleUpgradeCheckout}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold rounded-lg transition shadow-md shadow-indigo-600/20 text-sm"
              >
                <ExternalLink className="w-4 h-4" />
                <span>{checkoutLoading ? 'Redirecting to Walletdoc...' : 'Upgrade to Pro (R150/mo)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}