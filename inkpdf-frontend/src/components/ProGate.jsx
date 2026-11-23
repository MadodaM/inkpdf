import React, { useState, useEffect } from 'react';
import { Lock, Zap, ExternalLink } from 'lucide-react';

export default function ProGate({ featureName, children }) {
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    checkSubscriptionStatus();
  }, []);

  const checkSubscriptionStatus = async () => {
    try {
      const token = localStorage.getItem('inkpdf_token');
      const res = await fetch('http://localhost:5000/api/subscription', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (res.ok && data.status === 'active' && data.plan_name && data.plan_name.toLowerCase().includes('pro')) {
        setIsPro(true);
      } else {
        setIsPro(false);
      }
    } catch (err) {
      console.error('Failed to verify subscription status:', err);
      setIsPro(false);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    setPortalLoading(true);
    try {
      const token = localStorage.getItem('inkpdf_token');
      // If user has a customer profile, open Stripe portal or redirect to checkout
      const res = await fetch('http://localhost:5000/api/create-portal-session', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      
      if (res.ok && data.url) {
        window.location.href = data.url;
      } else {
        alert('Please subscribe to InkPDF Pro via your billing panel to unlock this feature.');
      }
    } catch (err) {
      console.error(err);
      alert('Could not initiate upgrade flow.');
    } finally {
      setPortalLoading(false);
    }
  };

  if (loading) {
    return <div className="py-12 text-center text-sm text-slate-500">Checking subscription permissions...</div>;
  }

  // If user has an active Pro subscription, render the protected tool normally
  if (isPro) {
    return children;
  }

  // Otherwise, render the feature gate lock screen
  return (
    <div className="flex flex-col items-center justify-center w-full max-w-4xl mx-auto p-12 bg-[#fdfbf7] rounded-2xl text-slate-900 border border-slate-200 shadow-xl text-center space-y-6">
      <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl text-indigo-600 shadow-inner">
        <Lock className="w-10 h-10" />
      </div>

      <div className="space-y-2 max-w-md">
        <span className="text-xs px-2.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-200 font-medium uppercase tracking-wider">
          Pro Feature
        </span>
        <h2 className="text-xl font-bold text-indigo-900">Unlock {featureName} with InkPDF Pro</h2>
        <p className="text-xs text-slate-600">
          This advanced workflow requires an active Pro subscription billed in South African Rand (ZAR). Enjoy unlimited batch operations, priority WASM performance, and advanced tooling.
        </p>
      </div>

      <button
        disabled={portalLoading}
        onClick={handleUpgrade}
        className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold rounded-xl transition shadow-lg shadow-indigo-600/25 text-sm"
      >
        <Zap className="w-4 h-4" />
        <span>{portalLoading ? 'Connecting to Stripe...' : 'Upgrade to Pro (ZAR)'}</span>
      </button>
    </div>
  );
}