import React, { useState, useRef } from 'react';
import { Upload, PenTool, Eraser, Download, CheckCircle2, FileText } from 'lucide-react';
import { signPDF } from '../utils/pdfengine';

export default function PdfSigner() {
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfBytes, setPdfBytes] = useState(null);
  const [fileName, setFileName] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [signing, setSigning] = useState(false);
  const [success, setSuccess] = useState(false);

  const sigCanvasRef = useRef(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || file.type !== 'application/pdf') return;

    setFileName(file.name);
    setPdfFile(file);
    const buffer = await file.arrayBuffer();
    setPdfBytes(new Uint8Array(buffer));
    setSuccess(false);
  };

  const startDrawing = (e) => {
    setIsDrawing(true);
    const canvas = sigCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = sigCanvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = '#1e1b4b'; // Dark indigo ink
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = sigCanvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const handleApplySignature = async () => {
    if (!pdfBytes || !sigCanvasRef.current) return;

    setSigning(true);
    setSuccess(false);

    try {
      const canvas = sigCanvasRef.current;
      const dataUrl = canvas.toDataURL('image/png');
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const sigBytes = new Uint8Array(await blob.arrayBuffer());

      // Stamp signature on page 0 at coordinates x=100, y=100
      const signedPdfBytes = await signPDF(pdfBytes, sigBytes, 0, 100, 100, 160, 70);

      // Trigger download
      const resultBlob = new Blob([signedPdfBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(resultBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Signed-${fileName}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSuccess(true);
    } catch (err) {
      console.error('Signing error:', err);
      alert('Failed to apply signature to PDF.');
    } finally {
      setSigning(false);
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto p-6 bg-[#fdfbf7] rounded-2xl text-slate-900 border border-slate-200 shadow-xl">
      <div className="flex items-center justify-between w-full mb-6 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-indigo-600">Electronic Signature Studio</h2>
          <p className="text-sm text-slate-600">Draw and legally stamp your signature securely in the browser.</p>
        </div>
        <label className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg cursor-pointer text-sm font-semibold transition shadow-sm">
          <Upload className="w-4 h-4" />
          <span>Upload PDF</span>
          <input type="file" accept="application/pdf" onChange={handleFileUpload} className="hidden" />
        </label>
      </div>

      {!pdfFile ? (
        <div className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 text-slate-400 p-6 text-center">
          <FileText className="w-10 h-10 mb-2 text-indigo-400" />
          <p className="text-sm font-medium text-slate-700">No PDF document loaded</p>
          <p className="text-xs text-slate-500 mt-1">Upload a PDF above to attach your signature</p>
        </div>
      ) : (
        <div className="w-full space-y-6">
          <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
            <div className="flex items-center gap-2 text-sm font-medium text-slate-700 truncate">
              <FileText className="w-4 h-4 text-indigo-600 flex-shrink-0" />
              <span className="truncate">{fileName}</span>
            </div>
            <span className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-600 border border-emerald-200 rounded-lg font-medium">
              Ready for Signature
            </span>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <PenTool className="w-4 h-4 text-indigo-600" /> Draw Your Signature Below
              </label>
              <button
                onClick={clearSignature}
                className="flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-xs transition font-medium"
              >
                <Eraser className="w-3.5 h-3.5" /> Clear
              </button>
            </div>
            <div className="flex justify-center border border-slate-300 rounded-xl bg-slate-50 overflow-hidden">
              <canvas
                ref={sigCanvasRef}
                width={500}
                height={160}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
                className="cursor-crosshair bg-white w-full max-w-[500px] h-[160px]"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            {success ? (
              <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" />
                <span>Signed PDF downloaded successfully!</span>
              </div>
            ) : (
              <span className="text-xs text-slate-500">Signature will be placed on the first page.</span>
            )}

            <button
              disabled={signing}
              onClick={handleApplySignature}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold rounded-lg transition shadow-md shadow-indigo-600/20"
            >
              <Download className="w-4 h-4" />
              <span>{signing ? 'Applying...' : 'Sign & Download PDF'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}