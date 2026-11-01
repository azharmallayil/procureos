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

  const filteredPayments = payments.filter((pay) => {
    const matchesScope = matchesCompany(pay.entity);
    const matchesStatus = statusFilter === 'ALL' || pay.status === statusFilter;
    const matchesQuery =
      pay.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
      pay.poNumber.toLowerCase().includes(search.toLowerCase()) ||
      pay.vendorName.toLowerCase().includes(search.toLowerCase());
    return matchesScope && matchesStatus && matchesQuery;
  });

  const handleRelease = (pay: PaymentMilestone) => {
    if (!permissions.canReleasePayment) {
      warning(
        'Treasury Authorization Required',
        `Role '${activeRole}' does not hold disbursement clearance. Only Financial Controller or Super Admin can release payments.`
      );
      return;
    }
    onReleasePayment(pay.id);
    success(
      'SARIE Wire Dispatched',
      `Payment of SAR ${pay.amountSAR.toLocaleString()} released to ${pay.vendorName}.`
    );
    setSelectedPayment(null);
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

        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3.5 py-1.5 rounded-xl">
          <span className="text-[11px] text-slate-400">Total Pending Settlement:</span>
          <span className="font-mono font-bold text-amber-400 text-sm">
            SAR {totalOutstandingSAR.toLocaleString()}
          </span>
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
          {['ALL', 'Paid', 'Processing', 'Pending Approval', 'Hold'].map((s) => (
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

      {/* Payments Table */}
      {filteredPayments.length === 0 ? (
        <EmptyState
          title="No payment records found"
          description="Adjust your search query or status filter."
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
                {filteredPayments.map((pay) => (
                  <tr key={pay.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-cyan-300 whitespace-nowrap">
                      {pay.invoiceNumber}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300 whitespace-nowrap">
                      {pay.poNumber}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <Badge variant={pay.entity === 'FITCO' ? 'cyan' : 'emerald'}>
                        {pay.entity}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-200 min-w-[200px]">
                      {pay.vendorName}
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 min-w-[220px]">
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
                            : pay.status === 'Processing'
                            ? 'cyan'
                            : pay.status === 'Hold'
                            ? 'rose'
                            : 'amber'
                        }
                        dot
                      >
                        {pay.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      {pay.status !== 'Paid' ? (
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
                        <span className="text-[11px] font-mono text-emerald-400">
                          {pay.bankReference || 'Settled'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Release Payment Modal */}
      {selectedPayment && (
        <Modal
          isOpen={!!selectedPayment}
          onClose={() => setSelectedPayment(null)}
          title="Authorize Treasury Disbursement"
          subtitle={`Invoice: ${selectedPayment.invoiceNumber} | Vendor: ${selectedPayment.vendorName}`}
          maxWidth="md"
          footer={
            <>
              <Button variant="outline" size="sm" onClick={() => setSelectedPayment(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleRelease(selectedPayment)}
              >
                Sign & Release SAR {selectedPayment.amountSAR.toLocaleString()}
              </Button>
            </>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2 font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Disbursement Amount:</span>
                <span className="text-emerald-400 font-bold text-sm">
                  SAR {selectedPayment.amountSAR.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Payment Channel:</span>
                <span className="text-slate-200">{selectedPayment.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Linked Purchase Order:</span>
                <span className="text-cyan-300">{selectedPayment.poNumber}</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30 text-emerald-300 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Two-Tier Treasury Sign-Off</p>
                <p className="text-[11px] text-emerald-300/80 mt-0.5">
                  Confirming this transaction executes the automated SARIE interbank batch transmission and archives invoice compliance against Saudi ZATCA standards.
                </p>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
