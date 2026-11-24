import React, { useState } from 'react';
import { Upload, FileCheck, Download, CheckCircle2, Sliders } from 'lucide-react';
import { getPdfFormFields, fillAndSaveForm } from '../utils/pdfEngine';
import { trackPdfOperation } from '../utils/usageTracker';

export default function PdfFormFiller() {
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfBytes, setPdfBytes] = useState(null);
  const [fileName, setFileName] = useState('');
  const [fields, setFields] = useState([]);
  const [formData, setFormData] = useState({});
  const [flatten, setFlatten] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || file.type !== 'application/pdf') return;

    setLoading(true);
    setFileName(file.name);
    setPdfFile(file);
    setSuccess(false);

    try {
      const buffer = await file.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      setPdfBytes(bytes);

      // Extract AcroForm field metadata
      const detectedFields = await getPdfFormFields(bytes);
      setFields(detectedFields);

      // Initialize form state
      const initialData = {};
      detectedFields.forEach((f) => {
        initialData[f.name] = f.value;
      });
      setFormData(initialData);
    } catch (err) {
      console.error('Error reading form fields:', err);
      alert('Failed to inspect PDF form fields.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSaveForm = async () => {
    if (!pdfBytes) return;

    setSaving(true);
    setSuccess(false);

    try {
      // 1. Enforce 24-hour operation quota check
      await trackPdfOperation('edit');

      // 2. Fill form values and optional flattening
      const filledBytes = await fillAndSaveForm(pdfBytes, formData, flatten);

      // 3. Trigger download
      const blob = new Blob([filledBytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Filled-${fileName}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      setSuccess(true);
    } catch (err) {
      console.error('Form saving error:', err);
      alert(err.message || 'Failed to save completed form.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col items-center w-full max-w-4xl mx-auto p-6 bg-[#fdfbf7] rounded-2xl text-slate-900 border border-slate-200 shadow-xl">
      <div className="flex items-center justify-between w-full mb-6 pb-4 border-b border-slate-200">
        <div>
          <h2 className="text-xl font-bold text-indigo-600">Interactive Form Filler (AcroForms)</h2>
          <p className="text-sm text-slate-600">Fill out SARS forms, FICA declarations, and banking applications securely in-browser.</p>
        </div>
        <label className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg cursor-pointer text-sm font-semibold transition shadow-sm">
          <Upload className="w-4 h-4" />
          <span>Upload PDF Form</span>
          <input type="file" accept="application/pdf" onChange={handleFileUpload} className="hidden" />
        </label>
      </div>

      {loading ? (
        <div className="py-12 text-sm text-indigo-600 font-semibold animate-pulse">Inspecting interactive form fields...</div>
      ) : !pdfFile ? (
        <div className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 text-slate-400 p-6 text-center">
          <FileCheck className="w-10 h-10 mb-2 text-indigo-400" />
          <p className="text-sm font-medium text-slate-700">No PDF form loaded</p>
          <p className="text-xs text-slate-500 mt-1">Upload an AcroForm PDF above to edit field data</p>
        </div>
      ) : fields.length === 0 ? (
        <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl text-center text-amber-900 text-sm">
          No interactive form fields detected in this PDF.
        </div>
      ) : (
        <div className="w-full space-y-6">
          <div className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-sm">
            <span className="text-sm font-medium text-slate-700 truncate">{fileName}</span>
            <span className="text-xs px-2.5 py-1 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-lg font-semibold">
              {fields.length} Form Field{fields.length > 1 ? 's' : ''} Found
            </span>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4 max-h-[400px] overflow-y-auto">
            {fields.map((field) => (
              <div key={field.name} className="flex flex-col space-y-1">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                  {field.name}
                </label>

                {field.type === 'PDFCheckBox' ? (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!formData[field.name]}
                      onChange={(e) => handleInputChange(field.name, e.target.checked)}
                      className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                    />
                    <span className="text-sm text-slate-700">Checked</span>
                  </label>
                ) : field.type === 'PDFDropdown' || field.type === 'PDFRadioGroup' ? (
                  <select
                    value={formData[field.name] || ''}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-indigo-600"
                  >
                    <option value="">-- Select Option --</option>
                    {field.options.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={formData[field.name] || ''}
                    onChange={(e) => handleInputChange(field.name, e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-indigo-600"
                  />
                )}
              </div>
            ))}
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
            <label className="flex items-center gap-3 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={flatten}
                onChange={(e) => setFlatten(e.target.checked)}
                className="w-4 h-4 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
              />
              <span className="text-sm text-slate-700">
                <strong>Flatten Form</strong> (Bakes form values permanently so they cannot be edited)
              </span>
            </label>
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-slate-200">
            {success ? (
              <div className="flex items-center gap-2 text-emerald-600 text-sm font-medium">
                <CheckCircle2 className="w-4 h-4" />
                <span>Form saved and downloaded successfully!</span>
              </div>
            ) : (
              <span className="text-xs text-slate-500">100% in-browser form processing.</span>
            )}

            <button
              disabled={saving}
              onClick={handleSaveForm}
              className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white font-semibold rounded-lg transition shadow-md shadow-indigo-600/20 text-sm"
            >
              <Download className="w-4 h-4" />
              <span>{saving ? 'Exporting Form...' : 'Export & Download Form'}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}