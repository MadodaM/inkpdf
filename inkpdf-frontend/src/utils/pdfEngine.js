import { PDFDocument, degrees } from 'pdf-lib';

/**
 * Merges multiple PDF File objects completely in the browser.
 * @param {File[]} files 
 * @returns {Promise<Uint8Array>} Merged PDF bytes
 */
export async function mergePDFs(files) {
  const mergedPdf = await PDFDocument.create();

  for (const file of files) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await PDFDocument.load(arrayBuffer);
    const copiedPages = await mergedPdf.copyPages(pdf, pdf.getPageIndices());
    copiedPages.forEach((page) => mergedPdf.addPage(page));
  }

  return await mergedPdf.save();
}

/**
 * Rotates a specific page by 90 degrees.
 * @param {Uint8Array} pdfBytes 
 * @param {number} pageIndex 
 * @returns {Promise<Uint8Array>} Modified PDF bytes
 */
export async function rotatePage(pdfBytes, pageIndex) {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  if (pages[pageIndex]) {
    const currentRotation = pages[pageIndex].getRotation().angle;
    const newAngle = (currentRotation + 90) % 360;
    pages[pageIndex].setRotation(degrees(newAngle)); // Fixed: Wrapped in degrees()
  }
  return await pdfDoc.save();
}

/**
 * Embeds an image signature onto a PDF page.
 * @param {Uint8Array} pdfBytes 
 * @param {Uint8Array} signatureImageBytes - PNG bytes of the signature
 * @param {number} pageIndex 
 * @param {number} x 
 * @param {number} y 
 * @param {number} width 
 * @param {number} height 
 * @returns {Promise<Uint8Array>} Modified PDF bytes
 */
export async function signPDF(pdfBytes, signatureImageBytes, pageIndex = 0, x = 100, y = 100, width = 150, height = 60) {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const pages = pdfDoc.getPages();
  const page = pages[pageIndex];

  if (!page) throw new Error('Invalid page index');

  const signatureImage = await pdfDoc.embedPng(signatureImageBytes);

  page.drawImage(signatureImage, {
    x,
    y,
    width,
    height,
  });

  return await pdfDoc.save();
}

/**
 * Extracts specific 0-based page indices from a PDF into a new document.
 * @param {Uint8Array} pdfBytes 
 * @param {number[]} pageIndices - Array of 0-based page numbers to extract
 * @returns {Promise<Uint8Array>} Extracted PDF bytes
 */
export async function extractPages(pdfBytes, pageIndices) {
  const sourcePdf = await PDFDocument.load(pdfBytes);
  const newPdf = await PDFDocument.create();
  
  const copiedPages = await newPdf.copyPages(sourcePdf, pageIndices);
  copiedPages.forEach((page) => newPdf.addPage(page));

  return await newPdf.save();
}

/**
 * Compresses and optimizes a PDF document client-side.
 * @param {Uint8Array} pdfBytes 
 * @param {Object} options - { stripMetadata: boolean }
 * @returns {Promise<Uint8Array>} Optimized PDF bytes
 */
export async function compressPDF(pdfBytes, options = { stripMetadata: true }) {
  const pdfDoc = await PDFDocument.load(pdfBytes, { ignoreEncryption: true });

  if (options.stripMetadata) {
    pdfDoc.setTitle('');
    pdfDoc.setAuthor('');
    pdfDoc.setSubject('');
    pdfDoc.setKeywords([]);
    pdfDoc.setProducer('');
    pdfDoc.setCreator('');
  }

  // Save with useObjectStreams enabled to pack objects into compressed object streams
  return await pdfDoc.save({ useObjectStreams: true });
}

// --- ADDITIONS FOR PASSWORD PROTECTION & ENCRYPTION ---

/**
 * Encrypts a PDF Uint8Array with user and owner passwords.
 * @param {Uint8Array} pdfBytes - Raw PDF bytes
 * @param {Object} options - { userPassword, ownerPassword }
 * @returns {Promise<Uint8Array>} Encrypted PDF bytes
 */
export async function encryptPDF(pdfBytes, { userPassword, ownerPassword = null }) {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  
  const encryptedBytes = await pdfDoc.save({
    userPassword: userPassword,
    ownerPassword: ownerPassword || userPassword,
    permissions: {
      printing: 'highResolution',
      modifying: false,
      copying: false,
      annotating: true,
    },
  });

  return encryptedBytes;
}

/**
 * Loads and decrypts a password-protected PDF document.
 * @param {ArrayBuffer|Uint8Array} pdfBytes - Raw encrypted PDF bytes
 * @param {string} password - Password to unlock the PDF
 * @returns {Promise<PDFDocument>} Loaded pdf-lib PDFDocument instance
 */
export async function loadEncryptedPDF(pdfBytes, password) {
  try {
    const pdfDoc = await PDFDocument.load(pdfBytes, {
      password: password,
      ignoreEncryption: false,
    });
    return pdfDoc;
  } catch (err) {
    if (err.message?.includes('password') || err.name === 'PasswordRequirementError') {
      throw new Error('Incorrect password. Failed to decrypt PDF.');
    }
    throw err;
  }
}

// --- ADDITIONS FOR INTERACTIVE FORM FILLING (ACROFORMS) ---

/**
 * Extracts form field definitions from a PDF.
 * @param {Uint8Array} pdfBytes 
 * @returns {Promise<Array<{ name: string, type: string, value: string|boolean, options?: string[] }>>}
 */
export async function getPdfFormFields(pdfBytes) {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();
  const fields = form.getFields();

  return fields.map((field) => {
    const name = field.getName();
    const type = field.constructor.name; // e.g. PDFTextField, PDFCheckBox, PDFDropdown, PDFRadioGroup

    let value = '';
    let options = [];

    if (type === 'PDFTextField') {
      value = field.getText() || '';
    } else if (type === 'PDFCheckBox') {
      value = field.isChecked();
    } else if (type === 'PDFDropdown') {
      value = field.getSelected()[0] || '';
      options = field.getOptions();
    } else if (type === 'PDFRadioGroup') {
      value = field.getSelected() || '';
      options = field.getOptions();
    }

    return { name, type, value, options };
  });
}

/**
 * Fills PDF form fields with new values and exports the modified PDF.
 * @param {Uint8Array} pdfBytes 
 * @param {Object} fieldData - Key-value map of field names to values
 * @param {boolean} flatten - If true, bakes inputs directly into document pages
 * @returns {Promise<Uint8Array>}
 */
export async function fillAndSaveForm(pdfBytes, fieldData, flatten = false) {
  const pdfDoc = await PDFDocument.load(pdfBytes);
  const form = pdfDoc.getForm();

  for (const [name, value] of Object.entries(fieldData)) {
    try {
      const field = form.getField(name);
      const type = field.constructor.name;

      if (type === 'PDFTextField') {
        field.setText(String(value));
      } else if (type === 'PDFCheckBox') {
        if (value) field.check();
        else field.uncheck();
      } else if (type === 'PDFDropdown') {
        field.select(String(value));
      } else if (type === 'PDFRadioGroup') {
        field.select(String(value));
      }
    } catch (err) {
      console.warn(`Could not set field "${name}":`, err.message);
    }
  }

  // Flattening renders form inputs permanently onto the page
  if (flatten) {
    form.flatten();
  }

  return await pdfDoc.save();
}