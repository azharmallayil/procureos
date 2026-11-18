import React, { useState } from 'react';
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
} from 'lucide-react';
import { Vendor, ItemCategory, isHeadRole } from '../../../types/procurement';
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
  onAddVendor: (vendor: Vendor) => void;
  onApproveVendor?: (vendorId: string) => void;
  onRejectVendor?: (vendorId: string, reason?: string) => void;
}

export const VendorsModule: React.FC<VendorsModuleProps> = ({
  vendors,
  onAddVendor,
  onApproveVendor,
  onRejectVendor,
}) => {
  const { matchesCompany } = useCompany();
  const { currentUser, activeRole, permissions } = useAuth();
  const { success, warning } = useToast();

  const isHead = isHeadRole(activeRole) || permissions?.canApproveVendor || activeRole === 'Super Admin';

  const [search, setSearch] = useState('');
  const [vendorTab, setVendorTab] = useState<'ALL' | 'APPROVED' | 'PENDING'>('ALL');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Vendor Form State
  const [form, setForm] = useState({
    name: '',
    crNumber: '',
    vatNumber: '',
    category: 'Mechanical & Piping' as ItemCategory,
    tier: 'Tier 1' as 'Tier 1' | 'Tier 2' | 'Tier 3',
    entityScope: 'Arabitra Approved' as 'Arabitra Approved' | 'Joint / Group' | 'FITCO Approved',
    contactPerson: '',
    contactEmail: '',
    contactPhone: '',
    city: 'Riyadh',
  });

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
    const matchesQuery =
      v.name.toLowerCase().includes(search.toLowerCase()) ||
      v.crNumber.includes(search) ||
      v.vatNumber.includes(search) ||
      v.city.toLowerCase().includes(search.toLowerCase()) ||
      v.category.toLowerCase().includes(search.toLowerCase());
    return matchesScope && matchesTab && matchesQuery;
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
      rating: isHead ? 4.8 : 3.5,
      onTimeDeliveryRate: 95.0,
      qualityComplianceRate: 98.0,
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
      category: 'Mechanical & Piping',
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
            onClick={() => setVendorTab('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              vendorTab === 'ALL'
                ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            All Suppliers ({vendors.filter((v) => matchesCompany(v.entityScope)).length})
          </button>
          <button
            type="button"
            onClick={() => setVendorTab('APPROVED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              vendorTab === 'APPROVED'
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Head Approved Directory ({approvedCount})
          </button>
          <button
            type="button"
            onClick={() => setVendorTab('PENDING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              vendorTab === 'PENDING'
                ? 'bg-amber-950/80 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            Pending Head Approval ({pendingCount})
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by vendor name, CR number, VAT ID or city..."
            className="w-full sm:w-96"
          />
          <div className="text-xs text-slate-400">
            Showing <span className="font-semibold text-slate-200">{filteredVendors.length}</span> suppliers
          </div>
        </div>
      </div>

      {/* Vendors Table */}
      {filteredVendors.length === 0 ? (
        <EmptyState
          title="No vendors found"
          description="Try searching with a different term or register a new commercial vendor."
          actionLabel="Register Vendor"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="glass-panel rounded-xl overflow-hidden border border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 text-[11px] border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Vendor Company</th>
                  <th className="py-3.5 px-4 font-semibold">CR / VAT ID</th>
                  <th className="py-3.5 px-4 font-semibold">Scope & Tier</th>
                  <th className="py-3.5 px-4 font-semibold">Category</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Score / Rating</th>
                  <th className="py-3.5 px-4 font-semibold text-right">YTD Spend</th>
                  <th className="py-3.5 px-4 font-semibold">Head Clearance</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredVendors.map((vendor) => {
                  const isVendorPending = vendor.status === 'Under Audit' || vendor.approvalStatus === 'Pending Head Approval';

                  return (
                    <tr key={vendor.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 min-w-[220px]">
                        <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                          {vendor.name}
                        </div>
                        <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-cyan-400" />
                          {vendor.city}, {vendor.country}
                        </div>
                        {vendor.requestedBy && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Created by: <span className="text-slate-300 font-medium">{vendor.requestedBy}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono text-slate-300">
                        <div>CR: {vendor.crNumber}</div>
                        <div className="text-[10px] text-slate-400">VAT: {vendor.vatNumber}</div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <Badge
                          variant={
                            vendor.entityScope === 'Joint / Group'
                              ? 'purple'
                              : 'amber'
                          }
                        >
                          {vendor.entityScope === 'Joint / Group' ? 'Enterprise' : 'Arabitra Approved'}
                        </Badge>
                        <span className="block text-[10px] text-slate-400 mt-1 font-semibold">
                          {vendor.tier}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap">
                        {vendor.category}
                      </td>
                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1 font-bold text-amber-400">
                          <Star className="w-3.5 h-3.5 fill-amber-400" />
                          <span>{vendor.rating.toFixed(1)}</span>
                        </div>
                        <div className="text-[10px] text-slate-400">
                          OTD: {vendor.onTimeDeliveryRate}%
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-200 whitespace-nowrap">
                        SAR {(vendor.totalSpendSAR / 1000000).toFixed(2)}M
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isVendorPending ? (
                          <Badge variant="amber" dot className="font-semibold">
                            Pending Head Approval
                          </Badge>
                        ) : (
                          <div className="space-y-0.5">
                            <Badge
                              variant={vendor.status === 'Preferred' ? 'emerald' : 'cyan'}
                              dot
                              className="font-semibold"
                            >
                              Head Approved
                            </Badge>
                            {vendor.approvedBy && (
                              <p className="text-[9px] text-slate-400 truncate max-w-[120px]">
                                by {vendor.approvedBy}
                              </p>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {isVendorPending && isHead && onApproveVendor ? (
                            <button
                              type="button"
                              onClick={() => onApproveVendor(vendor.id)}
                              className="px-2 py-1 rounded bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 hover:text-white text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                              title="Sign off & approve supplier into active directory"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Approve
                            </button>
                          ) : null}
                          <button
                            onClick={() => setSelectedVendor(vendor)}
                            className="px-2.5 py-1 rounded bg-slate-800 text-cyan-300 hover:bg-slate-700 text-xs font-medium transition-colors cursor-pointer"
                          >
                            View Dossier
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

      {/* Vendor Profile Dossier Modal */}
      {selectedVendor && (
        <Modal
          isOpen={!!selectedVendor}
          onClose={() => setSelectedVendor(null)}
          title={selectedVendor.name}
          subtitle={`Commercial Reg: ${selectedVendor.crNumber} | Status: ${selectedVendor.status}`}
          maxWidth="2xl"
          footer={
            <div className="flex items-center justify-between w-full gap-2">
              <div>
                {(selectedVendor.status === 'Under Audit' || selectedVendor.approvalStatus === 'Pending Head Approval') && isHead && onApproveVendor ? (
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
              <Button variant="outline" size="sm" onClick={() => setSelectedVendor(null)}>
                Close Dossier
              </Button>
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            {/* KPI Banner */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800">
              <div>
                <span className="text-slate-400 block text-[10px]">Quality Compliance</span>
                <span className="text-base font-bold text-emerald-400">
                  {selectedVendor.qualityComplianceRate}%
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">On-Time Delivery</span>
                <span className="text-base font-bold text-cyan-400">
                  {selectedVendor.onTimeDeliveryRate}%
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Active Contracts</span>
                <span className="text-base font-bold text-slate-100">
                  {selectedVendor.activeContractsCount} Packages
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Lifetime Spend</span>
                <span className="text-base font-mono font-bold text-slate-100">
                  SAR {(selectedVendor.totalSpendSAR / 1000000).toFixed(1)}M
                </span>
              </div>
            </div>

            {/* Contact & Banking Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                <h5 className="font-semibold text-slate-200 flex items-center gap-1.5 text-xs">
                  <Mail className="w-3.5 h-3.5 text-cyan-400" /> Commercial Contact
                </h5>
                <p className="text-slate-300 font-medium">{selectedVendor.contactPerson}</p>
                <p className="text-slate-400">{selectedVendor.contactEmail}</p>
                <p className="text-slate-400">{selectedVendor.contactPhone}</p>
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
