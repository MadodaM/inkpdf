import * as pdfjsLib from 'pdfjs-dist';

// Set up worker URL directly from pdfjs-dist build
pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.mjs',
  import.meta.url
).toString();

export { pdfjsLib };