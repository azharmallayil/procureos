import React, { useState, useRef } from 'react';
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
} from 'lucide-react';
import { Modal } from '../../common/Modal';
import { Button } from '../../common/Button';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';
import {
  QuotationEvaluation,
  QuotationComparisonItem,
  QuoteLineItemPrice,
  Vendor,
  RFQ,
} from '../../../types/procurement';

interface UploadQuoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotations: QuotationEvaluation[];
  rfqs: RFQ[];
  vendors: Vendor[];
  onQuoteUploaded: (rfqId: string, newSubmission: QuotationComparisonItem) => void;
  selectedRfqId?: string;
}

export const UploadQuoteModal: React.FC<UploadQuoteModalProps> = ({
  isOpen,
  onClose,
  quotations,
  rfqs,
  vendors,
  onQuoteUploaded,
  selectedRfqId,
}) => {
  const { success, warning } = useToast();
  const { currentUser: _cu } = useAuth(); const currentUser = _cu!;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialRfq = selectedRfqId || (rfqs.find((rfq) => !['Awarded', 'Closed', 'Cancelled'].includes(rfq.status))?.id || quotations[0]?.rfqId || '');

  const [targetRfqId, setTargetRfqId] = useState<string>(initialRfq);
  const [selectedVendorId, setSelectedVendorId] = useState<string>(vendors[0]?.id || '');
  const [proposalRefNumber, setProposalRefNumber] = useState<string>('');
  const [quotedTotalSAR, setQuotedTotalSAR] = useState<string>('');
  const [leadTimeDays, setLeadTimeDays] = useState<string>('30');
  const [technicalScore, setTechnicalScore] = useState<string>('95');
  const [validityDate, setValidityDate] = useState<string>('2026-12-31');
  const [notes, setNotes] = useState<string>('');

  const currentRfq = rfqs.find((r) => r.id === targetRfqId);
  const existingEvaluation = quotations.find((evaluation) => evaluation.rfqId === targetRfqId);
  const eligibleVendors = vendors.filter((vendor) => {
    const isInvited = currentRfq?.invitedVendorIds?.length
      ? currentRfq.invitedVendorIds.includes(vendor.id)
      : (vendor.status === 'Approved' || vendor.status === 'Preferred') &&
        (vendor.entityScope === 'Joint / Group' ||
          (currentRfq?.entity === 'FITCO' && vendor.entityScope === 'FITCO Approved') ||
          (currentRfq?.entity === 'ARABITRA' && vendor.entityScope === 'Arabitra Approved'));
    const alreadySubmitted = existingEvaluation?.submissions.some((submission) => submission.vendorId === vendor.id);
    return isInvited && !alreadySubmitted && (vendor.status === 'Approved' || vendor.status === 'Preferred');
  });
  const [lineItemUnitPrices, setLineItemUnitPrices] = useState<Record<string, number>>({});

  // Sync line item prices when target RFQ changes
  React.useEffect(() => {
    if (currentRfq && currentRfq.lineItems && currentRfq.lineItems.length > 0) {
      const initial: Record<string, number> = {};
      let total = 0;
      currentRfq.lineItems.forEach((li) => {
        const p = li.targetPriceSAR || 0;
        initial[li.id] = p;
        total += p * li.quantity;
      });
      setLineItemUnitPrices(initial);
      setQuotedTotalSAR(total.toString());
    }
  }, [targetRfqId, currentRfq]);

  React.useEffect(() => {
    if (selectedRfqId && rfqs.some((rfq) => rfq.id === selectedRfqId)) {
      setTargetRfqId(selectedRfqId);
    }
  }, [selectedRfqId, rfqs]);

  React.useEffect(() => {
    if (!eligibleVendors.some((vendor) => vendor.id === selectedVendorId)) {
      setSelectedVendorId(eligibleVendors[0]?.id || '');
    }
  }, [targetRfqId, eligibleVendors.map((vendor) => vendor.id).join('|')]);

  const handleItemPriceChange = (id: string, unitPrice: number) => {
    const updated = { ...lineItemUnitPrices, [id]: unitPrice };
    setLineItemUnitPrices(updated);
    if (currentRfq?.lineItems) {
      const sum = currentRfq.lineItems.reduce((acc, li) => {
        const u = updated[li.id] !== undefined ? updated[li.id] : (li.targetPriceSAR || 0);
        return acc + u * li.quantity;
      }, 0);
      setQuotedTotalSAR(sum.toString());
    }
  };

  // File Upload State
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileDataUrl, setFileDataUrl] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isSimulatingUpload, setIsSimulatingUpload] = useState<boolean>(false);

  const handleFileChange = (file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      warning('Invalid File Type', 'Please upload a PDF document (.pdf)');
      return;
    }

    setUploadedFile(file);
    setIsSimulatingUpload(true);
    setUploadProgress(20);

    // Read Data URL for previewing or opening
    const reader = new FileReader();
    reader.onload = () => {
      setFileDataUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Simulate progress animation
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsSimulatingUpload(false);
          return 100;
        }
        return prev + 25;
      });
    }, 150);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentRfq || ['Awarded', 'Closed', 'Cancelled'].includes(currentRfq.status)) {
      warning('RFQ Not Available', 'Select an open RFQ that is accepting quotations.');
      return;
    }

    if (!selectedVendorId || !eligibleVendors.some((vendor) => vendor.id === selectedVendorId)) {
      warning('Vendor Not Eligible', 'Select an invited, approved vendor that has not already submitted a quotation for this RFQ.');
      return;
    }

    if (!uploadedFile) {
      warning('Missing Quote PDF', 'Please attach the supplier quotation PDF document.');
      return;
    }

    const parsedTotal = parseFloat(quotedTotalSAR);
    if (!quotedTotalSAR || parsedTotal <= 0) {
      warning('Invalid Amount', 'Please specify the commercial quoted total amount in SAR.');
      return;
    }

    const matchedVendor = vendors.find((v) => v.id === selectedVendorId);
    const vendorName = matchedVendor ? matchedVendor.name : 'Supplier Bidder';

    const pricedRfqLines = currentRfq?.lineItems?.map((line) => {
      const unitPrice = lineItemUnitPrices[line.id] ?? 0;
      return {
        rfqLineItemId: line.id,
        description: line.description,
        quantity: line.quantity,
        uom: line.uom,
        unitPriceSAR: unitPrice,
        totalPriceSAR: unitPrice * line.quantity,
      };
    }) || [];
    const linePriceTotal = pricedRfqLines.reduce((sum, line) => sum + line.totalPriceSAR, 0);
    if (linePriceTotal > 0 && Math.abs(linePriceTotal - parsedTotal) > 0.01) {
      warning('Quotation total does not match BOQ', `The line item total is SAR ${linePriceTotal.toLocaleString()}, while the entered quotation total is SAR ${parsedTotal.toLocaleString()}. Make the amounts match or clear the line prices and submit as a lump sum.`);
      return;
    }
    const lineItems: QuoteLineItemPrice[] = linePriceTotal > 0
      ? pricedRfqLines
      : [{
          rfqLineItemId: 'LI-LUMP',
          description: `Lump-sum commercial scope — ${currentRfq?.title || 'RFQ'}`,
          quantity: 1,
          uom: 'LOT',
          unitPriceSAR: parsedTotal,
          totalPriceSAR: parsedTotal,
        }];

    const newSubmission: QuotationComparisonItem = {
      vendorId: selectedVendorId || `VND-${Date.now()}`,
      vendorName: vendorName,
      quotedTotalSAR: parsedTotal,
      leadTimeDays: parseInt(leadTimeDays) || 30,
      technicalScore: parseInt(technicalScore) || 90,
      commercialScore: 88,
      compositeRank: 2,
      recommended: false,
      status: 'Received',
      validityDate: validityDate,
      notes: notes || 'Supplier quotation received and digitized via ProcureOS Document Gateway.',
      attachment: {
        fileName: uploadedFile.name,
        fileSizeBytes: uploadedFile.size,
        uploadedAt: new Date().toISOString().replace('T', ' ').slice(0, 16),
        uploadedBy: currentUser.name,
        proposalRefNumber: proposalRefNumber || `PROP-${Math.floor(1000 + Math.random() * 9000)}`,
        pdfDataUrl: fileDataUrl || undefined,
      },
      lineItems: lineItems,
    };

    onQuoteUploaded(targetRfqId, newSubmission);
    success(
      'Quotation PDF Uploaded',
      `Attached ${uploadedFile.name} (${(uploadedFile.size / 1024 / 1024).toFixed(2)} MB) from ${vendorName} with ${lineItems.length} priced items.`
    );

    // Reset and close
    setUploadedFile(null);
    setFileDataUrl(null);
    setUploadProgress(0);
    setQuotedTotalSAR('');
    setProposalRefNumber('');
    setNotes('');
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upload Supplier Quotation (PDF)"
      subtitle="Digitize supplier proposal document, commercial pricing, and technical evaluation"
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* RFQ & Vendor Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block font-medium text-slate-300 mb-1">Target RFQ Tender *</label>
            <select
              value={targetRfqId}
              onChange={(e) => setTargetRfqId(e.target.value)}
              disabled={rfqs.filter((rfq) => !['Awarded', 'Closed', 'Cancelled'].includes(rfq.status)).length === 0}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
            >
              {rfqs.filter((rfq) => !['Awarded', 'Closed', 'Cancelled'].includes(rfq.status)).map((rfq) => (
                <option key={rfq.id} value={rfq.id}>
                  {rfq.rfqNumber} — {rfq.title.slice(0, 48)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-medium text-slate-300 mb-1">Supplier / Vendor *</label>
            <select
              value={selectedVendorId}
              onChange={(e) => setSelectedVendorId(e.target.value)}
              disabled={eligibleVendors.length === 0}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
            >
              {eligibleVendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.entityScope})
                </option>
              ))}
            </select>
          </div>
        </div>

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
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-cyan-400 bg-cyan-950/30'
                : uploadedFile
                ? 'border-emerald-500/60 bg-emerald-950/20'
                : 'border-slate-700 bg-slate-950/50 hover:border-cyan-500/50 hover:bg-slate-900/60'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".pdf,application/pdf"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileChange(e.target.files[0]);
                }
              }}
              className="hidden"
            />

            {!uploadedFile ? (
              <div className="flex flex-col items-center justify-center space-y-2 py-2">
                <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-cyan-400 shadow-inner">
                  <FileUp className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-slate-200 font-semibold">
                    Click to browse or drag & drop supplier quote PDF
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Official technical & commercial proposals, bill of quantities (Max 25 MB)
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-between p-2">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-rose-950/80 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="text-left min-w-0">
                    <p className="font-semibold text-slate-200 truncate">{uploadedFile.name}</p>
                    <p className="text-[11px] text-slate-400 font-mono">
                      {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB • PDF Document
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Ready
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setUploadedFile(null);
                      setFileDataUrl(null);
                    }}
                    className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {isSimulatingUpload && (
              <div className="mt-3 w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-cyan-400 h-1.5 transition-all duration-300 rounded-full"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
          </div>
        </div>

        {/* Commercial & Technical Quotation Parameters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block font-medium text-slate-300 mb-1">
              Supplier Proposal Ref #
            </label>
            <input
              type="text"
              placeholder="e.g. QT-TMM-2026-908"
              value={proposalRefNumber}
              onChange={(e) => setProposalRefNumber(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-300 mb-1">
              Quoted Total Price (SAR) *
            </label>
            <input
              type="number"
              required
              placeholder="e.g. 2850000"
              value={quotedTotalSAR}
              onChange={(e) => setQuotedTotalSAR(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-medium text-slate-300 mb-1">
              Delivery Lead Time (Days)
            </label>
            <input
              type="number"
              placeholder="30"
              value={leadTimeDays}
              onChange={(e) => setLeadTimeDays(e.target.value)}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Itemized BOQ Line Pricing for RFQ */}
        {currentRfq && currentRfq.lineItems && currentRfq.lineItems.length > 0 && (
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-200 text-xs flex items-center gap-1.5">
                <Coins className="w-4 h-4 text-cyan-400" />
                Itemized BOQ Line Pricing ({currentRfq.lineItems.length} items)
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                Auto-calculated Total:{' '}
                <strong className="text-cyan-300">
                  SAR {parseFloat(quotedTotalSAR || '0').toLocaleString()}
                </strong>
              </span>
            </div>

            <div className="space-y-2">
              {currentRfq.lineItems.map((li, idx) => {
                const currentUnit =
                  lineItemUnitPrices[li.id] !== undefined
                    ? lineItemUnitPrices[li.id]
                    : (li.targetPriceSAR || 0);
                const lineTotal = currentUnit * li.quantity;

                return (
                  <div
                    key={li.id}
                    className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="flex-1">
                      <span className="font-medium text-slate-200 text-xs block">
                        {idx + 1}. {li.description}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        Qty: {li.quantity} {li.uom} • Target Est: SAR{' '}
                        {(li.targetPriceSAR || 0).toLocaleString()} / {li.uom}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] text-slate-400 font-mono">Unit Price:</span>
                      <div className="relative w-32">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-500 font-mono">
                          SAR
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={currentUnit}
                          onChange={(e) =>
                            handleItemPriceChange(li.id, parseFloat(e.target.value) || 0)
                          }
                          className="w-full pl-9 pr-2 py-1 bg-slate-950 border border-slate-700 rounded text-right font-mono text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
                        />
                      </div>
                      <span className="font-mono text-xs font-bold text-emerald-400 min-w-[90px] text-right">
                        SAR {lineTotal.toLocaleString()}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-medium text-slate-300 mb-1">
              Technical Compliance Score (0 - 100%)
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

        <div>
          <label className="block font-medium text-slate-300 mb-1">
            Commercial Notes & Exceptions
          </label>
          <textarea
            rows={2}
            placeholder="Special commercial terms, factory hydro-testing clauses, warranty exclusions, etc."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center justify-between pt-4 border-t border-slate-800">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Uploaded by: {currentUser.name}</span>
          </div>

          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              icon={<Upload className="w-3.5 h-3.5" />}
              disabled={!uploadedFile}
            >
              Upload & Record Quotation
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
