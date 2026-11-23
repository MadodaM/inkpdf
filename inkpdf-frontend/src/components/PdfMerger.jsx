import React, { useState } from 'react';
import { Files, Trash2, Download, Plus, CheckCircle2 } from 'lucide-react';
import { mergePDFs } from '../utils/pdfengine';
import { trackPdfOperation } from '../utils/usageTracker'; // <-- 1. ADD THIS IMPORT

export default function PdfMerger({ onOperationComplete, onQuotaExceeded }) {
  const [files, setFiles] = useState([]);
  const [merging, setMerging] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleFilesSelected = (e) => {
    const selectedFiles = Array.from(e.target.files).filter(
      (file) => file.type === 'application/pdf'
    );
    setFiles((prev) => [...prev, ...selectedFiles]);
    setSuccess(false);
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setSuccess(false);
  };

  const handleMergeAction = async () => {
    if (files.length < 2) return;

    setMerging(true);
    setSuccess(false);

    try {
      // 2. CHECK & LOG DAILY QUOTA BEFORE MERGING
      await trackPdfOperation('merge');

      const mergedBytes = await mergePDFs(files);
      
      // Create a blob and trigger download
      const blob = new Blob([mergedBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'InkPDF-Merged.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSuccess(true);
      onOperationComplete?.();
    } catch (err) {
      console.error('Merge error:', err);
      if (err?.isQuotaExceeded) {
        onQuotaExceeded?.();
      } else {
        alert(err.message || 'Failed to merge PDF files.');
      }
    } finally {
      setMerging(false);
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto p-6 bg-[#fdfbf7] rounded-2xl text-slate-900 border border-slate-200 shadow-xl">
      <div className="flex items-center justify-between w-full mb-6 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-indigo-600">Merge PDF Documents</h2>
          <p className="text-sm text-slate-600">Combine multiple PDF files securely in your browser using WASM.</p>
        </div>
        <label className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg cursor-pointer text-sm font-semibold transition shadow-sm">
          <Plus className="w-4 h-4" />
          <span>Add PDFs</span>
          <input type="file" accept="application/pdf" multiple onChange={handleFilesSelected} className="hidden" />
        </label>
      </div>

      {files.length === 0 ? (
        <div className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 text-slate-400 p-6 text-center">
          <Files className="w-10 h-10 mb-2 text-indigo-400" />
          <p className="text-sm font-medium text-slate-700">No PDF files selected yet</p>
          <p className="text-xs text-slate-500 mt-1">Select two or more PDF files to begin merging</p>
        </div>
      ) : (
        <div className="w-full space-y-3 mb-6">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Selected Files ({files.length})
          </div>
          {files.map((file, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
              <div className="flex items-center gap-3 truncate">
                <span className="w-6 h-6 flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold">
                  {idx + 1}
                </span>
                <span className="text-sm font-medium text-slate-800 truncate">{file.name}</span>
                <span className="text-xs text-slate-400">({(file.size / 1024 / 1024).toFixed(2)} MB)</span>
              </div>
              <button
                onClick={() => removeFile(idx)}
                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition"
                title="Remove file"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {files.length > 0 && (
        <div className="flex items-center justify-between w-full pt-4 border-t border-slate-200">
          {success ? (
            <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium">
              <CheckCircle2 className="w-4 h-4" />
              <span>PDFs merged and downloaded successfully!</span>
            </div>
          ) : (
            <span className="text-xs text-slate-500">
              {files.length < 2 ? 'Add at least 2 files to merge' : 'Ready to combine'}
            </span>
          )}

          <button
            disabled={files.length < 2 || merging}
            onClick={handleMergeAction}
            className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold rounded-lg transition shadow-md shadow-indigo-600/20"
          >
            <Download className="w-4 h-4" />
            <span>{merging ? 'Merging...' : 'Merge & Download'}</span>
          </button>
        </div>
      )}
    </div>
  );
}