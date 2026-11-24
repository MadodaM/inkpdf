import React from 'react';
import { ArrowLeft, ShieldCheck, FileText, RotateCcw } from 'lucide-react';

const POLICIES = {
  terms: {
    title: 'Terms of Service',
    icon: FileText,
    updated: '24 November 2026',
    sections: [
      {
        heading: '1. Acceptance & Service Scope',
        body: 'By using InkPDF at inkpdf.co, you agree to these Terms under the laws of the Republic of South Africa. PDF viewing, merging, signing, splitting, and compression run locally in your browser via WebAssembly (WASM).',
      },
      {
        heading: '2. Free Quota & Pro Subscription (ZAR)',
        body: 'Free accounts include up to 3 PDF operations per rolling 24-hour period. InkPDF Pro is billed at R150.00 ZAR per month for unlimited operations and Pro tools until cancelled.',
      },
      {
        heading: '3. Acceptable Use & File Responsibility',
        body: 'Do not abuse authentication, quota, or API endpoints. Because files are processed client-side, keep local backups of your original PDF documents.',
      },
    ],
  },
  privacy: {
    title: 'Privacy Policy & POPIA Notice',
    icon: ShieldCheck,
    updated: '24 November 2026',
    sections: [
      {
        heading: '1. POPIA Compliance & Zero Document Uploads',
        body: 'In line with POPIA (Act 4 of 2013), your PDF bytes are processed locally via WASM and are not uploaded or stored on our servers for document inspection.',
      },
      {
        heading: '2. Account, Quota & Billing Records',
        body: 'We process your email, hashed password, 24-hour usage logs, and subscription status/references to operate your account, enforce daily limits, and send receipts.',
      },
      {
        heading: '3. Right to Erasure (Section 24)',
        body: 'Delete your account anytime under Settings to purge your account and subscription records and receive a POPIA erasure confirmation.',
      },
    ],
  },
  refunds: {
    title: 'Refund & Cancellation Policy',
    icon: RotateCcw,
    updated: '24 November 2026',
    sections: [
      {
        heading: '1. Cancelling Your Subscription',
        body: 'Cancel InkPDF Pro (R150.00 ZAR/month) anytime in the Billing tab. Your Pro access continues through the end of your current 30-day billing period with no further charges.',
      },
      {
        heading: '2. Refunds & Billing Errors',
        body: 'Recurring charges are generally non-refundable once a billing cycle starts, except where required by South African consumer law or in cases of duplicate/erroneous charges reported within 7 days to billing@inkpdf.co.',
      },
      {
        heading: '3. Settlement Currency & Timeline',
        body: 'Approved refunds are issued in ZAR to the original payment method and typically reflect within 3 to 7 business days.',
      },
    ],
  },
};

export default function LegalPage({ docType = 'terms', onBack }) {
  const doc = POLICIES[docType] || POLICIES.terms;
  const Icon = doc.icon;

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-[#fdfbf7] rounded-2xl text-slate-900 border border-slate-200 shadow-xl space-y-6">
      <div className="flex items-center justify-between pb-4 border-b border-slate-200 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-200">
            <Icon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">{doc.title}</h2>
            <p className="text-xs text-slate-500">inkpdf.co • Effective {doc.updated}</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to InkPDF</span>
        </button>
      </div>

      <div className="space-y-4">
        {doc.sections.map((sec) => (
          <div key={sec.heading} className="p-4 bg-white rounded-xl border border-slate-200 space-y-1.5">
            <h3 className="text-sm font-bold text-indigo-900">{sec.heading}</h3>
            <p className="text-sm text-slate-600 leading-relaxed">{sec.body}</p>
          </div>
        ))}
      </div>

      <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-500 gap-2">
        <span>Governing law: Republic of South Africa</span>
        <span>Contact: support@inkpdf.co • billing@inkpdf.co</span>
      </div>
    </div>
  );
}