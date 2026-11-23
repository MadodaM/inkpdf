import React, { useState } from 'react';
import { Upload, Minimize2, FileText, Download, CheckCircle2, Sliders } from 'lucide-react';
import { compressPDF } from '../utils/pdfengine';
import { trackPdfOperation } from '../utils/usageTracker'; // <-- 1. ADD THIS IMPORT

export default function PdfCompressor({ onOperationComplete, onQuotaExceeded }) {
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfBytes, setPdfBytes] = useState(null);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [compressedSize, setCompressedSize] = useState(null);
  const [stripMetadata, setStripMetadata] = useState(true);
  const [compressing, setCompressing] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || file.type !== 'application/pdf') return;

    setFileName(file.name);
    setFileSize(file.size);
    setPdfFile(file);
    setCompressedSize(null);
    setSuccess(false);

    const buffer = await file.arrayBuffer();
    setPdfBytes(new Uint8Array(buffer));
  };

  const handleCompressAction = async () => {
    if (!pdfBytes) return;

    setCompressing(true);
    setSuccess(false);

    try {
      // 2. CHECK & LOG DAILY QUOTA BEFORE COMPRESSING
      await trackPdfOperation('compress');

      const optimizedBytes = await compressPDF(pdfBytes, { stripMetadata });
      setCompressedSize(optimizedBytes.length);

      // Trigger download
      const blob = new Blob([optimizedBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Compressed-${fileName}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSuccess(true);
      onOperationComplete?.();
    } catch (err) {
      console.error('Compression error:', err);
      if (err?.isQuotaExceeded) {
        onQuotaExceeded?.();
      } else {
        alert(err.message || 'Failed to compress PDF.');
      }
    } finally {
      setCompressing(false);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const savingsPercent = compressedSize && fileSize > 0 
    ? Math.max(0, Math.round((1 - compressedSize / fileSize) * 100))
    : 0;

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto p-6 bg-[#fdfbf7] rounded-2xl text-slate-900 border border-slate-200 shadow-xl">
      <div className="flex items-center justify-between w-full mb-6 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-indigo-600">PDF Compressor & Optimizer</h2>
          <p className="text-sm text-slate-600">Shrink PDF size securely in your browser using object stream optimization.</p>
        </div>
        <label className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg cursor-pointer text-sm font-semibold transition shadow-sm">
          <Upload className="w-4 h-4" />
          <span>Upload PDF</span>
          <input type="file" accept="application/pdf" onChange={handleFileUpload} className="hidden" />
        </label>
      </div>

      {!pdfFile ? (
        <div className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 text-slate-400 p-6 text-center">
          <Minimize2 className="w-10 h-10 mb-2 text-indigo-400" />
          <p className="text-sm font-medium text-slate-700">No PDF document loaded</p>
          <p className="text-xs text-slate-500 mt-1">Upload a PDF above to optimize file size</p>
        </div>
      ) : (
        <div className="w-full space-y-6">
          <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700 truncate">
              <FileText className="w-4 h-4 text-indigo-600 flex-shrink-0" />
              <span className="truncate">{fileName}</span>
            </div>
            <span className="text-xs px-2.5 py-1 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg font-medium">
              Original Size: {formatBytes(fileSize)}
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h4 className="font-semibold text-sm text-indigo-900 flex items-center gap-1.5">
              <Sliders className="w-4 h-4 text-indigo-600" /> Optimization Settings
            </h4>
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={stripMetadata}
                onChange={(e) => setStripMetadata(e.target.checked)}
                className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
              />
              <span className="text-sm text-slate-700">
                Strip unnecessary metadata (author, keywords, creator info) to maximize reduction
              </span>
            </label>
          </div>

          {compressedSize && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-900">
              <div>
                <p className="text-xs uppercase font-semibold text-emerald-700">Optimization Complete</p>
                <p className="text-sm mt-0.5">
                  New Size: <strong>{formatBytes(compressedSize)}</strong> ({savingsPercent}% smaller)
                </p>
              </div>
              <CheckCircle2 className="w-6 h-6 text-emerald-600 flex-shrink-0" />
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            {success ? (
              <span className="text-xs text-emerald-600 font-medium">Compressed PDF downloaded successfully!</span>
            ) : (
              <span className="text-xs text-slate-500">100% client-side compression. No data leaves your device.</span>
            )}

            <button
              disabled={compressing}
              onClick={handleCompressAction}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold rounded-lg transition shadow-md shadow-indigo-600/20"
            >
              <Download className="w-4 h-4" />
              <span>{compressing ? 'Compressing...' : 'Compress & Download'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}