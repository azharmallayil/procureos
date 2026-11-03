import React, { useState } from 'react';
import {
  FileQuestion,
  Plus,
  Clock,
  Calendar,
  Building,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Trash2,
} from 'lucide-react';
import { RFQ, EntityId, Vendor } from '../../../types/procurement';
import { useCompany } from '../../../context/CompanyContext';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { Button } from '../../common/Button';
import { Badge } from '../../common/Badge';
import { SearchInput } from '../../common/SearchInput';
import { Modal } from '../../common/Modal';
import { ConfirmationModal } from '../../common/ConfirmationModal';
import { EmptyState } from '../../common/EmptyState';

interface RfqsModuleProps {
  rfqs: RFQ[];
  vendors: Vendor[];
  onAddRfq: (newRfq: RFQ) => void;
  onNavigateToQuotes: (rfqId: string) => void;
  onDeleteRfq?: (rfqId: string) => Promise<boolean> | void;
  openCreateModal?: boolean;
  onCloseCreateModal?: () => void;
}

export const RfqsModule: React.FC<RfqsModuleProps> = ({
  rfqs,
  vendors,
  onAddRfq,
  onNavigateToQuotes,
  onDeleteRfq,
  openCreateModal = false,
  onCloseCreateModal,
}) => {
  const { matchesCompany } = useCompany();
  const { permissions: _perms, activeRole } = useAuth(); const permissions = _perms!;
  const { success, warning } = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(openCreateModal);
  const [deleteConfirmRfq, setDeleteConfirmRfq] = useState<RFQ | null>(null);
  const [isDeletingRfq, setIsDeletingRfq] = useState(false);
  const [selectedVendorIds, setSelectedVendorIds] = useState<string[]>(() => vendors.filter((vendor) =>
    (vendor.status === 'Approved' || vendor.status === 'Preferred') &&
    (vendor.entityScope === 'Joint / Group' || vendor.entityScope === 'FITCO Approved')
  ).slice(0, 4).map((vendor) => vendor.id));

  // Form State
  const [form, setForm] = useState({
    title: '',
    projectName: '',
    entity: 'FITCO' as EntityId,
    closingDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    budgetEstimatedSAR: '',
    priority: 'High' as 'Urgent' | 'High' | 'Normal',
  });

  const [lineItems, setLineItems] = useState<{ description: string; quantity: number; uom: string; targetPriceSAR: number }[]>([
    { description: '', quantity: 1, uom: 'EA', targetPriceSAR: 0 },
  ]);

  const eligibleVendors = vendors.filter((vendor) =>
    (vendor.status === 'Approved' || vendor.status === 'Preferred') &&
    (vendor.entityScope === 'Joint / Group' ||
      (form.entity === 'FITCO' && vendor.entityScope === 'FITCO Approved') ||
      (form.entity === 'ARABITRA' && vendor.entityScope === 'Arabitra Approved'))
  );

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', quantity: 1, uom: 'EA', targetPriceSAR: 0 }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const filteredRfqs = rfqs.filter((r) => {
    const matchesScope = matchesCompany(r.entity);
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    const matchesQuery =
      r.rfqNumber.toLowerCase().includes(search.toLowerCase()) ||
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      r.projectName.toLowerCase().includes(search.toLowerCase());
    return matchesScope && matchesStatus && matchesQuery;
  });

  const handleDeleteRfqClick = (rfq: RFQ, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!permissions.canDeleteRFQ) {
      warning(
        'RFQ Deletion Restricted',
        `Role '${activeRole}' does not have authority to delete tender packages. Super Admin or Procurement Director required.`
      );
      return;
    }
    setDeleteConfirmRfq(rfq);
  };

  const handleConfirmDeleteRfq = async () => {
    if (!deleteConfirmRfq) return;
    setIsDeletingRfq(true);
    try {
      if (onDeleteRfq) {
        await onDeleteRfq(deleteConfirmRfq.id);
      }
      setDeleteConfirmRfq(null);
    } catch (err) {
      console.error('Failed to delete RFQ:', err);
    } finally {
      setIsDeletingRfq(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !form.projectName.trim() || !form.budgetEstimatedSAR || selectedVendorIds.length === 0) return;

    const now = new Date();
    const year = now.getFullYear();
    const suffix = `${now.getTime().toString().slice(-6)}${Math.floor(Math.random() * 10)}`;
    const newRfq: RFQ = {
      id: `RFQ-${globalThis.crypto?.randomUUID?.() || now.getTime().toString()}`,
      rfqNumber: `RFQ-${form.entity === 'FITCO' ? 'FTC' : 'ARB'}-${year}-${suffix}`,
      title: form.title,
      projectName: form.projectName,
      entity: form.entity,
      status: 'Open',
      publishDate: new Date().toISOString().split('T')[0],
      closingDate: form.closingDate,
      budgetEstimatedSAR: parseFloat(form.budgetEstimatedSAR) || 0,
      invitedVendorsCount: selectedVendorIds.length,
      invitedVendorIds: [...selectedVendorIds],
      receivedBidsCount: 0,
      requestedBy: 'Current Specialist',
      priority: form.priority,
      lineItems: lineItems.map((item, idx) => ({
        id: `LI-${idx + 1}-${now.getTime()}`,
        description: item.description.trim(),
        quantity: item.quantity,
        uom: item.uom,
        targetPriceSAR: item.targetPriceSAR,
      })),
    };

    onAddRfq(newRfq);
    success('RFQ Tender Published', `${newRfq.rfqNumber} opened for supplier bids.`);
    setIsModalOpen(false);
    setSelectedVendorIds([]);
    setForm({ ...form, title: '', projectName: '', budgetEstimatedSAR: '' });
    setLineItems([{ description: '', quantity: 1, uom: 'EA', targetPriceSAR: 0 }]);
    if (onCloseCreateModal) onCloseCreateModal();
  };

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <FileQuestion className="w-6 h-6 text-cyan-400" />
            Request for Quotations (RFQs) & Tenders
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-0.5">
            Competitive bid tendering packages, bill of quantities (BOQ), and vendor response tracking
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setIsModalOpen(true)}
        >
          Create Tender Package
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search RFQ number, project or tender title..."
          className="w-full sm:w-96"
        />

        <div className="flex items-center gap-2">
          {['ALL', 'Open', 'Under Evaluation', 'Awarded', 'Closed'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
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

      {/* RFQ Cards Grid */}
      {filteredRfqs.length === 0 ? (
        <EmptyState
          title="No RFQ tender packages found"
          description="Create a new competitive tender package or change your status filters."
          actionLabel="Create Tender Package"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredRfqs.map((rfq) => (
            <div
              key={rfq.id}
              className="glass-panel p-5 rounded-xl border border-slate-800 hover:border-slate-700/80 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-cyan-300">
                      {rfq.rfqNumber}
                    </span>
                    <Badge variant={rfq.entity === 'FITCO' ? 'cyan' : 'emerald'}>
                      {rfq.entity}
                    </Badge>
                  </div>
                  <Badge
                    variant={
                      rfq.status === 'Open'
                        ? 'cyan'
                        : rfq.status === 'Under Evaluation'
                        ? 'amber'
                        : rfq.status === 'Awarded'
                        ? 'emerald'
                        : 'slate'
                    }
                    dot
                  >
                    {rfq.status}
                  </Badge>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-100 line-clamp-2">{rfq.title}</h3>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-1">
                    <Building className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Project: {rfq.projectName}</span>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-slate-950/70 border border-slate-800 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Est. Budget</span>
                    <span className="font-mono font-bold text-slate-200">
                      SAR {(rfq.budgetEstimatedSAR / 1000).toFixed(0)}k
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Tender Closes</span>
                    <span className="text-slate-300 font-medium">{rfq.closingDate}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Bids Received</span>
                    <span className="font-mono font-bold text-cyan-400">
                      {rfq.receivedBidsCount} / {rfq.invitedVendorsCount}
                    </span>
                  </div>
                </div>

                {rfq.purchaseRequisitionNumber && (
                  <div className="text-[11px] text-emerald-300">Source requisition: {rfq.purchaseRequisitionNumber}</div>
                )}
                <div className="text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-300">BOQ Items: </span>
                  {rfq.lineItems.map((li) => `${li.quantity} ${li.uom} ${li.description}`).join('; ')}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-[10px] text-slate-400">
                  Requested by: {rfq.requestedBy}
                </span>
                <div className="flex items-center gap-2">
                  {permissions.canDeleteRFQ && (
                    <button
                      type="button"
                      onClick={(e) => handleDeleteRfqClick(rfq, e)}
                      className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 hover:border-rose-500/40 transition-colors cursor-pointer"
                      title={`Delete RFQ ${rfq.rfqNumber}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onNavigateToQuotes(rfq.id)}
                    className="text-xs"
                  >
                    Evaluate Bids <ArrowRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create RFQ Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          if (onCloseCreateModal) onCloseCreateModal();
        }}
        title="Create Competitive RFQ Tender Package"
        subtitle="Issue quotation invitation to qualified vendors"
        maxWidth="2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-300 mb-1">Target Entity *</label>
              <select
                value={form.entity}
                onChange={(e) => {
                  const entity = e.target.value as EntityId;
                  setForm({ ...form, entity });
                  const nextEligible = vendors.filter((vendor) =>
                    (vendor.status === 'Approved' || vendor.status === 'Preferred') &&
                    (vendor.entityScope === 'Joint / Group' ||
                      (entity === 'FITCO' && vendor.entityScope === 'FITCO Approved') ||
                      (entity === 'ARABITRA' && vendor.entityScope === 'Arabitra Approved'))
                  );
                  setSelectedVendorIds(nextEligible.slice(0, 4).map((vendor) => vendor.id));
                }}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
              >
                <option value="FITCO">FITCO Telematics & AI Safety</option>
                <option value="ARABITRA">Arabitra Fleet & LMI Tracking</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-300 mb-1">Priority Level</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
              >
                <option value="Urgent">Urgent Expedited</option>
                <option value="High">High Priority</option>
                <option value="Normal">Normal Schedule</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-300 mb-1">Package Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Shedgum Gas Plant High-Pressure Control Valves Package"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-medium text-slate-300 mb-1">Project Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Shedgum Ph-2 Decarbonization"
                value={form.projectName}
                onChange={(e) => setForm({ ...form, projectName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-300 mb-1">Submission Deadline *</label>
              <input
                type="date"
                required
                value={form.closingDate}
                onChange={(e) => setForm({ ...form, closingDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-300 mb-1">Budget Allocation (SAR) *</label>
              <input
                type="number"
                required
                placeholder="e.g. 3500000"
                value={form.budgetEstimatedSAR}
                onChange={(e) => setForm({ ...form, budgetEstimatedSAR: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Vendor Invitation List */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-slate-300 uppercase text-[10px] tracking-wider">Invite Approved Vendors *</span>
              <span className="text-[10px] text-cyan-300 font-semibold">{selectedVendorIds.length} selected</span>
            </div>
            {eligibleVendors.length === 0 ? (
              <p className="text-amber-300 text-[11px]">No approved vendors are available for this entity. Register and approve vendors first.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-36 overflow-y-auto pr-1">
                {eligibleVendors.map((vendor) => (
                  <label key={vendor.id} className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950 px-3 py-2 text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedVendorIds.includes(vendor.id)}
                      onChange={(event) => setSelectedVendorIds((current) =>
                        event.target.checked ? [...current, vendor.id] : current.filter((id) => id !== vendor.id)
                      )}
                      className="accent-cyan-500"
                    />
                    <span className="min-w-0"><span className="block truncate font-medium">{vendor.name}</span><span className="block text-[10px] text-slate-500">{vendor.code} · {vendor.status}</span></span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Line Items Builder */}
          <div className="pt-2">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-slate-300 uppercase text-[10px] tracking-wider">
                Bill of Quantities (BOQ) Items
              </span>
              <button
                type="button"
                onClick={addLineItem}
                className="text-cyan-400 hover:text-cyan-300 text-xs font-semibold flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Line
              </button>
            </div>

            <div className="space-y-2">
              {lineItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <input
                    type="text"
                    required
                    placeholder="Specification Description"
                    value={item.description}
                    onChange={(e) => {
                      const updated = [...lineItems];
                      updated[idx].description = e.target.value;
                      setLineItems(updated);
                    }}
                    className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-100 focus:outline-none"
                  />
                  <input
                    type="number"
                    placeholder="Qty"
                    value={item.quantity}
                    onChange={(e) => {
                      const updated = [...lineItems];
                      updated[idx].quantity = parseInt(e.target.value) || 1;
                      setLineItems(updated);
                    }}
                    className="w-16 px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-100 font-mono text-center focus:outline-none"
                  />
                  <input
                    type="text"
                    placeholder="UOM"
                    value={item.uom}
                    onChange={(e) => {
                      const updated = [...lineItems];
                      updated[idx].uom = e.target.value.toUpperCase();
                      setLineItems(updated);
                    }}
                    className="w-14 px-2 py-1.5 bg-slate-900 border border-slate-700 rounded text-xs text-slate-100 font-mono text-center focus:outline-none"
                  />
                  {lineItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeLineItem(idx)}
                      className="p-1 text-slate-400 hover:text-rose-400"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setIsModalOpen(false);
                if (onCloseCreateModal) onCloseCreateModal();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={selectedVendorIds.length === 0 || eligibleVendors.length === 0}>
              Publish Tender Package
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Modal for RFQ Parent Deletion */}
      {deleteConfirmRfq && (
        <ConfirmationModal
          isOpen={!!deleteConfirmRfq}
          onClose={() => setDeleteConfirmRfq(null)}
          onConfirm={handleConfirmDeleteRfq}
          title="Delete RFQ Tender Package"
          intent="danger"
          isProcessing={isDeletingRfq}
          confirmText={isDeletingRfq ? 'Deleting...' : 'Permanently Delete Tender Package'}
          description="Are you sure you want to permanently delete this RFQ? Deleting an RFQ is a parent-level deletion that will permanently delete the RFQ record, its requested BOQ items, ALL associated supplier quotations, AI comparison matrices, and erase all quotation PDF files from storage."
          details={[
            { label: 'RFQ Number', value: deleteConfirmRfq.rfqNumber },
            { label: 'Tender Title', value: deleteConfirmRfq.title },
            { label: 'Project Name', value: deleteConfirmRfq.projectName },
            { label: 'Target Entity', value: deleteConfirmRfq.entity },
            {
              label: 'Est. Budget',
              value: `SAR ${deleteConfirmRfq.budgetEstimatedSAR.toLocaleString()}`,
            },
            {
              label: 'Bids Received',
              value: `${deleteConfirmRfq.receivedBidsCount} Quotes (will also be permanently deleted)`,
            },
          ]}
        />
      )}
    </div>
  );
};
