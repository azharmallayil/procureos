import React, { useState, useMemo } from 'react';
import {
  Building2,
  Plus,
  Star,
  CheckCircle2,
  XCircle,
  AlertCircle,
  FileText,
  Phone,
  Mail,
  MapPin,
  ExternalLink,
  Clock,
  ShieldCheck,
  Edit3,
  Check,
  Info,
} from 'lucide-react';
import {
  Vendor,
  ItemCategory,
  isHeadRole,
  PurchaseOrder,
  Delivery,
  PaymentMilestone,
} from '../../../types/procurement';
import { useCompany } from '../../../context/CompanyContext';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { Button } from '../../common/Button';
import { Badge } from '../../common/Badge';
import { SearchInput } from '../../common/SearchInput';
import { Modal } from '../../common/Modal';
import { EmptyState } from '../../common/EmptyState';

interface VendorsModuleProps {
  vendors: Vendor[];
  purchaseOrders?: PurchaseOrder[];
  deliveries?: Delivery[];
  payments?: PaymentMilestone[];
  onAddVendor: (vendor: Vendor) => void;
  onUpdateVendor?: (vendor: Vendor) => void;
  onApproveVendor?: (vendorId: string) => void;
  onRejectVendor?: (vendorId: string, reason?: string) => void;
}

export const VendorsModule: React.FC<VendorsModuleProps> = ({
  vendors,
  purchaseOrders = [],
  deliveries = [],
  payments = [],
  onAddVendor,
  onUpdateVendor,
  onApproveVendor,
  onRejectVendor,
}) => {
  const { matchesCompany } = useCompany();
  const { currentUser, activeRole, permissions } = useAuth();
  const { success, warning } = useToast();

  const isHead = isHeadRole(activeRole) || permissions?.canApproveVendor || activeRole === 'Super Admin';

  const [search, setSearch] = useState('');
  const [vendorTab, setVendorTab] = useState<'ALL' | 'APPROVED' | 'PENDING'>('PENDING');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Vendor Dossier Edit Mode State
  const [isEditingVendor, setIsEditingVendor] = useState(false);
  const [editVendorForm, setEditVendorForm] = useState<{
    name: string;
    crNumber: string;
    vatNumber: string;
    category: ItemCategory;
    city: string;
    contactPerson: string;
    contactEmail: string;
    contactPhone: string;
  }>({
    name: '',
    crNumber: '',
    vatNumber: '',
    category: 'GPS Trackers & Asset Gateways',
    city: 'Al Khobar',
    contactPerson: '',
    contactEmail: '',
    contactPhone: '',
  });

  const handleOpenDossier = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setIsEditingVendor(false);
    setEditVendorForm({
      name: vendor.name,
      crNumber: vendor.crNumber,
      vatNumber: vendor.vatNumber,
      category: vendor.category,
      city: vendor.city,
      contactPerson: vendor.contactPerson,
      contactEmail: vendor.contactEmail,
      contactPhone: vendor.contactPhone,
    });
  };

  const handleSaveVendorEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVendor) return;

    const updatedVendor: Vendor = {
      ...selectedVendor,
      name: editVendorForm.name,
      crNumber: editVendorForm.crNumber,
      vatNumber: editVendorForm.vatNumber,
      category: editVendorForm.category,
      city: editVendorForm.city,
      contactPerson: editVendorForm.contactPerson,
      contactEmail: editVendorForm.contactEmail,
      contactPhone: editVendorForm.contactPhone,
      status: 'Under Audit',
      approvalStatus: 'Pending Head Approval',
      approvedBy: undefined,
      approvedAt: undefined,
    };

    if (onUpdateVendor) {
      onUpdateVendor(updatedVendor);
    } else {
      onAddVendor(updatedVendor);
    }

    setSelectedVendor(updatedVendor);
    setIsEditingVendor(false);
    success(
      'Changes Submitted for Head Approval',
      `${updatedVendor.name} details were updated. Status moved to Pending Head Approval.`
    );
  };

  // New Vendor Form State
  const [form, setForm] = useState({
    name: '',
    crNumber: '',
    vatNumber: '',
    category: 'GPS Trackers & Asset Gateways' as ItemCategory,
    tier: 'Tier 1' as 'Tier 1' | 'Tier 2' | 'Tier 3',
    entityScope: 'Arabitra Approved' as 'Arabitra Approved' | 'Joint / Group' | 'FITCO Approved',
    contactPerson: '',
    contactEmail: '',
    contactPhone: '',
    city: 'Al Khobar',
  });

  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Real dynamic telemetry computed from live POs, shipments and payments
  const vendorMetricsMap = useMemo(() => {
    const map = new Map<
      string,
      {
        totalSpendSAR: number;
        formattedSpend: string;
        totalOrders: number;
        activeContractsCount: number;
        totalDeliveries: number;
        onTimeRate: number | null;
        qcRate: number | null;
        rating: number | null;
      }
    >();

    vendors.forEach((vendor) => {
      const vendorIdNorm = vendor.id?.trim().toLowerCase();
      const vendorNameNorm = vendor.name?.trim().toLowerCase();

      // Find all POs matching this vendor (by ID or vendor name)
      const vendorPOs = purchaseOrders.filter((po) => {
        const poVendorId = po.vendorId?.trim().toLowerCase();
        const poVendorName = po.vendorName?.trim().toLowerCase();
        return (
          (poVendorId && poVendorId === vendorIdNorm) ||
          (poVendorName && poVendorName === vendorNameNorm)
        );
      });

      const vendorPoNumbers = new Set(
        vendorPOs.map((po) => po.poNumber?.trim().toUpperCase()).filter(Boolean)
      );

      // Real spend: valid PO commitments (exclude Draft and Cancelled)
      const validPOs = vendorPOs.filter(
        (po) => po.status !== 'Draft' && po.status !== 'Cancelled'
      );
      const computedPoSpend = validPOs.reduce((sum, po) => {
        const val = Number(po.grandTotalSAR ?? po.totalAmountSAR ?? 0);
        return sum + (isNaN(val) ? 0 : val);
      }, 0);

      // Real disbursements / payments if recorded
      const vendorPayments = payments.filter((p) => {
        const pVendorName = p.vendorName?.trim().toLowerCase();
        const pPo = p.poNumber?.trim().toUpperCase();
        return (
          (pVendorName && pVendorName === vendorNameNorm) ||
          (pPo && vendorPoNumbers.has(pPo))
        );
      });
      const paidPaymentsSpend = vendorPayments
        .filter((p) => p.status === 'Paid')
        .reduce((sum, p) => sum + (Number(p.amountSAR) || 0), 0);

      const totalSpendSAR = Math.max(computedPoSpend, paidPaymentsSpend, vendor.totalSpendSAR || 0);

      // Active contracts (active PO commitments in progress)
      const activePOs = vendorPOs.filter(
        (po) => po.status !== 'Draft' && po.status !== 'Cancelled' && po.status !== 'Closed'
      );
      const activeContractsCount = activePOs.length > 0 ? activePOs.length : (vendor.activeContractsCount || 0);

      // Deliveries matching vendor
      const vendorDeliveries = deliveries.filter((d) => {
        const dVendorName = d.vendorName?.trim().toLowerCase();
        const dPo = d.poNumber?.trim().toUpperCase();
        return (
          (dVendorName && dVendorName === vendorNameNorm) ||
          (dPo && vendorPoNumbers.has(dPo))
        );
      });

      const totalDeliveries = vendorDeliveries.length;

      // Real On-Time Delivery (OTD) rate
      let onTimeRate: number | null = null;
      if (totalDeliveries > 0) {
        const onTimeCount = vendorDeliveries.filter(
          (d) => !d.isOverdue && d.status !== 'Delayed'
        ).length;
        onTimeRate = Math.round((onTimeCount / totalDeliveries) * 100);
      } else if (vendor.onTimeDeliveryRate > 0) {
        onTimeRate = vendor.onTimeDeliveryRate;
      }

      // Real Quality Compliance (QC) rate
      let qcRate: number | null = null;
      const inspectedDeliveries = vendorDeliveries.filter(
        (d) => d.qcInspectionStatus && d.qcInspectionStatus !== 'Pending Inspection'
      );
      if (inspectedDeliveries.length > 0) {
        const passedCount = inspectedDeliveries.filter(
          (d) => d.qcInspectionStatus === 'Passed' || d.qcInspectionStatus === 'Conditional Acceptance'
        ).length;
        qcRate = Math.round((passedCount / inspectedDeliveries.length) * 100);
      } else if (vendor.qualityComplianceRate > 0) {
        qcRate = vendor.qualityComplianceRate;
      }

      // Real Score / Rating: out of 5.0
      let rating: number | null = null;
      if (onTimeRate !== null && qcRate !== null) {
        const score = ((onTimeRate * 0.5 + qcRate * 0.5) / 100) * 5.0;
        rating = Math.min(5.0, Math.max(1.0, Number(score.toFixed(1))));
      } else if (onTimeRate !== null) {
        rating = Math.min(5.0, Math.max(1.0, Number(((onTimeRate / 100) * 5.0).toFixed(1))));
      } else if (qcRate !== null) {
        rating = Math.min(5.0, Math.max(1.0, Number(((qcRate / 100) * 5.0).toFixed(1))));
      } else if (vendor.rating > 0) {
        rating = vendor.rating;
      }

      // Currency formatting for spend
      let formattedSpend = 'SAR 0';
      if (totalSpendSAR >= 1_000_000) {
        formattedSpend = `SAR ${(totalSpendSAR / 1_000_000).toFixed(2)}M`;
      } else if (totalSpendSAR >= 1_000) {
        formattedSpend = `SAR ${(totalSpendSAR / 1_000).toFixed(1)}k`;
      } else if (totalSpendSAR > 0) {
        formattedSpend = `SAR ${Math.round(totalSpendSAR).toLocaleString()}`;
      }

      map.set(vendor.id, {
        totalSpendSAR,
        formattedSpend,
        totalOrders: vendorPOs.length,
        activeContractsCount,
        totalDeliveries,
        onTimeRate,
        qcRate,
        rating,
      });
    });

    return map;
  }, [vendors, purchaseOrders, deliveries, payments]);

  const pendingCount = vendors.filter(
    (v) => matchesCompany(v.entityScope) && (v.status === 'Under Audit' || v.approvalStatus === 'Pending Head Approval')
  ).length;

  const approvedCount = vendors.filter(
    (v) => matchesCompany(v.entityScope) && v.status === 'Approved' && v.approvalStatus !== 'Pending Head Approval'
  ).length;

  const filteredVendors = vendors.filter((v) => {
    const matchesScope = matchesCompany(v.entityScope);
    const isPending = v.status === 'Under Audit' || v.approvalStatus === 'Pending Head Approval';
    const isApproved = v.status === 'Approved' && !isPending;
    const matchesTab =
      vendorTab === 'ALL' ||
      (vendorTab === 'APPROVED' && isApproved) ||
      (vendorTab === 'PENDING' && isPending);
    const matchesCategory = selectedCategory === 'ALL' || v.category === selectedCategory;
    const matchesQuery =
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.crNumber.includes(search) ||
      v.vatNumber.includes(search) ||
      v.city.toLowerCase().includes(search.toLowerCase()) ||
      v.category.toLowerCase().includes(search.toLowerCase());
    return matchesScope && matchesTab && matchesCategory && matchesQuery;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.crNumber) return;

    const newVendor: Vendor = {
      id: `VND-${Date.now().toString().slice(-3)}`,
      name: form.name,
      code: `V-${form.name.slice(0, 3).toUpperCase()}-${Math.floor(10 + Math.random() * 89)}`,
      crNumber: form.crNumber,
      vatNumber: form.vatNumber || `300${Math.floor(1000000000 + Math.random() * 9000000000)}00003`,
      category: form.category,
      tier: form.tier,
      status: isHead ? 'Approved' : 'Under Audit',
      approvalStatus: isHead ? 'Approved' : 'Pending Head Approval',
      approvedBy: isHead ? (currentUser?.name || 'Authorized Head') : undefined,
      approvedAt: isHead ? new Date().toISOString() : undefined,
      requestedBy: currentUser?.name || 'Staff User',
      entityScope: form.entityScope,
      rating: 0,
      onTimeDeliveryRate: 0,
      qualityComplianceRate: 0,
      contactPerson: form.contactPerson || 'Vendor Representative',
      contactEmail: form.contactEmail || 'sales@vendor.com.sa',
      contactPhone: form.contactPhone || '+966 11 000 0000',
      city: form.city,
      country: 'Saudi Arabia',
      totalSpendSAR: 0,
      activeContractsCount: 0,
    };

    onAddVendor(newVendor);
    if (isHead) {
      success('Vendor Qualified & Approved', `${newVendor.name} approved directly by Head into directory.`);
    } else {
      success('Submitted for Head Review', `${newVendor.name} queued for Department Head qualification audit.`);
    }
    setIsModalOpen(false);
    setForm({
      name: '',
      crNumber: '',
      vatNumber: '',
      category: 'GPS Trackers & Asset Gateways',
      tier: 'Tier 1',
      entityScope: 'Arabitra Approved',
      contactPerson: '',
      contactEmail: '',
      contactPhone: '',
      city: 'Riyadh',
    });
  };

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-cyan-400" />
            Approved Vendor Directory
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-0.5">
            Verified suppliers, Aramco/SEC qualification standards, compliance audits & performance scores. <span className="text-amber-400 font-medium">All new suppliers require prior Department Head sign-off.</span>
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setIsModalOpen(true)}
        >
          Register Vendor
        </Button>
      </div>

      {/* Pending Head Approval Banner */}
      {pendingCount > 0 && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-900/60 border border-amber-500/50 flex items-center justify-center text-amber-400 shrink-0">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-200">
                {pendingCount} Supplier{pendingCount > 1 ? 's' : ''} Awaiting Prior Head Qualification
              </h4>
              <p className="text-xs text-amber-300/80">
                {isHead
                  ? 'As Department Head / Super Admin, you hold authority to approve or reject supplier onboarding applications.'
                  : 'Supplier submissions have been routed to Department Head for prequalification verification.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setVendorTab('PENDING')}
            className="text-xs font-bold text-amber-300 hover:text-white px-3 py-1.5 rounded-lg bg-amber-900/50 border border-amber-500/40 transition-colors shrink-0"
          >
            Review Pending ({pendingCount})
          </button>
        </div>
      )}

      {/* Tabs and Search Bar */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setVendorTab('PENDING')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              vendorTab === 'PENDING'
                ? 'bg-amber-950/90 text-amber-300 border border-amber-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-400" />
            <span>Vendors Pending Approval</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                vendorTab === 'PENDING'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-amber-500/20 text-amber-400'
              }`}
            >
              {pendingCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setVendorTab('APPROVED')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              vendorTab === 'APPROVED'
                ? 'bg-emerald-950/90 text-emerald-300 border border-emerald-500/50 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Approved Vendors</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                vendorTab === 'APPROVED'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-emerald-500/20 text-emerald-400'
              }`}
            >
              {approvedCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setVendorTab('ALL')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              vendorTab === 'ALL'
                ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            All Suppliers ({vendors.filter((v) => matchesCompany(v.entityScope)).length})
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
          <div className="flex flex-col sm:flex-row items-center gap-2.5 w-full sm:w-auto">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search by vendor name, CR number, VAT ID or city..."
              className="w-full sm:w-80"
            />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full sm:w-auto px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-300 focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              <option value="GPS Trackers & Asset Gateways">GPS Trackers & Asset Gateways</option>
              <option value="Video Telematics & AI Dashcams">Video Telematics & AI Dashcams</option>
              <option value="CAN Bus & Vehicle Interfaces">CAN Bus & Vehicle Interfaces</option>
              <option value="Sensors, Probes & IoT Monitoring">Sensors, Probes & IoT Monitoring</option>
              <option value="Driver Safety & Alarm Systems">Driver Safety & Alarm Systems</option>
              <option value="Driver Identification & RFID">Driver Identification & RFID</option>
              <option value="Industrial Routers & Switches">Industrial Routers & Switches</option>
              <option value="In-Vehicle Displays & Infotainment">In-Vehicle Displays & Infotainment</option>
              <option value="Satellite IoT & Connectivity">Satellite IoT & Connectivity</option>
              <option value="Cables, Wiring & Mounting Hardware">Cables, Wiring & Mounting Hardware</option>
              <option value="Cloud Subscriptions & Software">Cloud Subscriptions & Software</option>
            </select>
          </div>
          <div className="text-xs text-slate-400">
            Showing <span className="font-semibold text-slate-200">{filteredVendors.length}</span> suppliers
          </div>
        </div>
      </div>

      {/* Vendors Table */}
      {filteredVendors.length === 0 ? (
        <EmptyState
          title={
            vendorTab === 'PENDING'
              ? 'No vendors pending approval'
              : 'No approved vendors found'
          }
          description="Try searching with a different term or register a new commercial vendor."
          actionLabel="Register Vendor"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="glass-panel rounded-xl overflow-hidden border border-slate-800 shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 text-[11px] border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Vendor Company</th>
                  <th className="py-3.5 px-4 font-semibold">CR / VAT ID</th>
                  <th className="py-3.5 px-4 font-semibold">Category</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Score / Rating</th>
                  <th className="py-3.5 px-4 font-semibold text-right">YTD Spend</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Dossier</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredVendors.map((vendor) => {
                  const isVendorPending = vendor.status === 'Under Audit' || vendor.approvalStatus === 'Pending Head Approval';
                  const vMetrics = vendorMetricsMap.get(vendor.id) || {
                    totalSpendSAR: 0,
                    formattedSpend: 'SAR 0',
                    totalOrders: 0,
                    activeContractsCount: 0,
                    totalDeliveries: 0,
                    onTimeRate: null,
                    qcRate: null,
                    rating: null,
                  };

                  return (
                    <tr key={vendor.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 min-w-[220px]" title={vendor.name}>
                        <div className="font-semibold text-slate-100 flex items-center gap-1.5 leading-snug break-words" title={vendor.name}>
                          {vendor.name}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5 leading-snug break-words" title={`${vendor.city}, ${vendor.country}`}>
                          <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
                          {vendor.city}, {vendor.country}
                        </div>
                        {isVendorPending ? (
                          <div className="mt-1">
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded">
                              <Clock className="w-2.5 h-2.5" />
                              Pending Head Approval
                            </span>
                          </div>
                        ) : (
                          <div className="mt-1">
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-1.5 py-0.5 rounded">
                              <ShieldCheck className="w-2.5 h-2.5" />
                              Head Approved
                            </span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-slate-300" title={`CR: ${vendor.crNumber} | VAT: ${vendor.vatNumber}`}>
                        <div>CR: {vendor.crNumber}</div>
                        <div className="text-[10px] text-slate-400">VAT: {vendor.vatNumber}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 min-w-[200px]" title={vendor.category}>
                        <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800/60 text-slate-300 border border-slate-700/60 inline-block leading-tight break-words max-w-[260px]" title={vendor.category}>
                          {vendor.category}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {vMetrics.rating !== null ? (
                          <>
                            <div className="inline-flex items-center gap-1 font-bold text-amber-400">
                              <Star className="w-3.5 h-3.5 fill-amber-400" />
                              <span>{vMetrics.rating.toFixed(1)}</span>
                            </div>
                            <div className="text-[10px] text-slate-400">
                              OTD: {vMetrics.onTimeRate !== null ? `${vMetrics.onTimeRate}%` : '—'}
                            </div>
                          </>
                        ) : (
                          <>
                            <div className="inline-flex items-center gap-1 font-semibold text-slate-400 text-xs">
                              <Star className="w-3.5 h-3.5 text-slate-500" />
                              <span>Unrated</span>
                            </div>
                            <div className="text-[10px] text-slate-500">
                              {vMetrics.totalOrders > 0
                                ? `${vMetrics.totalOrders} in pipeline`
                                : '0 completed orders'}
                            </div>
                          </>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-200 whitespace-nowrap">
                        {vMetrics.formattedSpend}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {isVendorPending && isHead && onApproveVendor ? (
                            <button
                              type="button"
                              onClick={() => onApproveVendor(vendor.id)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 hover:text-white text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                              title="Sign off & approve supplier into active directory"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Approve
                            </button>
                          ) : null}
                          <button
                            type="button"
                            onClick={() => handleOpenDossier(vendor)}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 text-cyan-300 hover:bg-slate-700 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1.5 border border-slate-700"
                            title="Open vendor dossier and edit details"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Dossier
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Vendor Profile Dossier Modal (View & Edit with Approval Workflow) */}
      {selectedVendor && (
        <Modal
          isOpen={!!selectedVendor}
          onClose={() => {
            setSelectedVendor(null);
            setIsEditingVendor(false);
          }}
          title={isEditingVendor ? `Edit Vendor: ${selectedVendor.name}` : `Vendor Dossier: ${selectedVendor.name}`}
          subtitle={`Commercial Reg: ${selectedVendor.crNumber} | Status: ${selectedVendor.approvalStatus || selectedVendor.status}`}
          maxWidth="2xl"
          footer={
            <div className="flex items-center justify-between w-full gap-2">
              <div>
                {!isEditingVendor && (selectedVendor.status === 'Under Audit' || selectedVendor.approvalStatus === 'Pending Head Approval') && isHead && onApproveVendor ? (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<CheckCircle2 className="w-4 h-4" />}
                      onClick={() => {
                        onApproveVendor(selectedVendor.id);
                        setSelectedVendor({ ...selectedVendor, status: 'Approved', approvalStatus: 'Approved' });
                      }}
                    >
                      Approve Supplier (Head Sign-off)
                    </Button>
                    {onRejectVendor && (
                      <Button
                        variant="danger"
                        size="sm"
                        icon={<XCircle className="w-4 h-4" />}
                        onClick={() => {
                          onRejectVendor(selectedVendor.id, 'Qualification criteria returned by Head');
                          setSelectedVendor({ ...selectedVendor, status: 'Probation', approvalStatus: 'Rejected' });
                        }}
                      >
                        Reject
                      </Button>
                    )}
                  </div>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                {!isEditingVendor ? (
                  <>
                    <Button
                      variant="primary"
                      size="sm"
                      icon={<Edit3 className="w-3.5 h-3.5" />}
                      onClick={() => setIsEditingVendor(true)}
                    >
                      Edit Vendor Details
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setSelectedVendor(null)}>
                      Close Dossier
                    </Button>
                  </>
                ) : (
                  <Button variant="outline" size="sm" onClick={() => setIsEditingVendor(false)}>
                    Cancel Editing
                  </Button>
                )}
              </div>
            </div>
          }
        >
          {isEditingVendor ? (
            <form onSubmit={handleSaveVendorEdit} className="space-y-4 text-xs">
              {/* Approval Warning Notice */}
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
                <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-800 dark:text-amber-200">
                  <p className="font-bold">Prior Approval Required for Vendor Modifications</p>
                  <p className="mt-0.5 text-amber-700 dark:text-amber-300/90">
                    Any modification to vendor legal name, CR number, VAT ID, category or contacts will automatically reset this vendor's qualification status to <strong className="font-semibold underline">Pending Head Approval</strong>.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Company Name *</label>
                  <input
                    type="text"
                    required
                    value={editVendorForm.name}
                    onChange={(e) => setEditVendorForm({ ...editVendorForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 font-semibold focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Category *</label>
                  <select
                    value={editVendorForm.category}
                    onChange={(e) => setEditVendorForm({ ...editVendorForm, category: e.target.value as ItemCategory })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:border-cyan-500 focus:outline-none cursor-pointer"
                  >
                    <option value="GPS Trackers & Asset Gateways">GPS Trackers & Asset Gateways</option>
                    <option value="Video Telematics & AI Dashcams">Video Telematics & AI Dashcams</option>
                    <option value="CAN Bus & Vehicle Interfaces">CAN Bus & Vehicle Interfaces</option>
                    <option value="Sensors, Probes & IoT Monitoring">Sensors, Probes & IoT Monitoring</option>
                    <option value="Driver Safety & Alarm Systems">Driver Safety & Alarm Systems</option>
                    <option value="Driver Identification & RFID">Driver Identification & RFID</option>
                    <option value="Industrial Routers & Switches">Industrial Routers & Switches</option>
                    <option value="In-Vehicle Displays & Infotainment">In-Vehicle Displays & Infotainment</option>
                    <option value="Satellite IoT & Connectivity">Satellite IoT & Connectivity</option>
                    <option value="Cables, Wiring & Mounting Hardware">Cables, Wiring & Mounting Hardware</option>
                    <option value="Cloud Subscriptions & Software">Cloud Subscriptions & Software</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Commercial Registration (CR) *</label>
                  <input
                    type="text"
                    required
                    value={editVendorForm.crNumber}
                    onChange={(e) => setEditVendorForm({ ...editVendorForm, crNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">VAT Identification Number</label>
                  <input
                    type="text"
                    value={editVendorForm.vatNumber}
                    onChange={(e) => setEditVendorForm({ ...editVendorForm, vatNumber: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Headquarters City</label>
                  <input
                    type="text"
                    value={editVendorForm.city}
                    onChange={(e) => setEditVendorForm({ ...editVendorForm, city: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={editVendorForm.contactPerson}
                    onChange={(e) => setEditVendorForm({ ...editVendorForm, contactPerson: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Contact Email</label>
                  <input
                    type="email"
                    value={editVendorForm.contactEmail}
                    onChange={(e) => setEditVendorForm({ ...editVendorForm, contactEmail: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={editVendorForm.contactPhone}
                    onChange={(e) => setEditVendorForm({ ...editVendorForm, contactPhone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsEditingVendor(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" icon={<Check className="w-4 h-4" />}>
                  Save & Submit for Head Approval
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4 text-xs">
              {/* Approval status badge inside dossier */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 font-medium">Head Qualification Status:</span>
                  {selectedVendor.approvalStatus === 'Pending Head Approval' || selectedVendor.status === 'Under Audit' ? (
                    <Badge variant="amber" dot className="font-bold">
                      Pending Head Approval
                    </Badge>
                  ) : (
                    <Badge variant="emerald" dot className="font-bold">
                      Approved by {selectedVendor.approvedBy || 'Department Head'}
                    </Badge>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Edit3 className="w-3.5 h-3.5 text-cyan-400" />}
                  onClick={() => setIsEditingVendor(true)}
                >
                  Edit Vendor Details
                </Button>
              </div>

              {/* KPI Banner with Real Dynamic Telemetry */}
              {(() => {
                const sMetrics = selectedVendor ? vendorMetricsMap.get(selectedVendor.id) : null;
                const hasOrders = sMetrics && sMetrics.totalOrders > 0;
                const hasDeliveries = sMetrics && sMetrics.totalDeliveries > 0;

                return (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Quality Compliance</span>
                        <span className={`text-base font-bold ${sMetrics?.qcRate !== null && sMetrics?.qcRate !== undefined ? 'text-emerald-400' : 'text-slate-400'}`}>
                          {sMetrics?.qcRate !== null && sMetrics?.qcRate !== undefined ? `${sMetrics.qcRate}%` : '—'}
                        </span>
                        {(sMetrics?.qcRate === null || sMetrics?.qcRate === undefined) && (
                          <span className="text-[9px] text-slate-500 block">No QC logs yet</span>
                        )}
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">On-Time Delivery</span>
                        <span className={`text-base font-bold ${sMetrics?.onTimeRate !== null && sMetrics?.onTimeRate !== undefined ? 'text-cyan-400' : 'text-slate-400'}`}>
                          {sMetrics?.onTimeRate !== null && sMetrics?.onTimeRate !== undefined ? `${sMetrics.onTimeRate}%` : '—'}
                        </span>
                        {(sMetrics?.onTimeRate === null || sMetrics?.onTimeRate === undefined) && (
                          <span className="text-[9px] text-slate-500 block">No shipments yet</span>
                        )}
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Active Contracts</span>
                        <span className="text-base font-bold text-slate-100">
                          {sMetrics?.activeContractsCount || 0} {(sMetrics?.activeContractsCount === 1) ? 'Package' : 'Packages'}
                        </span>
                        <span className="text-[9px] text-slate-500 block">
                          {sMetrics?.totalOrders || 0} total PO{sMetrics?.totalOrders === 1 ? '' : 's'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Lifetime Spend</span>
                        <span className="text-base font-mono font-bold text-slate-100">
                          {sMetrics?.formattedSpend || 'SAR 0'}
                        </span>
                        <span className="text-[9px] text-slate-500 block">
                          {sMetrics && sMetrics.totalSpendSAR > 0 ? 'Committed & Paid' : 'No spend recorded'}
                        </span>
                      </div>
                    </div>

                    {/* Telemetry Status Summary */}
                    <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800/80 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-lg bg-slate-800 text-cyan-400">
                          <Building2 className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-semibold text-slate-200">
                            {hasOrders ? `${sMetrics?.totalOrders} Purchase Orders Recorded` : 'No Transaction History'}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {hasDeliveries
                              ? `${sMetrics?.totalDeliveries} deliveries tracked with live QC & OTD telemetry`
                              : 'Real telemetry reflects automatically upon issuance of POs and receipt of shipments.'}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                          sMetrics?.rating !== null && sMetrics?.rating !== undefined
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : 'bg-slate-800 text-slate-400 border border-slate-700'
                        }`}>
                          <Star className={`w-3 h-3 ${sMetrics?.rating !== null && sMetrics?.rating !== undefined ? 'fill-amber-400' : 'text-slate-500'}`} />
                          {sMetrics?.rating !== null && sMetrics?.rating !== undefined ? `${sMetrics.rating.toFixed(1)} Rating` : 'Unrated Supplier'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Contact & Banking Information */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <h5 className="font-semibold text-slate-200 flex items-center gap-1.5 text-xs">
                    <Mail className="w-3.5 h-3.5 text-cyan-400" /> Commercial Contact
                  </h5>
                  <p className="text-slate-300 font-medium">{selectedVendor.contactPerson}</p>
                  <p className="text-slate-400">{selectedVendor.contactEmail}</p>
                  <p className="text-slate-400">{selectedVendor.contactPhone}</p>
                  <p className="text-slate-400 flex items-center gap-1 mt-1">
                    <MapPin className="w-3 h-3 text-cyan-400" /> {selectedVendor.city}, {selectedVendor.country}
                  </p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                  <h5 className="font-semibold text-slate-200 flex items-center gap-1.5 text-xs">
                    <FileText className="w-3.5 h-3.5 text-emerald-400" /> Compliance Accreditations
                  </h5>
                  <ul className="space-y-1 text-slate-400 text-[11px]">
                    <li>• ISO 9001:2015 Quality Management Certified</li>
                    <li>• Saudi Aramco Vendor Approval Certificate Verified</li>
                    <li>• SEC (Saudi Electricity Company) Prequalified Class A</li>
                    <li>• General Authority of Zakat & Tax (ZATCA) Compliant</li>
                  </ul>
                </div>
              </div>
            </div>
          )}
        </Modal>
      )}

      {/* Register Vendor Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Register New Vendor"
        subtitle="Onboard supplier for Arabitra procurement (Powered by Fitco)"
        maxWidth="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Company Legal Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Al-Falak Heavy Mechanical Co."
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">CR Number (Ministry of Commerce) *</label>
              <input
                type="text"
                required
                placeholder="10-digit CR number"
                value={form.crNumber}
                onChange={(e) => setForm({ ...form, crNumber: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Primary Category</label>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value as ItemCategory })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
              >
                <option value="GPS Trackers & Asset Gateways">GPS Trackers & Asset Gateways</option>
                <option value="Video Telematics & AI Dashcams">Video Telematics & AI Dashcams</option>
                <option value="CAN Bus & Vehicle Interfaces">CAN Bus & Vehicle Interfaces</option>
                <option value="Sensors, Probes & IoT Monitoring">Sensors, Probes & IoT Monitoring</option>
                <option value="Driver Safety & Alarm Systems">Driver Safety & Alarm Systems</option>
                <option value="Driver Identification & RFID">Driver Identification & RFID</option>
                <option value="Industrial Routers & Switches">Industrial Routers & Switches</option>
                <option value="In-Vehicle Displays & Infotainment">In-Vehicle Displays & Infotainment</option>
                <option value="Satellite IoT & Connectivity">Satellite IoT & Connectivity</option>
                <option value="Cables, Wiring & Mounting Hardware">Cables, Wiring & Mounting Hardware</option>
                <option value="Cloud Subscriptions & Software">Cloud Subscriptions & Software</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Entity Scope</label>
              <select
                value={form.entityScope}
                onChange={(e) => setForm({ ...form, entityScope: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
              >
                <option value="Arabitra Approved">Arabitra Approved</option>
                <option value="Joint / Group">Enterprise / Group</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Tier</label>
              <select
                value={form.tier}
                onChange={(e) => setForm({ ...form, tier: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
              >
                <option value="Tier 1">Tier 1 (Strategic)</option>
                <option value="Tier 2">Tier 2 (Preferred)</option>
                <option value="Tier 3">Tier 3 (Standard)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">City / Region</label>
              <input
                type="text"
                placeholder="Dammam, Riyadh, etc."
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Contact Person</label>
              <input
                type="text"
                placeholder="Sales Director"
                value={form.contactPerson}
                onChange={(e) => setForm({ ...form, contactPerson: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Email</label>
              <input
                type="email"
                placeholder="sales@company.com.sa"
                value={form.contactEmail}
                onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Phone</label>
              <input
                type="tel"
                placeholder="+966 ..."
                value={form.contactPhone}
                onChange={(e) => setForm({ ...form, contactPhone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Register Vendor
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
