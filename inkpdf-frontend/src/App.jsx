import React, { useState, useEffect, useCallback } from 'react';
import AuthForm from './components/AuthForm';
import PdfViewer from './components/PdfViewer';
import PdfMerger from './components/PdfMerger';
import PdfSigner from './components/PdfSigner';
import PdfSplitter from './components/PdfSplitter';
import PdfCompressor from './components/PdfCompressor';
import PrivacyModal from './components/PrivacyModal';
import UpgradeModal from './components/UpgradeModal';
import AccountSettings from './components/AccountSettings';
import BillingPortal from './components/BillingPortal';
import ProGate from './components/ProGate';
import AdBanner from './components/AdBanner';
import LegalPage from './components/LegalPage'; // <-- 3a. IMPORT LEGAL PAGE
import Footer from './components/Footer';       // <-- 3b. IMPORT FOOTER

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const PATH_TO_TAB = {
  '/terms': 'terms',
  '/privacy': 'privacy',
  '/refunds': 'refunds',
};

const TAB_TO_PATH = {
  terms: '/terms',
  privacy: '/privacy',
  refunds: '/refunds',
};

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState(() => PATH_TO_TAB[window.location.pathname] || 'viewer');
  const [isPro, setIsPro] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  // 1. Track daily 24-hour quota status for the header badge
  const [quota, setQuota] = useState({
    loading: false,
    usedToday: 0,
    dailyLimit: 3,
    remaining: 3,
  });

  // 3c. SYNC TAB WITH URL PATH & BROWSER BACK/FORWARD
  const navigateTab = useCallback((nextTab) => {
    setActiveTab(nextTab);
    const targetPath = TAB_TO_PATH[nextTab] || '/';
    if (window.location.pathname !== targetPath) {
      window.history.pushState({}, '', targetPath);
    }
  }, []);

  useEffect(() => {
    const handlePopState = () => {
      setActiveTab(PATH_TO_TAB[window.location.pathname] || 'viewer');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const refreshQuota = useCallback(async () => {
    const token = localStorage.getItem('inkpdf_token');
    if (!token) {
      setQuota({ loading: false, usedToday: 0, dailyLimit: 3, remaining: 3 });
      return;
    }

    setQuota((prev) => ({ ...prev, loading: true }));
    try {
      const res = await fetch(`${API_BASE_URL}/api/usage/status`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch usage status');
      const data = await res.json();
      setIsPro(Boolean(data.isPro));
      setQuota({
        loading: false,
        usedToday: data.usedToday ?? 0,
        dailyLimit: data.dailyLimit ?? 3,
        remaining: data.remaining ?? 0,
      });
    } catch (err) {
      console.error('Failed to verify usage status:', err);
      setQuota((prev) => ({ ...prev, loading: false }));
    }
  }, []);

  const checkProStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem('inkpdf_token');
      if (!token) return;
      const res = await fetch(`${API_BASE_URL}/api/subscription`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.status === 'active' && data.plan_name?.toLowerCase().includes('pro')) {
        setIsPro(true);
      }
      await refreshQuota();
    } catch (err) {
      console.error('Failed to verify subscription status:', err);
    }
  }, [refreshQuota]);

  useEffect(() => {
    const savedUser = localStorage.getItem('inkpdf_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
        checkProStatus();
      } catch (e) {
        localStorage.removeItem('inkpdf_user');
      }
    }
  }, [checkProStatus]);

  const handleLogout = () => {
    localStorage.removeItem('inkpdf_token');
    localStorage.removeItem('inkpdf_user');
    setUser(null);
    setIsPro(false);
    setShowUpgradeModal(false);
    setQuota({ loading: false, usedToday: 0, dailyLimit: 3, remaining: 3 });
  };

  const handleQuotaExceeded = () => {
    refreshQuota();
    setShowUpgradeModal(true);
  };

  const isLegalTab = activeTab === 'terms' || activeTab === 'privacy' || activeTab === 'refunds';

  return (
    <div className="min-h-screen bg-[#fdfbf7] text-slate-900 flex flex-col items-center justify-center p-6 relative">
      <PrivacyModal />

      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        onGoToBilling={() => navigateTab('billing')}
        usedToday={quota.usedToday}
        dailyLimit={quota.dailyLimit}
      />

      {/* 3d. RENDER LEGAL PAGE DIRECTLY IF ON /terms, /privacy, OR /refunds */}
      {isLegalTab ? (
        <LegalPage docType={activeTab} onBack={() => navigateTab('viewer')} />
      ) : !user ? (
        <AuthForm onLoginSuccess={(userData) => { setUser(userData); checkProStatus(); }} />
      ) : (
        <div className="w-full max-w-4xl space-y-6">
          {/* Header Bar */}
          <header className="flex flex-wrap justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-md gap-4">
            <div className="flex items-center gap-4">
              <span className="font-bold text-lg text-indigo-600">InkPDF</span>
              <span className="text-xs px-2.5 py-0.5 bg-indigo-50 text-indigo-600 rounded-full border border-indigo-200 font-medium">
                POPIA Compliant • ZAR
              </span>
              <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 overflow-x-auto">
                <button
                  onClick={() => navigateTab('viewer')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition whitespace-nowrap ${
                    activeTab === 'viewer' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  View & Edit
                </button>
                <button
                  onClick={() => navigateTab('merger')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition whitespace-nowrap ${
                    activeTab === 'merger' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Merge (Pro)
                </button>
                <button
                  onClick={() => navigateTab('signer')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition whitespace-nowrap ${
                    activeTab === 'signer' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Sign
                </button>
                <button
                  onClick={() => navigateTab('splitter')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition whitespace-nowrap ${
                    activeTab === 'splitter' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Split (Pro)
                </button>
                <button
                  onClick={() => navigateTab('compressor')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition whitespace-nowrap ${
                    activeTab === 'compressor' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Compress (Pro)
                </button>
                <button
                  onClick={() => navigateTab('billing')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition whitespace-nowrap ${
                    activeTab === 'billing' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Billing
                </button>
                <button
                  onClick={() => navigateTab('settings')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition whitespace-nowrap ${
                    activeTab === 'settings' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Settings
                </button>
              </div>
            </div>

            {/* 2. Daily Quota Badge + User Controls */}
            <div className="flex items-center gap-3">
              {quota.loading ? (
                <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-500 font-medium">
                  Checking quota...
                </span>
              ) : isPro ? (
                <span className="text-xs px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 font-semibold">
                  Pro • Unlimited ops
                </span>
              ) : quota.remaining === 0 ? (
                <button
                  type="button"
                  onClick={() => setShowUpgradeModal(true)}
                  className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-300 hover:bg-amber-100 font-semibold transition"
                >
                  0 / {quota.dailyLimit} free ops left • Upgrade
                </button>
              ) : (
                <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                  {quota.remaining} / {quota.dailyLimit} free ops left
                </span>
              )}

              <span className="text-sm text-slate-600 hidden sm:inline">
                Signed in as <strong className="text-indigo-600">{user.email}</strong>
              </span>
              <button
                onClick={handleLogout}
                className="px-3 py-1.5 bg-red-50 border border-red-200 text-red-600 hover:bg-red-100 rounded-lg text-sm transition font-medium"
              >
                Sign Out
              </button>
            </div>
          </header>

          {/* AdButler Banner - Displayed to Free Users Only */}
          {!isPro && (
            <AdBanner 
              zoneId="YOUR_ADBUTLER_ZONE_ID" 
              accountId="YOUR_ADBUTLER_ACCOUNT_ID" 
              width="728" 
              height="90" 
            />
          )}

          {/* 2b. Active Workspace with Pro Gating & Quota Exceeded Trigger */}
          {activeTab === 'viewer' && (
            <PdfViewer onOperationComplete={refreshQuota} onQuotaExceeded={handleQuotaExceeded} />
          )}
          {activeTab === 'merger' && (
            <ProGate featureName="PDF Merging">
              <PdfMerger onOperationComplete={refreshQuota} onQuotaExceeded={handleQuotaExceeded} />
            </ProGate>
          )}
          {activeTab === 'signer' && (
            <PdfSigner onOperationComplete={refreshQuota} onQuotaExceeded={handleQuotaExceeded} />
          )}
          {activeTab === 'splitter' && (
            <ProGate featureName="PDF Splitter & Extractor">
              <PdfSplitter onOperationComplete={refreshQuota} onQuotaExceeded={handleQuotaExceeded} />
            </ProGate>
          )}
          {activeTab === 'compressor' && (
            <ProGate featureName="PDF Compression & Optimization">
              <PdfCompressor onOperationComplete={refreshQuota} onQuotaExceeded={handleQuotaExceeded} />
            </ProGate>
          )}
          {activeTab === 'billing' && <BillingPortal onSubscriptionUpdated={checkProStatus} />}
          {activeTab === 'settings' && <AccountSettings user={user} onAccountDeleted={() => { handleLogout(); }} />}
        </div>
      )}

      {/* 3e. RENDER FOOTER AT BOTTOM OF PAGE */}
      <Footer onNavigateLegal={(docType) => navigateTab(docType)} />
    </div>
  );
}