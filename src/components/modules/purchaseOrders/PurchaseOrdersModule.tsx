import React, { useState } from 'react';
import {
  FileCheck2,
  Plus,
  Printer,
  Eye,
  CheckCircle2,
  AlertCircle,
  Truck,
  CreditCard,
  Building,
  Calendar,
} from 'lucide-react';
import { PurchaseOrder, POStatus, EntityId } from '../../../types/procurement';
import { useCompany } from '../../../context/CompanyContext';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { Button } from '../../common/Button';
import { Badge } from '../../common/Badge';
import { SearchInput } from '../../common/SearchInput';
import { Modal } from '../../common/Modal';
import { EmptyState } from '../../common/EmptyState';
import { ConfirmationModal } from '../../common/ConfirmationModal';

interface PurchaseOrdersModuleProps {
  purchaseOrders: PurchaseOrder[];
  onAddPO: (newPO: PurchaseOrder) => void;
  onApprovePO: (poId: string) => void;
  onRejectPO?: (poId: string) => void;
  openCreateModal?: boolean;
  onCloseCreateModal?: () => void;
}

export const PurchaseOrdersModule: React.FC<PurchaseOrdersModuleProps> = ({
  purchaseOrders,
  onAddPO,
  onApprovePO,
  onRejectPO,
  openCreateModal = false,
  onCloseCreateModal,
}) => {
  const { matchesCompany } = useCompany();
  const { permissions: _perms, activeRole } = useAuth(); const permissions = _perms!;
  const { success, warning } = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(openCreateModal);

  // Confirmation Modals State
  const [confirmApprovalPO, setConfirmApprovalPO] = useState<PurchaseOrder | null>(null);
  const [confirmRejectPO, setConfirmRejectPO] = useState<PurchaseOrder | null>(null);

  // New PO Form State
  const [form, setForm] = useState({
    vendorName: 'Al-Tamimi Industrial Flow Systems Co.',
    entity: 'FITCO' as EntityId,
    projectSite: 'Shedgum Gas Compression Station 3',
    expectedDeliveryDate: '2026-11-20',
    totalAmountSAR: '',
    paymentTerms: '30% Advance, 70% Post-Delivery & MTC Verification',
  });

  const filteredPOs = purchaseOrders.filter((po) => {
    const matchesScope = matchesCompany(po.entity);
    const matchesStatus = statusFilter === 'ALL' || po.status === statusFilter;
    const matchesQuery =
      po.poNumber.toLowerCase().includes(search.toLowerCase()) ||
      po.vendorName.toLowerCase().includes(search.toLowerCase()) ||
      po.projectSite.toLowerCase().includes(search.toLowerCase());
    return matchesScope && matchesStatus && matchesQuery;
  });

  const handleApprove = (po: PurchaseOrder) => {
    if (!permissions.canApprovePO) {
      warning(
        'Authorization Denied',
        `Role '${activeRole}' does not possess the requisite authority to approve Purchase Orders.`
      );
      return;
    }
    setConfirmApprovalPO(po);
  };

  const executeApproval = (po: PurchaseOrder) => {
    onApprovePO(po.id);
    success('Purchase Order Approved', `${po.poNumber} authorized.`);
    if (selectedPO?.id === po.id) {
      setSelectedPO({ ...po, status: 'Approved' });
    }
    setConfirmApprovalPO(null);
  };

  const handleReject = (po: PurchaseOrder) => {
    if (!permissions.canApprovePO) {
      warning(
        'Authorization Denied',
        `Role '${activeRole}' cannot reject Purchase Orders.`
      );
      return;
    }
    setConfirmRejectPO(po);
  };

  const executeReject = (po: PurchaseOrder) => {
    if (onRejectPO) onRejectPO(po.id);
    warning('Purchase Order Rejected', `${po.poNumber} returned to Draft.`);
    if (selectedPO?.id === po.id) {
      setSelectedPO({ ...po, status: 'Draft' });
    }
    setConfirmRejectPO(null);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.totalAmountSAR) return;

    const netAmount = parseFloat(form.totalAmountSAR) || 0;
    const vatAmount = netAmount * 0.15;
    const grandTotal = netAmount + vatAmount;

    const newPO: PurchaseOrder = {
      id: `PO-${Date.now().toString().slice(-4)}`,
      poNumber: `PO-${form.entity === 'FITCO' ? 'FTC' : 'ARB'}-26-0${Math.floor(500 + Math.random() * 499)}`,
      vendorId: 'VND-001',
      vendorName: form.vendorName,
      entity: form.entity,
      projectSite: form.projectSite,
      issueDate: new Date().toISOString().split('T')[0],
      expectedDeliveryDate: form.expectedDeliveryDate,
      totalAmountSAR: netAmount,
      taxAmountSAR: vatAmount,
      grandTotalSAR: grandTotal,
      status: 'Pending Approval',
      paymentTerms: form.paymentTerms,
      approvalStage: 'Purchasing',
      currentApproverRole: 'Procurement Director',
      paymentStatus: 'Unpaid',
      lineItems: [
        {
          id: 'POL-AUTO-1',
          sku: 'ITM-AUTO-01',
          description: 'Package line items per approved tender specification',
          quantity: 1,
          uom: 'LOT',
          unitPriceSAR: netAmount,
          totalPriceSAR: netAmount,
        },
      ],
    };

    onAddPO(newPO);
    success('Purchase Order Generated', `${newPO.poNumber} drafted and submitted for authorization.`);
    setIsCreateModalOpen(false);
    if (onCloseCreateModal) onCloseCreateModal();
  };

  const getStatusBadgeVariant = (status: POStatus) => {
    switch (status) {
      case 'Approved':
      case 'Received':
        return 'emerald';
      case 'Pending Approval':
        return 'amber';
      case 'In Transit':
      case 'Issued':
        return 'cyan';
      case 'Invoiced':
      case 'Closed':
        return 'purple';
      default:
        return 'slate';
    }
  };

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <FileCheck2 className="w-6 h-6 text-cyan-400" />
            Purchase Orders (POs) Management
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-0.5">
            Commercial binding orders, VAT accounting, delivery schedules, and authorization governance
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setIsCreateModalOpen(true)}
        >
          Issue Purchase Order
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by PO number, vendor or project site..."
          className="w-full sm:w-96"
        />

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {['ALL', 'Pending Approval', 'Approved', 'In Transit', 'Issued'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                statusFilter === s
                  ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* PO Table */}
      {filteredPOs.length === 0 ? (
        <EmptyState
          title="No purchase orders found"
          description="Adjust your search criteria or create a new purchase order."
          actionLabel="Issue Purchase Order"
          onAction={() => setIsCreateModalOpen(true)}
        />
      ) : (
        <div className="glass-panel rounded-xl overflow-hidden border border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 text-[11px] border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">PO Number</th>
                  <th className="py-3.5 px-4 font-semibold">Entity</th>
                  <th className="py-3.5 px-4 font-semibold">Vendor Company</th>
                  <th className="py-3.5 px-4 font-semibold">Project Site</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Grand Total (Incl. 15% VAT)</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold">Payment Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredPOs.map((po) => (
                  <tr key={po.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-cyan-300 whitespace-nowrap">
                      {po.poNumber}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <Badge variant={po.entity === 'FITCO' ? 'cyan' : 'emerald'}>
                        {po.entity}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-200 min-w-[200px]">
                      {po.vendorName}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap">
                      {po.projectSite}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400 whitespace-nowrap">
                      SAR {po.grandTotalSAR.toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <Badge variant={getStatusBadgeVariant(po.status)} dot>
                        {po.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-medium text-slate-300 text-[11px]">
                        {po.paymentStatus}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedPO(po)}
                          className="p-1.5 rounded bg-slate-800 text-slate-300 hover:text-cyan-300 hover:bg-slate-700 transition-colors"
                          title="Inspect PO details & lifecycle"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {po.status === 'Pending Approval' && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleApprove(po)}
                            className="text-[11px] py-1 px-2.5"
                          >
                            Approve
                          </Button>
                        )}
                        {po.status === 'Pending Approval' && onRejectPO && (
                          <button
                            onClick={() => handleReject(po)}
                            className="text-[11px] py-1 px-2.5 rounded-lg bg-rose-950/60 border border-rose-700/40 text-rose-300 hover:bg-rose-900/60 transition-colors font-semibold"
                          >
                            Reject
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PO Detail & Lifecycle Stepper Modal */}
      {selectedPO && (
        <Modal
          isOpen={!!selectedPO}
          onClose={() => setSelectedPO(null)}
          title={`Purchase Order: ${selectedPO.poNumber}`}
          subtitle={`Entity: ${selectedPO.entity} | Issued to: ${selectedPO.vendorName}`}
          maxWidth="2xl"
          footer={
            <div className="flex items-center justify-between w-full">
              <Button
                variant="outline"
                size="sm"
                icon={<Printer className="w-3.5 h-3.5" />}
                onClick={() => success('Document Queued', 'Sent official PO PDF to printer spool.')}
              >
                Print Official PO
              </Button>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setSelectedPO(null)}>
                  Close
                </Button>
                {selectedPO.status === 'Pending Approval' && (
                  <Button variant="primary" size="sm" onClick={() => handleApprove(selectedPO)}>
                    Approve PO
                  </Button>
                )}
              </div>
            </div>
          }
        >
          <div className="space-y-5 text-xs">
            {/* Status Stepper */}
            <div>
              <p className="font-semibold text-slate-300 uppercase text-[10px] tracking-wider mb-2">
                Order Lifecycle Stepper
              </p>
              <div className="flex items-center justify-between bg-slate-950 p-3 rounded-xl border border-slate-800">
                {['Draft', 'Approved', 'Issued', 'In Transit', 'Received'].map((step, idx) => {
                  const isCurrent = selectedPO.status === step;
                  const isPassed =
                    (selectedPO.status === 'Approved' && idx <= 1) ||
                    (selectedPO.status === 'Issued' && idx <= 2) ||
                    (selectedPO.status === 'In Transit' && idx <= 3) ||
                    (selectedPO.status === 'Received' && idx <= 4);

                  return (
                    <div key={step} className="flex flex-col items-center flex-1 relative">
                      <div
                        className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] mb-1 ${
                          isPassed || isCurrent
                            ? 'bg-cyan-500 text-slate-950'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {idx + 1}
                      </div>
                      <span
                        className={`text-[10px] ${
                          isCurrent
                            ? 'text-cyan-400 font-bold'
                            : isPassed
                            ? 'text-slate-200'
                            : 'text-slate-500'
                        }`}
                      >
                        {step}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Financial Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <div>
                <span className="text-slate-400 block text-[10px]">Net Amount</span>
                <span className="font-mono text-slate-200">
                  SAR {selectedPO.totalAmountSAR.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">VAT (15%)</span>
                <span className="font-mono text-slate-200">
                  SAR {selectedPO.taxAmountSAR.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Grand Total</span>
                <span className="font-mono font-bold text-emerald-400 text-sm">
                  SAR {selectedPO.grandTotalSAR.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Payment Status</span>
                <span className="text-cyan-300 font-semibold">{selectedPO.paymentStatus}</span>
              </div>
            </div>

            {/* Line items list */}
            <div>
              <h5 className="font-semibold text-slate-300 uppercase text-[10px] tracking-wider mb-2">
                Line Items in Purchase Order
              </h5>
              <div className="border border-slate-800 rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 text-[11px]">
                    <tr>
                      <th className="p-2.5">SKU / Item</th>
                      <th className="p-2.5">Description</th>
                      <th className="p-2.5 text-right">Quantity</th>
                      <th className="p-2.5 text-right">Unit Price</th>
                      <th className="p-2.5 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {selectedPO.lineItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-800/30">
                        <td className="p-2.5 font-mono text-cyan-300 text-[11px]">{item.sku}</td>
                        <td className="p-2.5 text-slate-200">{item.description}</td>
                        <td className="p-2.5 text-right font-mono">
                          {item.quantity} {item.uom}
                        </td>
                        <td className="p-2.5 text-right font-mono">
                          SAR {item.unitPriceSAR.toLocaleString()}
                        </td>
                        <td className="p-2.5 text-right font-mono font-semibold text-slate-100">
                          SAR {item.totalPriceSAR.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Create PO Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          if (onCloseCreateModal) onCloseCreateModal();
        }}
        title="Issue Purchase Order (PO)"
        subtitle="Create formal binding procurement order for supplier"
        maxWidth="xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-300 mb-1">Company Entity *</label>
              <select
                value={form.entity}
                onChange={(e) => setForm({ ...form, entity: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
              >
                <option value="FITCO">FITCO Telematics & AI Safety</option>
                <option value="ARABITRA">Arabitra Fleet & LMI Tracking</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-300 mb-1">Expected Delivery Date *</label>
              <input
                type="date"
                required
                value={form.expectedDeliveryDate}
                onChange={(e) => setForm({ ...form, expectedDeliveryDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-300 mb-1">Vendor Supplier *</label>
            <input
              type="text"
              required
              value={form.vendorName}
              onChange={(e) => setForm({ ...form, vendorName: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-300 mb-1">Project Site Location *</label>
              <input
                type="text"
                required
                value={form.projectSite}
                onChange={(e) => setForm({ ...form, projectSite: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-300 mb-1">Net Order Amount (SAR) *</label>
              <input
                type="number"
                required
                placeholder="Excluding 15% VAT"
                value={form.totalAmountSAR}
                onChange={(e) => setForm({ ...form, totalAmountSAR: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-300 mb-1">Commercial Payment Terms</label>
            <input
              type="text"
              value={form.paymentTerms}
              onChange={(e) => setForm({ ...form, paymentTerms: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsCreateModalOpen(false);
                if (onCloseCreateModal) onCloseCreateModal();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Generate Purchase Order
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Modal: Approve PO */}
      {confirmApprovalPO && (
        <ConfirmationModal
          isOpen={Boolean(confirmApprovalPO)}
          onClose={() => setConfirmApprovalPO(null)}
          onConfirm={() => executeApproval(confirmApprovalPO)}
          title="Confirm Purchase Order Authorization"
          description={`Are you sure you want to authorize ${confirmApprovalPO.poNumber}? This commits the organization to the commercial terms and triggers procurement fulfillment.`}
          confirmText="Yes, Authorize PO"
          cancelText="Review Again"
          intent="success"
          details={[
            { label: 'PO Number', value: confirmApprovalPO.poNumber },
            { label: 'Supplier', value: confirmApprovalPO.vendorName },
            { label: 'Total Value', value: `SAR ${confirmApprovalPO.grandTotalSAR.toLocaleString()}` },
            { label: 'Project Site', value: confirmApprovalPO.projectSite },
          ]}
        />
      )}

      {/* Confirmation Modal: Reject PO */}
      {confirmRejectPO && (
        <ConfirmationModal
          isOpen={Boolean(confirmRejectPO)}
          onClose={() => setConfirmRejectPO(null)}
          onConfirm={() => executeReject(confirmRejectPO)}
          title="Confirm Purchase Order Rejection"
          description={`Are you sure you want to reject ${confirmRejectPO.poNumber}? The status will revert to Draft and require revisions before re-submission.`}
          confirmText="Yes, Reject to Draft"
          cancelText="Cancel"
          intent="warning"
          details={[
            { label: 'PO Number', value: confirmRejectPO.poNumber },
            { label: 'Supplier', value: confirmRejectPO.vendorName },
            { label: 'Total Value', value: `SAR ${confirmRejectPO.grandTotalSAR.toLocaleString()}` },
          ]}
        />
      )}
    </div>
  );
};
