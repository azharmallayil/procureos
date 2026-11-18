import React from 'react';
import {
  DollarSign,
  FileQuestion,
  CheckSquare,
  FileCheck2,
  AlertTriangle,
  Building2,
  Clock,
  ArrowRight,
} from 'lucide-react';
import { KpiCard } from './KpiCard';
import { SpendCharts } from './SpendCharts';
import { PendingApprovalsList } from './PendingApprovalsList';
import { OverdueDeliveriesTable } from './OverdueDeliveriesTable';
import { Card } from '../../common/Card';
import { Badge } from '../../common/Badge';
import { Button } from '../../common/Button';
import { useCompany } from '../../../context/CompanyContext';
import {
  RFQ,
  PurchaseOrder,
  Delivery,
  ModuleId,
  Vendor,
  Item,
} from '../../../types/procurement';

interface DashboardModuleProps {
  rfqs: RFQ[];
  purchaseOrders: PurchaseOrder[];
  deliveries: Delivery[];
  vendors?: Vendor[];
  items?: Item[];
  onNavigateModule: (module: ModuleId) => void;
  onApprovePO: (poId: string) => void;
  onRejectPO: (poId: string) => void;
  onMarkInspected: (deliveryId: string) => void;
}

export const DashboardModule: React.FC<DashboardModuleProps> = ({
  rfqs,
  purchaseOrders,
  deliveries,
  vendors = [],
  items = [],
  onNavigateModule,
  onApprovePO,
  onRejectPO,
  onMarkInspected,
}) => {
  const { activeCompany, matchesCompany, companyLabel } = useCompany();

  // Filter based on active company
  const filteredRfqs = rfqs.filter((r) => matchesCompany(r.entity));
  const filteredPOs = purchaseOrders.filter((p) => matchesCompany(p.entity));
  const filteredDeliveries = deliveries.filter((d) => matchesCompany(d.entity));
  const filteredVendors = vendors.filter((v) => matchesCompany(v.entityScope));

  // Compute live KPI metrics
  const totalSpendSAR = filteredPOs.reduce((acc, curr) => acc + curr.grandTotalSAR, 0);
  const formattedSpend =
    totalSpendSAR >= 1000000
      ? `SAR ${(totalSpendSAR / 1000000).toFixed(2)}M`
      : totalSpendSAR >= 1000
      ? `SAR ${(totalSpendSAR / 1000).toFixed(1)}K`
      : `SAR ${Math.round(totalSpendSAR).toLocaleString()}`;

  const activeRfqsCount = filteredRfqs.filter((r) => r.status === 'Open' || r.status === 'Under Evaluation').length;
  const pendingApprovalsCount = filteredPOs.filter((p) => p.status === 'Pending Approval').length;
  const pendingItemsCount = items.filter(
    (i) => matchesCompany(i.entity) && (i.approvalStatus === 'Pending Head Approval' || i.status === 'Pending Head Approval')
  ).length;
  const pendingVendorsCount = filteredVendors.filter(
    (v) => v.status === 'Under Audit' || v.approvalStatus === 'Pending Head Approval'
  ).length;
  const totalPendingActionCount = pendingApprovalsCount + pendingItemsCount + pendingVendorsCount;

  const openPosCount = filteredPOs.filter((p) => p.status !== 'Closed' && p.status !== 'Cancelled').length;
  const overdueCount = filteredDeliveries.filter((d) => d.isOverdue || d.status === 'Delayed').length;
  const activeVendorsCount = filteredVendors.filter((v) => v.status === 'Approved' || v.status === 'Preferred').length;

  return (
    <div className="space-y-6">
      {/* Scope Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
            Procurement Operations Cockpit
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-0.5">
            Real-time supply chain telemetry for <span className="text-cyan-400 font-semibold">{companyLabel}</span>
          </p>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-6 gap-4">
        <KpiCard
          title="Total Spend YTD"
          value={formattedSpend}
          change={filteredPOs.length > 0 ? `${filteredPOs.length} Active POs` : 'Zero Commitments'}
          isPositive={true}
          subtitle="Capital & Opex"
          icon={<DollarSign className="w-5 h-5" />}
          accentColor="cyan"
        />
        <KpiCard
          title="Active RFQs & Tenders"
          value={`${activeRfqsCount}`}
          change={`${filteredRfqs.length} Total Packages`}
          isPositive={true}
          subtitle="Open for Bidding"
          icon={<FileQuestion className="w-5 h-5" />}
          accentColor="blue"
        />
        <KpiCard
          title="Pending Head Sign-offs"
          value={`${totalPendingActionCount}`}
          change={totalPendingActionCount > 0 ? `${totalPendingActionCount} Pending Approval` : 'All Cleared'}
          isPositive={totalPendingActionCount === 0}
          subtitle={`${pendingApprovalsCount} PO · ${pendingItemsCount} Item · ${pendingVendorsCount} Vendor`}
          icon={<CheckSquare className="w-5 h-5" />}
          accentColor="amber"
          alert={totalPendingActionCount > 0}
        />
        <KpiCard
          title="POs in Pipeline"
          value={`${openPosCount}`}
          change={openPosCount > 0 ? `${openPosCount} Orders Active` : 'Pipeline Cleared'}
          isPositive={true}
          subtitle="Issued & In Transit"
          icon={<FileCheck2 className="w-5 h-5" />}
          accentColor="emerald"
        />
        <KpiCard
          title="Overdue Deliveries"
          value={`${overdueCount}`}
          change={overdueCount > 0 ? 'Logistics Delay' : '0 Delays'}
          isPositive={overdueCount === 0}
          subtitle="Transit Alerts"
          icon={<AlertTriangle className="w-5 h-5" />}
          accentColor="rose"
          alert={overdueCount > 0}
        />
        <KpiCard
          title="Active Approved Vendors"
          value={`${activeVendorsCount}`}
          change={`${filteredVendors.length} Total Registered`}
          isPositive={true}
          subtitle="Strategic Supply Base"
          icon={<Building2 className="w-5 h-5" />}
          accentColor="cyan"
        />
      </div>

      {/* Spend Charts Section */}
      <SpendCharts purchaseOrders={filteredPOs} vendors={vendors} />

      {/* Operational Modules Split View: Pending Approvals & Recent RFQs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Pending Approvals */}
        <div className="lg:col-span-6">
          <Card
            title="Authorizations & Approvals Queue"
            subtitle="Prior Head authorization required for POs, Catalogue Items & Vendors"
            icon={<CheckSquare className="w-5 h-5 text-amber-400" />}
            headerAction={
              <div className="flex items-center gap-1.5 flex-wrap">
                {pendingItemsCount > 0 && (
                  <button
                    type="button"
                    onClick={() => onNavigateModule('items')}
                    className="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-500/40 text-[10px] text-amber-300 font-bold hover:text-white cursor-pointer"
                  >
                    {pendingItemsCount} Items
                  </button>
                )}
                {pendingVendorsCount > 0 && (
                  <button
                    type="button"
                    onClick={() => onNavigateModule('vendors')}
                    className="px-2 py-0.5 rounded bg-amber-950/80 border border-amber-500/40 text-[10px] text-amber-300 font-bold hover:text-white cursor-pointer"
                  >
                    {pendingVendorsCount} Vendors
                  </button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onNavigateModule('purchaseOrders')}
                  className="text-xs text-cyan-400 hover:text-cyan-300"
                >
                  All POs <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Button>
              </div>
            }
          >
            <PendingApprovalsList
              purchaseOrders={filteredPOs}
              onApprovePO={onApprovePO}
              onRejectPO={onRejectPO}
            />
          </Card>
        </div>

        {/* Recent RFQs */}
        <div className="lg:col-span-6">
          <Card
            title="Active RFQs & Tender Packages"
            subtitle="Procurement invitations with vendor submission deadlines"
            icon={<FileQuestion className="w-5 h-5 text-cyan-400" />}
            headerAction={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigateModule('rfqs')}
                className="text-xs text-cyan-400 hover:text-cyan-300"
              >
                View RFQs <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            }
          >
            <div className="space-y-3">
              {filteredRfqs.map((rfq) => (
                <div
                  key={rfq.id}
                  className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/90 hover:border-slate-700/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-cyan-300">
                        {rfq.rfqNumber}
                      </span>
                      <Badge
                        variant="amber"
                        className="text-[10px]"
                      >
                        Arabitra
                      </Badge>
                      <Badge
                        variant={
                          rfq.status === 'Open'
                            ? 'cyan'
                            : rfq.status === 'Under Evaluation'
                            ? 'amber'
                            : 'emerald'
                        }
                        className="text-[10px]"
                      >
                        {rfq.status}
                      </Badge>
                    </div>
                    <p className="text-xs font-semibold text-slate-200 truncate">{rfq.title}</p>
                    <div className="flex items-center gap-3 text-[11px] text-slate-400">
                      <span>Project: {rfq.projectName}</span>
                      <span>•</span>
                      <span className="flex items-center gap-1 text-slate-300">
                        <Clock className="w-3 h-3 text-amber-400" /> Closes: {rfq.closingDate}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 block">Submissions</span>
                      <span className="font-mono text-xs font-bold text-slate-200">
                        {rfq.receivedBidsCount} / {rfq.invitedVendorsCount} Bids
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onNavigateModule('quotations')}
                      className="text-xs py-1 px-2.5"
                    >
                      Compare
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Overdue / Critical Deliveries */}
        <div className="lg:col-span-12">
          <Card
            title="Logistics Alert: Overdue & Expedited Deliveries"
            subtitle="Shipments requiring customs clearance expediting or site receiving inspection"
            icon={<AlertTriangle className="w-5 h-5 text-rose-400" />}
            headerAction={
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigateModule('deliveries')}
                className="text-xs text-cyan-400 hover:text-cyan-300"
              >
                Logistics Hub <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            }
          >
            <OverdueDeliveriesTable
              deliveries={filteredDeliveries}
              onMarkInspected={onMarkInspected}
            />
          </Card>
        </div>
      </div>
    </div>
  );
};
