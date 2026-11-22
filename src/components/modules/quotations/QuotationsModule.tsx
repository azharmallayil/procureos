import React, { useEffect, useRef, useState } from 'react';
import {
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Trophy,
  Award,
  Clock,
  DollarSign,
  TrendingUp,
  FileCheck2,
  FileText,
  Upload,
  Download,
  ExternalLink,
  Eye,
  ShieldCheck,
  Check,
  FileCode,
  ChevronDown,
  ChevronUp,
  Edit3,
  Lock,
  Layers,
  Coins,
  Trash2,
  Tag,
  HelpCircle,
  Plus,
} from 'lucide-react';
import {
  QuotationEvaluation,
  QuotationComparisonItem,
  QuoteLineItemPrice,
  ItemMatchStatus,
  RFQ,
  Vendor,
} from '../../../types/procurement';
import { useCompany } from '../../../context/CompanyContext';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { Button } from '../../common/Button';
import { Badge } from '../../common/Badge';
import { Modal } from '../../common/Modal';
import { ConfirmationModal } from '../../common/ConfirmationModal';
import { UploadQuoteModal } from './UploadQuoteModal';
import { EditQuotePriceModal } from './EditQuotePriceModal';
import {
  getPdfLocally,
  generateSyntheticQuotationPdf,
  resolveSecurePdfBlobUrl,
  deleteQuotationFiles,
} from '../../../lib/pdfStorage';

interface QuotationsModuleProps {
  quotations: QuotationEvaluation[];
  selectedRfqId?: string;
  onSelectRfqId?: (rfqId: string) => void;
  rfqs?: RFQ[];
  vendors?: Vendor[];
  onAwardBid: (quoteEvaluationId: string, vendorId: string, autoSubmitForApproval?: boolean) => void;
  onQuoteUploaded?: (rfqId: string, newSubmission: QuotationComparisonItem) => void;
  onAddVendor?: (vendor: Vendor) => void;
  onUpdateQuotePrice?: (
    rfqId: string,
    vendorId: string,
    updatedLineItems: QuoteLineItemPrice[],
    newTotalSAR: number
  ) => void;
  onDeleteQuotation?: (rfqId: string, vendorId: string) => Promise<boolean> | void;
}

export const QuotationsModule: React.FC<QuotationsModuleProps> = ({
  quotations,
  selectedRfqId: initialSelectedRfqId,
  onSelectRfqId,
  rfqs = [],
  vendors = [],
  onAwardBid,
  onQuoteUploaded,
  onAddVendor,
  onUpdateQuotePrice,
  onDeleteQuotation,
}) => {
  const { matchesCompany } = useCompany();
  const { permissions: _perms, activeRole } = useAuth(); const permissions = _perms!;
  const { success, warning } = useToast();

  const [activeRfqId, setActiveRfqId] = useState<string>(initialSelectedRfqId || quotations[0]?.rfqId || '');
  const lastExternalRfqId = useRef<string | undefined>(undefined);
  const selectedEvaluation = quotations.find((evaluation) => evaluation.rfqId === activeRfqId) || quotations[0];

  useEffect(() => {
    if (
      initialSelectedRfqId &&
      initialSelectedRfqId !== lastExternalRfqId.current &&
      quotations.some((evaluation) => evaluation.rfqId === initialSelectedRfqId)
    ) {
      lastExternalRfqId.current = initialSelectedRfqId;
      setActiveRfqId(initialSelectedRfqId);
      return;
    }
    if (!quotations.some((evaluation) => evaluation.rfqId === activeRfqId) && quotations[0]) {
      setActiveRfqId(quotations[0].rfqId);
    }
  }, [initialSelectedRfqId, quotations, activeRfqId]);

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedPdfBid, setSelectedPdfBid] = useState<{
    bid: QuotationComparisonItem;
    evaluation: QuotationEvaluation;
  } | null>(null);
  const [activeRawPdfUrl, setActiveRawPdfUrl] = useState<string | null>(null);

  // Deletion modal state
  const [deleteConfirmQuote, setDeleteConfirmQuote] = useState<{
    bid: QuotationComparisonItem;
    evaluation: QuotationEvaluation;
  } | null>(null);
  const [isDeletingQuote, setIsDeletingQuote] = useState(false);

  // Helper to render Match Status Badge
  const renderMatchBadge = (status?: ItemMatchStatus) => {
    switch (status) {
      case 'Exact Match':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-950/80 border border-emerald-500/40 text-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Exact Match
          </span>
        );
      case 'Possible Match / Alternative':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-950/80 border border-amber-500/40 text-amber-300">
            <AlertCircle className="w-3 h-3 text-amber-400" /> Alternative
          </span>
        );
      case 'Additional Quoted Item':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-950/80 border border-purple-500/40 text-purple-300">
            <Plus className="w-3 h-3 text-purple-400" /> Additional Item
          </span>
        );
      case 'Unmatched / Needs Review':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-950/80 border border-rose-500/40 text-rose-300">
            <HelpCircle className="w-3 h-3 text-rose-400" /> Needs Review
          </span>
        );
    }
  };

  const handleDeleteQuoteClick = (evaluation: QuotationEvaluation, bid: QuotationComparisonItem) => {
    if (!permissions.canDeleteQuotation) {
      warning(
        'Quotation Deletion Restricted',
        `Role '${activeRole}' does not have authority to delete supplier quotations. Super Admin or Procurement Director required.`
      );
      return;
    }
    setDeleteConfirmQuote({ bid, evaluation });
  };

  const handleConfirmDeleteQuotation = async () => {
    if (!deleteConfirmQuote) return;
    setIsDeletingQuote(true);
    try {
      if (onDeleteQuotation) {
        await onDeleteQuotation(deleteConfirmQuote.evaluation.rfqId, deleteConfirmQuote.bid.vendorId);
      }
      if (selectedPdfBid?.bid.vendorId === deleteConfirmQuote.bid.vendorId) {
        setSelectedPdfBid(null);
      }
      setDeleteConfirmQuote(null);
    } catch (err) {
      console.error('Failed to delete quotation:', err);
    } finally {
      setIsDeletingQuote(false);
    }
  };

  // When a dossier is opened, resolve genuine raw original uploaded PDF into secure browser memory blob
  useEffect(() => {
    if (!selectedPdfBid) {
      setActiveRawPdfUrl(null);
      return;
    }
    const docId = selectedPdfBid.bid.attachment?.docId || `DOC-${selectedPdfBid.evaluation.rfqId}-${selectedPdfBid.bid.vendorId}`;
    let isCancelled = false;
    resolveSecurePdfBlobUrl(selectedPdfBid.bid.attachment?.pdfDataUrl, docId).then((secureBlobUrl) => {
      if (!isCancelled && secureBlobUrl) {
        setActiveRawPdfUrl(secureBlobUrl);
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [selectedPdfBid]);

  const [awardModalQuote, setAwardModalQuote] = useState<{
    evaluation: QuotationEvaluation;
    bid: QuotationComparisonItem;
  } | null>(null);

  // Expanded vendor item prices state
  const [expandedVendorIds, setExpandedVendorIds] = useState<Record<string, boolean>>({});

  // Editing price modal state
  const [editingPriceBid, setEditingPriceBid] = useState<{
    bid: QuotationComparisonItem;
    evaluation: QuotationEvaluation;
  } | null>(null);

  const currentRfq = rfqs.find((r) => r.id === selectedEvaluation?.rfqId);

  // Helper to get or extrapolate line items for a submission
  const getSubmissionLineItems = (sub: QuotationComparisonItem): QuoteLineItemPrice[] => {
    if (sub.lineItems && sub.lineItems.length > 0) {
      return sub.lineItems;
    }
    if (currentRfq && currentRfq.lineItems && currentRfq.lineItems.length > 0) {
      const totalTarget = currentRfq.lineItems.reduce(
        (acc, li) => acc + (li.targetPriceSAR || 0) * li.quantity,
        0
      );
      const ratio = totalTarget > 0 ? sub.quotedTotalSAR / totalTarget : 1;
      return currentRfq.lineItems.map((li) => {
        const estUnit = Math.round((li.targetPriceSAR || 1000) * ratio);
        return {
          rfqLineItemId: li.id,
          description: li.description,
          quantity: li.quantity,
          uom: li.uom,
          unitPriceSAR: estUnit,
          totalPriceSAR: estUnit * li.quantity,
        };
      });
    }
    return [
      {
        rfqLineItemId: 'LI-LUMP',
        description: selectedEvaluation.rfqTitle,
        quantity: 1,
        uom: 'LOT',
        unitPriceSAR: sub.quotedTotalSAR,
        totalPriceSAR: sub.quotedTotalSAR,
      },
    ];
  };

  const toggleExpandVendor = (vendorId: string) => {
    setExpandedVendorIds((prev) => ({
      ...prev,
      [vendorId]: !prev[vendorId],
    }));
  };

  const handleOpenEditPrice = (bid: QuotationComparisonItem) => {
    if (!permissions.canEditQuotePrice) {
      warning(
        'Commercial Price Edit Restricted',
        `Role '${activeRole}' does not hold commercial pricing authority. Price adjustments require Super Admin, Procurement Director, Procurement Engineer, Purchasing Specialist, or Financial Controller clearance.`
      );
    }
    setEditingPriceBid({ bid, evaluation: selectedEvaluation });
  };

  const handleSavePriceEdit = (
    rfqId: string,
    vendorId: string,
    updatedLineItems: QuoteLineItemPrice[],
    newTotalSAR: number
  ) => {
    if (onUpdateQuotePrice) {
      onUpdateQuotePrice(rfqId, vendorId, updatedLineItems, newTotalSAR);
    }

    // Keep selectedPdfBid in sync if modal is open
    if (selectedPdfBid && selectedPdfBid.bid.vendorId === vendorId) {
      setSelectedPdfBid((prev) =>
        prev
          ? {
              ...prev,
              bid: {
                ...prev.bid,
                quotedTotalSAR: newTotalSAR,
                lineItems: updatedLineItems,
              },
            }
          : null
      );
    }
  };

  const handleAwardClick = (evaluation: QuotationEvaluation, bid: QuotationComparisonItem) => {
    if (!permissions.canAwardBid) {
      warning(
        'Insufficient Tender Award Authorization',
        `Role '${activeRole}' cannot execute tender awards. Procurement Director or Super Admin credentials required.`
      );
      return;
    }
    setAwardModalQuote({ evaluation, bid });
  };

  const confirmAward = (autoSubmitForApproval: boolean = true) => {
    if (!awardModalQuote) return;
    onAwardBid(awardModalQuote.evaluation.id, awardModalQuote.bid.vendorId, autoSubmitForApproval);
    if (autoSubmitForApproval) {
      success(
        'Tender Awarded & PO Submitted for Approval',
        `Bid from ${awardModalQuote.bid.vendorName} awarded. Purchase Order has been submitted for Executive Sign-off.`
      );
    } else {
      success(
        'Tender Awarded & PO Draft Queued',
        `Bid from ${awardModalQuote.bid.vendorName} awarded. Draft Purchase Order queued in ERP.`
      );
    }
    setAwardModalQuote(null);
  };

  const handleOpenPdfWindow = (bid: QuotationComparisonItem) => {
    const docId = bid.attachment?.docId || `DOC-${selectedEvaluation?.rfqId}-${bid.vendorId}`;
    resolveSecurePdfBlobUrl(bid.attachment?.pdfDataUrl, docId).then((secureUrl) => {
      const url = secureUrl || bid.attachment?.pdfDataUrl;
      if (url) {
        if (url.startsWith('http') || url.startsWith('blob:')) {
          window.open(url, '_blank', 'noopener,noreferrer');
          return;
        }
        const win = window.open();
        if (win) {
          win.document.write(
            `<iframe src="${url}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
          );
        }
      }
    });
  };

  if (!selectedEvaluation) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-white">Quotations & Bid Evaluation</h1>
        <div className="glass-panel p-8 rounded-xl border border-slate-800 text-center">
          <p className="text-slate-200 font-semibold">No published RFQs are ready for quotation collection.</p>
          <p className="text-xs text-slate-400 mt-2">Create and publish an RFQ first. It will appear here automatically.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-6 h-6 text-cyan-400" />
            Quotations & Bid Evaluation Matrix
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-0.5">
            Item-by-item price transparency, supplier quote dossier, lead-time benchmarking & awards
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Permission Status Indicator */}
          {permissions.canEditQuotePrice ? (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-950/80 border border-emerald-500/40 text-emerald-300"
              title="You have permission to edit quote prices"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Price Edit Enabled ({activeRole})
            </span>
          ) : (
            <span
              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-900 border border-slate-700 text-slate-400"
              title="Your active role has read-only price access"
            >
              <Lock className="w-3 h-3 text-slate-500" />
              Price Read-Only ({activeRole})
            </span>
          )}

          <Button
            variant="primary"
            size="sm"
            icon={<Upload className="w-4 h-4" />}
            disabled={['Awarded', 'Closed', 'Cancelled'].includes(currentRfq?.status || 'Closed')}
            onClick={() => setIsUploadModalOpen(true)}
          >
            Upload Received Quote (PDF)
          </Button>
        </div>
      </div>

      {/* Visual RFQ Workspace Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {quotations.map((evaluation) => {
          const isSelected = evaluation.rfqId === selectedEvaluation.rfqId;
          const count = evaluation.submissions.length;
          return (
            <button
              key={evaluation.rfqId}
              type="button"
              onClick={() => {
                setActiveRfqId(evaluation.rfqId);
                onSelectRfqId?.(evaluation.rfqId);
              }}
              className={`px-3 py-2 rounded-xl text-xs font-semibold shrink-0 transition-all border flex items-center gap-2 cursor-pointer ${
                isSelected
                  ? 'bg-cyan-950/80 border-cyan-500/50 text-cyan-200 shadow-md shadow-cyan-950/60'
                  : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <FileSpreadsheet className={`w-3.5 h-3.5 ${isSelected ? 'text-cyan-400' : 'text-slate-500'}`} />
              <span>{evaluation.rfqNumber}</span>
              <span
                className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                  count > 0 ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {count} {count === 1 ? 'quote' : 'quotes'}
              </span>
            </button>
          );
        })}
      </div>

      {/* RFQ work queue: every RFQ has its own quotation workspace */}
      <div className="glass-panel p-4 rounded-xl border border-slate-800">
        <label className="block text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-2">Select RFQ quotation workspace</label>
        <select
          value={selectedEvaluation.rfqId}
          onChange={(event) => {
            setActiveRfqId(event.target.value);
            onSelectRfqId?.(event.target.value);
          }}
          className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
        >
          {quotations.map((evaluation) => {
            const rfq = rfqs.find((item) => item.id === evaluation.rfqId);
            const invited = rfq?.invitedVendorsCount || 0;
            const received = evaluation.submissions.length;
            return (
              <option key={evaluation.rfqId} value={evaluation.rfqId}>
                {evaluation.rfqNumber} — {evaluation.rfqTitle} ({received}/{invited} quotations)
              </option>
            );
          })}
        </select>
      </div>

      {/* Tender Package Selector & Header summary */}
      <div className="glass-panel p-5 rounded-xl border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold text-cyan-300">
                {selectedEvaluation.rfqNumber}
              </span>
              <Badge variant="amber">
                Arabitra
              </Badge>
              <Badge variant="amber" dot className="text-[10px]">
                {selectedEvaluation.status}
              </Badge>
            </div>
            <h2 className="text-base font-bold text-slate-100 mt-1">{selectedEvaluation.rfqTitle}</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Project: <span className="text-slate-300">{selectedEvaluation.projectName}</span> • Allocated Budget:
              <span className="font-mono text-emerald-400 font-semibold ml-1">
                SAR {selectedEvaluation.totalBudgetSAR.toLocaleString()}
              </span>
            </p>
          </div>

          <div className="text-xs text-slate-400 bg-slate-950/70 p-3 rounded-lg border border-slate-800">
            <span className="font-semibold text-slate-300 block mb-1">Tender Evaluation Committee:</span>
            <div className="flex items-center gap-2 flex-wrap">
              {selectedEvaluation.evaluators.map((evaluator, i) => (
                <span
                  key={i}
                  className="px-2 py-0.5 rounded bg-slate-900 border border-slate-700 text-slate-300 text-[11px]"
                >
                  {evaluator}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Vendor Comparison Matrix Table */}
      <div className="glass-panel rounded-xl overflow-hidden border border-slate-800">
        <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="font-bold text-slate-200 text-sm flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-400" />
            Competitive Evaluation Matrix
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400">
              Showing <span className="text-cyan-400 font-semibold">{selectedEvaluation.submissions.length}</span> submitted vendor bids
            </span>
            <span className="text-[11px] text-slate-500 hidden sm:inline">•</span>
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              Click <strong className="text-cyan-300">"items breakdown"</strong> to view price of each item
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 text-[11px] border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Rank</th>
                <th className="py-3.5 px-4 font-semibold">Vendor & Attached Quote PDF</th>
                <th className="py-3.5 px-4 font-semibold text-right">Quoted Bid (SAR) & Items</th>
                <th className="py-3.5 px-4 font-semibold text-center">Variance vs Budget</th>
                <th className="py-3.5 px-4 font-semibold text-center">Lead Time</th>
                <th className="py-3.5 px-4 font-semibold text-center">Tech Score (100)</th>
                <th className="py-3.5 px-4 font-semibold text-center">Comm Score (100)</th>
                <th className="py-3.5 px-4 font-semibold">Recommendation</th>
                <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80">
              {selectedEvaluation.submissions.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-10 px-4 text-center">
                    <div className="font-semibold text-slate-200">No supplier quotations received yet</div>
                    <p className="text-xs text-slate-400 mt-1">This RFQ is already linked to this workspace. Invitees can submit their quotation here.</p>
                    <Button variant="outline" size="sm" className="mt-3" onClick={() => setIsUploadModalOpen(true)}>
                      Upload first quotation
                    </Button>
                  </td>
                </tr>
              )}
              {selectedEvaluation.submissions.map((sub) => {
                const variance =
                  ((sub.quotedTotalSAR - selectedEvaluation.totalBudgetSAR) /
                    selectedEvaluation.totalBudgetSAR) *
                  100;
                const isExpanded = !!expandedVendorIds[sub.vendorId];
                const lineItems = getSubmissionLineItems(sub);

                return (
                  <React.Fragment key={sub.vendorId}>
                    <tr
                      className={`hover:bg-slate-800/40 transition-colors ${
                        sub.recommended ? 'bg-cyan-950/20' : ''
                      } ${isExpanded ? 'bg-slate-900/40' : ''}`}
                    >
                      <td className="py-3.5 px-4 font-mono font-bold whitespace-nowrap">
                        <span
                          className={`w-6 h-6 rounded-full inline-flex items-center justify-center text-xs font-bold ${
                            sub.compositeRank === 1
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/50'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          #{sub.compositeRank}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 min-w-[240px]">
                        <div className="font-semibold text-slate-100">{sub.vendorName}</div>
                        
                        {/* Attached Supplier Quote PDF badge */}
                        {sub.attachment ? (
                          <button
                            type="button"
                            onClick={() => setSelectedPdfBid({ bid: sub, evaluation: selectedEvaluation })}
                            className="mt-1 inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900 border border-slate-700/80 text-cyan-300 hover:border-cyan-500/50 hover:bg-slate-800/80 transition-all text-[11px] group text-left cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                            <span className="truncate max-w-[190px]">{sub.attachment.fileName}</span>
                            <span className="text-[10px] text-slate-400 shrink-0">
                              ({(sub.attachment.fileSizeBytes / 1024 / 1024).toFixed(1)}M)
                            </span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setIsUploadModalOpen(true)}
                            className="mt-1 text-[11px] text-cyan-400 hover:underline flex items-center gap-1"
                          >
                            <Upload className="w-3 h-3" /> Attach Quote PDF
                          </button>
                        )}

                        <div className="text-[11px] text-slate-400 mt-1 line-clamp-1">{sub.notes}</div>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="font-mono font-bold text-slate-100 text-sm">
                          SAR {sub.quotedTotalSAR.toLocaleString()}
                        </div>
                        {/* Toggle to view price of each item */}
                        <button
                          type="button"
                          onClick={() => toggleExpandVendor(sub.vendorId)}
                          className={`mt-1 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium transition-all cursor-pointer ${
                            isExpanded
                              ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/50'
                              : 'bg-slate-900 border border-slate-700 text-slate-300 hover:text-cyan-300 hover:border-slate-600'
                          }`}
                          title="Click to toggle itemized prices for this quote"
                        >
                          {isExpanded ? (
                            <ChevronUp className="w-3 h-3 text-cyan-400" />
                          ) : (
                            <ChevronDown className="w-3 h-3 text-cyan-400" />
                          )}
                          <span>
                            {lineItems.length} {lineItems.length === 1 ? 'item' : 'items'} breakdown
                          </span>
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap font-mono text-[11px]">
                        <span className={variance <= 0 ? 'text-emerald-400' : 'text-rose-400 font-bold'}>
                          {variance > 0 ? `+${variance.toFixed(1)}%` : `${variance.toFixed(1)}%`}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap font-mono text-slate-300">
                        {sub.leadTimeDays} Days
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded font-bold font-mono ${
                            sub.technicalScore >= 90
                              ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                              : 'bg-rose-950 text-rose-300 border border-rose-500/40'
                          }`}
                        >
                          {sub.technicalScore}%
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span className="font-mono font-bold text-slate-200">{sub.commercialScore}%</span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {sub.recommended ? (
                          <div className="flex items-center gap-1.5">
                            <Badge variant="emerald" dot>
                              Recommended
                            </Badge>
                            <span
                              className="text-slate-400 hover:text-cyan-400 cursor-help transition-colors"
                              title="Recommendation criteria: Ranked highest by evaluation algorithm for meeting 100% technical specifications, lowest evaluated cost, and required delivery timeline. Subject to final Committee sign-off."
                            >
                              <HelpCircle className="w-3.5 h-3.5" />
                            </span>
                          </div>
                        ) : sub.status === 'Rejected' ? (
                          <Badge variant="rose">Rejected</Badge>
                        ) : (
                          <Badge variant="slate">Shortlisted</Badge>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Inspect PDF Button */}
                          {sub.attachment && (
                            <button
                              type="button"
                              onClick={() => setSelectedPdfBid({ bid: sub, evaluation: selectedEvaluation })}
                              className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-cyan-300 hover:bg-slate-700 transition-colors"
                              title="Inspect Attached Quotation PDF & Itemized Pricing"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          )}

                          {/* Edit Price Button */}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEditPrice(sub)}
                            icon={
                              permissions.canEditQuotePrice ? (
                                <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                              ) : (
                                <Lock className="w-3.5 h-3.5 text-slate-500" />
                              )
                            }
                            className={`text-xs py-1 px-2.5 ${
                              !permissions.canEditQuotePrice ? 'opacity-70 text-slate-400' : ''
                            }`}
                            title={
                              permissions.canEditQuotePrice
                                ? 'Edit Itemized Quote Prices'
                                : `Edit Price Locked: Role '${activeRole}' cannot edit commercial prices`
                            }
                          >
                            Edit Price
                          </Button>

                          {/* Award Bid Button */}
                          <Button
                            variant={sub.recommended ? 'primary' : 'outline'}
                            size="sm"
                            disabled={sub.status === 'Rejected'}
                            onClick={() => handleAwardClick(selectedEvaluation, sub)}
                            icon={<Award className="w-3.5 h-3.5" />}
                            className="text-xs py-1 px-3"
                          >
                            Award Bid
                          </Button>

                          {/* Delete Quotation Button */}
                          {permissions.canDeleteQuotation && (
                            <button
                              type="button"
                              onClick={() => handleDeleteQuoteClick(selectedEvaluation, sub)}
                              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 border border-slate-700/80 transition-colors cursor-pointer"
                              title={`Delete Quotation from ${sub.vendorName}`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* EXPANDED ITEM-BY-ITEM PRICING ROW */}
                    {isExpanded && (
                      <tr className="bg-slate-950/90 border-b border-cyan-900/30">
                        <td colSpan={9} className="p-0">
                          <div className="p-4 bg-gradient-to-b from-slate-950 to-slate-900/90 border-x border-slate-800 m-2 rounded-xl">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                              <div className="flex items-center gap-2">
                                <Coins className="w-4 h-4 text-cyan-400" />
                                <span className="font-bold text-slate-100 text-xs">
                                  Itemized Scope & Pricing Breakdown — {sub.vendorName}
                                </span>
                                <span className="px-2 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[10px]">
                                  {lineItems.length} Quoted Line Items
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <span className="text-[11px] text-slate-400">
                                  Evaluated Total:{' '}
                                  <strong className="text-cyan-300 font-mono">
                                    SAR {sub.quotedTotalSAR.toLocaleString()}
                                  </strong>
                                </span>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleOpenEditPrice(sub)}
                                  icon={
                                    permissions.canEditQuotePrice ? (
                                      <Edit3 className="w-3 h-3 text-cyan-400" />
                                    ) : (
                                      <Lock className="w-3 h-3 text-slate-500" />
                                    )
                                  }
                                  className="text-[11px] py-0.5 px-2.5 h-7"
                                >
                                  Edit Item Prices
                                </Button>
                              </div>
                            </div>

                            <div className="mt-3 overflow-x-auto">
                              <table className="w-full text-left text-xs">
                                <thead className="bg-slate-900/90 text-slate-400 text-[10px] border-b border-slate-800">
                                  <tr>
                                    <th className="py-2 px-3 font-semibold w-10">#</th>
                                    <th className="py-2 px-3 font-semibold min-w-[220px]">
                                      Line Item Scope & Description
                                    </th>
                                    <th className="py-2 px-3 font-semibold text-center whitespace-nowrap">
                                      Match Classification
                                    </th>
                                    <th className="py-2 px-3 font-semibold text-center whitespace-nowrap">
                                      Requested vs Quoted Qty
                                    </th>
                                    <th className="py-2 px-3 font-semibold text-right whitespace-nowrap">
                                      Quoted Unit Price (SAR)
                                    </th>
                                    <th className="py-2 px-3 font-semibold text-right whitespace-nowrap">
                                      Line Item Total (SAR)
                                    </th>
                                    <th className="py-2 px-3 font-semibold text-right whitespace-nowrap">
                                      Target Budget / Item
                                    </th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-800/50">
                                  {lineItems.map((item, idx) => {
                                    // Match RFQ target item if available
                                    const rfqItem = currentRfq?.lineItems?.find(
                                      (li) => li.id === item.rfqLineItemId
                                    );
                                    const targetUnit = rfqItem?.targetPriceSAR || 0;
                                    const itemVariancePct =
                                      targetUnit > 0
                                        ? ((item.unitPriceSAR - targetUnit) / targetUnit) * 100
                                        : 0;

                                    return (
                                      <tr key={item.rfqLineItemId || idx} className="hover:bg-slate-800/30">
                                        <td className="py-2.5 px-3 font-mono text-slate-400 font-semibold">
                                          {idx + 1}
                                        </td>
                                        <td className="py-2.5 px-3">
                                          <div className="font-medium text-slate-200">
                                            {item.description}
                                          </div>
                                          {(item.sku || item.modelNumber || item.brand) && (
                                            <div className="text-[10px] text-slate-400 mt-0.5 font-mono flex items-center gap-2 flex-wrap">
                                              {item.sku && <span>SKU: <span className="text-cyan-300 font-semibold">{item.sku}</span></span>}
                                              {item.modelNumber && <span>Model: <span className="text-slate-200">{item.modelNumber}</span></span>}
                                              {item.brand && <span>Brand: <span className="text-slate-300">{item.brand}</span></span>}
                                            </div>
                                          )}
                                          {item.matchReason && (
                                            <div className="text-[10px] text-amber-300/80 mt-0.5 italic">
                                              {item.matchReason}
                                            </div>
                                          )}
                                          {item.notes && (
                                            <div className="text-[10px] text-slate-400 mt-0.5">
                                              {item.notes}
                                            </div>
                                          )}
                                        </td>
                                        <td className="py-2.5 px-3 text-center whitespace-nowrap">
                                          {renderMatchBadge(item.matchStatus)}
                                        </td>
                                        <td className="py-2.5 px-3 text-center whitespace-nowrap font-mono text-xs">
                                          {item.matchStatus === 'Additional Quoted Item' ? (
                                            <div>
                                              <span className="text-[10px] text-purple-300 font-semibold block">Not in BOQ</span>
                                              <span className="font-bold text-cyan-300">{item.quantity}</span> {item.uom}
                                            </div>
                                          ) : (
                                            <div>
                                              <span className="text-[10px] text-slate-400 block">
                                                Req: {item.requestedQuantity ?? rfqItem?.quantity ?? '—'}
                                              </span>
                                              <span className="font-bold text-cyan-300">{item.quantity}</span> {item.uom}
                                            </div>
                                          )}
                                        </td>
                                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-100 whitespace-nowrap">
                                          SAR {item.unitPriceSAR.toLocaleString()}
                                        </td>
                                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                                          SAR {item.totalPriceSAR.toLocaleString()}
                                        </td>
                                        <td className="py-2.5 px-3 text-right font-mono text-[11px] whitespace-nowrap">
                                          {targetUnit > 0 ? (
                                            <div>
                                              <span className="text-slate-400">
                                                SAR {targetUnit.toLocaleString()}
                                              </span>
                                              <span
                                                className={`ml-1 text-[10px] ${
                                                  itemVariancePct <= 0
                                                    ? 'text-emerald-400'
                                                    : 'text-rose-400 font-bold'
                                                }`}
                                              >
                                                ({itemVariancePct > 0 ? `+${itemVariancePct.toFixed(1)}%` : `${itemVariancePct.toFixed(1)}%`})
                                              </span>
                                            </div>
                                          ) : (
                                            <span className="text-slate-500">—</span>
                                          )}
                                        </td>
                                      </tr>
                                    );
                                  })}
                                </tbody>
                                <tfoot className="bg-slate-900/60 border-t border-slate-700 font-semibold text-xs">
                                  <tr>
                                    <td colSpan={4} className="py-2.5 px-3 text-slate-300 font-bold">
                                      Total Quoted Proposal Sum:
                                    </td>
                                    <td colSpan={2} className="py-2.5 px-3 text-right font-mono text-sm text-cyan-300 font-extrabold">
                                      SAR {sub.quotedTotalSAR.toLocaleString()}
                                    </td>
                                    <td className="py-2.5 px-3 text-right">
                                      <span
                                        className={`font-mono text-xs ${
                                          variance <= 0 ? 'text-emerald-400' : 'text-rose-400 font-bold'
                                        }`}
                                      >
                                        {variance > 0 ? `+${variance.toFixed(1)}% vs pkg budget` : `${variance.toFixed(1)}% vs pkg budget`}
                                      </span>
                                    </td>
                                  </tr>
                                </tfoot>
                              </table>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Dedicated Section: Additional Quoted Items (Outside Original BOQ Scope) */}
      {(() => {
        const additionalItemsAcrossBids = selectedEvaluation.submissions.flatMap((sub) => {
          const items = getSubmissionLineItems(sub);
          return items
            .filter((item) => item.matchStatus === 'Additional Quoted Item')
            .map((item) => ({
              ...item,
              vendorName: sub.vendorName,
              vendorId: sub.vendorId,
            }));
        });

        if (additionalItemsAcrossBids.length === 0) return null;

        return (
          <div className="glass-panel rounded-xl overflow-hidden border border-purple-900/50 bg-purple-950/10">
            <div className="px-5 py-3.5 border-b border-purple-900/40 bg-purple-950/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-purple-200 text-sm flex items-center gap-2">
                  <Plus className="w-4 h-4 text-purple-400" />
                  Additional Quoted Items (Outside Original BOQ Scope)
                </h3>
                <p className="text-[11px] text-purple-300/70 mt-0.5">
                  The following items were identified in supplier quotation PDFs beyond the requested BOQ items. They are fully accounted for in the quotation totals.
                </p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-full bg-purple-950/80 border border-purple-500/40 text-purple-300 font-mono font-semibold">
                {additionalItemsAcrossBids.length} Additional {additionalItemsAcrossBids.length === 1 ? 'Item' : 'Items'} Found
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4 font-semibold">Supplier</th>
                    <th className="py-2.5 px-4 font-semibold">Quoted SKU / Code</th>
                    <th className="py-2.5 px-4 font-semibold min-w-[220px]">Item Description & Specs</th>
                    <th className="py-2.5 px-4 font-semibold text-center">Quoted Qty & UOM</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Unit Price (SAR)</th>
                    <th className="py-2.5 px-4 font-semibold text-right">Line Total (SAR)</th>
                    <th className="py-2.5 px-4 font-semibold">Classification</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {additionalItemsAcrossBids.map((item, idx) => (
                    <tr key={`${item.vendorId}-${item.rfqLineItemId || idx}`} className="hover:bg-slate-800/30">
                      <td className="py-3 px-4 font-semibold text-slate-200 whitespace-nowrap">
                        {item.vendorName}
                      </td>
                      <td className="py-3 px-4 font-mono text-cyan-300 whitespace-nowrap">
                        {item.sku || item.modelNumber || '—'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-slate-100">{item.description}</div>
                        {item.brand && <div className="text-[10px] text-slate-400">Brand: {item.brand}</div>}
                        {item.remarks && <div className="text-[10px] text-purple-300/80 mt-0.5">{item.remarks}</div>}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap font-mono">
                        <span className="font-bold text-cyan-300">{item.quantity}</span> {item.uom}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-slate-100 whitespace-nowrap">
                        SAR {item.unitPriceSAR.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                        SAR {item.totalPriceSAR.toLocaleString()}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {renderMatchBadge(item.matchStatus)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}

      {/* PDF Inspection Dossier Modal with Full Itemized Pricing & Edit Access */}
      {selectedPdfBid && (
        <Modal
          isOpen={!!selectedPdfBid}
          onClose={() => setSelectedPdfBid(null)}
          title={`Supplier Quotation Dossier: ${selectedPdfBid.bid.vendorName}`}
          subtitle={`Proposal Ref: ${selectedPdfBid.bid.attachment?.proposalRefNumber || 'N/A'} • Attached to RFQ ${selectedPdfBid.evaluation.rfqNumber}`}
          maxWidth="4xl"
          footer={
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Digitized via ProcureOS Commercial Gateway</span>
              </div>
              <div className="flex items-center gap-2">
                {permissions.canDeleteQuotation && (
                  <Button
                    variant="danger"
                    size="sm"
                    icon={<Trash2 className="w-3.5 h-3.5" />}
                    onClick={() => handleDeleteQuoteClick(selectedPdfBid.evaluation, selectedPdfBid.bid)}
                  >
                    Delete Quote
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  icon={
                    permissions.canEditQuotePrice ? (
                      <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                    ) : (
                      <Lock className="w-3.5 h-3.5 text-slate-500" />
                    )
                  }
                  onClick={() => handleOpenEditPrice(selectedPdfBid.bid)}
                >
                  Edit Prices
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<ExternalLink className="w-3.5 h-3.5" />}
                  onClick={() => handleOpenPdfWindow(selectedPdfBid.bid)}
                >
                  Open in New Window
                </Button>
                <Button variant="outline" size="sm" onClick={() => setSelectedPdfBid(null)}>
                  Close
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  icon={<Award className="w-3.5 h-3.5" />}
                  onClick={() => {
                    handleAwardClick(selectedPdfBid.evaluation, selectedPdfBid.bid);
                    setSelectedPdfBid(null);
                  }}
                >
                  Award This Bid
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            {/* Top Document Header Metadata */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <div>
                <span className="text-slate-400 block text-[10px]">Attached PDF File</span>
                <span className="font-semibold text-cyan-300 truncate block">
                  {selectedPdfBid.bid.attachment?.fileName}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">File Size & Upload Date</span>
                <span className="text-slate-200">
                  {((selectedPdfBid.bid.attachment?.fileSizeBytes || 0) / 1024 / 1024).toFixed(2)} MB • {selectedPdfBid.bid.attachment?.uploadedAt}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Uploaded By</span>
                <span className="text-slate-200">{selectedPdfBid.bid.attachment?.uploadedBy}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Total Proposal Amount</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  SAR {selectedPdfBid.bid.quotedTotalSAR.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Extracted Commercial Terms & Header Details */}
            {(selectedPdfBid.bid.paymentTerms || selectedPdfBid.bid.deliveryTerms || selectedPdfBid.bid.leadTimeDays) && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[10px]">Lead Time</span>
                  <span className="text-slate-200 font-semibold">{selectedPdfBid.bid.leadTimeDays} Calendar Days</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Payment Terms</span>
                  <span className="text-slate-200">{selectedPdfBid.bid.paymentTerms || 'Standard 30 Days Net'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Delivery Terms</span>
                  <span className="text-slate-200">{selectedPdfBid.bid.deliveryTerms || 'DDP Project Site'}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Tax / VAT</span>
                  <span className="text-slate-200 font-mono">15% KSA Standard VAT</span>
                </div>
              </div>
            )}

            {/* ITEM-BY-ITEM PRICING BREAKDOWN IN PROPOSAL DOSSIER */}
            <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
              <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Coins className="w-4 h-4 text-cyan-400" />
                  <span className="font-semibold text-slate-200">
                    Commercial Proposal Scope & Item-by-Item Prices
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">
                    Sum: <strong className="text-cyan-300 font-mono">SAR {selectedPdfBid.bid.quotedTotalSAR.toLocaleString()}</strong>
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEditPrice(selectedPdfBid.bid)}
                    icon={
                      permissions.canEditQuotePrice ? (
                        <Edit3 className="w-3 h-3 text-cyan-400" />
                      ) : (
                        <Lock className="w-3 h-3 text-slate-500" />
                      )
                    }
                    className="text-[10px] py-0.5 px-2 h-6"
                  >
                    Edit Prices
                  </Button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 text-[10px] border-b border-slate-800">
                    <tr>
                      <th className="py-2 px-3 font-semibold w-8">#</th>
                      <th className="py-2 px-3 font-semibold min-w-[200px]">Item Description & Specs</th>
                      <th className="py-2 px-3 font-semibold text-center whitespace-nowrap">Match Classification</th>
                      <th className="py-2 px-3 font-semibold text-center whitespace-nowrap">Requested vs Quoted Qty</th>
                      <th className="py-2 px-3 font-semibold text-right whitespace-nowrap">Quoted Unit Price (SAR)</th>
                      <th className="py-2 px-3 font-semibold text-right whitespace-nowrap">Total Price (SAR)</th>
                      <th className="py-2 px-3 font-semibold text-right whitespace-nowrap">Target Budget / Item</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {getSubmissionLineItems(selectedPdfBid.bid).map((item, idx) => {
                      const rfqItem = currentRfq?.lineItems?.find((li) => li.id === item.rfqLineItemId);
                      const targetUnit = rfqItem?.targetPriceSAR || 0;
                      const itemVariancePct =
                        targetUnit > 0 ? ((item.unitPriceSAR - targetUnit) / targetUnit) * 100 : 0;

                      return (
                        <tr key={item.rfqLineItemId || idx} className="hover:bg-slate-900/50">
                          <td className="py-2.5 px-3 font-mono text-slate-400 font-semibold">{idx + 1}</td>
                          <td className="py-2.5 px-3">
                            <div className="font-medium text-slate-100">{item.description}</div>
                            {(item.sku || item.modelNumber || item.brand) && (
                              <div className="text-[10px] text-slate-400 mt-0.5 font-mono flex items-center gap-2 flex-wrap">
                                {item.sku && <span>SKU: <span className="text-cyan-300 font-semibold">{item.sku}</span></span>}
                                {item.modelNumber && <span>Model: <span className="text-slate-200">{item.modelNumber}</span></span>}
                                {item.brand && <span>Brand: <span className="text-slate-300">{item.brand}</span></span>}
                              </div>
                            )}
                            {item.matchReason && <div className="text-[10px] text-amber-300/80 mt-0.5 italic">{item.matchReason}</div>}
                            {item.notes && <div className="text-[10px] text-slate-400 mt-0.5">{item.notes}</div>}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            {renderMatchBadge(item.matchStatus)}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap font-mono text-xs">
                            {item.matchStatus === 'Additional Quoted Item' ? (
                              <div>
                                <span className="text-[10px] text-purple-300 font-semibold block">Not in BOQ</span>
                                <span className="font-bold text-cyan-300">{item.quantity}</span> {item.uom}
                              </div>
                            ) : (
                              <div>
                                <span className="text-[10px] text-slate-400 block">
                                  Req: {item.requestedQuantity ?? rfqItem?.quantity ?? '—'}
                                </span>
                                <span className="font-bold text-cyan-300">{item.quantity}</span> {item.uom}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-100 whitespace-nowrap">
                            SAR {item.unitPriceSAR.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                            SAR {item.totalPriceSAR.toLocaleString()}
                          </td>
                          <td className="py-2.5 px-3 text-right font-mono text-[11px] whitespace-nowrap">
                            {targetUnit > 0 ? (
                              <div>
                                <span className="text-slate-400">SAR {targetUnit.toLocaleString()}</span>
                                <span
                                  className={`ml-1 text-[10px] ${
                                    itemVariancePct <= 0 ? 'text-emerald-400' : 'text-rose-400 font-bold'
                                  }`}
                                >
                                  ({itemVariancePct > 0 ? `+${itemVariancePct.toFixed(1)}%` : `${itemVariancePct.toFixed(1)}%`})
                                </span>
                              </div>
                            ) : (
                              <span className="text-slate-500">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-900/60 border-t border-slate-700 font-semibold text-xs">
                    <tr>
                      <td colSpan={4} className="py-2 px-3 text-slate-300 font-bold">
                        Quoted Total Amount:
                      </td>
                      <td colSpan={2} className="py-2 px-3 text-right font-mono text-sm text-cyan-300 font-extrabold">
                        SAR {selectedPdfBid.bid.quotedTotalSAR.toLocaleString()}
                      </td>
                      <td className="py-2 px-3 text-right font-mono text-slate-400 text-xs">
                        Budget: SAR {selectedEvaluation.totalBudgetSAR.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Document Interactive Preview / Simulated PDF Render View */}
            <div className="border border-slate-700 rounded-xl overflow-hidden bg-slate-950">
              {(() => {
                const renderUrl = activeRawPdfUrl || selectedPdfBid.bid.attachment?.pdfDataUrl;

                return (
                  <>
                    <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-rose-400" />
                        <span className="font-mono font-semibold text-slate-200 text-xs truncate max-w-xs">
                          {selectedPdfBid.bid.attachment?.fileName || 'Official_Quotation.pdf'}
                        </span>
                        {selectedPdfBid.bid.attachment?.fileSizeBytes ? (
                          <span className="text-[10px] text-slate-400">
                            ({(selectedPdfBid.bid.attachment.fileSizeBytes / 1024 / 1024).toFixed(2)} MB)
                          </span>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-2">
                        {renderUrl && (
                          <>
                            <button
                              type="button"
                              onClick={() => window.open(renderUrl, '_blank', 'noopener,noreferrer')}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] font-semibold border border-slate-700 transition-colors cursor-pointer"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Open in New Tab</span>
                            </button>
                            <a
                              href={renderUrl}
                              download={selectedPdfBid.bid.attachment?.fileName || 'quotation.pdf'}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-semibold transition-colors cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download PDF</span>
                            </a>
                          </>
                        )}
                      </div>
                    </div>

                    {renderUrl ? (
                      <div className="h-[600px] w-full bg-slate-900 relative">
                        <object
                          data={renderUrl}
                          type="application/pdf"
                          className="w-full h-full"
                        >
                          <iframe
                            src={renderUrl}
                            className="w-full h-full border-0 bg-white"
                            title="Supplier Quotation Document"
                          />
                        </object>
                      </div>
                    ) : (
                      <div className="h-64 flex flex-col items-center justify-center p-6 text-center text-slate-400 bg-slate-900/60">
                        <FileText className="w-12 h-12 text-slate-500 mb-2" />
                        <p className="font-semibold text-slate-300 text-sm">Quotation Dossier In Processing</p>
                        <p className="text-xs text-slate-500 mt-1">
                          Proposal Ref: {selectedPdfBid.bid.attachment?.proposalRefNumber || 'PROP-2026'}
                        </p>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        </Modal>
      )}

      {/* Upload Quote Modal Component */}
      <UploadQuoteModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        quotations={quotations}
        rfqs={rfqs}
        vendors={vendors}
        selectedRfqId={selectedEvaluation.rfqId}
        onQuoteUploaded={(rfqId, newSubmission) => {
          if (onQuoteUploaded) {
            onQuoteUploaded(rfqId, newSubmission);
          }
        }}
        onAddVendor={onAddVendor}
      />

      {/* Edit Itemized Quote Price Modal */}
      {editingPriceBid && (
        <EditQuotePriceModal
          isOpen={!!editingPriceBid}
          onClose={() => setEditingPriceBid(null)}
          bid={editingPriceBid.bid}
          evaluation={editingPriceBid.evaluation}
          rfq={currentRfq}
          onSave={handleSavePriceEdit}
        />
      )}

      {/* Award Tender Confirmation Modal */}
      {awardModalQuote && (
        <Modal
          isOpen={!!awardModalQuote}
          onClose={() => setAwardModalQuote(null)}
          title="Confirm Tender Package Award"
          subtitle={`Package: ${awardModalQuote.evaluation.rfqNumber} | Vendor: ${awardModalQuote.bid.vendorName}`}
          maxWidth="lg"
          footer={
            <div className="flex items-center justify-between w-full flex-wrap gap-2">
              <Button variant="outline" size="sm" onClick={() => setAwardModalQuote(null)}>
                Cancel
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => confirmAward(false)}
                  className="text-slate-300 border-slate-700 hover:bg-slate-800 text-xs"
                >
                  Save as Draft PO
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => confirmAward(true)}
                  className="bg-cyan-600 hover:bg-cyan-500 font-semibold text-xs"
                >
                  Award & Submit for Approval
                </Button>
              </div>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <p className="text-slate-300">
              You are authorizing the commercial award for{' '}
              <strong className="text-white">{awardModalQuote.evaluation.rfqTitle}</strong> to{' '}
              <strong className="text-cyan-400">{awardModalQuote.bid.vendorName}</strong>.
            </p>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Awarded Price:</span>
                <span className="text-slate-100 font-bold">
                  SAR {awardModalQuote.bid.quotedTotalSAR.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Guaranteed Lead Time:</span>
                <span className="text-slate-100">{awardModalQuote.bid.leadTimeDays} Days</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Technical Score:</span>
                <span className="text-emerald-400 font-bold">
                  {awardModalQuote.bid.technicalScore}%
                </span>
              </div>
              {awardModalQuote.bid.attachment && (
                <div className="flex justify-between">
                  <span className="text-slate-400">Attached PDF:</span>
                  <span className="text-cyan-300 font-mono text-[11px]">
                    {awardModalQuote.bid.attachment.fileName}
                  </span>
                </div>
              )}
            </div>

            <div className="p-3 bg-cyan-950/30 border border-cyan-800/40 rounded-xl space-y-1 text-[11px]">
              <span className="font-semibold text-cyan-300 block">Workflow Transition:</span>
              <ul className="list-disc pl-4 space-y-1 text-slate-300">
                <li>
                  <strong className="text-white">Award & Submit for Approval:</strong> Immediately moves the Purchase Order into <em>Pending Approval</em> stage, making it ready for the Procurement Director to approve.
                </li>
                <li>
                  <strong className="text-white">Save as Draft PO:</strong> Saves the Purchase Order in <em>Draft</em> status so you can review or adjust specifications in the Purchase Orders module before submitting.
                </li>
              </ul>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirmation Modal for Quotation Deletion */}
      {deleteConfirmQuote && (
        <ConfirmationModal
          isOpen={!!deleteConfirmQuote}
          onClose={() => setDeleteConfirmQuote(null)}
          onConfirm={handleConfirmDeleteQuotation}
          title="Delete Supplier Quotation"
          intent="danger"
          isProcessing={isDeletingQuote}
          confirmText={isDeletingQuote ? 'Deleting...' : 'Permanently Delete Quotation'}
          description="Are you sure you want to permanently delete this supplier quotation? This action removes the database record, extracted line items, AI analysis, and deletes the PDF file from storage. The parent RFQ and other bids remain intact."
          details={[
            { label: 'Supplier', value: deleteConfirmQuote.bid.vendorName },
            {
              label: 'Proposal Ref',
              value: deleteConfirmQuote.bid.attachment?.proposalRefNumber || deleteConfirmQuote.bid.quoteReference || 'N/A',
            },
            {
              label: 'Quoted Total',
              value: `SAR ${deleteConfirmQuote.bid.quotedTotalSAR.toLocaleString()}`,
            },
            {
              label: 'Attached PDF',
              value: deleteConfirmQuote.bid.attachment?.fileName || 'None',
            },
            { label: 'Linked RFQ', value: deleteConfirmQuote.evaluation.rfqNumber },
          ]}
        />
      )}
    </div>
  );
};
