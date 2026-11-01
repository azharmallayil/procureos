import React, { useState } from 'react';
import { Check, X, Eye, FileCheck2, ShieldAlert } from 'lucide-react';
import { PurchaseOrder } from '../../../types/procurement';
import { Badge } from '../../common/Badge';
import { Button } from '../../common/Button';
import { Modal } from '../../common/Modal';
import { ConfirmationModal } from '../../common/ConfirmationModal';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';

interface PendingApprovalsListProps {
  purchaseOrders: PurchaseOrder[];
  onApprovePO: (poId: string) => void;
  onRejectPO: (poId: string) => void;
}

export const PendingApprovalsList: React.FC<PendingApprovalsListProps> = ({
  purchaseOrders,
  onApprovePO,
  onRejectPO,
}) => {
  const { permissions: _perms, activeRole } = useAuth(); const permissions = _perms!;
  const { success, warning } = useToast();
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [confirmApprovalPO, setConfirmApprovalPO] = useState<PurchaseOrder | null>(null);
  const [confirmRejectPO, setConfirmRejectPO] = useState<PurchaseOrder | null>(null);

  const pendingPOs = purchaseOrders.filter((po) => po.status === 'Pending Approval');

  const handleApprove = (po: PurchaseOrder) => {
    if (!permissions.canApprovePO) {
      warning(
        'Authorization Guard Blocked Action',
        `Role '${activeRole}' does not possess the requisite server authority to sign off Purchase Orders.`
      );
      return;
    }
    if (po.totalAmountSAR > 1000000 && !permissions.canApproveHighValuePO) {
      warning(
        'Authority Limit Exceeded',
        `PO value (${(po.totalAmountSAR / 1000000).toFixed(1)}M SAR) requires Executive VP approval.`
      );
      return;
    }
    setConfirmApprovalPO(po);
  };

  const executeApproval = (po: PurchaseOrder) => {
    onApprovePO(po.id);
    success('Purchase Order Approved', `${po.poNumber} authorized and queued for issuance.`);
    setSelectedPO(null);
    setConfirmApprovalPO(null);
  };

  const handleReject = (po: PurchaseOrder) => {
    setConfirmRejectPO(po);
  };

  const executeReject = (po: PurchaseOrder) => {
    onRejectPO(po.id);
    warning('Purchase Order Returned', `${po.poNumber} sent back to originator for revisions.`);
    setSelectedPO(null);
    setConfirmRejectPO(null);
  };

  return (
    <div className="space-y-3">
      {pendingPOs.length === 0 ? (
        <div className="p-6 text-center text-slate-400 text-xs bg-slate-900/30 rounded-xl border border-dashed border-slate-800">
          No pending approvals requiring immediate authorization.
        </div>
      ) : (
        pendingPOs.map((po) => (
          <div
            key={po.id}
            className="p-4 rounded-xl bg-slate-900/60 border border-slate-800/90 hover:border-slate-700/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
          >
            <div className="min-w-0 space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold text-cyan-300">{po.poNumber}</span>
                <Badge
                  variant={po.entity === 'FITCO' ? 'cyan' : 'emerald'}
                  className="text-[10px]"
                >
                  {po.entity}
                </Badge>
                <Badge variant="amber" dot className="text-[10px]">
                  Stage: {po.approvalStage}
                </Badge>
              </div>
              <p className="text-xs font-semibold text-slate-200 truncate">{po.vendorName}</p>
              <div className="flex items-center gap-3 text-[11px] text-slate-400">
                <span>Site: {po.projectSite}</span>
                <span>•</span>
                <span className="font-mono text-emerald-400 font-semibold">
                  SAR {po.grandTotalSAR.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => setSelectedPO(po)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
                title="Inspect Line Items"
              >
                <Eye className="w-4 h-4" />
              </button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleReject(po)}
                className="text-rose-300 border-rose-800/50 hover:bg-rose-950/40 px-2.5"
              >
                <X className="w-3.5 h-3.5 mr-1" />
                Reject
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleApprove(po)}
                className="px-2.5"
              >
                <Check className="w-3.5 h-3.5 mr-1" />
                Approve
              </Button>
            </div>
          </div>
        ))
      )}

      {/* Detail Review Modal */}
      {selectedPO && (
        <Modal
          isOpen={!!selectedPO}
          onClose={() => setSelectedPO(null)}
          title={`Authorization Review: ${selectedPO.poNumber}`}
          subtitle={`Entity: ${selectedPO.entity} | Vendor: ${selectedPO.vendorName}`}
          maxWidth="2xl"
          footer={
            <>
              <Button variant="outline" size="sm" onClick={() => setSelectedPO(null)}>
                Close
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleReject(selectedPO)}
              >
                Reject / Return
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleApprove(selectedPO)}
              >
                Sign & Authorize PO
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px]">Project Site</span>
                <span className="font-medium text-slate-200">{selectedPO.projectSite}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Payment Terms</span>
                <span className="font-medium text-slate-200">{selectedPO.paymentTerms}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Net Value</span>
                <span className="font-mono text-slate-200">
                  SAR {selectedPO.totalAmountSAR.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Total Incl. 15% VAT</span>
                <span className="font-mono font-bold text-emerald-400">
                  SAR {selectedPO.grandTotalSAR.toLocaleString()}
                </span>
              </div>
            </div>

            <div>
              <h5 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                Line Items Breakdown
              </h5>
              <div className="border border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 text-[11px]">
                    <tr>
                      <th className="p-2.5">SKU / Code</th>
                      <th className="p-2.5">Description</th>
                      <th className="p-2.5 text-right">Qty</th>
                      <th className="p-2.5 text-right">Unit Price (SAR)</th>
                      <th className="p-2.5 text-right">Total (SAR)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {selectedPO.lineItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/30">
                        <td className="p-2.5 font-mono text-cyan-300 text-[11px]">{item.sku}</td>
                        <td className="p-2.5 text-slate-200">{item.description}</td>
                        <td className="p-2.5 text-right font-mono">
                          {item.quantity} {item.uom}
                        </td>
                        <td className="p-2.5 text-right font-mono">
                          {item.unitPriceSAR.toLocaleString()}
                        </td>
                        <td className="p-2.5 text-right font-mono font-medium text-slate-100">
                          {item.totalPriceSAR.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2.5">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Compliance & Audit Verification</p>
                <p className="text-[11px] text-amber-300/80 mt-0.5">
                  Approval of this Purchase Order registers an immutable digital signature with timestamp and active role claims ({activeRole}).
                </p>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Confirmation Modal: Approve PO */}
      {confirmApprovalPO && (
        <ConfirmationModal
          isOpen={Boolean(confirmApprovalPO)}
          onClose={() => setConfirmApprovalPO(null)}
          onConfirm={() => executeApproval(confirmApprovalPO)}
          title="Authorize Purchase Order"
          description={`Confirm signature and authorization for ${confirmApprovalPO.poNumber}? This digitally signs the contract and releases it to the supplier.`}
          confirmText="Yes, Authorize PO"
          cancelText="Cancel"
          intent="success"
          details={[
            { label: 'PO Number', value: confirmApprovalPO.poNumber },
            { label: 'Vendor', value: confirmApprovalPO.vendorName },
            { label: 'Amount', value: `SAR ${confirmApprovalPO.grandTotalSAR.toLocaleString()}` },
          ]}
        />
      )}

      {/* Confirmation Modal: Reject PO */}
      {confirmRejectPO && (
        <ConfirmationModal
          isOpen={Boolean(confirmRejectPO)}
          onClose={() => setConfirmRejectPO(null)}
          onConfirm={() => executeReject(confirmRejectPO)}
          title="Return Purchase Order for Revision"
          description={`Are you sure you want to return ${confirmRejectPO.poNumber} to the originator?`}
          confirmText="Yes, Return to Originator"
          cancelText="Cancel"
          intent="warning"
          details={[
            { label: 'PO Number', value: confirmRejectPO.poNumber },
            { label: 'Vendor', value: confirmRejectPO.vendorName },
            { label: 'Amount', value: `SAR ${confirmRejectPO.grandTotalSAR.toLocaleString()}` },
          ]}
        />
      )}
    </div>
  );
};
