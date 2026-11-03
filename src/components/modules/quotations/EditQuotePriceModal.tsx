import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Lock,
  ShieldAlert,
  Save,
  RotateCcw,
  TrendingDown,
  TrendingUp,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';
import {
  QuotationComparisonItem,
  QuotationEvaluation,
  QuoteLineItemPrice,
  RFQ,
} from '../../../types/procurement';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { Modal } from '../../common/Modal';
import { Button } from '../../common/Button';
import { Badge } from '../../common/Badge';

interface EditQuotePriceModalProps {
  isOpen: boolean;
  onClose: () => void;
  bid: QuotationComparisonItem | null;
  evaluation: QuotationEvaluation;
  rfq?: RFQ;
  onSave: (
    rfqId: string,
    vendorId: string,
    updatedLineItems: QuoteLineItemPrice[],
    newTotalSAR: number
  ) => void;
}

export const EditQuotePriceModal: React.FC<EditQuotePriceModalProps> = ({
  isOpen,
  onClose,
  bid,
  evaluation,
  rfq,
  onSave,
}) => {
  const { permissions: _perms, activeRole } = useAuth(); const permissions = _perms!;
  const { success, warning } = useToast();

  const [items, setItems] = useState<QuoteLineItemPrice[]>([]);

  // Initialize or reset line items when modal opens with a bid
  useEffect(() => {
    if (!bid) return;

    if (bid.lineItems && bid.lineItems.length > 0) {
      setItems(bid.lineItems.map((item) => ({ ...item })));
    } else if (rfq && rfq.lineItems && rfq.lineItems.length > 0) {
      // Fallback: estimate proportional line items from RFQ
      const totalTarget = rfq.lineItems.reduce(
        (acc, li) => acc + (li.targetPriceSAR || 0) * li.quantity,
        0
      );
      const ratio = totalTarget > 0 ? bid.quotedTotalSAR / totalTarget : 1;

      const generated: QuoteLineItemPrice[] = rfq.lineItems.map((li) => {
        const estUnit = Math.round((li.targetPriceSAR || 1000) * ratio);
        return {
          rfqLineItemId: li.id,
          description: li.description,
          quantity: li.quantity,
          uom: li.uom,
          unitPriceSAR: estUnit,
          totalPriceSAR: estUnit * li.quantity,
          notes: '',
        };
      });
      setItems(generated);
    } else {
      // Single lumped line item
      setItems([
        {
          rfqLineItemId: 'LI-LUMP',
          description: `${evaluation.rfqTitle} Quoted Scope`,
          quantity: 1,
          uom: 'LOT',
          unitPriceSAR: bid.quotedTotalSAR,
          totalPriceSAR: bid.quotedTotalSAR,
        },
      ]);
    }
  }, [bid, evaluation, rfq]);

  if (!bid) return null;

  const canEdit = permissions.canEditQuotePrice;

  const currentTotalSAR = items.reduce((sum, item) => sum + item.totalPriceSAR, 0);
  const originalTotalSAR = bid.quotedTotalSAR;
  const varianceFromOriginal = currentTotalSAR - originalTotalSAR;
  const variancePct = originalTotalSAR > 0 ? (varianceFromOriginal / originalTotalSAR) * 100 : 0;

  const handleUnitPriceChange = (index: number, newUnitPrice: string) => {
    if (!canEdit) return;
    const parsed = parseFloat(newUnitPrice) || 0;
    setItems((prev) =>
      prev.map((item, i) => {
        if (i === index) {
          const qty = item.quantity > 0 ? item.quantity : 1;
          return {
            ...item,
            unitPriceSAR: parsed,
            totalPriceSAR: Math.round(parsed * qty * 100) / 100,
          };
        }
        return item;
      })
    );
  };

  const handleNotesChange = (index: number, note: string) => {
    if (!canEdit) return;
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, notes: note } : item))
    );
  };

  const handleReset = () => {
    if (bid.lineItems && bid.lineItems.length > 0) {
      setItems(bid.lineItems.map((item) => ({ ...item })));
    }
  };

  const handleSave = () => {
    if (!canEdit) {
      warning(
        'Permission Denied',
        `Role '${activeRole}' does not have commercial authority to edit quotation prices.`
      );
      return;
    }

    if (currentTotalSAR <= 0) {
      warning('Invalid Total Price', 'The total quotation price must be greater than 0 SAR.');
      return;
    }

    onSave(evaluation.rfqId, bid.vendorId, items, currentTotalSAR);
    success(
      'Quotation Prices Updated',
      `Updated itemized prices for ${bid.vendorName}. New Total: SAR ${currentTotalSAR.toLocaleString()}`
    );
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Itemized Quotation Price: ${bid.vendorName}`}
      subtitle={`RFQ ${evaluation.rfqNumber} • ${evaluation.rfqTitle}`}
      maxWidth="4xl"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            {canEdit && (
              <Button
                variant="outline"
                size="sm"
                icon={<RotateCcw className="w-3.5 h-3.5" />}
                onClick={handleReset}
              >
                Reset to Original
              </Button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            {canEdit ? (
              <Button
                variant="primary"
                size="sm"
                icon={<Save className="w-3.5 h-3.5" />}
                onClick={handleSave}
              >
                Save & Update Quote Price
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                <Lock className="w-3.5 h-3.5 mr-1" />
                Read-Only (No Permission)
              </Button>
            )}
          </div>
        </div>
      }
    >
      <div className="space-y-4 text-xs">
        {/* Permission Advisory Banner */}
        {!canEdit ? (
          <div className="p-3 rounded-xl bg-amber-950/40 border border-amber-500/40 flex items-start gap-3 text-amber-200">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-300">
                Commercial Edit Permission Restricted: {activeRole}
              </p>
              <p className="text-[11px] text-amber-200/80 mt-0.5">
                Your currently active role ({activeRole}) does not have permission to modify
                tender commercial pricing. Switch to Super Admin, Procurement Director, Procurement
                Engineer, Purchasing Specialist, or Financial Controller in the top-right profile
                menu to adjust pricing.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3 rounded-xl bg-cyan-950/30 border border-cyan-800/40 flex items-center justify-between text-cyan-200">
            <div className="flex items-center gap-2">
              <Badge variant="cyan" dot>
                Commercial Pricing Authority Granted
              </Badge>
              <span className="text-[11px] text-slate-300">
                Acting as <strong>{activeRole}</strong>
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              Modifications are audited & re-rank composite bids
            </span>
          </div>
        )}

        {/* Pricing Summary Dashboard Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400 text-[10px] block">Original Quoted Bid</span>
            <span className="font-mono font-bold text-slate-200 text-sm">
              SAR {originalTotalSAR.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-500 block mt-0.5">
              Ref: {bid.attachment?.proposalRefNumber || 'N/A'}
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400 text-[10px] block">Updated Calculated Total</span>
            <span className="font-mono font-bold text-cyan-400 text-sm">
              SAR {currentTotalSAR.toLocaleString()}
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Sum of {items.length} priced line items
            </span>
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400 text-[10px] block">Variance vs Original</span>
            <div className="flex items-center gap-1.5 mt-0.5">
              {varianceFromOriginal === 0 ? (
                <span className="font-mono font-bold text-slate-300">0.0% (No Change)</span>
              ) : varianceFromOriginal > 0 ? (
                <span className="font-mono font-bold text-rose-400 flex items-center gap-0.5">
                  <TrendingUp className="w-3.5 h-3.5" /> +SAR{' '}
                  {varianceFromOriginal.toLocaleString()} (+{variancePct.toFixed(1)}%)
                </span>
              ) : (
                <span className="font-mono font-bold text-emerald-400 flex items-center gap-0.5">
                  <TrendingDown className="w-3.5 h-3.5" /> -SAR{' '}
                  {Math.abs(varianceFromOriginal).toLocaleString()} ({variancePct.toFixed(1)}%)
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-500 block">
              Budget: SAR {evaluation.totalBudgetSAR.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Itemized Line Items Table */}
        <div className="rounded-xl border border-slate-800 overflow-hidden bg-slate-950">
          <div className="px-4 py-2.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
              <span className="font-semibold text-slate-200">
                Priced Line Items ({items.length})
              </span>
            </div>
            <span className="text-[11px] text-slate-400">
              Edit individual unit prices below to recalculate quote total
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 text-[11px] border-b border-slate-800">
                <tr>
                  <th className="py-2.5 px-3 font-semibold">#</th>
                  <th className="py-2.5 px-3 font-semibold min-w-[220px]">Item Description</th>
                  <th className="py-2.5 px-3 font-semibold text-center whitespace-nowrap">
                    Qty & UoM
                  </th>
                  <th className="py-2.5 px-3 font-semibold text-right min-w-[150px]">
                    Unit Price (SAR)
                  </th>
                  <th className="py-2.5 px-3 font-semibold text-right whitespace-nowrap">
                    Line Total (SAR)
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {items.map((item, idx) => {
                  return (
                    <tr key={item.rfqLineItemId || idx} className="hover:bg-slate-900/50">
                      <td className="py-2.5 px-3 font-mono text-slate-400 font-semibold">
                        {idx + 1}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-slate-100">{item.description}</div>
                        {(item.sku || item.modelNumber) && (
                          <div className="text-[10px] text-cyan-300 font-mono mt-0.5">
                            {item.sku && <span>SKU: {item.sku} </span>}
                            {item.modelNumber && <span>Model: {item.modelNumber}</span>}
                          </div>
                        )}
                        {item.matchStatus && (
                          <div className="mt-0.5">
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 border border-slate-700 font-medium">
                              {item.matchStatus}
                            </span>
                          </div>
                        )}
                        <input
                          type="text"
                          placeholder="Optional item note or supplier clarification..."
                          value={item.notes || ''}
                          disabled={!canEdit}
                          onChange={(e) => handleNotesChange(idx, e.target.value)}
                          className="mt-1 w-full bg-slate-900/80 border border-slate-800 rounded px-2 py-0.5 text-[10px] text-slate-300 placeholder-slate-600 focus:outline-none focus:border-cyan-500 disabled:opacity-50"
                        />
                      </td>
                      <td className="py-2.5 px-3 text-center whitespace-nowrap font-mono text-slate-300">
                        <span className="font-bold text-cyan-300">{item.quantity}</span> {item.uom}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <div className="relative inline-block w-full max-w-[140px]">
                          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-mono">
                            SAR
                          </span>
                          <input
                            type="number"
                            min="0"
                            step="any"
                            disabled={!canEdit}
                            value={item.unitPriceSAR}
                            onChange={(e) => handleUnitPriceChange(idx, e.target.value)}
                            className="w-full pl-10 pr-2 py-1 bg-slate-900 border border-slate-700 rounded-lg text-right font-mono font-bold text-slate-100 text-xs focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 disabled:opacity-50 disabled:bg-slate-950"
                          />
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                        SAR {item.totalPriceSAR.toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-slate-900/80 border-t-2 border-slate-700 text-xs font-semibold">
                <tr>
                  <td colSpan={3} className="py-3 px-3 text-slate-300 font-bold">
                    Total Evaluated Quoted Amount:
                  </td>
                  <td colSpan={2} className="py-3 px-3 text-right font-mono text-sm text-cyan-300 font-extrabold">
                    SAR {currentTotalSAR.toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-400 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
          <AlertCircle className="w-4 h-4 text-cyan-400 shrink-0" />
          <span>
            Saving new item prices will update the vendor's evaluated total in the matrix, re-rank
            all submissions, and use these exact line items if this bid is awarded to draft a PO.
          </span>
        </div>
      </div>
    </Modal>
  );
};
