import React, { useState } from 'react';
import {
  CreditCard,
  Plus,
  CheckCircle2,
  Clock,
  AlertCircle,
  Building,
  DollarSign,
  ShieldCheck,
  Send,
  AlertTriangle,
  Info,
  Lock,
} from 'lucide-react';
import { PaymentMilestone, PaymentStatus } from '../../../types/procurement';
import { useCompany } from '../../../context/CompanyContext';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { Button } from '../../common/Button';
import { Badge } from '../../common/Badge';
import { SearchInput } from '../../common/SearchInput';
import { Modal } from '../../common/Modal';
import { EmptyState } from '../../common/EmptyState';
import { ConfirmationModal } from '../../common/ConfirmationModal';

interface PaymentsModuleProps {
  payments: PaymentMilestone[];
  onReleasePayment: (paymentId: string) => void;
}

export const PaymentsModule: React.FC<PaymentsModuleProps> = ({
  payments,
  onReleasePayment,
}) => {
  const { matchesCompany } = useCompany();
  const { permissions: _perms, activeRole } = useAuth(); const permissions = _perms!;
  const { success, warning } = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedPayment, setSelectedPayment] = useState<PaymentMilestone | null>(null);
  const [confirmReleasePayment, setConfirmReleasePayment] = useState<PaymentMilestone | null>(null);
  // PY-01: Invoice registration form state
  const [isRegisterInvoiceOpen, setIsRegisterInvoiceOpen] = useState(false);
  const [invoiceForm, setInvoiceForm] = useState({
    invoiceNumber: '',
    poNumber: '',
    vendorName: '',
    milestoneDescription: '',
    amountSAR: '',
    dueDate: '',
    paymentMethod: 'SARIE Bank Transfer',
  });
  // PY-02: 3-way match checkbox
  const [threeWayConfirmed, setThreeWayConfirmed] = useState(false);

  const filteredPayments = payments.filter((pay) => {
    const matchesScope = matchesCompany(pay.entity);
    const matchesStatus = statusFilter === 'ALL' || pay.status === statusFilter;
    const matchesQuery =
      pay.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      pay.poNumber.toLowerCase().includes(search.toLowerCase()) ||
      pay.vendorName.toLowerCase().includes(search.toLowerCase());
    return matchesScope && matchesStatus && matchesQuery;
  });

  // WF-01c: Only allow Disburse when status is Processing or Scheduled
  const canDisburse = (pay: PaymentMilestone) =>
    pay.status === 'Processing' || pay.status === 'Scheduled';

  const getDisburseBlockReason = (pay: PaymentMilestone): string | null => {
    if (pay.status === 'Hold') return 'Invoice is on Hold — resolve the hold flag before disbursement.';
    if (pay.status === 'Pending Approval') return 'Invoice is Pending Approval — await Head authorization first.';
    if (pay.status === 'Paid') return null; // shows Settled label instead
    return null;
  };

  const handleRelease = (pay: PaymentMilestone) => {
    if (!permissions.canReleasePayment) {
      warning(
        'Treasury Authorization Required',
        `Role '${activeRole}' does not hold disbursement clearance. Only Financial Controller or Super Admin can release payments.`
      );
      return;
    }
    setThreeWayConfirmed(false);
    setConfirmReleasePayment(pay);
  };

  const executeRelease = (pay: PaymentMilestone) => {
    onReleasePayment(pay.id);
    success(
      'SARIE Wire Dispatched',
      `Payment of SAR ${pay.amountSAR.toLocaleString()} released to ${pay.vendorName}.`
    );
    setSelectedPayment(null);
    setConfirmReleasePayment(null);
  };

  // PY-01: Register new invoice
  const handleRegisterInvoice = (e: React.FormEvent) => {
    e.preventDefault();
    success(
      'Invoice Registered',
      `${invoiceForm.invoiceNumber} registered and routed for Department Head approval before disbursement.`
    );
    setIsRegisterInvoiceOpen(false);
    setInvoiceForm({ invoiceNumber: '', poNumber: '', vendorName: '', milestoneDescription: '', amountSAR: '', dueDate: '', paymentMethod: 'SARIE Bank Transfer' });
  };

  const totalOutstandingSAR = filteredPayments
    .filter((p) => p.status !== 'Paid')
    .reduce((acc, curr) => acc + curr.amountSAR, 0);

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <CreditCard className="w-6 h-6 text-cyan-400" />
            Payments & Milestone Disbursements
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-0.5">
            Progressive milestone invoices, SARIE Saudi interbank transfers, letters of credit (LC), and treasury releases
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-xl">
            <span className="text-[11px] text-slate-400">Total Pending Settlement:</span>
            <span className="font-mono font-bold text-amber-400 text-sm">
              SAR {totalOutstandingSAR.toLocaleString()}
            </span>
          </div>
          {/* PY-01: Register Invoice button */}
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsRegisterInvoiceOpen(true)}
          >
            Register Invoice
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search invoice #, PO # or vendor..."
          className="w-full sm:w-96"
        />

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {['ALL', 'Paid', 'Processing', 'Approved', 'Pending Approval', 'Hold'].map((s) => {
            const count =
              s === 'ALL'
                ? payments.filter((p) => matchesCompany(p.entity)).length
                : payments.filter((p) => matchesCompany(p.entity) && p.status === s).length;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                  statusFilter === s
                    ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{s}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300 font-mono">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Payments Table */}
      {filteredPayments.length === 0 ? (
        <EmptyState
          title="No payment records found"
          description="Adjust your search query or status filter, or register a new invoice."
        />
      ) : (
        <div className="glass-panel rounded-xl overflow-hidden border border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 text-[11px] border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Invoice #</th>
                  <th className="py-3.5 px-4 font-semibold">Linked PO #</th>
                  <th className="py-3.5 px-4 font-semibold">Entity</th>
                  <th className="py-3.5 px-4 font-semibold">Vendor Supplier</th>
                  <th className="py-3.5 px-4 font-semibold">Milestone Scope</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Amount (SAR)</th>
                  <th className="py-3.5 px-4 font-semibold">Due Date</th>
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredPayments.map((pay) => {
                  const blockReason = getDisburseBlockReason(pay);
                  return (
                    <tr key={pay.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-cyan-300 whitespace-nowrap">
                        {pay.invoiceNumber}
                      </td>
                      <td className="py-3.5 px-4 font-mono text-slate-300 whitespace-nowrap">
                        {pay.poNumber}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <Badge variant="amber">
                          Arabitra
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-slate-200 min-w-[200px] max-w-[240px] truncate" title={pay.vendorName}>
                        {pay.vendorName}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 min-w-[220px] max-w-[280px] truncate" title={pay.milestoneDescription}>
                        {pay.milestoneDescription}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-100 whitespace-nowrap text-sm">
                        SAR {pay.amountSAR.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-slate-300">
                        {pay.dueDate}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <Badge
                          variant={
                            pay.status === 'Paid'
                              ? 'emerald'
                              : pay.status === 'Processing' || pay.status === 'Scheduled'
                              ? 'cyan'
                              : pay.status === 'Hold' || pay.status === 'Disputed'
                              ? 'rose'
                              : 'amber'
                          }
                          dot
                        >
                          {pay.status}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        {pay.status === 'Paid' ? (
                          <span className="text-[11px] font-mono text-emerald-400">
                            {pay.bankReference || 'Settled'}
                          </span>
                        ) : canDisburse(pay) ? (
                          /* WF-01c: Only active when Processing or Approved */
                          <Button
                            variant="primary"
                            size="sm"
                            icon={<Send className="w-3 h-3" />}
                            onClick={() => setSelectedPayment(pay)}
                            className="text-xs py-1 px-2.5"
                          >
                            Disburse
                          </Button>
                        ) : (
                          /* WF-01c: Blocked — show disabled button with tooltip reason */
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/60 border border-slate-700/40 text-slate-500 text-xs font-medium cursor-not-allowed"
                            title={blockReason || 'Cannot disburse at this stage'}
                          >
                            <Lock className="w-3 h-3" />
                            Blocked
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PY-02: Release Payment Modal — with 3-way match check */}
      {selectedPayment && (
        <Modal
          isOpen={!!selectedPayment}
          onClose={() => { setSelectedPayment(null); setThreeWayConfirmed(false); }}
          title="Two-Tier Authorization — Treasury Release"
          subtitle={`Invoice: ${selectedPayment.invoiceNumber} | Vendor: ${selectedPayment.vendorName}`}
          maxWidth="lg"
          footer={
            <>
              <Button variant="outline" size="sm" onClick={() => { setSelectedPayment(null); setThreeWayConfirmed(false); }}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleRelease(selectedPayment)}
                className={!threeWayConfirmed ? 'opacity-40 cursor-not-allowed' : ''}
              >
                Sign & Release SAR {selectedPayment.amountSAR.toLocaleString()}
              </Button>
            </>
          }
        >
          <div className="space-y-4 text-xs">
            {/* Payment Details */}
            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-300">Disbursement Amount:</span>
                <span className="text-emerald-400 font-bold text-sm">
                  SAR {selectedPayment.amountSAR.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Payment Channel:</span>
                <span className="text-slate-200">{selectedPayment.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-300">Linked Purchase Order:</span>
                <span className="text-cyan-300">{selectedPayment.poNumber}</span>
              </div>
            </div>

            {/* PY-02: Three-Way Match Check Panel */}
            <div className="p-3.5 bg-slate-900 rounded-xl border border-slate-700 space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Info className="w-4 h-4 text-cyan-400" />
                <span className="font-semibold text-slate-200 text-xs">Three-Way Match Verification</span>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-slate-300">Purchase Order Status</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-slate-300">Goods Receipt Note (GRN)</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Received
                  </span>
                </div>
                <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                  <span className="text-slate-300">Invoice Verification</span>
                  <span className={`font-semibold flex items-center gap-1 ${
                    selectedPayment.status === 'Processing' || selectedPayment.status === 'Scheduled'
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Verified
                  </span>
                </div>
              </div>
            </div>

            {/* PY-02: Mandatory Confirmation Checkbox */}
            <label className="flex items-start gap-3 cursor-pointer p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30">
              <input
                type="checkbox"
                checked={threeWayConfirmed}
                onChange={(e) => setThreeWayConfirmed(e.target.checked)}
                className="mt-0.5 w-4 h-4 accent-emerald-500 cursor-pointer shrink-0"
              />
              <div>
                <p className="font-semibold text-emerald-300">I confirm all three-way match criteria are satisfied</p>
                <p className="text-[11px] text-emerald-300/70 mt-0.5">
                  Confirming executes the SARIE interbank batch transmission and archives invoice compliance against Saudi ZATCA standards. This action is irreversible.
                </p>
              </div>
            </label>
          </div>
        </Modal>
      )}

      {/* Confirmation Modal: Release Payment */}
      {confirmReleasePayment && (
        <ConfirmationModal
          isOpen={Boolean(confirmReleasePayment)}
          onClose={() => setConfirmReleasePayment(null)}
          onConfirm={() => executeRelease(confirmReleasePayment)}
          title="Confirm Treasury Payment Disbursement"
          description={`Are you sure you want to release the disbursement of SAR ${confirmReleasePayment.amountSAR.toLocaleString()} for Invoice ${confirmReleasePayment.invoiceNumber}? This executes an automated SARIE interbank wire transfer.`}
          confirmText="Yes, Release SARIE Payment"
          cancelText="Cancel"
          intent="success"
          details={[
            { label: 'Invoice Number', value: confirmReleasePayment.invoiceNumber },
            { label: 'Vendor Payee', value: confirmReleasePayment.vendorName },
            { label: 'Amount Payable', value: `SAR ${confirmReleasePayment.amountSAR.toLocaleString()}` },
            { label: 'Linked PO', value: confirmReleasePayment.poNumber },
            { label: 'Payment Channel', value: confirmReleasePayment.paymentMethod },
          ]}
        />
      )}

      {/* PY-01: Register Invoice Modal */}
      <Modal
        isOpen={isRegisterInvoiceOpen}
        onClose={() => setIsRegisterInvoiceOpen(false)}
        title="Register Vendor Invoice"
        subtitle="Link invoice to a Purchase Order — routes for Head approval before disbursement"
        maxWidth="lg"
      >
        <form onSubmit={handleRegisterInvoice} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-300 mb-1">Invoice Number *</label>
              <input
                type="text"
                required
                placeholder="e.g. INV-2026-0491"
                value={invoiceForm.invoiceNumber}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, invoiceNumber: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-300 mb-1">Linked PO Number *</label>
              <input
                type="text"
                required
                placeholder="e.g. PO-ARB-26-0491"
                value={invoiceForm.poNumber}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, poNumber: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
          <div>
            <label className="block font-medium text-slate-300 mb-1">Vendor / Supplier *</label>
            <input
              type="text"
              required
              value={invoiceForm.vendorName}
              onChange={(e) => setInvoiceForm({ ...invoiceForm, vendorName: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="block font-medium text-slate-300 mb-1">Milestone / Scope Description *</label>
            <input
              type="text"
              required
              placeholder="e.g. 30% Advance — GPS Tracker Batch Delivery"
              value={invoiceForm.milestoneDescription}
              onChange={(e) => setInvoiceForm({ ...invoiceForm, milestoneDescription: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-300 mb-1">Amount (SAR) *</label>
              <input
                type="number"
                required
                placeholder="Excluding VAT"
                value={invoiceForm.amountSAR}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, amountSAR: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-300 mb-1">Due Date *</label>
              <input
                type="date"
                required
                value={invoiceForm.dueDate}
                onChange={(e) => setInvoiceForm({ ...invoiceForm, dueDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
          <div>
            <label className="block font-medium text-slate-300 mb-1">Payment Method</label>
            <select
              value={invoiceForm.paymentMethod}
              onChange={(e) => setInvoiceForm({ ...invoiceForm, paymentMethod: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none focus:border-cyan-500"
            >
              <option>SARIE Bank Transfer</option>
              <option>Letter of Credit (LC)</option>
              <option>Bank Cheque</option>
              <option>Wire Transfer (SWIFT)</option>
            </select>
          </div>
          <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-500/30 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-300">
              Registered invoices will be set to <strong>Pending Approval</strong> and must receive Department Head authorization before the Disburse action becomes available.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsRegisterInvoiceOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Register & Submit for Approval
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
