import React, { useState } from 'react';
import { UserX, AlertTriangle, ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function AccountSettings({ user, onAccountDeleted }) {
  const [confirmText, setConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const handleDeleteAccount = async () => {
    if (confirmText !== 'DELETE') return;

    setDeleting(true);
    setError('');

    try {
      const token = localStorage.getItem('inkpdf_token');
      const res = await fetch('http://localhost:5000/api/account', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete account');

      // Clear local storage and trigger logout state
      localStorage.removeItem('inkpdf_token');
      localStorage.removeItem('inkpdf_user');
      onAccountDeleted();
    } catch (err) {
      console.error('Deletion error:', err);
      setError(err.message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto p-6 bg-[#fdfbf7] rounded-2xl text-slate-900 border border-slate-200 shadow-xl">
      <div className="flex items-center justify-between w-full mb-6 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-indigo-600">Account & Data Privacy (POPIA)</h2>
          <p className="text-sm text-slate-600">Manage your personal data rights under South African regulations.</p>
        </div>
      </div>

      <div className="w-full space-y-6">
        <div className="p-4 bg-white border border-slate-200 rounded-xl space-y-3 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-semibold text-slate-800">
            <ShieldAlert className="w-5 h-5 text-amber-600" />
            <span>Right to Erasure (Section 24 of POPIA)</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            You have the right to request the permanent destruction or deletion of your personal information held by InkPDF. Once executed, your account, billing history links, and associated database records will be permanently erased from our PostgreSQL database. This action cannot be undone.
          </p>
          <div className="text-xs text-slate-500 pt-1">
            Currently signed in as: <strong className="text-indigo-600">{user?.email}</strong>
          </div>
        </div>

        <div className="p-6 bg-red-50/50 border border-red-200 rounded-xl space-y-4 shadow-sm">
          <div className="flex items-center gap-2 text-sm font-bold text-red-700">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <span>Danger Zone: Permanent Account Deletion</span>
          </div>
          <p className="text-xs text-red-600">
            To confirm permanent deletion, please type <strong className="font-mono bg-red-100 px-1.5 py-0.5 rounded text-red-800">DELETE</strong> below:
          </p>
          <input
            type="text"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="Type DELETE to enable button"
            className="w-full px-3 py-2 bg-white border border-red-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-red-600"
          />

          {error && <p className="text-xs text-red-600 font-medium">{error}</p>}

          <div className="flex justify-end pt-2">
            <button
              disabled={confirmText !== 'DELETE' || deleting}
              onClick={handleDeleteAccount}
              className="flex items-center gap-2 px-6 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-40 text-white font-semibold rounded-lg transition shadow-md shadow-red-600/20 text-sm"
            >
              <UserX className="w-4 h-4" />
              <span>{deleting ? 'Permanently Deleting...' : 'Permanently Delete My Account'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}