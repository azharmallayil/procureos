import React, { useState } from 'react';
import { Plus, Boxes, Filter, AlertTriangle, ArrowUpDown, Download, CheckCircle2, XCircle, Clock, ShieldCheck } from 'lucide-react';
import { Item, ItemCategory, EntityId, isHeadRole } from '../../../types/procurement';
import { useCompany } from '../../../context/CompanyContext';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { Button } from '../../common/Button';
import { Badge } from '../../common/Badge';
import { SearchInput } from '../../common/SearchInput';
import { Modal } from '../../common/Modal';
import { EmptyState } from '../../common/EmptyState';

interface ItemsModuleProps {
  items: Item[];
  onAddItem: (newItem: Item) => void;
  onApproveItem?: (itemId: string) => void;
  onRejectItem?: (itemId: string, reason?: string) => void;
  openCreateModal?: boolean;
  onCloseCreateModal?: () => void;
}

export const ItemsModule: React.FC<ItemsModuleProps> = ({
  items,
  onAddItem,
  onApproveItem,
  onRejectItem,
  openCreateModal = false,
  onCloseCreateModal,
}) => {
  const { activeCompany, matchesCompany } = useCompany();
  const { currentUser, activeRole, permissions } = useAuth();
  const { success, warning } = useToast();

  const isHead = isHeadRole(activeRole) || permissions?.canApproveItem || activeRole === 'Super Admin';

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [approvalTab, setApprovalTab] = useState<'ALL' | 'APPROVED' | 'PENDING'>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(openCreateModal);

  // Form State
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    category: 'GPS Trackers & Asset Gateways' as ItemCategory,
    uom: 'EA',
    unitPriceSAR: '',
    stockLevel: '',
    reorderPoint: '',
    entity: 'ARABITRA' as EntityId | 'SHARED',
    location: '',
  });

  const categories = [
    'ALL',
    'GPS Trackers & Asset Gateways',
    'Video Telematics & AI Dashcams',
    'CAN Bus & Vehicle Interfaces',
    'Sensors, Probes & IoT Monitoring',
    'Driver Safety & Alarm Systems',
    'Driver Identification & RFID',
    'Industrial Routers & Switches',
    'In-Vehicle Displays & Infotainment',
    'Satellite IoT & Connectivity',
    'Cables, Wiring & Mounting Hardware',
    'Cloud Subscriptions & Software',
  ];

  const pendingCount = items.filter(
    (i) => matchesCompany(i.entity) && (i.approvalStatus === 'Pending Head Approval' || i.status === 'Pending Head Approval')
  ).length;

  const approvedCount = items.filter(
    (i) => matchesCompany(i.entity) && i.approvalStatus !== 'Pending Head Approval' && i.status !== 'Pending Head Approval' && i.approvalStatus !== 'Rejected'
  ).length;

  const filteredItems = items.filter((item) => {
    const matchesScope = matchesCompany(item.entity);
    const matchesCat = selectedCategory === 'ALL' || item.category === selectedCategory;
    const isPending = item.approvalStatus === 'Pending Head Approval' || item.status === 'Pending Head Approval';
    const isApproved = !isPending && item.approvalStatus !== 'Rejected';
    const matchesTab =
      approvalTab === 'ALL' ||
      (approvalTab === 'APPROVED' && isApproved) ||
      (approvalTab === 'PENDING' && isPending);
    const matchesQuery =
      item.sku.toLowerCase().includes(search.toLowerCase()) ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase());
    return matchesScope && matchesCat && matchesTab && matchesQuery;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.sku || !formData.name || !formData.unitPriceSAR) return;

    const newItem: Item = {
      id: `ITM-${Date.now().toString().slice(-4)}`,
      sku: formData.sku.toUpperCase(),
      name: formData.name,
      description: formData.description,
      category: formData.category,
      uom: formData.uom,
      stockLevel: parseInt(formData.stockLevel) || 0,
      reorderPoint: parseInt(formData.reorderPoint) || 5,
      unitPriceSAR: parseFloat(formData.unitPriceSAR) || 0,
      entity: formData.entity,
      primaryVendorId: 'VND-001',
      location: formData.location || 'Central Depot',
      status: isHead ? (parseInt(formData.stockLevel) <= 2 ? 'Critical' : 'In Stock') : 'Pending Head Approval',
      approvalStatus: isHead ? 'Approved' : 'Pending Head Approval',
      approvedBy: isHead ? (currentUser?.name || 'Department Head') : undefined,
      approvedAt: isHead ? new Date().toISOString() : undefined,
      requestedBy: currentUser?.name || 'Staff User',
      leadTimeDays: 20,
      updatedAt: new Date().toISOString().split('T')[0],
    };

    onAddItem(newItem);
    if (isHead) {
      success('Item Approved & Cataloged', `${newItem.sku} authorized directly by Head into Master Catalog.`);
    } else {
      success('Submitted for Head Approval', `${newItem.sku} queued for Department Head sign-off before entering inventory.`);
    }
    setIsModalOpen(false);
    if (onCloseCreateModal) onCloseCreateModal();

    // Reset Form
    setFormData({
      sku: '',
      name: '',
      description: '',
      category: 'GPS Trackers & Asset Gateways',
      uom: 'EA',
      unitPriceSAR: '',
      stockLevel: '',
      reorderPoint: '',
      entity: 'ARABITRA',
      location: '',
    });
  };

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <Boxes className="w-6 h-6 text-cyan-400" />
            Items & Material Master Data
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-0.5">
            Standardized catalog, SKUs, inventory thresholds, and pricing. <span className="text-amber-400 font-medium">All new items require prior Department Head sign-off.</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            icon={<Download className="w-3.5 h-3.5" />}
            onClick={() => success('Catalog Exported', 'Downloaded item master dataset (.csv)')}
          >
            Export
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsModalOpen(true)}
          >
            Add New Item
          </Button>
        </div>
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
                {pendingCount} Item{pendingCount > 1 ? 's' : ''} Awaiting Prior Head Approval
              </h4>
              <p className="text-xs text-amber-300/80">
                {isHead
                  ? 'As Department Head / Super Admin, you hold authorization authority to sign off these additions.'
                  : 'Items have been submitted to Department Head for review and commercial qualification.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setApprovalTab('PENDING')}
            className="text-xs font-bold text-amber-300 hover:text-white px-3 py-1.5 rounded-lg bg-amber-900/50 border border-amber-500/40 transition-colors shrink-0"
          >
            Review Pending ({pendingCount})
          </button>
        </div>
      )}

      {/* Approval Status Tabs & Search Filter */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
          <button
            type="button"
            onClick={() => setApprovalTab('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              approvalTab === 'ALL'
                ? 'bg-cyan-950/80 text-cyan-300 border border-cyan-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            All Items ({items.filter((i) => matchesCompany(i.entity)).length})
          </button>
          <button
            type="button"
            onClick={() => setApprovalTab('APPROVED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              approvalTab === 'APPROVED'
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            Head Approved Catalog ({approvedCount})
          </button>
          <button
            type="button"
            onClick={() => setApprovalTab('PENDING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              approvalTab === 'PENDING'
                ? 'bg-amber-950/80 text-amber-300 border border-amber-500/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-amber-400" />
            Pending Head Approval ({pendingCount})
          </button>
        </div>

        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by SKU, item name or specification..."
            className="w-full md:w-96"
          />

          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
            <Filter className="w-4 h-4 text-slate-400 shrink-0 hidden sm:block" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              {categories.map((c) => {
                const count =
                  c === 'ALL'
                    ? items.filter((i) => matchesCompany(i.entity)).length
                    : items.filter((i) => matchesCompany(i.entity) && i.category === c).length;
                return (
                  <option key={c} value={c}>
                    {c === 'ALL' ? `All Commodity Categories (${count})` : `${c} (${count})`}
                  </option>
                );
              })}
            </select>
          </div>
        </div>
      </div>

      {/* Items Table */}
      {filteredItems.length === 0 ? (
        <EmptyState
          title="No items found in catalog"
          description="Adjust your search terms, select a different category, or create a new inventory SKU."
          actionLabel="Add New Item"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="glass-panel rounded-xl overflow-hidden border border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 text-[11px] border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">SKU & Code</th>
                  <th className="py-3.5 px-4 font-semibold">Item Specification</th>
                  <th className="py-3.5 px-4 font-semibold">Category</th>
                  <th className="py-3.5 px-4 font-semibold">Entity</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Standard Price</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Stock Level</th>
                  <th className="py-3.5 px-4 font-semibold">Head Clearance</th>
                  <th className="py-3.5 px-4 font-semibold">Actions / Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredItems.map((item) => {
                  const isItemPending = item.approvalStatus === 'Pending Head Approval' || item.status === 'Pending Head Approval';
                  const isItemRejected = item.approvalStatus === 'Rejected';

                  return (
                    <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-cyan-300 whitespace-nowrap">
                        {item.sku}
                      </td>
                      <td className="py-3.5 px-4 min-w-[240px]">
                        <div className="font-semibold text-slate-100">{item.name}</div>
                        <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                          {item.description}
                        </div>
                        {item.requestedBy && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Created by: <span className="text-slate-300 font-medium">{item.requestedBy}</span>
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap">
                        {item.category}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <Badge
                          variant={item.entity === 'SHARED' ? 'purple' : 'amber'}
                        >
                          {item.entity === 'SHARED' ? 'Shared' : 'Arabitra'}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-semibold text-slate-100 whitespace-nowrap">
                        SAR {item.unitPriceSAR.toLocaleString()} / {item.uom}
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="font-mono font-bold text-slate-200">
                          {item.stockLevel.toLocaleString()} {item.uom}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          Reorder at {item.reorderPoint} {item.uom}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isItemPending ? (
                          <Badge variant="amber" dot className="font-semibold">
                            Pending Head Approval
                          </Badge>
                        ) : isItemRejected ? (
                          <Badge variant="rose" dot className="font-semibold">
                            Rejected by Head
                          </Badge>
                        ) : (
                          <div className="space-y-0.5">
                            <Badge variant="emerald" dot className="font-semibold">
                              Head Approved
                            </Badge>
                            {item.approvedBy && (
                              <p className="text-[9px] text-slate-400 truncate max-w-[120px]">
                                by {item.approvedBy}
                              </p>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isItemPending && isHead && onApproveItem && onRejectItem ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => onApproveItem(item.id)}
                              className="px-2 py-1 rounded bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 hover:text-white text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                              title="Sign off item into master catalog"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => onRejectItem(item.id, 'Returned by Department Head')}
                              className="px-2 py-1 rounded bg-rose-950/80 hover:bg-rose-900 border border-rose-500/50 text-rose-300 hover:text-white text-[11px] font-bold transition-colors flex items-center gap-1 cursor-pointer"
                              title="Reject item addition"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          </div>
                        ) : isItemPending ? (
                          <span className="text-[10px] text-amber-300 italic">
                            Awaiting Head Sign-off
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400">
                            {item.location}
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

      {/* Add New Item Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          if (onCloseCreateModal) onCloseCreateModal();
        }}
        title="Add New Catalog Item"
        subtitle="Register standard procurement item for Arabitra ERP (Powered by Fitco)"
        maxWidth="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">SKU Code *</label>
              <input
                type="text"
                required
                placeholder="e.g. ARB-VAL-9021"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Assign Entity *</label>
              <select
                value={formData.entity}
                onChange={(e) => setFormData({ ...formData, entity: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
              >
                <option value="ARABITRA">Arabitra Enterprise</option>
                <option value="SHARED">Shared Group Item</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Item Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. API 600 Cast Steel Gate Valve 8-inch"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Technical Specification</label>
            <textarea
              rows={2}
              placeholder="Detailed engineering standard, flange rating, grade, etc."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Category</label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
              >
                {categories.filter((c) => c !== 'ALL').map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Unit of Measure (UOM)</label>
              <input
                type="text"
                placeholder="EA / MT / M / SET"
                value={formData.uom}
                onChange={(e) => setFormData({ ...formData, uom: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Standard Price (SAR) *</label>
              <input
                type="number"
                required
                placeholder="e.g. 25000"
                value={formData.unitPriceSAR}
                onChange={(e) => setFormData({ ...formData, unitPriceSAR: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Current Stock</label>
              <input
                type="number"
                placeholder="0"
                value={formData.stockLevel}
                onChange={(e) => setFormData({ ...formData, stockLevel: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Reorder Point</label>
              <input
                type="number"
                placeholder="5"
                value={formData.reorderPoint}
                onChange={(e) => setFormData({ ...formData, reorderPoint: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Depot / Yard Location</label>
              <input
                type="text"
                placeholder="e.g. Dammam Yard Bay 3"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
              />
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
            <Button type="submit" variant="primary" size="sm">
              Save to Catalog
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
