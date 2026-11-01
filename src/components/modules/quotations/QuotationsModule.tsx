import React, { useState } from 'react';
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
} from 'lucide-react';
import {
  QuotationEvaluation,
  QuotationComparisonItem,
  QuoteLineItemPrice,
  RFQ,
  Vendor,
} from '../../../types/procurement';
import { useCompany } from '../../../context/CompanyContext';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { Button } from '../../common/Button';
import { Badge } from '../../common/Badge';
import { Modal } from '../../common/Modal';
import { UploadQuoteModal } from './UploadQuoteModal';
import { EditQuotePriceModal } from './EditQuotePriceModal';

interface QuotationsModuleProps {
  quotations: QuotationEvaluation[];
  rfqs?: RFQ[];
  vendors?: Vendor[];
  onAwardBid: (quoteEvaluationId: string, vendorId: string) => void;
  onQuoteUploaded?: (rfqId: string, newSubmission: QuotationComparisonItem) => void;
  onUpdateQuotePrice?: (
    rfqId: string,
    vendorId: string,
    updatedLineItems: QuoteLineItemPrice[],
    newTotalSAR: number
  ) => void;
}

export const QuotationsModule: React.FC<QuotationsModuleProps> = ({
  quotations,
  rfqs = [],
  vendors = [],
  onAwardBid,
  onQuoteUploaded,
  onUpdateQuotePrice,
}) => {
  const { matchesCompany } = useCompany();
  const { permissions: _perms, activeRole } = useAuth(); const permissions = _perms!;
  const { success, warning } = useToast();

  const [selectedEvaluationIndex, setSelectedEvaluationIndex] = useState<number>(0);
  const selectedEvaluation = quotations[selectedEvaluationIndex] || quotations[0];

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedPdfBid, setSelectedPdfBid] = useState<{
    bid: QuotationComparisonItem;
    evaluation: QuotationEvaluation;
  } | null>(null);

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

  const currentRfq = rfqs.find((r) => r.id === selectedEvaluation.rfqId);

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
        `Role '${activeRole}' does not have commercial pricing authority. Switch role in the profile menu (Super Admin, Procurement Director, Procurement Engineer, Purchasing Specialist or Financial Controller) to edit prices.`
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

  const confirmAward = () => {
    if (!awardModalQuote) return;
    onAwardBid(awardModalQuote.evaluation.id, awardModalQuote.bid.vendorId);
    success(
      'Tender Awarded & PO Drafted',
      `Bid from ${awardModalQuote.bid.vendorName} awarded. Draft Purchase Order queued in ERP.`
    );
    setAwardModalQuote(null);
  };

  const handleOpenPdfWindow = (bid: QuotationComparisonItem) => {
    if (bid.attachment?.pdfDataUrl) {
      const win = window.open();
      if (win) {
        win.document.write(
          `<iframe src="${bid.attachment.pdfDataUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`
        );
      }
    } else {
      success('PDF Document Download', `Downloading ${bid.attachment?.fileName || 'supplier_quote.pdf'}`);
    }
  };

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
            onClick={() => setIsUploadModalOpen(true)}
          >
            Upload Received Quote (PDF)
          </Button>
        </div>
      </div>

      {/* Tender Package Selector & Header summary */}
      <div className="glass-panel p-5 rounded-xl border border-slate-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs font-bold text-cyan-300">
                {selectedEvaluation.rfqNumber}
              </span>
              <Badge variant={selectedEvaluation.entity === 'FITCO' ? 'cyan' : 'emerald'}>
                {selectedEvaluation.entity}
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
                          <Badge variant="emerald" dot>
                            Recommended
                          </Badge>
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
                                  {lineItems.length} BOQ Line Items
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
                                      Quantity & UOM
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
                                          {item.notes && (
                                            <div className="text-[10px] text-slate-400 mt-0.5">
                                              {item.notes}
                                            </div>
                                          )}
                                        </td>
                                        <td className="py-2.5 px-3 text-center whitespace-nowrap font-mono text-slate-300">
                                          <span className="font-bold text-cyan-300">{item.quantity}</span>{' '}
                                          {item.uom}
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
                                    <td colSpan={3} className="py-2.5 px-3 text-slate-300 font-bold">
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
                      <th className="py-2 px-3 font-semibold min-w-[200px]">Item Description</th>
                      <th className="py-2 px-3 font-semibold text-center whitespace-nowrap">Qty & UOM</th>
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
                            {item.notes && <div className="text-[10px] text-slate-400 mt-0.5">{item.notes}</div>}
                          </td>
                          <td className="py-2.5 px-3 text-center whitespace-nowrap font-mono text-slate-300">
                            <span className="font-bold text-cyan-300">{item.quantity}</span> {item.uom}
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
                      <td colSpan={3} className="py-2 px-3 text-slate-300 font-bold">
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
              <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-rose-400" />
                  <span className="font-mono font-semibold text-slate-200 text-xs">
                    {selectedPdfBid.bid.attachment?.fileName}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400">
                  <span>Page 1 of 4</span>
                  <span>•</span>
                  <span>A4 Format</span>
                </div>
              </div>

              {selectedPdfBid.bid.attachment?.pdfDataUrl ? (
                <div className="h-96 w-full">
                  <iframe
                    src={selectedPdfBid.bid.attachment.pdfDataUrl}
                    className="w-full h-full border-0"
                    title="Supplier Quotation Document"
                  />
                </div>
              ) : (
                <div className="p-6 space-y-4 bg-slate-900/40 font-sans">
                  {/* Formal Proposal Header Simulation */}
                  <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex justify-between items-start">
                    <div>
                      <div className="text-xs uppercase font-extrabold text-cyan-400 tracking-wider">
                        Official Commercial Proposal
                      </div>
                      <h4 className="text-sm font-bold text-slate-100 mt-1">
                        {selectedPdfBid.bid.vendorName}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Proposal Reference: {selectedPdfBid.bid.attachment?.proposalRefNumber}
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold">
                        ORIGINAL PDF ARCHIVED
                      </span>
                      <p className="text-[10px] text-slate-400 mt-1">
                        Validity Until: {selectedPdfBid.bid.validityDate}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 text-[10px] block">Guaranteed Lead Time</span>
                      <span className="text-sm font-bold text-slate-100 font-mono">
                        {selectedPdfBid.bid.leadTimeDays} Days Ex-Works
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 text-[10px] block">Technical Compliance</span>
                      <span className="text-sm font-bold text-emerald-400 font-mono">
                        {selectedPdfBid.bid.technicalScore}% (Evaluated)
                      </span>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                      <span className="text-slate-400 text-[10px] block">Total Proposal Amount</span>
                      <span className="text-sm font-bold text-emerald-400 font-mono">
                        SAR {selectedPdfBid.bid.quotedTotalSAR.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-lg bg-slate-950 border border-slate-800">
                    <h5 className="font-semibold text-slate-300 text-xs mb-1">
                      Commercial Scope & Technical Clarifications:
                    </h5>
                    <p className="text-slate-400 text-xs leading-relaxed">
                      {selectedPdfBid.bid.notes}
                    </p>
                  </div>
                </div>
              )}
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
          maxWidth="md"
          footer={
            <>
              <Button variant="outline" size="sm" onClick={() => setAwardModalQuote(null)}>
                Cancel
              </Button>
              <Button variant="primary" size="sm" onClick={confirmAward}>
                Authorize & Generate Purchase Order
              </Button>
            </>
          }
        >
          <div className="space-y-3 text-xs">
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

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Upon confirmation, ProcureOS will update tender status to 'Awarded', link the verified quotation PDF, and instantiate a new Purchase Order in the ERP pipeline with these exact awarded line items.
            </p>
          </div>
        </Modal>
      )}
    </div>
  );
};
