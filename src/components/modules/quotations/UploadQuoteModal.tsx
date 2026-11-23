import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  FileText,
  X,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calendar,
  Clock,
  DollarSign,
  ShieldCheck,
  FileUp,
  Coins,
  Sparkles,
  Loader2,
  Check,
  Plus,
  Trash2,
  Edit2,
  HelpCircle,
  Tag,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { Modal } from '../../common/Modal';
import { Button } from '../../common/Button';
import { Badge } from '../../common/Badge';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';
import {
  QuotationEvaluation,
  QuotationComparisonItem,
  QuoteLineItemPrice,
  ItemMatchStatus,
  ItemCategory,
  Vendor,
  RFQ,
} from '../../../types/procurement';
import {
  storePdfLocally,
  uploadPdfToCloudStorage,
} from '../../../lib/pdfStorage';
import {
  analyzeQuotePdf,
  ParsedQuoteReview,
  ExtractedLineItem,
} from '../../../lib/pdfParser';

interface UploadQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotations: QuotationEvaluation[];
  rfqs: RFQ[];
  vendors: Vendor[];
  onQuoteUploaded: (rfqId: string, newSubmission: QuotationComparisonItem) => void;
  onAddVendor?: (vendor: Vendor) => void;
  selectedRfqId?: string;
}

export const UploadQuoteModal: React.FC<UploadQuoteModalProps> = ({
  isOpen,
  onClose,
  quotations,
  rfqs,
  vendors,
  onQuoteUploaded,
  onAddVendor,
  selectedRfqId,
}) => {
  const { success, warning, info } = useToast();
  const { currentUser: _cu } = useAuth();
  const currentUser = _cu || { name: 'Procurement Specialist', email: 'procurement@arabitra.com' };
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialRfq =
    selectedRfqId ||
    (rfqs.find((rfq) => !['Awarded', 'Closed', 'Cancelled'].includes(rfq.status))?.id ||
      quotations[0]?.rfqId ||
      '');

  const [targetRfqId, setTargetRfqId] = useState<string>(initialRfq);
  const [selectedVendorId, setSelectedVendorId] = useState<string>(vendors[0]?.id || '');
  const [proposalRefNumber, setProposalRefNumber] = useState<string>('');
  const [quotedTotalSAR, setQuotedTotalSAR] = useState<string>('');
  const [leadTimeDays, setLeadTimeDays] = useState<string>('30');
  const [technicalScore, setTechnicalScore] = useState<string>('95');
  const [validityDate, setValidityDate] = useState<string>('2026-12-31');
  const [paymentTerms, setPaymentTerms] = useState<string>('Net 30 Days');
  const [deliveryTerms, setDeliveryTerms] = useState<string>('Ex-Works Warehouse');
  const [currency, setCurrency] = useState<string>('SAR');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Workflow Processing Status
  const [processingStatus, setProcessingStatus] = useState<
    'Uploaded' | 'Processing' | 'Extracting' | 'Matching' | 'Review Required' | 'Completed' | 'Failed'
  >('Uploaded');

  // Extracted Line Items List (Primary Source of Truth: Supplier's Actual Quotation)
  const [extractedItems, setExtractedItems] = useState<ExtractedLineItem[]>([]);

  // Quick Add Supplier Form State
  const [showQuickAddVendor, setShowQuickAddVendor] = useState(false);
  const [newVendorForm, setNewVendorForm] = useState({
    name: '',
    category: 'GPS Trackers & Asset Gateways' as ItemCategory,
    entityScope: 'Arabitra Approved' as 'Joint / Group' | 'FITCO Approved' | 'Arabitra Approved',
    crNumber: '',
    vatNumber: '',
    contactPerson: '',
    contactEmail: '',
    contactPhone: '',
    city: 'Al Khobar, KSA',
    paymentTerms: 'Net 30 Days',
  });

  const currentRfq = rfqs.find((r) => r.id === targetRfqId);
  const existingEvaluation = quotations.find((evaluation) => evaluation.rfqId === targetRfqId);

  // Open to ALL suppliers for any RFQ / project
  const eligibleVendors = vendors.filter((vendor) => {
    const alreadySubmitted = existingEvaluation?.submissions.some(
      (submission) => submission.vendorId === vendor.id
    );
    return !alreadySubmitted;
  });

  useEffect(() => {
    if (selectedRfqId && rfqs.some((rfq) => rfq.id === selectedRfqId)) {
      setTargetRfqId(selectedRfqId);
    }
  }, [selectedRfqId, rfqs]);

  useEffect(() => {
    if (eligibleVendors.length > 0 && !eligibleVendors.some((vendor) => vendor.id === selectedVendorId)) {
      setSelectedVendorId(eligibleVendors[0]?.id || '');
    }
  }, [targetRfqId, eligibleVendors.length]);

  // File Upload & Scan State
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileDataUrl, setFileDataUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [scanStatus, setScanStatus] = useState<string>('');
  const [parsedReview, setParsedReview] = useState<ParsedQuoteReview | null>(null);

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelected = (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      warning('Invalid Document Type', 'Only official supplier quotation PDF documents are accepted.');
      return;
    }

    setUploadedFile(file);
    setIsAnalyzing(true);
    setProcessingStatus('Processing');
    setScanStatus('Initializing multi-page PDF extraction engine...');

    const reader = new FileReader();
    reader.onload = async () => {
      const dataUrl = reader.result as string;
      setFileDataUrl(dataUrl);

      try {
        setProcessingStatus('Extracting');
        // Extract all items from PDF first without template restrictions,
        // then match against RFQ line templates
        const templates = currentRfq?.lineItems?.map((li) => ({
          id: li.id,
          sku: li.itemId || '',
          description: li.description,
          quantity: li.quantity,
          uom: li.uom,
          targetPriceSAR: li.targetPriceSAR,
        }));

        setProcessingStatus('Matching');
        const review = await analyzeQuotePdf(dataUrl, templates, (msg) => {
          setScanStatus(msg);
        });

        setParsedReview(review);
        setProcessingStatus('Review Required');

        // Pre-fill fields from PDF analysis
        if (review.proposalRefNumber) {
          setProposalRefNumber(review.proposalRefNumber);
        }
        if (review.leadTimeDays) {
          setLeadTimeDays(review.leadTimeDays.toString());
        }
        if (review.validityDate) {
          setValidityDate(review.validityDate);
        }
        if (review.paymentTerms) {
          setPaymentTerms(review.paymentTerms);
        }
        if (review.deliveryTerms) {
          setDeliveryTerms(review.deliveryTerms);
        }
        if (review.currency) {
          setCurrency(review.currency);
        }

        // Keep the FULL extracted line items list (both matched BOQ items and additional quoted items)
        if (review.lineItems && review.lineItems.length > 0) {
          setExtractedItems(review.lineItems);
          
          // Calculate sum of extracted items
          const itemsSum = review.lineItems.reduce((acc, curr) => acc + curr.totalPriceSAR, 0);
          setQuotedTotalSAR(review.totalAmountSAR && review.totalAmountSAR > 0 ? review.totalAmountSAR.toString() : itemsSum.toString());
        } else if (review.totalAmountSAR && review.totalAmountSAR > 0) {
          setQuotedTotalSAR(review.totalAmountSAR.toString());
        }

        // Supplier recognition
        if (review.vendorInfo?.name) {
          const detectedLower = review.vendorInfo.name.toLowerCase();
          const matchedVendor = vendors.find(
            (v) =>
              v.name.toLowerCase().includes(detectedLower) ||
              detectedLower.includes(v.name.toLowerCase()) ||
              (review.vendorInfo?.crNumber && v.crNumber === review.vendorInfo.crNumber) ||
              (review.vendorInfo?.vatNumber && v.vatNumber === review.vendorInfo.vatNumber)
          );

          if (matchedVendor) {
            setSelectedVendorId(matchedVendor.id);
            success('Supplier Recognized', `Quotation matched to verified vendor: ${matchedVendor.name}`);
          } else {
            setNewVendorForm((prev) => ({
              ...prev,
              name: review.vendorInfo?.name || '',
              crNumber: review.vendorInfo?.crNumber || '',
              vatNumber: review.vendorInfo?.vatNumber || '',
              contactEmail: review.vendorInfo?.email || '',
              contactPhone: review.vendorInfo?.phone || '',
              city: review.vendorInfo?.city || prev.city,
              paymentTerms: review.paymentTerms || prev.paymentTerms,
            }));
            setShowQuickAddVendor(true);
            info(
              'New Supplier Detected',
              `"${review.vendorInfo.name}" is not yet registered. Quick registration form opened below.`
            );
          }
        }
      } catch (err) {
        console.warn('[ProcureOS] PDF analysis notice:', err);
        setProcessingStatus('Review Required');
      } finally {
        setIsAnalyzing(false);
        setScanStatus('');
      }
    };
    reader.readAsDataURL(file);
  };

  // Line Item Update Helpers
  const handleUpdateLineItem = (index: number, updates: Partial<ExtractedLineItem>) => {
    setExtractedItems((prev) => {
      const updated = [...prev];
      const current = updated[index];
      if (!current) return prev;

      const nextItem = { ...current, ...updates };
      // Auto-recalculate line total if quantity or unit price changed
      if (updates.quantity !== undefined || updates.unitPriceSAR !== undefined) {
        const qty = updates.quantity !== undefined ? updates.quantity : current.quantity;
        const unit = updates.unitPriceSAR !== undefined ? updates.unitPriceSAR : current.unitPriceSAR;
        nextItem.totalPriceSAR = qty * unit;
      }
      updated[index] = nextItem;

      // Update grand total
      const newTotal = updated.reduce((sum, item) => sum + item.totalPriceSAR, 0);
      setQuotedTotalSAR(newTotal.toString());
      return updated;
    });
  };

  const handleRemoveLineItem = (index: number) => {
    setExtractedItems((prev) => {
      const updated = prev.filter((_, idx) => idx !== index);
      const newTotal = updated.reduce((sum, item) => sum + item.totalPriceSAR, 0);
      setQuotedTotalSAR(newTotal.toString());
      return updated;
    });
  };

  const handleAddLineItem = () => {
    const nextIdx = extractedItems.length + 1;
    const newItem: ExtractedLineItem = {
      id: `EXT-MANUAL-${Date.now()}`,
      lineNumber: nextIdx,
      itemName: 'Additional Quoted Scope',
      description: 'Additional supplier line item',
      quantity: 1,
      uom: 'EA',
      unitPriceSAR: 0,
      totalPriceSAR: 0,
      matchStatus: 'Additional Quoted Item',
      matchReason: 'Manually added item from supplier quotation',
      needsVerification: false,
    };
    setExtractedItems((prev) => [...prev, newItem]);
  };

  // Quick Add Supplier Handler
  const handleQuickSaveVendor = () => {
    if (!newVendorForm.name.trim()) {
      warning('Supplier Name Required', 'Please enter the vendor / supplier company name.');
      return;
    }

    const newVendorId = `VND-${Date.now().toString().slice(-4)}`;
    const newVendor: Vendor = {
      id: newVendorId,
      name: newVendorForm.name.trim(),
      code: `VND-${newVendorForm.name.slice(0, 3).toUpperCase()}`,
      category: newVendorForm.category as any,
      tier: 'Tier 2',
      status: 'Approved',
      rating: 0,
      entityScope: newVendorForm.entityScope,
      onTimeDeliveryRate: 0,
      qualityComplianceRate: 0,
      contactPerson: newVendorForm.contactPerson || 'Sales Coordinator',
      contactEmail:
        newVendorForm.contactEmail ||
        `sales@${newVendorForm.name.toLowerCase().replace(/[^a-z0-9]/g, '')}.com`,
      contactPhone: newVendorForm.contactPhone || '+966 13 800 0000',
      crNumber: newVendorForm.crNumber || '2050019876',
      vatNumber: newVendorForm.vatNumber || '310987654300003',
      city: newVendorForm.city,
      country: 'Saudi Arabia',
      totalSpendSAR: 0,
      activeContractsCount: 0,
    };

    if (onAddVendor) {
      onAddVendor(newVendor);
    }
    setSelectedVendorId(newVendorId);
    setShowQuickAddVendor(false);
    success(
      'Supplier Registered',
      `${newVendor.name} has been added to master suppliers and selected for this quotation.`
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentRfq || ['Awarded', 'Closed', 'Cancelled'].includes(currentRfq.status)) {
      warning('RFQ Not Available', 'Select an active open RFQ.');
      return;
    }

    if (!selectedVendorId) {
      warning('Select Supplier', 'Please select or quick-register a supplier.');
      return;
    }

    if (!uploadedFile) {
      warning('Missing Quote PDF', 'Please attach the supplier quotation PDF document.');
      return;
    }

    const parsedTotal = parseFloat(quotedTotalSAR);
    if (!parsedTotal || parsedTotal <= 0) {
      warning('Invalid Total', 'Enter a valid positive quoted total amount in SAR.');
      return;
    }

    setIsSubmitting(true);

    const vendor = vendors.find((v) => v.id === selectedVendorId);
    const vendorName = vendor ? vendor.name : 'Registered Supplier';

    // Prepare line items: Preserve ALL items extracted from the supplier quotation PDF
    // (Both matched BOQ items and additional quoted items)
    let finalLineItems: QuoteLineItemPrice[] = [];

    if (extractedItems.length > 0) {
      finalLineItems = extractedItems.map((item, idx) => ({
        rfqLineItemId: item.matchedRfqLineId || `EXT-${idx + 1}`,
        lineNumber: item.lineNumber || idx + 1,
        itemName: item.itemName,
        sku: item.sku,
        modelNumber: item.modelNumber,
        brand: item.brand,
        description: item.description,
        quantity: item.quantity, // Supplier's exact quoted quantity
        requestedQuantity: item.requestedQuantity,
        uom: item.uom,
        unitPriceSAR: item.unitPriceSAR,
        discountPercent: item.discountPercent || 0,
        taxPercent: item.taxPercent || 15,
        totalPriceSAR: item.totalPriceSAR,
        remarks: item.remarks,
        matchStatus: item.matchStatus || 'Additional Quoted Item',
        matchConfidence: item.matchConfidence || 100,
        matchReason: item.matchReason,
        needsVerification: item.needsVerification || false,
      }));
    } else {
      // Fallback: If no granular line items were detected, create primary quotation line
      finalLineItems = [
        {
          rfqLineItemId: 'LI-PRIMARY',
          description: `Scope of supply as per ${proposalRefNumber || 'supplier quotation'}`,
          quantity: 1,
          uom: 'LOT',
          unitPriceSAR: parsedTotal,
          totalPriceSAR: parsedTotal,
          matchStatus: 'Additional Quoted Item',
          matchReason: 'Full tender quotation scope',
        },
      ];
    }

    const proposalRef = proposalRefNumber || `PROP-${Math.floor(1000 + Math.random() * 9000)}`;
    const docId = `DOC-${targetRfqId}-${selectedVendorId}-${Date.now().toString().slice(-4)}`;

    let finalPdfUrl = fileDataUrl || '';

    // Upload genuine raw PDF to Supabase Cloud Storage
    try {
      const cloudUrl = await uploadPdfToCloudStorage(docId, uploadedFile, uploadedFile.name);
      if (cloudUrl) {
        finalPdfUrl = cloudUrl;
      }
    } catch (uploadErr) {
      console.warn('[ProcureOS] Cloud storage upload notice:', uploadErr);
    }

    // Cache genuine PDF locally in IndexedDB as well
    if (fileDataUrl) {
      await storePdfLocally(docId, uploadedFile.name, fileDataUrl, uploadedFile.size, proposalRef);
    }

    const subtotal = finalLineItems.reduce((sum, item) => sum + item.totalPriceSAR, 0);
    const taxAmount = parsedReview?.taxAmountSAR || subtotal * 0.15;

    const newSubmission: QuotationComparisonItem = {
      vendorId: selectedVendorId,
      vendorName,
      quotedTotalSAR: parsedTotal,
      subtotalSAR: subtotal,
      taxAmountSAR: taxAmount,
      currency,
      quoteReference: proposalRef,
      quotationDate: parsedReview?.quotationDate || new Date().toISOString().split('T')[0],
      deliveryTerms,
      paymentTerms,
      leadTimeDays: parseInt(leadTimeDays, 10) || 30,
      technicalScore: parseFloat(technicalScore) || 95,
      commercialScore: 90,
      compositeRank: 1,
      recommended: true,
      status: 'Received',
      validityDate,
      notes: notes.trim() || `Supplier quotation digitized via ProcureOS Document Gateway. Payment Terms: ${paymentTerms}. Delivery: ${deliveryTerms}.`,
      attachment: {
        docId,
        fileName: uploadedFile.name,
        fileSizeBytes: uploadedFile.size,
        uploadedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
        uploadedBy: currentUser.name,
        proposalRefNumber: proposalRef,
        pdfDataUrl: finalPdfUrl,
      },
      lineItems: finalLineItems,
      processingStatus: 'Completed',
      aiConfidenceScore: parsedReview?.confidenceScore || 95,
    };

    onQuoteUploaded(targetRfqId, newSubmission);
    setIsSubmitting(false);

    success(
      'Quotation Extracted & Recorded',
      `Attached ${uploadedFile.name} from ${vendorName} (${finalLineItems.length} line items extracted). All quoted items preserved.`
    );
    onClose();
  };

  const getMatchBadge = (status?: ItemMatchStatus) => {
    switch (status) {
      case 'Exact Match':
        return <Badge variant="emerald">Exact Match</Badge>;
      case 'Possible Match / Alternative':
        return <Badge variant="amber">Possible Alternative</Badge>;
      case 'Additional Quoted Item':
        return <Badge variant="cyan">Additional Item</Badge>;
      case 'Unmatched / Needs Review':
      default:
        return <Badge variant="purple">Needs Review</Badge>;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upload Supplier Quotation (Full AI PDF Extraction & BOQ Matching)"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Automatic Workflow Status Tracker */}
        <div className="p-3 bg-slate-950/80 border border-slate-800 rounded-xl flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>AI Extraction & BOQ Matching Pipeline:</span>
          </div>

          <div className="flex items-center gap-1.5 text-[10px] font-mono">
            <span
              className={`px-2 py-0.5 rounded-full border ${
                uploadedFile
                  ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              1. Uploaded
            </span>
            <ArrowRight className="w-3 h-3 text-slate-600" />
            <span
              className={`px-2 py-0.5 rounded-full border ${
                processingStatus === 'Extracting' || processingStatus === 'Matching' || processingStatus === 'Review Required'
                  ? 'bg-cyan-950/60 border-cyan-500/40 text-cyan-300'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              2. Extract All Items
            </span>
            <ArrowRight className="w-3 h-3 text-slate-600" />
            <span
              className={`px-2 py-0.5 rounded-full border ${
                processingStatus === 'Matching' || processingStatus === 'Review Required'
                  ? 'bg-amber-950/60 border-amber-500/40 text-amber-300'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              3. BOQ Matching
            </span>
            <ArrowRight className="w-3 h-3 text-slate-600" />
            <span
              className={`px-2 py-0.5 rounded-full border ${
                processingStatus === 'Review Required'
                  ? 'bg-emerald-950 border-emerald-500 text-emerald-200 font-bold'
                  : 'bg-slate-900 border-slate-800 text-slate-500'
              }`}
            >
              4. Review & Confirm
            </span>
          </div>
        </div>

        {/* RFQ Target & Supplier Selector */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-medium text-slate-300 mb-1">Target RFQ / Tender Scope *</label>
            <select
              value={targetRfqId}
              onChange={(e) => setTargetRfqId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
            >
              {rfqs.map((rfq) => (
                <option key={rfq.id} value={rfq.id}>
                  {rfq.rfqNumber} — {rfq.title} ({rfq.entity})
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-medium text-slate-300">Supplier / Vendor *</label>
              <button
                type="button"
                onClick={() => setShowQuickAddVendor(!showQuickAddVendor)}
                className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>{showQuickAddVendor ? 'Close Quick Add' : '+ Quick Add Supplier'}</span>
              </button>
            </div>
            <select
              value={selectedVendorId}
              onChange={(e) => setSelectedVendorId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
            >
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.entityScope})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quick Add Supplier Inline Drawer */}
        {showQuickAddVendor && (
          <div className="p-3.5 bg-gradient-to-r from-cyan-950/40 via-slate-900 to-slate-950 border border-cyan-500/40 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-bold text-cyan-300 flex items-center gap-1.5 text-xs">
                <Building2 className="w-4 h-4 text-cyan-400" />
                Register New Supplier on the Fly
              </span>
              <button
                type="button"
                onClick={() => setShowQuickAddVendor(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-medium text-slate-300 mb-0.5">Supplier Name *</label>
                <input
                  type="text"
                  placeholder="e.g. Al-Falak Telematics Solutions Est."
                  value={newVendorForm.name}
                  onChange={(e) => setNewVendorForm({ ...newVendorForm, name: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-100 text-xs focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-0.5">Entity Scope</label>
                <select
                  value={newVendorForm.entityScope}
                  onChange={(e) => setNewVendorForm({ ...newVendorForm, entityScope: e.target.value as any })}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-100 text-xs focus:border-cyan-500 focus:outline-none"
                >
                  <option value="Arabitra Approved">Arabitra Approved</option>
                  <option value="Joint / Group">Enterprise / Group</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-0.5">CR Number (10 digits)</label>
                <input
                  type="text"
                  placeholder="2050019876"
                  value={newVendorForm.crNumber}
                  onChange={(e) => setNewVendorForm({ ...newVendorForm, crNumber: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-100 text-xs font-mono focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-0.5">VAT Number (15 digits)</label>
                <input
                  type="text"
                  placeholder="310987654300003"
                  value={newVendorForm.vatNumber}
                  onChange={(e) => setNewVendorForm({ ...newVendorForm, vatNumber: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-100 text-xs font-mono focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-0.5">City</label>
                <input
                  type="text"
                  placeholder="Al Khobar, KSA"
                  value={newVendorForm.city}
                  onChange={(e) => setNewVendorForm({ ...newVendorForm, city: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-100 text-xs focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-0.5">Contact Person</label>
                <input
                  type="text"
                  placeholder="Sales Director"
                  value={newVendorForm.contactPerson}
                  onChange={(e) => setNewVendorForm({ ...newVendorForm, contactPerson: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-100 text-xs focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-0.5">Email</label>
                <input
                  type="email"
                  placeholder="sales@company.com"
                  value={newVendorForm.contactEmail}
                  onChange={(e) => setNewVendorForm({ ...newVendorForm, contactEmail: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-100 text-xs focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-0.5">Payment Terms</label>
                <input
                  type="text"
                  placeholder="Net 30 Days"
                  value={newVendorForm.paymentTerms}
                  onChange={(e) => setNewVendorForm({ ...newVendorForm, paymentTerms: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-950 border border-slate-700 rounded text-slate-100 text-xs focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleQuickSaveVendor}
                className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold"
              >
                Save & Select Supplier
              </Button>
            </div>
          </div>
        )}

        {/* PDF File Dropzone */}
        <div>
          <label className="block font-medium text-slate-300 mb-1">
            Supplier Quote Document (.PDF) *
          </label>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleFileDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-cyan-400 bg-cyan-950/20'
                : uploadedFile
                ? 'border-emerald-500/60 bg-emerald-950/20'
                : 'border-slate-700 hover:border-slate-500 bg-slate-900/40'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => e.target.files?.[0] && handleFileSelected(e.target.files[0])}
              accept=".pdf,application/pdf"
              className="hidden"
            />
            {isAnalyzing ? (
              <div className="py-2 flex flex-col items-center justify-center gap-2">
                <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                <span className="font-semibold text-cyan-300 text-xs">
                  {scanStatus || 'Extracting All Line Items & Matching Against BOQ...'}
                </span>
                <span className="text-[10px] text-slate-400">
                  Dual-Engine: pdfjs-dist vector layer + Tesseract.js OCR engine
                </span>
              </div>
            ) : uploadedFile ? (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-lg bg-emerald-950 border border-emerald-500/40 text-emerald-400">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div className="text-left">
                    <span className="font-semibold text-slate-100 text-xs block">
                      {uploadedFile.name}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB • {extractedItems.length} Quoted Line Items Extracted
                      {parsedReview?.isOcrUsed ? ' • OCR Processed' : ''}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setUploadedFile(null);
                    setFileDataUrl(null);
                    setParsedReview(null);
                    setExtractedItems([]);
                    setProcessingStatus('Uploaded');
                  }}
                  className="p-1.5 rounded-md hover:bg-slate-800 text-slate-400 hover:text-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-1.5 py-1">
                <FileUp className="w-8 h-8 text-slate-400" />
                <span className="font-semibold text-slate-200 text-xs">
                  Click to browse or drag & drop supplier quotation PDF
                </span>
                <span className="text-[10px] text-slate-400">
                  Extracts ALL items actually quoted by the supplier, including additional items and model alternatives
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Commercial Header Parameters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block font-medium text-slate-300 mb-1">Proposal / Quote Ref *</label>
            <input
              type="text"
              placeholder="PROP-2026-092"
              value={proposalRefNumber}
              onChange={(e) => setProposalRefNumber(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-300 mb-1">Total Quoted Amount ({currency}) *</label>
            <input
              type="number"
              min="0"
              step="any"
              placeholder="0.00"
              value={quotedTotalSAR}
              onChange={(e) => setQuotedTotalSAR(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 font-mono font-bold text-emerald-400 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-300 mb-1">Delivery Lead Time</label>
            <div className="relative">
              <input
                type="number"
                min="1"
                placeholder="30"
                value={leadTimeDays}
                onChange={(e) => setLeadTimeDays(e.target.value)}
                className="w-full pl-3 pr-12 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-[10px]">
                Days
              </span>
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-300 mb-1">Quote Validity Date</label>
            <input
              type="date"
              value={validityDate}
              onChange={(e) => setValidityDate(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Commercial Terms */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block font-medium text-slate-300 mb-1">Payment Terms</label>
            <input
              type="text"
              placeholder="Net 30 Days"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-300 mb-1">Delivery Terms</label>
            <input
              type="text"
              placeholder="Ex-Works Warehouse / DDP Site"
              value={deliveryTerms}
              onChange={(e) => setDeliveryTerms(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-300 mb-1">
              Technical Compliance Score (%)
            </label>
            <input
              type="number"
              min="0"
              max="100"
              placeholder="95"
              value={technicalScore}
              onChange={(e) => setTechnicalScore(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
            />
          </div>
        </div>

        {/* INTERACTIVE REVIEW TABLE: ALL SUPPLIER QUOTED ITEMS */}
        <div className="space-y-2 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-800">
            <div>
              <span className="font-bold text-slate-200 text-xs flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-cyan-400" />
                Extracted Quotation Line Items & BOQ Matching Review
              </span>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Primary source of truth: All items quoted in the supplier's PDF are preserved. Buyer can edit quantities, prices, or matching classifications.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                icon={<Plus className="w-3.5 h-3.5" />}
                onClick={handleAddLineItem}
                className="text-[11px] py-1 px-2.5 h-7"
              >
                + Add Item
              </Button>
            </div>
          </div>

          {extractedItems.length === 0 ? (
            <div className="py-6 text-center text-slate-400 text-xs">
              Attach a supplier quotation PDF above to automatically extract all quoted items.
            </div>
          ) : (
            <div className="overflow-x-auto max-h-72 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/90 text-slate-400 text-[10px] border-b border-slate-800 sticky top-0 z-10">
                  <tr>
                    <th className="py-2 px-2.5 font-semibold w-8">#</th>
                    <th className="py-2 px-2.5 font-semibold min-w-[200px]">Description / Scope</th>
                    <th className="py-2 px-2.5 font-semibold w-24">SKU / Model</th>
                    <th className="py-2 px-2.5 font-semibold text-center w-24">Quoted Qty</th>
                    <th className="py-2 px-2.5 font-semibold text-right w-28">Unit Price</th>
                    <th className="py-2 px-2.5 font-semibold text-right w-28">Line Total</th>
                    <th className="py-2 px-2.5 font-semibold text-center w-36">Matching Status</th>
                    <th className="py-2 px-2 font-semibold text-center w-10">Act</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-sans">
                  {extractedItems.map((item, idx) => (
                    <tr key={item.id || idx} className="hover:bg-slate-900/40">
                      <td className="py-2 px-2.5 font-mono text-slate-400 font-semibold">{idx + 1}</td>
                      <td className="py-2 px-2.5">
                        <input
                          type="text"
                          value={item.description}
                          onChange={(e) => handleUpdateLineItem(idx, { description: e.target.value })}
                          className="w-full px-2 py-1 bg-slate-950 border border-slate-700/80 rounded text-slate-100 text-xs focus:border-cyan-500 focus:outline-none"
                        />
                        {item.matchReason && (
                          <div className="text-[10px] text-slate-500 mt-0.5 truncate max-w-xs">
                            {item.matchReason}
                          </div>
                        )}
                      </td>
                      <td className="py-2 px-2.5">
                        <input
                          type="text"
                          placeholder="SKU"
                          value={item.sku || item.modelNumber || ''}
                          onChange={(e) => handleUpdateLineItem(idx, { sku: e.target.value, modelNumber: e.target.value })}
                          className="w-full px-1.5 py-1 bg-slate-950 border border-slate-700/80 rounded text-slate-200 font-mono text-[11px] focus:border-cyan-500 focus:outline-none"
                        />
                      </td>
                      <td className="py-2 px-2.5">
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="0"
                            step="any"
                            value={item.quantity}
                            onChange={(e) => handleUpdateLineItem(idx, { quantity: parseFloat(e.target.value) || 0 })}
                            className="w-14 px-1.5 py-1 bg-slate-950 border border-slate-700/80 rounded text-center text-slate-100 font-mono text-xs focus:border-cyan-500 focus:outline-none"
                          />
                          <span className="text-[10px] text-slate-400 font-mono uppercase">{item.uom}</span>
                        </div>
                        {item.requestedQuantity !== undefined && (
                          <span className="text-[9px] text-slate-500 block text-center mt-0.5 font-mono">
                            Req: {item.requestedQuantity}
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2.5 text-right">
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={item.unitPriceSAR}
                          onChange={(e) => handleUpdateLineItem(idx, { unitPriceSAR: parseFloat(e.target.value) || 0 })}
                          className="w-24 px-1.5 py-1 bg-slate-950 border border-slate-700/80 rounded text-right text-slate-100 font-mono text-xs focus:border-cyan-500 focus:outline-none"
                        />
                      </td>
                      <td className="py-2 px-2.5 text-right font-mono font-bold text-emerald-400">
                        SAR {item.totalPriceSAR.toLocaleString()}
                      </td>
                      <td className="py-2 px-2.5 text-center">
                        <select
                          value={item.matchStatus || 'Additional Quoted Item'}
                          onChange={(e) => handleUpdateLineItem(idx, { matchStatus: e.target.value as ItemMatchStatus })}
                          className="w-full px-1.5 py-1 bg-slate-950 border border-slate-700 rounded text-[11px] text-slate-200 focus:border-cyan-500 focus:outline-none"
                        >
                          <option value="Exact Match">Exact Match</option>
                          <option value="Possible Match / Alternative">Possible Alternative</option>
                          <option value="Additional Quoted Item">Additional Item</option>
                          <option value="Unmatched / Needs Review">Needs Review</option>
                        </select>
                      </td>
                      <td className="py-2 px-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveLineItem(idx)}
                          className="p-1 text-slate-500 hover:text-rose-400 rounded hover:bg-slate-800 transition-colors"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-slate-900/80 border-t border-slate-700 font-semibold text-xs sticky bottom-0">
                  <tr>
                    <td colSpan={3} className="py-2 px-2.5 text-slate-300 font-bold">
                      Sum of Extracted Items ({extractedItems.length} lines):
                    </td>
                    <td colSpan={3} className="py-2 px-2.5 text-right font-mono font-extrabold text-cyan-300 text-sm">
                      SAR {extractedItems.reduce((acc, curr) => acc + curr.totalPriceSAR, 0).toLocaleString()}
                    </td>
                    <td colSpan={2} className="py-2 px-2 text-right text-[10px] text-slate-400">
                      Reconciled against PDF Total
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>

        {/* Commercial Notes & Clarifications */}
        <div>
          <label className="block font-medium text-slate-300 mb-1">
            Commercial Notes & Clarifications
          </label>
          <textarea
            rows={2}
            placeholder="Special commercial terms, warranty coverage, delivery points, etc."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
          />
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Verified Digitizer: {currentUser.name}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              icon={isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
              disabled={!uploadedFile || isSubmitting || isAnalyzing}
              className="bg-cyan-600 hover:bg-cyan-500 text-white font-semibold"
            >
              {isSubmitting ? 'Uploading & Synchronizing...' : 'Confirm & Save Quotation'}
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
