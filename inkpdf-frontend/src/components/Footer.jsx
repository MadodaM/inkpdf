import React from 'react';

export default function Footer({ onNavigateLegal }) {
  const handleLinkClick = (e, path, docType) => {
    e.preventDefault();
    window.history.pushState({}, '', path);
    onNavigateLegal(docType);
  };

  return (
    <footer className="w-full max-w-4xl mt-8 pt-4 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-4 text-xs text-slate-500">
      <div>
        <span className="font-semibold text-slate-700">InkPDF</span> • POPIA Compliant • ZAR
      </div>

      <nav aria-label="Legal policies" className="flex flex-wrap items-center gap-5">
        <a
          href="/terms"
          onClick={(e) => handleLinkClick(e, '/terms', 'terms')}
          className="hover:text-indigo-600 font-medium transition"
        >
          Terms of Service
        </a>
        <a
          href="/privacy"
          onClick={(e) => handleLinkClick(e, '/privacy', 'privacy')}
          className="hover:text-indigo-600 font-medium transition"
        >
          POPIA Privacy Policy
        </a>
        <a
          href="/refunds"
          onClick={(e) => handleLinkClick(e, '/refunds', 'refunds')}
          className="hover:text-indigo-600 font-medium transition"
        >
          Refund Policy
        </a>
      </nav>
    </footer>
  );
}