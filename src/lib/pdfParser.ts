// ============================================================================
// ProcureOS Intelligent PDF Quotation Parser
// Dual-Engine Extraction:
// 1. High-precision vector text extraction via pdfjs-dist
// 2. Automated OCR fallback via Tesseract.js for scanned/image quotations
// 3. Extraction of vendor metadata, line items, pricing, and commercial terms
// ============================================================================

import * as pdfjsLib from 'pdfjs-dist';

// Configure pdfjs worker for Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export interface ExtractedLineItem {
  id: string;
  description: string;
  quantity: number;
  uom: string;
  unitPriceSAR: number;
  totalPriceSAR: number;
}

export interface ParsedVendorInfo {
  name?: string;
  crNumber?: string;
  vatNumber?: string;
  email?: string;
  phone?: string;
  city?: string;
}

export interface ParsedQuoteReview {
  proposalRefNumber?: string;
  totalAmountSAR?: number;
  leadTimeDays?: number;
  validityDate?: string;
  paymentTerms?: string;
  lineItems: ExtractedLineItem[];
  vendorInfo?: ParsedVendorInfo;
  rawTextSample?: string;
  confidenceScore: number; // 0 - 100
  isOcrUsed?: boolean;
}

/**
 * Runs OCR on a rendered canvas using Tesseract.js
 */
async function performCanvasOcr(canvas: HTMLCanvasElement): Promise<string[]> {
  try {
    const { createWorker } = await import('tesseract.js');
    const worker = await createWorker('eng');
    const result = await worker.recognize(canvas);
    await worker.terminate();
    const text = result.data?.text || '';
    return text.split('\n').map((l) => l.trim()).filter((l) => l.length > 2);
  } catch (err) {
    console.warn('[ProcureOS OCR] Tesseract OCR fallback failed or offline:', err);
    return [];
  }
}

/**
 * Reads array buffer from File or dataUrl and returns full extracted text lines
 */
export async function extractTextLinesFromPdf(
  fileOrDataUrl: File | string,
  onProgress?: (status: string) => void
): Promise<{ lines: string[]; isOcr: boolean }> {
  try {
    let arrayBuffer: ArrayBuffer;

    if (typeof fileOrDataUrl === 'string') {
      const base64 = fileOrDataUrl.split(',')[1] || fileOrDataUrl;
      const binary = atob(base64);
      const len = binary.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      arrayBuffer = bytes.buffer;
    } else {
      arrayBuffer = await fileOrDataUrl.arrayBuffer();
    }

    if (onProgress) onProgress('Scanning PDF vector text layer...');

    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useSystemFonts: true,
      isEvalSupported: false,
    });

    const pdf = await loadingTask.promise;
    const lines: string[] = [];

    for (let pageNum = 1; pageNum <= Math.min(pdf.numPages, 5); pageNum++) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      let currentLine = '';
      let lastY: number | null = null;

      for (const item of textContent.items as any[]) {
        if ('str' in item) {
          const str = item.str.trim();
          if (!str) continue;

          // Check if item is on a new vertical line
          const y = item.transform ? item.transform[5] : null;
          if (lastY !== null && y !== null && Math.abs(y - lastY) > 5) {
            if (currentLine.trim()) {
              lines.push(currentLine.trim());
            }
            currentLine = str;
          } else {
            currentLine += (currentLine ? ' ' : '') + str;
          }
          lastY = y;
        }
      }
      if (currentLine.trim()) {
        lines.push(currentLine.trim());
      }
    }

    const totalTextLength = lines.join(' ').trim().length;

    // If PDF is a scanned image with very little or no native text, trigger Tesseract OCR
    if (totalTextLength < 40 && typeof document !== 'undefined') {
      if (onProgress) onProgress('Scanned image detected. Running Tesseract.js OCR engine...');
      try {
        const firstPage = await pdf.getPage(1);
        const viewport = firstPage.getViewport({ scale: 1.5 });
        const canvas = document.createElement('canvas');
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        const ctx = canvas.getContext('2d');

        if (ctx) {
          await firstPage.render({ canvasContext: ctx, viewport }).promise;
          const ocrLines = await performCanvasOcr(canvas);
          if (ocrLines.length > 0) {
            return { lines: ocrLines, isOcr: true };
          }
        }
      } catch (ocrErr) {
        console.warn('[ProcureOS PDF Parser] OCR attempt failed:', ocrErr);
      }
    }

    return { lines, isOcr: false };
  } catch (err) {
    console.warn('[ProcureOS PDF Parser] Text extraction exception:', err);
    return { lines: [], isOcr: false };
  }
}

/**
 * Intelligent regex and structural parsing to extract proposal ref, prices, and lines
 */
export async function analyzeQuotePdf(
  fileOrDataUrl: File | string,
  rfqLineTemplates?: Array<{ id: string; description: string; quantity: number; uom: string; targetPriceSAR?: number }>,
  onProgress?: (status: string) => void
): Promise<ParsedQuoteReview> {
  const { lines, isOcr } = await extractTextLinesFromPdf(fileOrDataUrl, onProgress);
  const fullText = lines.join('\n');

  if (onProgress) onProgress('Analyzing quotation details, line items, and pricing...');

  let proposalRef: string | undefined;
  let totalAmount: number | undefined;
  let leadTime: number | undefined;
  let validity: string | undefined;
  let paymentTerms: string | undefined;
  let vendorInfo: ParsedVendorInfo | undefined;

  // 0. Extract Vendor / Supplier Details (Company Name, CR, VAT, Email, Phone, City)
  let detectedVendorName: string | undefined;
  let detectedCr: string | undefined;
  let detectedVat: string | undefined;
  let detectedEmail: string | undefined;
  let detectedPhone: string | undefined;
  let detectedCity: string | undefined;

  // CR Number (10 digits starting with 1, 2, 4, etc.)
  const crMatch = fullText.match(/(?:C\.?R\.?|CR\s*No\.?|Commercial\s*Reg(?:istration)?|سجل\s*تجاري)[:\s#]*([1-4][0-9]{9})\b/i) ||
                  fullText.match(/\b([1-4][0-9]{9})\b/);
  if (crMatch) detectedCr = crMatch[1].trim();

  // VAT Number (15 digits usually starting with 3 and ending with 3 in KSA)
  const vatMatch = fullText.match(/(?:VAT|VAT\s*No\.?|Tax\s*ID|Tax\s*Number|الرقم\s*الضريبي)[:\s#]*(3[0-9]{13,14})\b/i) ||
                   fullText.match(/\b(3[0-9]{13,14})\b/);
  if (vatMatch) detectedVat = vatMatch[1].trim();

  // Email
  const emailMatch = fullText.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
  if (
    emailMatch &&
    !emailMatch[1].toLowerCase().includes('procureos') &&
    !emailMatch[1].toLowerCase().includes('fitco') &&
    !emailMatch[1].toLowerCase().includes('arabitra')
  ) {
    detectedEmail = emailMatch[1].trim();
  }

  // Phone
  const phoneMatch = fullText.match(/(?:\+?966[\s-]?[0-9]{1,2}[\s-]?[0-9]{3}[\s-]?[0-9]{4}|05[0-9]{8})/);
  if (phoneMatch) detectedPhone = phoneMatch[0].trim();

  // City
  const cityMatch = fullText.match(/\b(Riyadh|Dammam|Jeddah|Khobar|Al\s*Khobar|Jubail|Yanbu|Tabuk|Makkah|Madinah)\b/i);
  if (cityMatch) detectedCity = cityMatch[1].trim();

  // Company / Supplier Name detection from top lines or explicit "From:" / "Supplier:" / "Company:" tags
  const supplierTagMatch = fullText.match(/(?:Supplier|Vendor|From|Company|Issued\s*By|المورد|الشركة)[:\s]+([^\n\r,]{4,60})/i);
  if (
    supplierTagMatch &&
    !supplierTagMatch[1].toLowerCase().includes('procureos') &&
    !supplierTagMatch[1].toLowerCase().includes('fitco') &&
    !supplierTagMatch[1].toLowerCase().includes('arabitra')
  ) {
    detectedVendorName = supplierTagMatch[1].trim();
  } else {
    // Scan top 10 lines for likely company headers
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
      const line = lines[i].trim();
      if (
        line.length > 5 &&
        line.length < 65 &&
        !line.match(/quotation|proposal|invoice|rfq|purchase\s*order|page\s*[0-9]|date/i) &&
        !line.match(/fitco|arabitra|procureos/i) &&
        line.match(/(?:Est\.?|Co\.?|Ltd\.?|Trading|Solutions|Telematics|Technology|Wireless|Systems|General|Corporation|Enterprises|Supply|Services)/i)
      ) {
        detectedVendorName = line;
        break;
      }
    }
  }

  if (detectedVendorName || detectedCr || detectedVat || detectedEmail) {
    vendorInfo = {
      name: detectedVendorName,
      crNumber: detectedCr,
      vatNumber: detectedVat,
      email: detectedEmail,
      phone: detectedPhone,
      city: detectedCity,
    };
  }

  // Payment Terms
  const termsMatch = fullText.match(/(?:Payment\s*Terms|Terms\s*of\s*Payment|شروط\s*الدفع)[:\s]*([^\n\r;]{5,50})/i);
  if (termsMatch) {
    paymentTerms = termsMatch[1].trim();
  } else if (/Net\s*30/i.test(fullText)) {
    paymentTerms = 'Net 30 Days';
  } else if (/Net\s*60/i.test(fullText)) {
    paymentTerms = 'Net 60 Days';
  } else if (/100%\s*(?:Advance|SARIE)/i.test(fullText)) {
    paymentTerms = '100% SARIE Wire Transfer';
  }

  // 1. Extract Proposal / Quotation Reference
  const refMatches = [
    /(?:quote|quotation|ref|proposal|offer|bid|estimate)\s*(?:#|no\.?|num\.?|reference|id)?[:\s-]*([A-Z0-9\-_/]{4,25})/i,
    /([A-Z]{2,5}[-_/][A-Z0-9-_/]{3,20})/i,
  ];
  for (const regex of refMatches) {
    const match = fullText.match(regex);
    if (match && match[1] && !match[1].toUpperCase().includes('SAR') && !match[1].toUpperCase().includes('TOTAL')) {
      proposalRef = match[1].trim();
      break;
    }
  }

  // 2. Extract Lead Time (e.g., 30 days, 4 weeks)
  const leadTimeMatch = fullText.match(/(?:delivery|lead\s*time|dispatch|completion)[:\s]*([0-9]{1,3})\s*(days?|weeks?)/i);
  if (leadTimeMatch) {
    const val = parseInt(leadTimeMatch[1], 10);
    const unit = leadTimeMatch[2].toLowerCase();
    leadTime = unit.startsWith('week') ? val * 7 : val;
  }

  // 3. Extract Validity Date
  const dateMatch = fullText.match(/(?:valid\s*(?:until|thru|to|date)?|validity)[:\s]*([0-9]{4}[-/][0-9]{1,2}[-/][0-9]{1,2}|[0-9]{1,2}[-/][0-9]{1,2}[-/][0-9]{4})/i);
  if (dateMatch) {
    try {
      const d = new Date(dateMatch[1]);
      if (!isNaN(d.getTime())) {
        validity = d.toISOString().split('T')[0];
      }
    } catch {}
  }

  // 4. Extract Grand Total / Subtotal Amount
  const totalMatches = [
    /(?:grand\s*total|total\s*payable|final\s*amount|net\s*total|total\s*price|total\s*sar|total)[:\s]*(?:sar|sr|riyal)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/i,
    /(?:sar|sr)\s*([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]{1,2})?)/i,
  ];
  for (const regex of totalMatches) {
    const match = fullText.match(regex);
    if (match && match[1]) {
      const cleanNum = parseFloat(match[1].replace(/,/g, ''));
      if (cleanNum > 0) {
        totalAmount = cleanNum;
        break;
      }
    }
  }

  // 5. Extract itemized line entries
  const extractedLines: ExtractedLineItem[] = [];

  // Match against target RFQ line template if provided
  if (rfqLineTemplates && rfqLineTemplates.length > 0) {
    for (const rfqLine of rfqLineTemplates) {
      const words = rfqLine.description.split(/\s+/).filter((w) => w.length > 3);
      let matchedPrice: number | null = null;

      for (const line of lines) {
        const matchesWords = words.some((w) => line.toLowerCase().includes(w.toLowerCase()));
        if (matchesWords) {
          const numMatches = line.matchAll(/([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/g);
          const foundNumbers: number[] = [];
          for (const m of numMatches) {
            const parsed = parseFloat(m[1].replace(/,/g, ''));
            if (parsed > 0 && parsed !== rfqLine.quantity) {
              foundNumbers.push(parsed);
            }
          }
          if (foundNumbers.length > 0) {
            matchedPrice = foundNumbers[foundNumbers.length - 1];
            break;
          }
        }
      }

      const unitPrice = matchedPrice
        ? matchedPrice > (rfqLine.targetPriceSAR || 100) * 1.5
          ? Math.round(matchedPrice / rfqLine.quantity)
          : matchedPrice
        : rfqLine.targetPriceSAR || 1000;

      extractedLines.push({
        id: rfqLine.id,
        description: rfqLine.description,
        quantity: rfqLine.quantity,
        uom: rfqLine.uom,
        unitPriceSAR: unitPrice,
        totalPriceSAR: unitPrice * rfqLine.quantity,
      });
    }
  } else {
    // Parse free-form table lines (pattern: index/item description qty uom unit_price total_price)
    let autoIndex = 1;
    for (const line of lines) {
      const tableRowMatch =
        line.match(/^([0-9]{1,2})[.)\s]+([A-Za-z0-9\s"'-]{5,60}?)\s+([0-9]{1,4})\s*(EA|LOT|M|SET|PCS|NOS|MTR|UNIT)?\s+([0-9,]+(?:\.[0-9]{1,2})?)\s+([0-9,]+(?:\.[0-9]{1,2})?)$/i) ||
        line.match(/^([A-Za-z0-9\s"'-]{5,60}?)\s+([0-9]{1,4})\s*(EA|LOT|M|SET|PCS|NOS|MTR|UNIT)?\s+([0-9,]+(?:\.[0-9]{1,2})?)\s+([0-9,]+(?:\.[0-9]{1,2})?)$/i);

      if (tableRowMatch) {
        const desc = (tableRowMatch.length === 7 ? tableRowMatch[2] : tableRowMatch[1]).trim();
        const qty = parseInt(tableRowMatch.length === 7 ? tableRowMatch[3] : tableRowMatch[2], 10) || 1;
        const uom = (tableRowMatch.length === 7 ? tableRowMatch[4] : tableRowMatch[3])?.toUpperCase() || 'EA';
        const unit = parseFloat((tableRowMatch.length === 7 ? tableRowMatch[5] : tableRowMatch[4]).replace(/,/g, '')) || 0;
        const total = parseFloat((tableRowMatch.length === 7 ? tableRowMatch[6] : tableRowMatch[5]).replace(/,/g, '')) || unit * qty;

        if (desc.length > 3 && unit > 0) {
          extractedLines.push({
            id: `EXTRACT-${autoIndex++}`,
            description: desc,
            quantity: qty,
            uom,
            unitPriceSAR: unit,
            totalPriceSAR: total,
          });
        }
      }
    }
  }

  // Calculate sum of extracted lines
  const sumLines = extractedLines.reduce((acc, curr) => acc + curr.totalPriceSAR, 0);
  if (!totalAmount && sumLines > 0) {
    totalAmount = sumLines;
  }

  const confidenceScore = lines.length > 0 ? (extractedLines.length > 0 ? 94 : 78) : 30;

  return {
    proposalRefNumber: proposalRef,
    totalAmountSAR: totalAmount,
    leadTimeDays: leadTime,
    validityDate: validity,
    paymentTerms,
    lineItems: extractedLines,
    vendorInfo,
    rawTextSample: lines.slice(0, 8).join(' | '),
    confidenceScore,
    isOcrUsed: isOcr,
  };
}
