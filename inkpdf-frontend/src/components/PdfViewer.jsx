import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Upload, FileText, RotateCw } from 'lucide-react';
import { rotatePage } from '../utils/pdfEngine';
import { trackPdfOperation } from '../utils/usageTracker'; // <-- 1. ADD THIS IMPORT

pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

export default function PdfViewer({ onOperationComplete, onQuotaExceeded }) {
  const [pdfBytes, setPdfBytes] = useState(null);
  const [pdfDoc, setPdfDoc] = useState(null);
  const [pageNum, setPageNum] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [scale, setScale] = useState(1.2);
  const [loading, setLoading] = useState(false);
  const [fileName, setFileName] = useState('');

  const canvasRef = useRef(null);
  const renderTaskRef = useRef(null);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || file.type !== 'application/pdf') return;

    setLoading(true);
    setFileName(file.name);

    try {
      const arrayBuffer = await file.arrayBuffer();
      setPdfBytes(new Uint8Array(arrayBuffer));
      const loadedPdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      
      setPdfDoc(loadedPdf);
      setTotalPages(loadedPdf.numPages);
      setPageNum(1);
    } catch (error) {
      console.error('Error loading PDF:', error);
      alert('Failed to load PDF file.');
    } finally {
      setLoading(false);
    }
  };

  const handleRotate = async () => {
    if (!pdfBytes) return;
    try {
      // 2. CHECK & LOG DAILY QUOTA BEFORE ROTATING/EDITING
      await trackPdfOperation('edit');

      const modifiedBytes = await rotatePage(pdfBytes, pageNum - 1);
      setPdfBytes(modifiedBytes);
      const loadedPdf = await pdfjsLib.getDocument({ data: modifiedBytes }).promise;
      setPdfDoc(loadedPdf);
      onOperationComplete?.();
    } catch (err) {
      console.error('Rotation error:', err);
      if (err?.isQuotaExceeded) {
        onQuotaExceeded?.();
      } else {
        alert(err.message || 'Failed to rotate PDF page.');
      }
    }
  };

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    let isSubscribed = true;

    const renderPage = async () => {
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }

      try {
        const page = await pdfDoc.getPage(pageNum);
        if (!isSubscribed) return;

        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        const viewport = page.getViewport({ scale });

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;

        await renderTask.promise;
      } catch (error) {
        if (error?.name !== 'RenderingCancelledException') {
          console.error('Render error:', error);
        }
      }
    };

    renderPage();

    return () => {
      isSubscribed = false;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [pdfDoc, pageNum, scale]);

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto p-4 bg-[#fdfbf7] rounded-2xl text-slate-900 border border-slate-200 shadow-xl">
      <div className="flex flex-wrap items-center justify-between w-full p-3 mb-4 bg-white rounded-xl border border-slate-200 gap-2 shadow-sm">
        <label className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg cursor-pointer text-sm font-semibold transition shadow-sm">
          <Upload className="w-4 h-4" />
          <span>Upload PDF</span>
          <input type="file" accept="application/pdf" onChange={handleFileUpload} className="hidden" />
        </label>

        {pdfDoc && (
          <>
            <div className="flex items-center gap-2 text-slate-700 text-sm truncate max-w-[180px]">
              <FileText className="w-4 h-4 text-indigo-600 flex-shrink-0" />
              <span className="truncate">{fileName}</span>
            </div>

            <button
              onClick={handleRotate}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg text-sm transition font-medium"
              title="Rotate Page 90°"
            >
              <RotateCw className="w-4 h-4 text-indigo-600" />
              <span>Rotate</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                disabled={pageNum <= 1}
                onClick={() => setPageNum((prev) => prev - 1)}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 border border-slate-200 rounded-lg transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-sm font-mono text-slate-700 font-medium">
                {pageNum} / {totalPages}
              </span>
              <button
                disabled={pageNum >= totalPages}
                onClick={() => setPageNum((prev) => prev + 1)}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 border border-slate-200 rounded-lg transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setScale((s) => Math.max(0.5, s - 0.2))}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg transition"
                title="Zoom Out"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono px-2 text-slate-600">{Math.round(scale * 100)}%</span>
              <button
                onClick={() => setScale((s) => Math.min(3.0, s + 0.2))}
                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg transition"
                title="Zoom In"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
            </div>
          </>
        )}
      </div>

      <div className="w-full flex justify-center items-center min-h-[400px] bg-slate-100 rounded-xl p-4 overflow-auto border border-slate-200 shadow-inner">
        {loading ? (
          <div className="text-indigo-600 font-semibold animate-pulse">Loading PDF Document...</div>
        ) : !pdfDoc ? (
          <div className="text-slate-400 text-sm">Select a PDF document above to start viewing.</div>
        ) : (
          <canvas ref={canvasRef} className="shadow-2xl rounded-lg bg-white border border-slate-300" />
        )}
      </div>
    </div>
  );
}