import React, { useState } from 'react';
import { Upload, Scissors, FileText, Download, CheckCircle2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { extractPages } from '../utils/pdfengine';
import { trackPdfOperation } from '../utils/usageTracker'; // <-- 1. ADD THIS IMPORT

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

export default function PdfSplitter() {
  const [pdfBytes, setPdfBytes] = useState(null);
  const [fileName, setFileName] = useState('');
  const [totalPages, setTotalPages] = useState(0);
  const [pageRange, setPageRange] = useState('');
  const [splitMode, setSplitMode] = useState('range'); // 'range' or 'all'
  const [processing, setProcessing] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || file.type !== 'application/pdf') return;

    setFileName(file.name);
    setSuccess(false);

    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      setPdfBytes(bytes);

      const loadedPdf = await pdfjsLib.getDocument({ data: buffer }).promise;
      setTotalPages(loadedPdf.numPages);
      setPageRange(`1-${loadedPdf.numPages}`);
    } catch (err) {
      console.error('Error loading PDF for splitting:', err);
      alert('Failed to load PDF.');
    }
  };

  const parseRangeString = (str, max) => {
    const indices = new Set();
    const parts = str.split(',');

    for (const part of parts) {
      const trimmed = part.trim();
      if (trimmed.includes('-')) {
        const [start, end] = trimmed.split('-').map(Number);
        if (!isNaN(start) && !isNaN(end)) {
          for (let i = start; i <= end; i++) {
            if (i >= 1 && i <= max) indices.add(i - 1);
          }
        }
      } else {
        const num = Number(trimmed);
        if (!isNaN(num) && num >= 1 && num <= max) {
          indices.add(num - 1);
        }
      }
    }
    return Array.from(indices).sort((a, b) => a - b);
  };

  const handleSplitAction = async () => {
    if (!pdfBytes) return;

    setProcessing(true);
    setSuccess(false);

    try {
      // 2. CHECK & LOG DAILY QUOTA BEFORE SPLITTING/EXTRACTING
      await trackPdfOperation('split');

      if (splitMode === 'range') {
        const indices = parseRangeString(pageRange, totalPages);
        if (indices.length === 0) {
          alert('Please enter a valid page range.');
          setProcessing(false);
          return;
        }

        const extractedBytes = await extractPages(pdfBytes, indices);
        downloadPdf(extractedBytes, `Extracted-${fileName}`);
      } else {
        for (let i = 0; i < totalPages; i++) {
          const extractedBytes = await extractPages(pdfBytes, [i]);
          downloadPdf(extractedBytes, `Page-${i + 1}-${fileName}`);
        }
      }

      setSuccess(true);
    } catch (err) {
      console.error('Split error:', err);
      // Displays HTTP 429 quota alert or fallback error message
      alert(err.message || 'Failed to split/extract PDF pages.');
    } finally {
      setProcessing(false);
    }
  };

  const downloadPdf = (bytes, name) => {
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto p-6 bg-[#fdfbf7] rounded-2xl text-slate-900 border border-slate-200 shadow-xl">
      <div className="flex items-center justify-between w-full mb-6 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-indigo-600">PDF Splitter & Page Extractor</h2>
          <p className="text-sm text-slate-600">Extract custom page ranges or split single PDFs into individual files.</p>
        </div>
        <label className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg cursor-pointer text-sm font-semibold transition shadow-sm">
          <Upload className="w-4 h-4" />
          <span>Upload PDF</span>
          <input type="file" accept="application/pdf" onChange={handleFileUpload} className="hidden" />
        </label>
      </div>

      {!pdfBytes ? (
        <div className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 text-slate-400 p-6 text-center">
          <Scissors className="w-10 h-10 mb-2 text-indigo-400" />
          <p className="text-sm font-medium text-slate-700">No PDF document loaded</p>
          <p className="text-xs text-slate-500 mt-1">Upload a PDF above to start splitting or extracting pages</p>
        </div>
      ) : (
        <div className="w-full space-y-6">
          <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700 truncate">
              <FileText className="w-4 h-4 text-indigo-600 flex-shrink-0" />
              <span className="truncate">{fileName}</span>
            </div>
            <span className="text-xs px-2.5 py-1 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg font-medium">
              {totalPages} Total Pages
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button
              onClick={() => setSplitMode('range')}
              className={`p-4 rounded-xl border text-left transition ${
                splitMode === 'range'
                  ? 'bg-indigo-50/50 border-indigo-600 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <h4 className="font-semibold text-sm text-indigo-900">Extract Page Range</h4>
              <p className="text-xs text-slate-500 mt-1">Specify custom pages or ranges (e.g. 1-3, 5, 8-10)</p>
            </button>

            <button
              onClick={() => setSplitMode('all')}
              className={`p-4 rounded-xl border text-left transition ${
                splitMode === 'all'
                  ? 'bg-indigo-50/50 border-indigo-600 shadow-sm'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <h4 className="font-semibold text-sm text-indigo-900">Split into Single Pages</h4>
              <p className="text-xs text-slate-500 mt-1">Export every page as an individual PDF file</p>
            </button>
          </div>

          {splitMode === 'range' && (
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">
                Page Range (1 to {totalPages})
              </label>
              <input
                type="text"
                value={pageRange}
                onChange={(e) => setPageRange(e.target.value)}
                placeholder="e.g. 1-3, 5, 7-10"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-indigo-600"
              />
            </div>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            {success ? (
              <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" />
                <span>Pages extracted and downloaded successfully!</span>
              </div>
            ) : (
              <span className="text-xs text-slate-500">All operations run securely in your browser.</span>
            )}

            <button
              disabled={processing}
              onClick={handleSplitAction}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold rounded-lg transition shadow-md shadow-indigo-600/20"
            >
              <Download className="w-4 h-4" />
              <span>{processing ? 'Processing...' : splitMode === 'range' ? 'Extract Pages' : 'Split All Pages'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}