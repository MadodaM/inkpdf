import React, { useState, useEffect } from 'react';
import { ShieldCheck, Lock, CheckCircle2 } from 'lucide-react';

export default function PrivacyModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const hasConsented = localStorage.getItem('inkpdf_popia_consent');
    if (!hasConsented) {
      setIsOpen(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('inkpdf_popia_consent', 'true');
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-[#fdfbf7] border border-slate-200 rounded-2xl shadow-2xl max-w-lg w-full p-6 text-slate-900 space-y-6">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl text-indigo-600">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-indigo-900">POPIA Data Privacy Notice</h3>
            <p className="text-xs text-slate-500">Protection of Personal Information Act (South Africa)</p>
          </div>
        </div>

        <div className="space-y-3 text-sm text-slate-600">
          <p>
            Welcome to <strong>InkPDF</strong>. We take your data privacy and confidentiality seriously under South Africa's POPIA framework.
          </p>
          <div className="p-4 bg-white rounded-xl border border-slate-200 space-y-2">
            <div className="flex items-start gap-2 text-xs text-slate-700">
              <Lock className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>100% Local Processing:</strong> All PDF viewing, merging, signing, splitting, and compressing occur entirely in your browser using secure WebAssembly (WASM).
              </span>
            </div>
            <div className="flex items-start gap-2 text-xs text-slate-700">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>
                <strong>Zero Server Storage:</strong> Your private documents, signatures, and files never leave your device and are never uploaded to our servers.
              </span>
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-200 flex items-center justify-end">
          <button
            onClick={handleAccept}
            className="w-full sm:w-auto px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg transition shadow-md shadow-indigo-600/20 text-sm"
          >
            I Understand & Agree
          </button>
        </div>
      </div>
    </div>
  );
}