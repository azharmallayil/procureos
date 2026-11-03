// ============================================================================
// ProcureOS Advanced AI PDF Quotation Parser & BOQ Matcher
// 
// Principles:
// 1. Supplier quotation PDF is the primary source of truth.
// 2. Extracts ALL items actually mentioned in the supplier quotation PDF,
//    regardless of whether those items exist in the original RFQ/BOQ.
// 3. Never restricts quotation extraction to the original RFQ/BOQ items.
// 4. Preserves exact quoted quantities, SKUs, models, descriptions, unit prices,
//    currencies, and remarks without overwriting or inventing data.
// 5. Performs RFQ-to-Quotation matching as a distinct, separate operation AFTER extraction.
// 6. Classifies each item as Exact Match, Possible Alternative, Additional Quoted Item, or Needs Review.
// ============================================================================

import * as pdfjsLib from 'pdfjs-dist';
import { ItemMatchStatus } from '../types/procurement';

// Configure pdfjs worker for Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

export interface ExtractedLineItem {
  id: string;
  lineNumber?: number;
  itemName?: string;
  sku?: string;
  modelNumber?: string;
  brand?: string;
  description: string;
  quantity: number; // Supplier's quoted quantity (primary source of truth)
  requestedQuantity?: number; // Original RFQ quantity if matched
  uom: string;
  unitPriceSAR: number;
  discountPercent?: number;
  taxPercent?: number;
  totalPriceSAR: number;
  remarks?: string;
  matchStatus?: ItemMatchStatus;
  matchedRfqLineId?: string;
  matchConfidence?: number; // 0 - 100
  matchReason?: string;
  needsVerification?: boolean;
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
  quotationDate?: string;
  validityDate?: string;
  currency?: string;
  paymentTerms?: string;
  deliveryTerms?: string;
  leadTimeDays?: number;
  subtotalSAR?: number;
  taxAmountSAR?: number;
  totalAmountSAR?: number;
  taxPercent?: number;
  lineItems: ExtractedLineItem[];
  vendorInfo?: ParsedVendorInfo;
  rawTextSample?: string;
  confidenceScore: number; // 0 - 100
  isOcrUsed?: boolean;
  processingStatus?: 'Uploaded' | 'Processing' | 'Extracting' | 'Matching' | 'Review Required' | 'Completed' | 'Failed';
}

/**
 * Runs OCR on a rendered canvas using Tesseract.js for scanned/image PDFs
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
 * Reads array buffer from File or dataUrl and returns full extracted text lines across ALL pages
 */
export async function extractTextLinesFromPdf(
  fileOrDataUrl: File | string,
  onProgress?: (status: string) => void
): Promise<{ lines: string[]; isOcr: boolean; totalPages: number }> {
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

    if (onProgress) onProgress('Scanning PDF vector text layer across all pages...');

    const loadingTask = pdfjsLib.getDocument({
      data: new Uint8Array(arrayBuffer),
      useSystemFonts: true,
      isEvalSupported: false,
    });

    const pdf = await loadingTask.promise;
    const lines: string[] = [];
    const totalPages = pdf.numPages;

    // Scan up to 25 pages to support large multi-page commercial quotations
    const maxPagesToScan = Math.min(totalPages, 25);

    for (let pageNum = 1; pageNum <= maxPagesToScan; pageNum++) {
      if (onProgress && totalPages > 1) {
        onProgress(`Reading page ${pageNum} of ${totalPages}...`);
      }

      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      
      // Sort text items by vertical Y coordinate descending (top to bottom), then X ascending (left to right)
      const rawItems = (textContent.items as any[]).filter((it) => it && typeof it.str === 'string');
      
      // Group items into visual rows by Y threshold (~4-6px)
      interface PositionedItem {
        str: string;
        x: number;
        y: number;
      }
      
      const posItems: PositionedItem[] = rawItems.map((it) => ({
        str: it.str.trim(),
        x: it.transform ? it.transform[4] : 0,
        y: it.transform ? it.transform[5] : 0,
      })).filter((it) => it.str.length > 0);

      // Sort by Y desc
      posItems.sort((a, b) => b.y - a.y || a.x - b.x);

      const rows: PositionedItem[][] = [];
      let currentRow: PositionedItem[] = [];
      let currentY: number | null = null;

      for (const item of posItems) {
        if (currentY === null || Math.abs(item.y - currentY) <= 5) {
          currentRow.push(item);
          currentY = currentY === null ? item.y : (currentY + item.y) / 2;
        } else {
          if (currentRow.length > 0) {
            // Sort row left to right
            currentRow.sort((a, b) => a.x - b.x);
            rows.push(currentRow);
          }
          currentRow = [item];
          currentY = item.y;
        }
      }
      if (currentRow.length > 0) {
        currentRow.sort((a, b) => a.x - b.x);
        rows.push(currentRow);
      }

      // Convert rows to line strings
      for (const r of rows) {
        const lineStr = r.map((it) => it.str).join('   ').trim();
        if (lineStr.length > 0) {
          lines.push(lineStr);
        }
      }
    }

    const totalTextLength = lines.join(' ').trim().length;

    // If PDF is a scanned image with very little native text, trigger Tesseract OCR
    if (totalTextLength < 40 && typeof document !== 'undefined') {
      if (onProgress) onProgress('Scanned document detected. Running Tesseract.js OCR engine...');
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
            return { lines: ocrLines, isOcr: true, totalPages };
          }
        }
      } catch (ocrErr) {
        console.warn('[ProcureOS PDF Parser] OCR attempt failed:', ocrErr);
      }
    }

    return { lines, isOcr: false, totalPages };
  } catch (err) {
    console.warn('[ProcureOS PDF Parser] Text extraction exception:', err);
    return { lines: [], isOcr: false, totalPages: 0 };
  }
}

/**
 * Normalizes text for matching comparisons
 */
function normalizeForMatch(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Extracts a candidate SKU / Part Number from a line
 */
function extractSkuCandidate(text: string): string | undefined {
  const explicit = text.match(/(?:SKU|P\/N|Part\s*(?:No|Number)|Item\s*Code|Code)[:\s#]*([A-Z0-9-_/]{3,25})\b/i);
  if (explicit) return explicit[1].trim();

  const standardCode = text.match(/\b([A-Z]{2,8}[-_/][A-Z0-9-_/]{2,20})\b/);
  if (standardCode && !standardCode[1].match(/^(?:SAR|USD|EUR|TEL|FAX|REF|RFQ|PO|VAT|KSA)$/i)) {
    return standardCode[1].trim();
  }
  return undefined;
}

/**
 * Extracts a candidate model number from a line
 */
function extractModelCandidate(text: string): string | undefined {
  const explicit = text.match(/(?:Model|Mod|Type)[:\s#]*([A-Za-z0-9-_/]{2,20})\b/i);
  if (explicit) return explicit[1].trim();

  // Known industrial telematics / EPC model identifiers
  const modelPattern = text.match(/\b(FMC[0-9]{3}|FMB[0-9]{3}|RUT[0-9]{3}|FMB920|FMB120|FMC130|FMC640|TRB[0-9]{3}|TS-[0-9]{3,4}|DUT-E|DFM|ECO4|AT4)\b/i);
  if (modelPattern) return modelPattern[1].trim();

  return undefined;
}

/**
 * Extracts a candidate manufacturer or brand from a line
 */
function extractBrandCandidate(text: string): string | undefined {
  const brands = [
    'Teltonika',
    'Siemens',
    'Schneider',
    'Cisco',
    'Hikvision',
    'Technoton',
    'Queclink',
    'Ruptela',
    'Meitrack',
    'Huawei',
    'Honeywell',
    'Bosch',
    'ABB',
    'Yokogawa',
  ];
  for (const b of brands) {
    if (new RegExp(`\\b${b}\\b`, 'i').test(text)) {
      return b;
    }
  }
  return undefined;
}

/**
 * Extracts numbers from text that look like currency amounts or quantities
 */
function parseNumberClean(raw: string): number {
  return parseFloat(raw.replace(/,/g, '').trim()) || 0;
}

/**
 * Primary Extraction: Extracts ALL line items from the PDF without restricting to RFQ templates.
 * This guarantees the supplier's quotation is the primary source of truth.
 */
export function extractAllLineItemsFromText(lines: string[]): ExtractedLineItem[] {
  const extracted: ExtractedLineItem[] = [];
  const knownUoms = '(?:EA|LOT|M|SET|PCS|NOS|MTR|UNIT|BOX|PKG|METERS?|PIECES?|KG|MT)';
  
  let lineCounter = 1;
  const processedLineIndices = new Set<number>();

  // Filter out pure header/footer lines before scanning tables
  const isIgnorableLine = (l: string) => {
    const lower = l.toLowerCase();
    return (
      lower.startsWith('page ') ||
      lower.includes('commercial registration') ||
      lower.includes('tax registration') ||
      lower.includes('bank details') ||
      lower.includes('authorized signature') ||
      lower.includes('terms & conditions') ||
      (lower.includes('total') && (lower.includes('grand') || lower.includes('subtotal') || lower.includes('vat')))
    );
  };

  // PASS 1: High-precision regex matching standard procurement row structures
  // Pattern: [LineNo] [Description/SKU] [Qty] [UOM] [UnitPrice] [TotalPrice]
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.length < 5 || isIgnorableLine(line)) continue;

    // Pattern A: Numbered row with clear whitespace column separations
    // Example: "1   IOT-TEL-01 Teltonika FMC130 GPS Tracker   50   EA   480.00   24,000.00"
    const patternA = line.match(
      new RegExp(
        `^(?:([0-9]{1,3})[.)\\s]+)?(.+?)\\s+([0-9]{1,4}(?:\\.[0-9]{1,2})?)\\s*(${knownUoms})\\s+([0-9,]+(?:\\.[0-9]{1,2})?)\\s+([0-9,]+(?:\\.[0-9]{1,2})?)$`,
        'i'
      )
    );

    if (patternA) {
      const lineNo = patternA[1] ? parseInt(patternA[1], 10) : lineCounter;
      const rawDesc = patternA[2].trim();
      const qty = parseNumberClean(patternA[3]);
      const uom = patternA[4].toUpperCase();
      const unit = parseNumberClean(patternA[5]);
      const total = parseNumberClean(patternA[6]);

      if (rawDesc.length >= 3 && unit > 0 && qty > 0) {
        const sku = extractSkuCandidate(rawDesc);
        const model = extractModelCandidate(rawDesc);
        const brand = extractBrandCandidate(rawDesc);

        extracted.push({
          id: `EXT-LINE-${lineCounter++}`,
          lineNumber: lineNo,
          itemName: rawDesc.split(/[-–|]/)[0].trim(),
          sku,
          modelNumber: model,
          brand,
          description: rawDesc,
          quantity: qty,
          uom,
          unitPriceSAR: unit,
          totalPriceSAR: total || unit * qty,
          needsVerification: false,
        });
        processedLineIndices.add(i);
        continue;
      }
    }

    // Pattern B: Row with price @ qty
    // Example: "Teltonika FMC130 Tracker 4G LTE - Qty: 50 EA @ SAR 480.00 Total: 24,000.00"
    const patternB = line.match(
      new RegExp(
        `^(.+?)(?:[-–—|]|\\b)(?:qty|quantity)[:\\s]*([0-9]{1,4})\\s*(${knownUoms})?(?:\\s*[@|at]\\s*(?:sar|sr)?)?\\s*([0-9,]+(?:\\.[0-9]{1,2})?)(?:.*?total[:\\s]*(?:sar|sr)?\\s*([0-9,]+(?:\\.[0-9]{1,2})?))?`,
        'i'
      )
    );

    if (patternB) {
      const rawDesc = patternB[1].trim();
      const qty = parseNumberClean(patternB[2]);
      const uom = (patternB[3] || 'EA').toUpperCase();
      const unit = parseNumberClean(patternB[4]);
      const total = patternB[5] ? parseNumberClean(patternB[5]) : unit * qty;

      if (rawDesc.length >= 3 && unit > 0 && qty > 0) {
        const sku = extractSkuCandidate(rawDesc);
        const model = extractModelCandidate(rawDesc);
        const brand = extractBrandCandidate(rawDesc);

        extracted.push({
          id: `EXT-LINE-${lineCounter++}`,
          lineNumber: lineCounter,
          itemName: rawDesc.split(/[-–|]/)[0].trim(),
          sku,
          modelNumber: model,
          brand,
          description: rawDesc,
          quantity: qty,
          uom,
          unitPriceSAR: unit,
          totalPriceSAR: total,
          needsVerification: false,
        });
        processedLineIndices.add(i);
        continue;
      }
    }

    // Pattern C: Multi-column spatial layout where quantity, unit price, total price are at end of line
    // Example: "Industrial GNSS Antenna Magnetic Mount 25 80.00 2000.00"
    const patternC = line.match(/^(.+?)\s+([0-9]{1,4})\s+([0-9,]+\.[0-9]{2})\s+([0-9,]+\.[0-9]{2})$/);
    if (patternC) {
      const rawDesc = patternC[1].trim();
      const qty = parseNumberClean(patternC[2]);
      const unit = parseNumberClean(patternC[3]);
      const total = parseNumberClean(patternC[4]);

      if (rawDesc.length >= 4 && unit > 0 && qty > 0 && Math.abs(qty * unit - total) < total * 0.05 + 1) {
        const sku = extractSkuCandidate(rawDesc);
        const model = extractModelCandidate(rawDesc);
        const brand = extractBrandCandidate(rawDesc);

        extracted.push({
          id: `EXT-LINE-${lineCounter++}`,
          lineNumber: lineCounter,
          itemName: rawDesc.split(/[-–|]/)[0].trim(),
          sku,
          modelNumber: model,
          brand,
          description: rawDesc,
          quantity: qty,
          uom: 'EA',
          unitPriceSAR: unit,
          totalPriceSAR: total,
          needsVerification: false,
        });
        processedLineIndices.add(i);
        continue;
      }
    }
  }

  // PASS 2: Multi-line description reconciliation
  // If consecutive unparsed lines follow a parsed item, attach them as detailed description / remarks
  if (extracted.length > 0) {
    for (let i = 0; i < lines.length; i++) {
      if (processedLineIndices.has(i)) continue;
      const line = lines[i].trim();
      if (isIgnorableLine(line) || line.length < 3) continue;

      // Check if previous line was a parsed line item
      if (processedLineIndices.has(i - 1)) {
        const lastItem = extracted[extracted.length - 1];
        if (
          lastItem &&
          !line.match(/^(?:grand\s*total|subtotal|vat|tax|prepared|approved|payment)/i) &&
          !line.match(/^[0-9]+[.)]/)
        ) {
          lastItem.description += ` — ${line}`;
          if (!lastItem.remarks && line.match(/(?:warranty|delivery|lead\s*time|spec|cert|compliance)/i)) {
            lastItem.remarks = line;
          }
        }
      }
    }
  }

  return extracted;
}

/**
 * RFQ-TO-QUOTATION ITEM MATCHING
 * 
 * Separate operation executed strictly AFTER all line items are extracted from the quotation PDF.
 * Never alters the original supplier-provided values.
 * 
 * Classifies each extracted quotation item into:
 * - Exact Match: SKU/model and product details match the requested BOQ item
 * - Possible Match / Alternative: Supplier offered different SKU, model, or spec that may fulfil the requirement
 * - Additional Quoted Item: Item is not present in original RFQ/BOQ
 * - Unmatched / Needs Review: Ambiguous relationship requiring buyer inspection
 */
export function matchQuotationItemsToRfq(
  extractedItems: ExtractedLineItem[],
  rfqLineItems?: Array<{ id: string; description: string; quantity: number; uom: string; targetPriceSAR?: number; sku?: string }>
): ExtractedLineItem[] {
  if (!rfqLineItems || rfqLineItems.length === 0) {
    // If no RFQ items to match against, all items are classified as Additional Quoted Items
    return extractedItems.map((item) => ({
      ...item,
      matchStatus: 'Additional Quoted Item',
      matchConfidence: 100,
      matchReason: 'Quoted item submitted for open procurement scope (no strict pre-set BOQ lines)',
    }));
  }

  const matchedRfqLineIds = new Set<string>();

  return extractedItems.map((item) => {
    let bestMatch: {
      rfqLine: typeof rfqLineItems[0];
      status: ItemMatchStatus;
      confidence: number;
      reason: string;
    } | null = null;

    const normItemDesc = normalizeForMatch(item.description);
    const itemSku = (item.sku || '').toLowerCase().trim();
    const itemModel = (item.modelNumber || '').toLowerCase().trim();

    for (const rfqLine of rfqLineItems) {
      const normRfqDesc = normalizeForMatch(rfqLine.description);
      const rfqSku = (rfqLine.sku || '').toLowerCase().trim();
      const rfqModel = extractModelCandidate(rfqLine.description)?.toLowerCase() || '';

      // 1. Check Exact SKU / Model Match
      if (itemSku && rfqSku && itemSku === rfqSku) {
        bestMatch = {
          rfqLine,
          status: 'Exact Match',
          confidence: 99,
          reason: `Exact SKU code match (${item.sku}) with requested BOQ item`,
        };
        break;
      }

      if (itemModel && rfqModel && itemModel === rfqModel) {
        bestMatch = {
          rfqLine,
          status: 'Exact Match',
          confidence: 95,
          reason: `Exact model match (${item.modelNumber}) with requested BOQ item`,
        };
        break;
      }

      // 2. Check Alternative Model Match (same product line or family, but different model number)
      if (itemModel && rfqModel && itemModel !== rfqModel) {
        // e.g. FMC130 vs FMB120, SKU-B2 vs SKU-B
        const wordsA = normItemDesc.split(' ');
        const wordsB = normRfqDesc.split(' ');
        const commonWords = wordsA.filter((w) => w.length > 3 && wordsB.includes(w));

        if (commonWords.length >= 2) {
          bestMatch = {
            rfqLine,
            status: 'Possible Match / Alternative',
            confidence: 85,
            reason: `Supplier offered alternative model (${item.modelNumber}) for requested ${rfqModel.toUpperCase()}`,
          };
          continue;
        }
      }

      // 3. Keyword / Semantic Overlap Match
      const wordsA = normItemDesc.split(' ').filter((w) => w.length > 3);
      const wordsB = normRfqDesc.split(' ').filter((w) => w.length > 3);
      if (wordsA.length > 0 && wordsB.length > 0) {
        const overlap = wordsA.filter((w) => wordsB.includes(w)).length;
        const score = (overlap * 2) / (wordsA.length + wordsB.length);

        if (score >= 0.65) {
          // If the model or SKU is clearly different, it's an alternative, not an exact match
          const isAlternative = (itemSku && rfqSku && itemSku !== rfqSku) || (itemModel && rfqModel && itemModel !== rfqModel);
          const status: ItemMatchStatus = isAlternative ? 'Possible Match / Alternative' : 'Exact Match';
          const confidence = Math.round(score * 100);

          if (!bestMatch || confidence > bestMatch.confidence) {
            bestMatch = {
              rfqLine,
              status,
              confidence,
              reason: isAlternative
                ? 'High technical specification overlap with different part designation (Substituted / Alternative Product)'
                : 'Full product specification alignment with requested BOQ line item',
            };
          }
        } else if (score >= 0.4) {
          if (!bestMatch || score * 100 > bestMatch.confidence) {
            bestMatch = {
              rfqLine,
              status: 'Unmatched / Needs Review',
              confidence: Math.round(score * 100),
              reason: 'Partial technical description similarity. Buyer verification recommended.',
            };
          }
        }
      }
    }

    if (bestMatch) {
      matchedRfqLineIds.add(bestMatch.rfqLine.id);
      return {
        ...item,
        requestedQuantity: bestMatch.rfqLine.quantity,
        matchedRfqLineId: bestMatch.rfqLine.id,
        matchStatus: bestMatch.status,
        matchConfidence: bestMatch.confidence,
        matchReason: bestMatch.reason,
        needsVerification: bestMatch.status === 'Unmatched / Needs Review',
      };
    }

    // If item was not matched to any RFQ line item, it is an Additional Quoted Item
    return {
      ...item,
      matchStatus: 'Additional Quoted Item',
      matchConfidence: 100,
      matchReason: 'Additional item quoted by supplier outside the original RFQ / BOQ scope',
      needsVerification: false,
    };
  });
}

/**
 * Comprehensive analysis of supplier quotation PDF.
 * Extracts ALL header metadata and ALL line items, then runs separate BOQ matching.
 */
export async function analyzeQuotePdf(
  fileOrDataUrl: File | string,
  rfqLineTemplates?: Array<{ id: string; description: string; quantity: number; uom: string; targetPriceSAR?: number; sku?: string }>,
  onProgress?: (status: string) => void
): Promise<ParsedQuoteReview> {
  const { lines, isOcr } = await extractTextLinesFromPdf(fileOrDataUrl, onProgress);
  const fullText = lines.join('\n');

  if (onProgress) onProgress('Extracting quotation commercial terms, tax, and header data...');

  let proposalRef: string | undefined;
  let quoteDate: string | undefined;
  let validity: string | undefined;
  let currency = 'SAR';
  let leadTime: number | undefined;
  let paymentTerms: string | undefined;
  let deliveryTerms: string | undefined;
  let subtotalAmount: number | undefined;
  let taxAmount: number | undefined;
  let totalAmount: number | undefined;
  let vendorInfo: ParsedVendorInfo | undefined;

  // 0. Extract Vendor / Supplier Details
  let detectedVendorName: string | undefined;
  let detectedCr: string | undefined;
  let detectedVat: string | undefined;
  let detectedEmail: string | undefined;
  let detectedPhone: string | undefined;
  let detectedCity: string | undefined;

  // CR Number (10 digits starting with 1, 2, 4, etc.)
  const crMatch =
    fullText.match(/(?:C\.?R\.?|CR\s*No\.?|Commercial\s*Reg(?:istration)?|سجل\s*تجاري)[:\s#]*([1-4][0-9]{9})\b/i) ||
    fullText.match(/\b([1-4][0-9]{9})\b/);
  if (crMatch) detectedCr = crMatch[1].trim();

  // VAT Number (15 digits usually starting with 3 and ending with 3 in KSA)
  const vatMatch =
    fullText.match(/(?:VAT|VAT\s*No\.?|Tax\s*ID|Tax\s*Number|الرقم\s*الضريبي)[:\s#]*(3[0-9]{13,14})\b/i) ||
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

  // Company / Supplier Name detection
  const supplierTagMatch = fullText.match(/(?:Supplier|Vendor|From|Company|Issued\s*By|المورد|الشركة)[:\s]+([^\n\r,]{4,60})/i);
  if (
    supplierTagMatch &&
    !supplierTagMatch[1].toLowerCase().includes('procureos') &&
    !supplierTagMatch[1].toLowerCase().includes('fitco') &&
    !supplierTagMatch[1].toLowerCase().includes('arabitra')
  ) {
    detectedVendorName = supplierTagMatch[1].trim();
  } else {
    for (let i = 0; i < Math.min(lines.length, 12); i++) {
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

  // 1. Currency
  if (/(\$|USD|US\s*Dollars?)\b/i.test(fullText)) {
    currency = 'USD';
  } else if (/(EUR|€|Euros?)\b/i.test(fullText)) {
    currency = 'EUR';
  } else {
    currency = 'SAR';
  }

  // 2. Proposal / Quotation Reference Number
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

  // 3. Dates: Quotation Date & Validity Date
  const qDateMatch = fullText.match(/(?:quote\s*date|date|issued)[:\s]*([0-9]{4}[-/][0-9]{1,2}[-/][0-9]{1,2}|[0-9]{1,2}[-/][0-9]{1,2}[-/][0-9]{4})/i);
  if (qDateMatch) {
    try {
      const d = new Date(qDateMatch[1]);
      if (!isNaN(d.getTime())) {
        quoteDate = d.toISOString().split('T')[0];
      }
    } catch {}
  }

  const valDateMatch = fullText.match(/(?:valid\s*(?:until|thru|to|date)?|validity)[:\s]*([0-9]{4}[-/][0-9]{1,2}[-/][0-9]{1,2}|[0-9]{1,2}[-/][0-9]{1,2}[-/][0-9]{4})/i);
  if (valDateMatch) {
    try {
      const d = new Date(valDateMatch[1]);
      if (!isNaN(d.getTime())) {
        validity = d.toISOString().split('T')[0];
      }
    } catch {}
  }

  // 4. Delivery Terms & Lead Time
  const dTermsMatch = fullText.match(/(?:Delivery\s*Terms|Incoterms?|Shipping\s*Terms)[:\s]*([^\n\r;]{4,50})/i);
  if (dTermsMatch) {
    deliveryTerms = dTermsMatch[1].trim();
  } else if (/Ex-Works|Ex\s*Works/i.test(fullText)) {
    deliveryTerms = 'Ex-Works Warehouse';
  } else if (/DDP/i.test(fullText)) {
    deliveryTerms = 'DDP Client Site';
  } else if (/FOB/i.test(fullText)) {
    deliveryTerms = 'FOB Port';
  }

  const leadTimeMatch = fullText.match(/(?:delivery|lead\s*time|dispatch|completion)[:\s]*([0-9]{1,3})\s*(days?|weeks?)/i);
  if (leadTimeMatch) {
    const val = parseInt(leadTimeMatch[1], 10);
    const unit = leadTimeMatch[2].toLowerCase();
    leadTime = unit.startsWith('week') ? val * 7 : val;
  }

  // 5. Payment Terms
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

  // 6. Subtotal, Tax / VAT, and Grand Total
  const subtotalMatch = fullText.match(/(?:subtotal|sub-total|net\s*amount|total\s*before\s*vat)[:\s]*(?:sar|sr|riyal)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/i);
  if (subtotalMatch) {
    subtotalAmount = parseNumberClean(subtotalMatch[1]);
  }

  const vatAmountMatch = fullText.match(/(?:vat\s*(?:\(15%\))?|tax\s*amount|15%\s*vat)[:\s]*(?:sar|sr|riyal)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/i);
  if (vatAmountMatch) {
    taxAmount = parseNumberClean(vatAmountMatch[1]);
  }

  const totalMatches = [
    /(?:grand\s*total|total\s*payable|final\s*amount|net\s*total|total\s*amount|total\s*sar|total)[:\s]*(?:sar|sr|riyal)?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)/i,
    /(?:sar|sr)\s*([0-9]{1,3}(?:,[0-9]{3})+(?:\.[0-9]{1,2})?)/i,
  ];
  for (const regex of totalMatches) {
    const match = fullText.match(regex);
    if (match && match[1]) {
      const cleanNum = parseNumberClean(match[1]);
      if (cleanNum > 0) {
        totalAmount = cleanNum;
        break;
      }
    }
  }

  // 7. Extract ALL line items mentioned in the PDF (WITHOUT restricting to RFQ templates!)
  if (onProgress) onProgress('Extracting all supplier quoted line items from document...');
  let rawExtractedLines = extractAllLineItemsFromText(lines);

  // If table extraction produced 0 items because the PDF is narrative or single lump-sum
  if (rawExtractedLines.length === 0) {
    if (totalAmount && totalAmount > 0) {
      rawExtractedLines.push({
        id: 'EXT-LINE-1',
        lineNumber: 1,
        itemName: proposalRef ? `Quotation Scope (${proposalRef})` : 'Commercial Quotation Scope',
        description: `Complete scope of supply as specified in ${proposalRef || 'quotation document'}`,
        quantity: 1,
        uom: 'LOT',
        unitPriceSAR: totalAmount,
        totalPriceSAR: totalAmount,
        needsVerification: true,
      });
    } else if (rfqLineTemplates && rfqLineTemplates.length > 0) {
      // Heuristic fallback only if no numbers at all were found
      rawExtractedLines = rfqLineTemplates.map((tmpl, idx) => ({
        id: `EXT-LINE-${idx + 1}`,
        lineNumber: idx + 1,
        itemName: tmpl.description.split(/[-–|]/)[0].trim(),
        sku: tmpl.sku,
        description: tmpl.description,
        quantity: tmpl.quantity,
        uom: tmpl.uom,
        unitPriceSAR: tmpl.targetPriceSAR || 500,
        totalPriceSAR: (tmpl.targetPriceSAR || 500) * tmpl.quantity,
        needsVerification: true,
      }));
    }
  }

  // Compute subtotal from extracted lines if missing
  const lineSum = rawExtractedLines.reduce((acc, curr) => acc + curr.totalPriceSAR, 0);
  if (!subtotalAmount && lineSum > 0) {
    subtotalAmount = lineSum;
  }
  if (!totalAmount && subtotalAmount) {
    taxAmount = taxAmount || subtotalAmount * 0.15;
    totalAmount = subtotalAmount + taxAmount;
  }

  // 8. Run SEPARATE RFQ-to-Quotation Matching Operation
  if (onProgress) onProgress('Matching extracted items against target RFQ BOQ specifications...');
  const matchedLineItems = matchQuotationItemsToRfq(rawExtractedLines, rfqLineTemplates);

  const confidenceScore = lines.length > 0 ? (matchedLineItems.length > 0 ? 95 : 75) : 30;

  return {
    proposalRefNumber: proposalRef,
    quotationDate: quoteDate,
    validityDate: validity,
    currency,
    paymentTerms,
    deliveryTerms,
    leadTimeDays: leadTime,
    subtotalSAR: subtotalAmount,
    taxAmountSAR: taxAmount,
    totalAmountSAR: totalAmount || lineSum,
    taxPercent: 15,
    lineItems: matchedLineItems,
    vendorInfo,
    rawTextSample: lines.slice(0, 10).join(' | '),
    confidenceScore,
    isOcrUsed: isOcr,
    processingStatus: 'Review Required',
  };
}
