import React, { useMemo, useState } from 'react';
import {
  ClipboardList,
  Plus,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Calendar,
  Package,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { Item, EntityId, PurchaseRequisition, PurchaseRequisitionLineItem, isHeadRole } from '../../../types/procurement';
import { useCompany } from '../../../context/CompanyContext';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { Button } from '../../common/Button';
import { Badge } from '../../common/Badge';
import { Modal } from '../../common/Modal';
import { EmptyState } from '../../common/EmptyState';
import { SearchInput } from '../../common/SearchInput';

interface RequisitionsModuleProps {
  requisitions: PurchaseRequisition[];
  items: Item[];
  onCreate: (requisition: PurchaseRequisition) => void;
  onApprove: (requisitionId: string) => void;
  onReject: (requisitionId: string, reason: string) => void;
  onCreateRfq: (requisition: PurchaseRequisition) => void;
}

interface DraftLine { itemId: string; quantity: number }

const statusVariant = (status: PurchaseRequisition['status']) => {
  if (status === 'Approved' || status === 'Converted to RFQ') return 'emerald' as const;
  if (status === 'Pending Approval') return 'amber' as const;
  if (status === 'Rejected' || status === 'Cancelled') return 'rose' as const;
  return 'slate' as const;
};

export const RequisitionsModule: React.FC<RequisitionsModuleProps> = ({
  requisitions, items, onCreate, onApprove, onReject, onCreateRfq,
}) => {
  const { matchesCompany } = useCompany();
  const { currentUser, activeRole, permissions } = useAuth();
  const { success, warning } = useToast();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'Pending Approval' | 'Approved' | 'Converted to RFQ'>('Pending Approval');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rejectTarget, setRejectTarget] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [form, setForm] = useState({
    title: '', entity: 'ARABITRA' as EntityId, department: currentUser?.department || 'Procurement',
    requiredDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
    projectName: '', deliveryLocation: 'Arabitra Head Office Store Khobar', justification: '', priority: 'Normal' as 'Urgent' | 'High' | 'Normal',
  });
  const [draftLines, setDraftLines] = useState<DraftLine[]>([{ itemId: '', quantity: 1 }]);

  const canApprove =
    permissions?.canApprovePR ||
    isHeadRole(activeRole) ||
    activeRole === 'Super Admin' ||
    ['Super Admin', 'Procurement Director', 'Financial Controller', 'Managing Director / CEO', 'General Manager (GM)', 'Department Head (HOD)', 'Project Manager (PM)'].includes(activeRole || '');
  const filtered = useMemo(() => requisitions.filter((pr) => {
    const inScope = matchesCompany(pr.entity);
    const statusMatch = statusFilter === 'ALL' || pr.status === statusFilter;
    const query = search.trim().toLowerCase();
    const searchMatch = !query || [pr.prNumber, pr.title, pr.projectName, pr.requestedBy]
      .some((value) => value.toLowerCase().includes(query));
    return inScope && statusMatch && searchMatch;
  }), [requisitions, matchesCompany, statusFilter, search]);

  const estimatedTotal = draftLines.reduce((sum, line) => {
    const item = items.find((candidate) => candidate.id === line.itemId);
    return sum + (item?.unitPriceSAR || 0) * line.quantity;
  }, 0);

  const updateLine = (index: number, patch: Partial<DraftLine>) => {
    setDraftLines((prev) => prev.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.title.trim() || !form.projectName.trim() || !form.deliveryLocation.trim() || !form.justification.trim()) {
      warning('Required information missing', 'Complete the request title, project, delivery location and purchase justification.');
      return;
    }
    const validLines = draftLines.filter((line) => line.itemId && line.quantity > 0);
    if (validLines.length === 0) {
      warning('No request items', 'Add at least one catalogue item with a quantity greater than zero.');
      return;
    }
    const now = new Date();
    const lineItems: PurchaseRequisitionLineItem[] = validLines.map((line, index) => {
      const item = items.find((candidate) => candidate.id === line.itemId)!;
      return {
        id: `PRL-${now.getTime()}-${index + 1}`,
        itemId: item.id,
        sku: item.sku,
        description: `${item.name}${item.description ? ` — ${item.description}` : ''}`,
        quantity: line.quantity,
        uom: item.uom,
        estimatedUnitPriceSAR: item.unitPriceSAR,
        estimatedTotalSAR: item.unitPriceSAR * line.quantity,
      };
    });
    const suffix = `${now.getTime().toString().slice(-7)}${Math.floor(Math.random() * 10)}`;
    const requisition: PurchaseRequisition = {
      id: `PR-${globalThis.crypto?.randomUUID?.() || now.getTime().toString()}`,
      prNumber: `PR-ARB-${now.getFullYear()}-${suffix}`,
      title: form.title.trim(), entity: form.entity, department: form.department.trim() || 'Unassigned',
      requestedBy: currentUser?.name || 'Current User', requestDate: now.toISOString().split('T')[0],
      requiredDate: form.requiredDate, projectName: form.projectName.trim(),
      deliveryLocation: form.deliveryLocation.trim(), justification: form.justification.trim(),
      priority: form.priority, status: 'Pending Approval',
      estimatedTotalSAR: lineItems.reduce((sum, line) => sum + line.estimatedTotalSAR, 0), lineItems,
    };
    onCreate(requisition);
    success('Purchase requisition submitted', `${requisition.prNumber} is now in the approval queue awaiting Department Head sign-off.`);
    setIsModalOpen(false);
    setForm({ ...form, title: '', projectName: '', deliveryLocation: 'Arabitra Head Office Store Khobar', justification: '' });
    setDraftLines([{ itemId: '', quantity: 1 }]);
  };

  const confirmReject = () => {
    if (!rejectTarget || !rejectionReason.trim()) {
      warning('Reason required', 'Enter a reason before rejecting the requisition.');
      return;
    }
    onReject(rejectTarget, rejectionReason.trim());
    setRejectTarget(null);
    setRejectionReason('');
  };

  const pendingPrCount = requisitions.filter((pr) => pr.status === 'Pending Approval').length;
  const approvedPrCount = requisitions.filter((pr) => pr.status === 'Approved').length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-cyan-400" />
            Purchase Requisitions
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-0.5">
            Internal demand requests, budget estimates and authorization before RFQ creation.{' '}
            <span className="text-amber-400 font-medium">All requisitions require prior Department Head sign-off.</span>
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => {
            if (!permissions?.canCreatePR) {
              warning('Authorization Required', `Role '${activeRole}' does not hold clearance to raise Purchase Requisitions.`);
              return;
            }
            setIsModalOpen(true);
          }}
        >
          Create Requisition
        </Button>
      </div>

      {/* Governance Status Navigation Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-1.5 rounded-2xl bg-slate-900/40 border border-slate-800">
        <div className="flex items-center gap-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setStatusFilter('Pending Approval')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              statusFilter === 'Pending Approval'
                ? 'bg-amber-950/90 text-amber-300 border border-amber-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Requisitions Pending Approval</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                statusFilter === 'Pending Approval'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-amber-500/20 text-amber-400'
              }`}
            >
              {pendingPrCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('Approved')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              statusFilter === 'Approved'
                ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Approved Requisitions</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                statusFilter === 'Approved'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-emerald-500/20 text-emerald-400'
              }`}
            >
              {approvedPrCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter('ALL')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              statusFilter === 'ALL'
                ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            All Requisitions ({requisitions.length})
          </button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
        <SearchInput value={search} onChange={setSearch} placeholder="Search PR number, project or requester..." className="w-full sm:w-96" />
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="No purchase requisitions found"
          description="Create an internal purchase request to begin the procurement workflow."
          actionLabel="Create Requisition"
          onAction={() => {
            if (!permissions?.canCreatePR) {
              warning('Authorization Required', `Role '${activeRole}' does not hold clearance to raise Purchase Requisitions.`);
              return;
            }
            setIsModalOpen(true);
          }}
        />
      ) : (
        <div className="space-y-3">
          {filtered.map((pr) => (
            <div key={pr.id} className="glass-panel rounded-xl border border-slate-800 p-4 md:p-5">
              <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-2">
                  <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs font-bold text-cyan-300">{pr.prNumber}</span><Badge variant={statusVariant(pr.status)} dot>{pr.status}</Badge><Badge variant="amber">Arabitra</Badge></div>
                  <h3 className="text-sm font-bold text-slate-100">{pr.title}</h3>
                  <p className="text-xs text-slate-400">{pr.projectName} · {pr.department} · Requested by {pr.requestedBy}</p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-400"><span className="inline-flex items-center gap-1"><Calendar className="w-3 h-3" /> Required: {pr.requiredDate}</span><span className="inline-flex items-center gap-1"><Package className="w-3 h-3" /> {pr.lineItems.length} item line(s)</span><span className="font-mono text-emerald-300">Est. SAR {pr.estimatedTotalSAR.toLocaleString()}</span></div>
                  <div className="text-[11px] text-slate-400">{pr.lineItems.map((line) => `${line.quantity} ${line.uom} ${line.description}`).join(' · ')}</div>
                  {pr.rejectionReason && <p className="text-[11px] text-rose-300">Rejection reason: {pr.rejectionReason}</p>}
                  {pr.linkedRfqNumber && <p className="text-[11px] text-emerald-300">Linked RFQ: {pr.linkedRfqNumber}</p>}
                </div>
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  {pr.status === 'Pending Approval' && canApprove && <>
                    <Button size="sm" variant="outline" icon={<XCircle className="w-3.5 h-3.5" />} onClick={() => setRejectTarget(pr.id)}>Return</Button>
                    <Button size="sm" variant="primary" icon={<CheckCircle2 className="w-3.5 h-3.5" />} onClick={() => onApprove(pr.id)}>Approve (Head Sign-off)</Button>
                  </>}
                  {pr.status === 'Approved' && <Button size="sm" variant="primary" icon={<ArrowRight className="w-3.5 h-3.5" />} onClick={() => onCreateRfq(pr)}>Create RFQ</Button>}
                  {pr.status === 'Pending Approval' && !canApprove && <span className="text-[11px] text-amber-300 self-center">Awaiting Prior Head Sign-off</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Purchase Requisition" subtitle="Submit an internal demand request for authorization" maxWidth="2xl">
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div><label className="block text-slate-300 mb-1">Request title *</label><input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100" placeholder="e.g. Site instrumentation materials" /></div>
            <div><label className="block text-slate-300 mb-1">Company *</label><select value={form.entity} onChange={(e) => setForm({ ...form, entity: e.target.value as EntityId })} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100"><option value="ARABITRA">Arabitra</option></select></div>
            <div><label className="block text-slate-300 mb-1">Department</label><input value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100" /></div>
            <div><label className="block text-slate-300 mb-1">Project / Cost Centre *</label><input required value={form.projectName} onChange={(e) => setForm({ ...form, projectName: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100" /></div>
            <div><label className="block text-slate-300 mb-1">Required delivery date *</label><input required type="date" min={new Date().toISOString().split('T')[0]} value={form.requiredDate} onChange={(e) => setForm({ ...form, requiredDate: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100" /></div>
            <div><label className="block text-slate-300 mb-1">Delivery location *</label><input required value={form.deliveryLocation} onChange={(e) => setForm({ ...form, deliveryLocation: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100" placeholder="e.g. Arabitra Head Office Store Khobar" /></div>
          </div>
          <div><label className="block text-slate-300 mb-1">Purchase justification *</label><textarea required rows={2} value={form.justification} onChange={(e) => setForm({ ...form, justification: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100" placeholder="Explain why this purchase is required..." /></div>
          <div className="flex items-center justify-between"><span className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Requisition items</span><button type="button" onClick={() => setDraftLines((prev) => [...prev, { itemId: '', quantity: 1 }])} className="text-cyan-300 hover:text-cyan-200">+ Add line</button></div>
          {draftLines.map((line, index) => <div key={index} className="grid grid-cols-[1fr_90px_auto] gap-2 items-end">
            <div><label className="block text-slate-400 mb-1">Catalogue item</label><select required value={line.itemId} onChange={(e) => updateLine(index, { itemId: e.target.value })} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 text-slate-100"><option value="">Select item</option>{items.filter((item) => item.status !== 'Discontinued').map((item) => <option key={item.id} value={item.id}>{item.sku} — {item.name}</option>)}</select></div>
            <div><label className="block text-slate-400 mb-1">Quantity</label><input type="number" min="1" required value={line.quantity} onChange={(e) => updateLine(index, { quantity: Math.max(1, Number(e.target.value) || 1) })} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-2 text-slate-100" /></div>
            {draftLines.length > 1 && <button type="button" onClick={() => setDraftLines((prev) => prev.filter((_, lineIndex) => lineIndex !== index))} className="text-rose-300 px-2 py-2">Remove</button>}
          </div>)}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-3"><div><label className="text-slate-400 mr-2">Priority</label><select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as typeof form.priority })} className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-slate-100"><option>Normal</option><option>High</option><option>Urgent</option></select></div><div className="text-right"><div className="text-[10px] text-slate-400">Catalogue-based estimate</div><div className="text-lg font-bold font-mono text-emerald-300">SAR {estimatedTotal.toLocaleString()}</div></div></div>
          <div className="flex justify-end gap-2"><Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>Cancel</Button><Button type="submit" size="sm" variant="primary" disabled={items.filter((item) => item.status !== 'Discontinued').length === 0}>Submit for Approval</Button></div>
        </form>
      </Modal>

      <Modal isOpen={!!rejectTarget} onClose={() => setRejectTarget(null)} title="Reject Purchase Requisition" subtitle="A rejection reason is required" maxWidth="md">
        <div className="space-y-3"><textarea rows={3} value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100" placeholder="Explain why this requisition is rejected..." /><div className="flex justify-end gap-2"><Button size="sm" variant="outline" onClick={() => setRejectTarget(null)}>Cancel</Button><Button size="sm" variant="danger" onClick={confirmReject}>Confirm Rejection</Button></div></div>
      </Modal>
    </div>
  );
};
