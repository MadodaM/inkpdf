import React, { useState, useRef } from 'react';
import { PDFDocument, rgb } from 'pdf-lib';
import { PenTool, Type, Download } from 'lucide-react';

export default function PdfEditor({ originalPdfBytes, fileName }) {
  const [annotations, setAnnotations] = useState([]); // [{type: 'text'|'sig', x, y, text}]
  const [activeTool, setActiveTool] = useState('text'); // 'text' or 'sig'
  const [inputText, setInputText] = useState('Approved by InkPDF');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const containerRef = useRef(null);

  // Handle clicking on the document canvas to place an annotation
  const handleCanvasClick = (e) => {
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top; // Distance from top of viewer

    const newAnnotation = {
      id: Date.now(),
      type: activeTool,
      x,
      y,
      content: activeTool === 'text' ? inputText : '✍️ [Signed by User]',
    };

    setAnnotations([...annotations, newAnnotation]);
  };

  // Burn annotations permanently into PDF bytes using pdf-lib
  const handleSaveWithAnnotations = async () => {
    if (!originalPdfBytes) return;
    setIsProcessing(true);

    try {
      const pdfDoc = await PDFDocument.load(originalPdfBytes);
      const pages = pdfDoc.getPages();
      const firstPage = pages[0]; // Assuming page 1 for MVP
      const { height } = firstPage.getSize();

      for (const ann of annotations) {
        // Convert screen coordinates (top-down) to PDF coordinates (bottom-up)
        const pdfX = ann.x;
        const pdfY = height - ann.y;

        firstPage.drawText(ann.content, {
          x: pdfX,
          y: pdfY,
          size: 16,
          color: rgb(0.1, 0.1, 0.8),
        });
      }

      const modifiedPdfBytes = await pdfDoc.save();
      
      // Trigger browser download
      const blob = new Blob([modifiedPdfBytes], { type: 'application/pdf' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `signed-${fileName || 'document.pdf'}`;
      link.click();
    } catch (error) {
      console.error('Error stamping PDF:', error);
      alert('Failed to stamp annotations.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col items-center w-full gap-4">
      {/* Tool Selector Toolbar */}
      <div className="flex items-center gap-4 bg-slate-800 p-3 rounded-lg border border-slate-700 text-white">
        <button
          onClick={() => setActiveTool('text')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded transition ${
            activeTool === 'text' ? 'bg-indigo-600' : 'bg-slate-700 hover:bg-slate-600'
          }`}
        >
          <Type className="w-4 h-4" /> Add Text
        </button>

        <button
          onClick={() => setActiveTool('sig')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded transition ${
            activeTool === 'sig' ? 'bg-indigo-600' : 'bg-slate-700 hover:bg-slate-600'
          }`}
        >
          <PenTool className="w-4 h-4" /> Add Signature
        </button>

        {activeTool === 'text' && (
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            className="px-3 py-1 bg-slate-900 border border-slate-600 rounded text-sm text-white"
            placeholder="Enter annotation text..."
          />
        )}

        <button
          onClick={handleSaveWithAnnotations}
          disabled={isProcessing || annotations.length === 0}
          className="flex items-center gap-2 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 rounded text-sm font-semibold transition ml-auto"
        >
          <Download className="w-4 h-4" />
          <span>{isProcessing ? 'Saving...' : 'Download Stamped PDF'}</span>
        </button>
      </div>

      {/* Clickable Overlay Container */}
      <div
        ref={containerRef}
        onClick={handleCanvasClick}
        className="relative cursor-crosshair border border-slate-700 rounded shadow-2xl inline-block bg-white"
      >
        {/* Your PdfViewer Canvas renders underneath */}
        
        {/* Render Live Annotation Markers */}
        {annotations.map((ann) => (
          <div
            key={ann.id}
            style={{ left: `${ann.x}px`, top: `${ann.y}px` }}
            className="absolute transform -translate-x-2 -translate-y-2 px-2 py-1 bg-indigo-500/20 border border-indigo-500 text-indigo-900 text-xs font-mono rounded pointer-events-none shadow"
          >
            {ann.content}
          </div>
        ))}
      </div>
    </div>
  );
}