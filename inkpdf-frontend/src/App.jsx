import React, { useState, useEffect } from 'react';
import AuthForm from './components/AuthForm';
import PdfViewer from './components/PdfViewer';
import PdfMerger from './components/PdfMerger';
import PdfSigner from './components/PdfSigner';
import PdfSplitter from './components/PdfSplitter';
import PdfCompressor from './components/PdfCompressor';
import PrivacyModal from './components/PrivacyModal';
import AccountSettings from './components/AccountSettings';
import BillingPortal from './components/BillingPortal';
import ProGate from './components/ProGate';
import AdBanner from './components/AdBanner';

export default function App() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState('viewer');
  const [isPro, setIsPro] = useState(false);

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
  }, []);

  const checkProStatus = async () => {
    try {
      const token = localStorage.getItem('inkpdf_token');
      if (!token) return;
      const res = await fetch('http://localhost:5000/api/subscription', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok && data.status === 'active' && data.plan_name?.toLowerCase().includes('pro')) {
        setIsPro(true);
      }
    } catch (err) {
      console.error('Failed to verify subscription status:', err);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('inkpdf_token');
    localStorage.removeItem('inkpdf_user');
    setUser(null);
    setIsPro(false);
  };

  return (
    <div className="min-h-screen bg-[#fdfbf7] text-slate-900 flex flex-col items-center justify-center p-6 relative">
      <PrivacyModal />

      {!user ? (
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
                  onClick={() => setActiveTab('viewer')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition whitespace-nowrap ${
                    activeTab === 'viewer' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  View & Edit
                </button>
                <button
                  onClick={() => setActiveTab('merger')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition whitespace-nowrap ${
                    activeTab === 'merger' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Merge (Pro)
                </button>
                <button
                  onClick={() => setActiveTab('signer')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition whitespace-nowrap ${
                    activeTab === 'signer' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Sign
                </button>
                <button
                  onClick={() => setActiveTab('splitter')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition whitespace-nowrap ${
                    activeTab === 'splitter' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Split (Pro)
                </button>
                <button
                  onClick={() => setActiveTab('compressor')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition whitespace-nowrap ${
                    activeTab === 'compressor' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Compress (Pro)
                </button>
                <button
                  onClick={() => setActiveTab('billing')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition whitespace-nowrap ${
                    activeTab === 'billing' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Billing
                </button>
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`px-3 py-1 rounded-md text-xs font-semibold transition whitespace-nowrap ${
                    activeTab === 'settings' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Settings
                </button>
              </div>
            </div>
            <div className="flex items-center gap-4">
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

          {/* Active Workspace with Pro Gating */}
          {activeTab === 'viewer' && <PdfViewer />}
          {activeTab === 'merger' && (
            <ProGate featureName="PDF Merging">
              <PdfMerger />
            </ProGate>
          )}
          {activeTab === 'signer' && <PdfSigner />}
          {activeTab === 'splitter' && (
            <ProGate featureName="PDF Splitter & Extractor">
              <PdfSplitter />
            </ProGate>
          )}
          {activeTab === 'compressor' && (
            <ProGate featureName="PDF Compression & Optimization">
              <PdfCompressor />
            </ProGate>
          )}
          {activeTab === 'billing' && <BillingPortal />}
          {activeTab === 'settings' && <AccountSettings user={user} onAccountDeleted={() => setUser(null)} />}
        </div>
      )}
    </div>
  );
}