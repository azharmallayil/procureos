import React, { useState } from 'react';
import {
  Boxes,
  Filter,
  Plus,
  Edit3,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  Download,
  Search,
  AlertTriangle,
  Info,
  Check,
  RotateCcw,
} from 'lucide-react';
import { Item, ItemCategory, isHeadRole } from '../../../types/procurement';
import { useCompany } from '../../../context/CompanyContext';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { Button } from '../../common/Button';
import { SearchInput } from '../../common/SearchInput';
import { Modal } from '../../common/Modal';
import { EmptyState } from '../../common/EmptyState';

interface ItemsModuleProps {
  items: Item[];
  onAddItem: (newItem: Item) => void;
  onUpdateItem?: (updatedItem: Item) => void;
  onApproveItem?: (itemId: string) => void;
  onRejectItem?: (itemId: string, reason?: string) => void;
  openCreateModal?: boolean;
  onCloseCreateModal?: () => void;
}

export function getStockStatus(stockLevel: number, reorderPoint: number): {
  color: 'red' | 'orange' | 'green';
  label: string;
  badgeClass: string;
  textClass: string;
  dotClass: string;
  subtext: string;
} {
  const stock = Number(stockLevel) || 0;
  const reorder = Number(reorderPoint) || 0;

  // Red: Low stock
  if (stock <= reorder) {
    return {
      color: 'red',
      label: 'Low Stock',
      badgeClass: 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/40',
      textClass: 'text-rose-600 dark:text-rose-400',
      dotClass: 'bg-rose-500',
      subtext: 'Reorder critical',
    };
  }

  // Orange: Reorder buffer / Moderate stock
  const bufferThreshold = Math.max(reorder * 1.5, reorder + 10);
  if (stock <= bufferThreshold) {
    return {
      color: 'orange',
      label: 'Reorder Buffer',
      badgeClass: 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/40',
      textClass: 'text-amber-600 dark:text-amber-400',
      dotClass: 'bg-amber-500',
      subtext: 'Approaching threshold',
    };
  }

  // Green: Healthy stock
  return {
    color: 'green',
    label: 'Good Stock',
    badgeClass: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/40',
    textClass: 'text-emerald-600 dark:text-emerald-400',
    dotClass: 'bg-emerald-500',
    subtext: 'Healthy inventory',
  };
}

export const ItemsModule: React.FC<ItemsModuleProps> = ({
  items,
  onAddItem,
  onUpdateItem,
  onApproveItem,
  onRejectItem,
  openCreateModal = false,
  onCloseCreateModal,
}) => {
  const { matchesCompany } = useCompany();
  const { currentUser, activeRole, permissions } = useAuth();
  const { success, warning } = useToast();

  const isHead =
    isHeadRole(activeRole) ||
    permissions?.canApproveItem ||
    activeRole === 'Super Admin' ||
    activeRole === 'Department Head (HOD)' ||
    activeRole === 'Managing Director / CEO' ||
    activeRole === 'General Manager (GM)' ||
    activeRole === 'Procurement Director';

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStockFilter, setSelectedStockFilter] = useState<'ALL' | 'RED' | 'ORANGE' | 'GREEN'>('ALL');

  // Primary navigation tabs: 'PENDING' (Items Pending Approval) & 'APPROVED' (Approved Items)
  const [activeTab, setActiveTab] = useState<'PENDING' | 'APPROVED'>('PENDING');

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(openCreateModal);
  const [editingItem, setEditingItem] = useState<Item | null>(null);

  // Edit form state
  const [editFormData, setEditFormData] = useState<{
    name: string;
    sku: string;
    category: ItemCategory;
    uom: string;
    description: string;
    stockLevel: string;
    reorderPoint: string;
    location: string;
  }>({
    name: '',
    sku: '',
    category: 'GPS Trackers & Asset Gateways',
    uom: 'EA',
    description: '',
    stockLevel: '0',
    reorderPoint: '5',
    location: 'Arabitra Head Office Store Khobar',
  });

  // Create form state
  const [newFormData, setNewFormData] = useState({
    sku: '',
    name: '',
    description: '',
    category: 'GPS Trackers & Asset Gateways' as ItemCategory,
    uom: 'EA',
    stockLevel: '',
    reorderPoint: '',
    location: 'Arabitra Head Office Store Khobar',
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

  // Counts based on approvalStatus
  const pendingItems = items.filter(
    (i) => matchesCompany(i.entity) && (i.approvalStatus === 'Pending Head Approval' || i.status === 'Pending Head Approval')
  );
  const approvedItems = items.filter(
    (i) => matchesCompany(i.entity) && i.approvalStatus === 'Approved' && i.status !== 'Pending Head Approval'
  );

  const pendingCount = pendingItems.length;
  const approvedCount = approvedItems.length;

  // Filter items by Tab, Category, and Search
  const filteredItems = items.filter((item) => {
    const matchesScope = matchesCompany(item.entity);
    const isItemPending = item.approvalStatus === 'Pending Head Approval' || item.status === 'Pending Head Approval';
    const isItemApproved = item.approvalStatus === 'Approved' && item.status !== 'Pending Head Approval';

    // Tab filter: 'PENDING' vs 'APPROVED'
    if (activeTab === 'PENDING' && !isItemPending) return false;
    if (activeTab === 'APPROVED' && !isItemApproved) return false;

    // Stock Level Filter (Red, Orange, Green)
    if (selectedStockFilter !== 'ALL') {
      const stockStatus = getStockStatus(item.stockLevel, item.reorderPoint);
      if (selectedStockFilter === 'RED' && stockStatus.color !== 'red') return false;
      if (selectedStockFilter === 'ORANGE' && stockStatus.color !== 'orange') return false;
      if (selectedStockFilter === 'GREEN' && stockStatus.color !== 'green') return false;
    }

    // Category filter
    if (selectedCategory !== 'ALL' && item.category !== selectedCategory) return false;

    // Search query
    if (search.trim()) {
      const q = search.toLowerCase();
      const matchSku = item.sku.toLowerCase().includes(q);
      const matchName = item.name.toLowerCase().includes(q);
      const matchDesc = item.description?.toLowerCase().includes(q);
      const matchCat = item.category?.toLowerCase().includes(q);
      if (!matchSku && !matchName && !matchDesc && !matchCat) return false;
    }

    return matchesScope;
  });

  // Open Edit Modal
  const handleOpenEdit = (item: Item) => {
    setEditingItem(item);
    setEditFormData({
      name: item.name,
      sku: item.sku,
      category: item.category,
      uom: item.uom || 'EA',
      description: item.description || '',
      stockLevel: item.stockLevel.toString(),
      reorderPoint: item.reorderPoint.toString(),
      location: item.location || 'Arabitra Head Office Store Khobar',
    });
  };

  // Submit Edit Form
  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const newStock = parseInt(editFormData.stockLevel) || 0;
    const newReorder = parseInt(editFormData.reorderPoint) || 5;

    const updated: Item = {
      ...editingItem,
      name: editFormData.name,
      sku: editFormData.sku.toUpperCase(),
      category: editFormData.category,
      uom: editFormData.uom.toUpperCase(),
      description: editFormData.description,
      stockLevel: newStock,
      reorderPoint: newReorder,
      location: editFormData.location,
      status: 'Pending Head Approval',
      approvalStatus: 'Pending Head Approval',
      approvedBy: undefined,
      approvedAt: undefined,
      updatedAt: new Date().toISOString().split('T')[0],
    };

    if (onUpdateItem) {
      onUpdateItem(updated);
    } else {
      // Fallback
      onAddItem(updated);
    }

    success(
      'Changes Submitted for Head Approval',
      `${updated.sku} was updated. Status moved to Items Pending Approval for Head clearance.`
    );
    setEditingItem(null);
  };

  // Submit New Item Form
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFormData.sku || !newFormData.name) return;

    const stock = parseInt(newFormData.stockLevel) || 0;
    const reorder = parseInt(newFormData.reorderPoint) || 5;

    const newItem: Item = {
      id: `ITM-TEL-${Date.now().toString().slice(-4)}`,
      sku: newFormData.sku.toUpperCase(),
      name: newFormData.name,
      description: newFormData.description,
      category: newFormData.category,
      uom: newFormData.uom || 'EA',
      stockLevel: stock,
      reorderPoint: reorder,
      unitPriceSAR: 0,
      entity: 'ARABITRA',
      primaryVendorId: 'VND-001',
      location: newFormData.location || 'Arabitra Head Office Store Khobar',
      status: 'Pending Head Approval',
      approvalStatus: 'Pending Head Approval',
      requestedBy: currentUser?.name || 'Telematics Specialist',
      leadTimeDays: 7,
      updatedAt: new Date().toISOString().split('T')[0],
    };

    onAddItem(newItem);
    success(
      'Item Submitted for Head Approval',
      `${newItem.sku} has been added to Items Pending Approval awaiting Department Head sign-off.`
    );
    setIsCreateModalOpen(false);
    if (onCloseCreateModal) onCloseCreateModal();

    // Reset create form
    setNewFormData({
      sku: '',
      name: '',
      description: '',
      category: 'GPS Trackers & Asset Gateways',
      uom: 'EA',
      stockLevel: '',
      reorderPoint: '',
      location: 'Arabitra Head Office Store Khobar',
    });
  };

  // Preview stock status for the edit modal
  const editStockPreview = getStockStatus(
    parseInt(editFormData.stockLevel) || 0,
    parseInt(editFormData.reorderPoint) || 0
  );

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Boxes className="w-6 h-6 text-cyan-500 dark:text-cyan-400" />
            Items & Catalogue Master
          </h1>
          <p className="text-xs md:text-sm text-slate-600 dark:text-slate-400 mt-0.5">
            Fleet IoT, telematics sensors, AI dashcams, and hardware inventory.{' '}
            <span className="text-amber-600 dark:text-amber-400 font-semibold">
              All items & edits require Department Head authorization.
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            icon={<Download className="w-3.5 h-3.5" />}
            onClick={() => success('Catalog Exported', 'Downloaded item catalogue dataset (.csv)')}
          >
            Export
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={<Plus className="w-4 h-4" />}
            onClick={() => setIsCreateModalOpen(true)}
          >
            Add New Item
          </Button>
        </div>
      </div>

      {/* Primary Status Function Tabs: Approved Items & Items Pending Approval */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-1.5 rounded-2xl bg-slate-900/40 dark:bg-slate-900/70 border border-slate-800">
        <div className="flex items-center gap-2">
          {/* Items Pending Approval Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('PENDING')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'PENDING'
                ? 'bg-amber-500/20 text-amber-600 dark:text-amber-300 border border-amber-500/50 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Clock className="w-4 h-4 text-amber-500" />
            <span>Items Pending Approval</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                activeTab === 'PENDING'
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-amber-500/20 text-amber-600 dark:text-amber-400'
              }`}
            >
              {pendingCount}
            </span>
          </button>

          {/* Approved Items Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('APPROVED')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
              activeTab === 'APPROVED'
                ? 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/50 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Approved Items</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                activeTab === 'APPROVED'
                  ? 'bg-emerald-500 text-slate-950'
                  : 'bg-emerald-500/20 text-emerald-700 dark:text-emerald-400'
              }`}
            >
              {approvedCount}
            </span>
          </button>
        </div>

        {/* Stock Level Color Guide */}
        <div className="flex items-center gap-3 px-3 py-1.5 text-[11px] text-slate-600 dark:text-slate-400">
          <span className="font-semibold text-slate-500 dark:text-slate-400 hidden lg:inline">Stock Status:</span>
          <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block animate-pulse" />
            Red (Low Stock)
          </span>
          <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            Orange (Buffer)
          </span>
          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
            Green (Good Stock)
          </span>
        </div>
      </div>

      {/* Pending Items Guidance Notice */}
      {activeTab === 'PENDING' && (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-500 shrink-0">
              <Clock className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-800 dark:text-amber-200">
                {pendingCount} Items Awaiting Department Head Approval
              </h4>
              <p className="text-xs text-amber-700 dark:text-amber-300/80 mt-0.5">
                {isHead
                  ? 'As authorized Department Head / Executive, you can review specifications, edit reorder thresholds, and grant sign-off.'
                  : 'Items and recent edits are placed on hold. A department head can authorize them into the approved catalogue.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Search Bar & Dropdown Filters (Category & Stock Level) */}
      <div className="bg-slate-900/40 dark:bg-slate-900/60 p-3.5 rounded-2xl border border-slate-800">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search by SKU, item name or technical specification..."
            className="w-full lg:w-96"
          />

          <div className="flex flex-wrap items-center gap-3">
            {/* Category Dropdown */}
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0" />
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                Category:
              </span>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 font-medium focus:outline-none focus:border-cyan-500 cursor-pointer min-w-[210px]"
              >
                {categories.map((c) => {
                  const count =
                    c === 'ALL'
                      ? items.filter((i) => matchesCompany(i.entity)).length
                      : items.filter((i) => matchesCompany(i.entity) && i.category === c).length;
                  return (
                    <option key={c} value={c}>
                      {c === 'ALL' ? `All Categories (${count})` : `${c} (${count})`}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Stock Level Dropdown Filter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-400 whitespace-nowrap">
                Stock:
              </span>
              <select
                value={selectedStockFilter}
                onChange={(e) => setSelectedStockFilter(e.target.value as 'ALL' | 'RED' | 'ORANGE' | 'GREEN')}
                className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 font-medium focus:outline-none focus:border-cyan-500 cursor-pointer min-w-[170px]"
              >
                <option value="ALL">All Stock Levels</option>
                <option value="RED">🔴 Low Stock (Red)</option>
                <option value="ORANGE">🟠 Reorder Buffer (Orange)</option>
                <option value="GREEN">🟢 Good Stock (Green)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Items Table */}
      {filteredItems.length === 0 ? (
        <EmptyState
          title={
            activeTab === 'PENDING'
              ? 'No items pending head approval'
              : 'No approved items found'
          }
          description="Adjust your search query, switch categories, or add/edit a catalog item."
          actionLabel="Add New Item"
          onAction={() => setIsCreateModalOpen(true)}
        />
      ) : (
        <div className="glass-panel rounded-2xl overflow-hidden border border-slate-800 shadow-md">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 text-[11px] border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 font-semibold w-44">SKU & Code</th>
                  <th className="py-3.5 px-4 font-semibold">Item Specification</th>
                  <th className="py-3.5 px-4 font-semibold w-56">Category</th>
                  <th className="py-3.5 px-4 font-semibold text-right w-48">Stock Level</th>
                  <th className="py-3.5 px-4 font-semibold text-right w-36">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredItems.map((item) => {
                  const isItemPending =
                    item.approvalStatus === 'Pending Head Approval' || item.status === 'Pending Head Approval';
                  const stockStatus = getStockStatus(item.stockLevel, item.reorderPoint);

                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-slate-800/30 transition-colors group"
                    >
                      {/* 1. SKU & Code */}
                      <td className="py-3.5 px-4 whitespace-nowrap align-top">
                        <div className="font-mono font-bold text-cyan-400 text-xs">
                          {item.sku}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {item.id}
                        </div>
                        {isItemPending && (
                          <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded mt-1.5">
                            <Clock className="w-2.5 h-2.5" />
                            Pending Sign-off
                          </span>
                        )}
                      </td>

                      {/* 2. Item Specification: Fully Readable Title and Technical Specifications */}
                      <td className="py-3.5 px-4 align-top">
                        <div className="font-bold text-sm text-slate-900 dark:text-slate-100 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors" title={item.name}>
                          {item.name}
                        </div>
                        <div className="text-xs text-slate-800 dark:text-slate-200 mt-1.5 leading-relaxed max-w-2xl font-normal bg-slate-100/70 dark:bg-slate-900/60 p-2.5 rounded-xl border border-slate-200/80 dark:border-slate-800/80 shadow-sm" title={item.description}>
                          {item.description}
                        </div>
                        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-500">
                          <span>
                            UOM: <strong className="text-slate-700 dark:text-slate-300">{item.uom}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Depot: <strong className="text-slate-700 dark:text-slate-300">{item.location}</strong>
                          </span>
                        </div>
                      </td>

                      {/* 3. Category */}
                      <td className="py-3.5 px-4 whitespace-nowrap align-top">
                        <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-800/60 text-slate-300 border border-slate-700/60 inline-block" title={item.category}>
                          {item.category}
                        </span>
                      </td>

                      {/* 4. Stock Level: White Text Removed, Red / Orange / Green Color-Coded */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap align-top">
                        <div className="flex items-center justify-end gap-2">
                          <span
                            className={`w-2.5 h-2.5 rounded-full ${stockStatus.dotClass} shrink-0 ${
                              stockStatus.color === 'red' ? 'animate-pulse' : ''
                            }`}
                          />
                          <span className={`font-mono font-bold text-sm ${stockStatus.textClass}`}>
                            {item.stockLevel.toLocaleString()} {item.uom}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                          Reorder at{' '}
                          <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                            {item.reorderPoint}
                          </span>{' '}
                          {item.uom}
                        </div>
                        <div className="mt-1">
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full inline-block ${stockStatus.badgeClass}`}
                          >
                            {stockStatus.label}
                          </span>
                        </div>
                      </td>

                      {/* 5. Action: Edit & Head Approval */}
                      <td
                        className="py-3.5 px-4 text-right whitespace-nowrap align-top"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                            title="Edit specifications, stock or reorder point"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Edit</span>
                          </button>

                          {/* Head Approval Direct Sign-off */}
                          {isItemPending && isHead && onApproveItem && (
                            <button
                              type="button"
                              onClick={() => onApproveItem(item.id)}
                              className="px-2.5 py-1 rounded-lg bg-emerald-950/90 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 hover:text-white text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                              title="Sign off item into master catalog"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Approve</span>
                            </button>
                          )}
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

      {/* Item Specification & Edit Modal (All details can be edited, reorder point updates stock color, edits require approval) */}
      {editingItem && (
        <Modal
          isOpen={!!editingItem}
          onClose={() => setEditingItem(null)}
          title={`Item Specification: ${editingItem.sku}`}
          subtitle="View full engineering specifications and edit inventory parameters"
          maxWidth="2xl"
        >
          <form onSubmit={handleSaveEdit} className="space-y-4">
            {/* Department Head Warning Notice */}
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-3">
              <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800 dark:text-amber-200">
                <strong>Governance Rule:</strong> Any edits made to item specifications, stock
                counts, or reorder thresholds will automatically place this item into{' '}
                <strong className="underline">Items Pending Approval</strong> for Department Head
                sign-off.
              </div>
            </div>

            {/* RL-04: Readability Box: Full Technical Specifications with High Contrast */}
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-700/80 space-y-2 shadow-sm">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Technical Specification Dossier
                </span>
                <span className="text-[10px] text-cyan-300 font-mono bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/40 font-semibold">
                  Arabitra Telematics Catalog
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-100 font-normal leading-relaxed whitespace-pre-line bg-slate-950 p-3.5 rounded-lg border border-slate-800">
                {editFormData.description || editingItem.description}
              </p>
            </div>

            {/* Form Fields for Editing */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Item Title *
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 font-semibold focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  SKU Code *
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.sku}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, sku: e.target.value.toUpperCase() })
                  }
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-cyan-300 font-mono font-bold focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Telematics Category
                </label>
                <select
                  value={editFormData.category}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, category: e.target.value as ItemCategory })
                  }
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:border-cyan-500 focus:outline-none cursor-pointer"
                >
                  {categories.filter((c) => c !== 'ALL').map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Unit of Measure (UOM)
                </label>
                <input
                  type="text"
                  value={editFormData.uom}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, uom: e.target.value.toUpperCase() })
                  }
                  placeholder="EA, SET, LOT"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Detailed Technical Specification Edit */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Edit Technical Specification & Protocols
              </label>
              <textarea
                rows={3}
                value={editFormData.description}
                onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 leading-relaxed focus:border-cyan-500 focus:outline-none"
                placeholder="Enter exact hardware parameters, frequency bands, interfaces, sensors..."
              />
            </div>

            {/* Stock Level & Reorder Point with Live Stock Color Preview */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Current Stock Level
                </label>
                <input
                  type="number"
                  min="0"
                  value={editFormData.stockLevel}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, stockLevel: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 font-mono font-bold focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Reorder Trigger Point (units)
                </label>
                <input
                  type="number"
                  min="0"
                  value={editFormData.reorderPoint}
                  onChange={(e) =>
                    setEditFormData({ ...editFormData, reorderPoint: e.target.value })
                  }
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 font-mono font-bold focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Depot / Yard Location
                </label>
                <input
                  type="text"
                  value={editFormData.location}
                  onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Live Stock Color Status Preview */}
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between">
              <span className="text-xs text-slate-400 font-medium">
                Calculated Stock Indicator Preview:
              </span>
              <div className="flex items-center gap-2">
                <span className={`w-3 h-3 rounded-full ${editStockPreview.dotClass} animate-pulse`} />
                <span className={`text-xs font-bold ${editStockPreview.textClass}`}>
                  {editStockPreview.label}
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full ${editStockPreview.badgeClass}`}>
                  {editStockPreview.subtext}
                </span>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-800">
              {/* Direct Head Approve Button if user is Head */}
              {isHead && onApproveItem && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-emerald-400 border-emerald-500/40 hover:bg-emerald-950/50"
                  icon={<CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                  onClick={() => {
                    onApproveItem(editingItem.id);
                    setEditingItem(null);
                  }}
                >
                  Authorize & Approve Item
                </Button>
              )}

              <div className="flex items-center gap-2 ml-auto">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingItem(null)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  icon={<Check className="w-4 h-4" />}
                >
                  Save & Submit for Head Approval
                </Button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* Add New Item Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          if (onCloseCreateModal) onCloseCreateModal();
        }}
        title="Add New Catalog Item"
        subtitle="Register new hardware for Arabitra Catalogue (Requires Head Clearance)"
        maxWidth="xl"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                SKU Code *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. ARB-GPS-FMB920"
                value={newFormData.sku}
                onChange={(e) =>
                  setNewFormData({ ...newFormData, sku: e.target.value.toUpperCase() })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-cyan-300 font-mono font-bold focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Category *
              </label>
              <select
                value={newFormData.category}
                onChange={(e) =>
                  setNewFormData({ ...newFormData, category: e.target.value as ItemCategory })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:border-cyan-500 focus:outline-none cursor-pointer"
              >
                {categories.filter((c) => c !== 'ALL').map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Item Title *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Teltonika FMB920 Compact Tracker"
              value={newFormData.name}
              onChange={(e) => setNewFormData({ ...newFormData, name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 font-semibold focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Technical Specification
            </label>
            <textarea
              rows={3}
              placeholder="Detailed engineering specifications, GSM/GNSS bands, interfaces, IP rating..."
              value={newFormData.description}
              onChange={(e) => setNewFormData({ ...newFormData, description: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 leading-relaxed focus:border-cyan-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Unit of Measure (UOM)
              </label>
              <input
                type="text"
                placeholder="EA / SET / LOT"
                value={newFormData.uom}
                onChange={(e) =>
                  setNewFormData({ ...newFormData, uom: e.target.value.toUpperCase() })
                }
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 font-mono focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Initial Stock Level (units)
              </label>
              <input
                type="number"
                min="0"
                placeholder="0"
                value={newFormData.stockLevel}
                onChange={(e) => setNewFormData({ ...newFormData, stockLevel: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 font-mono font-bold focus:border-cyan-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Reorder Trigger Point (units)
              </label>
              <input
                type="number"
                min="0"
                placeholder="5"
                value={newFormData.reorderPoint}
                onChange={(e) => setNewFormData({ ...newFormData, reorderPoint: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 font-mono font-bold focus:border-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Storage Depot Location
            </label>
            <input
              type="text"
              placeholder="e.g. Arabitra Head Office Store Khobar (Bay-1)"
              value={newFormData.location}
              onChange={(e) => setNewFormData({ ...newFormData, location: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-100 focus:border-cyan-500 focus:outline-none"
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
              Submit for Head Approval
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
