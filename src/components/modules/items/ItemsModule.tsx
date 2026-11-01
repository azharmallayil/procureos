import React, { useState } from 'react';
import { Plus, Boxes, Filter, AlertTriangle, ArrowUpDown, Download } from 'lucide-react';
import { Item, ItemCategory, EntityId } from '../../../types/procurement';
import { useCompany } from '../../../context/CompanyContext';
import { useToast } from '../../../context/ToastContext';
import { Button } from '../../common/Button';
import { Badge } from '../../common/Badge';
import { SearchInput } from '../../common/SearchInput';
import { Modal } from '../../common/Modal';
import { EmptyState } from '../../common/EmptyState';

interface ItemsModuleProps {
  items: Item[];
  onAddItem: (newItem: Item) => void;
  openCreateModal?: boolean;
  onCloseCreateModal?: () => void;
}

export const ItemsModule: React.FC<ItemsModuleProps> = ({
  items,
  onAddItem,
  openCreateModal = false,
  onCloseCreateModal,
}) => {
  const { activeCompany, matchesCompany } = useCompany();
  const { success } = useToast();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState(openCreateModal);

  // Form State
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    category: 'Mechanical & Piping' as ItemCategory,
    uom: 'EA',
    unitPriceSAR: '',
    stockLevel: '',
    reorderPoint: '',
    entity: 'FITCO' as EntityId | 'SHARED',
    location: '',
  });

  const categories = [
    'ALL',
    'Heavy Equipment & Spares',
    'Mechanical & Piping',
    'Electrical & Instrumentation',
    'Civil & Structural',
    'Safety & PPE',
    'IT & Automation',
  ];

  const filteredItems = items.filter((item) => {
    const matchesScope = matchesCompany(item.entity);
    const matchesCat = selectedCategory === 'ALL' || item.category === selectedCategory;
    const matchesQuery =
      item.sku.toLowerCase().includes(search.toLowerCase()) ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.description.toLowerCase().includes(search.toLowerCase());
    return matchesScope && matchesCat && matchesQuery;
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
      status: parseInt(formData.stockLevel) <= 2 ? 'Critical' : 'In Stock',
      leadTimeDays: 20,
      updatedAt: new Date().toISOString().split('T')[0],
    };

    onAddItem(newItem);
    success('Item Cataloged', `${newItem.sku} successfully added to Master Catalog.`);
    setIsModalOpen(false);
    if (onCloseCreateModal) onCloseCreateModal();

    // Reset Form
    setFormData({
      sku: '',
      name: '',
      description: '',
      category: 'Mechanical & Piping',
      uom: 'EA',
      unitPriceSAR: '',
      stockLevel: '',
      reorderPoint: '',
      entity: 'FITCO',
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
            Standardized catalog, SKUs, inventory thresholds, and pricing for FITCO & Arabitra
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

      {/* Filter and Search Bar */}
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
            {categories.map((c) => (
              <option key={c} value={c}>
                {c === 'ALL' ? 'All Commodity Categories' : c}
              </option>
            ))}
          </select>
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
                  <th className="py-3.5 px-4 font-semibold">Status</th>
                  <th className="py-3.5 px-4 font-semibold">Storage Depot</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-cyan-300 whitespace-nowrap">
                      {item.sku}
                    </td>
                    <td className="py-3.5 px-4 min-w-[240px]">
                      <div className="font-semibold text-slate-100">{item.name}</div>
                      <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                        {item.description}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 whitespace-nowrap">
                      {item.category}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <Badge
                        variant={
                          item.entity === 'FITCO'
                            ? 'cyan'
                            : item.entity === 'ARABITRA'
                            ? 'emerald'
                            : 'purple'
                        }
                      >
                        {item.entity}
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
                      <Badge
                        variant={
                          item.status === 'In Stock'
                            ? 'emerald'
                            : item.status === 'Low Stock'
                            ? 'amber'
                            : 'rose'
                        }
                        dot
                      >
                        {item.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-slate-300 text-[11px] whitespace-nowrap">
                      {item.location}
                    </td>
                  </tr>
                ))}
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
        subtitle="Register standard procurement item for FITCO or Arabitra ERP"
        maxWidth="xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">SKU Code *</label>
              <input
                type="text"
                required
                placeholder="e.g. FIT-VAL-9021"
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
                <option value="FITCO">FITCO Energy & Industrial</option>
                <option value="ARABITRA">Arabitra Infrastructure</option>
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
