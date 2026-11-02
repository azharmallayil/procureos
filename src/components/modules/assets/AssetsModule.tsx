import React, { useState } from 'react';
import {
  Wrench,
  Plus,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  UserCheck,
  ShieldAlert,
} from 'lucide-react';
import { Asset, AssetCondition, EntityId } from '../../../types/procurement';
import { useCompany } from '../../../context/CompanyContext';
import { useToast } from '../../../context/ToastContext';
import { Button } from '../../common/Button';
import { Badge } from '../../common/Badge';
import { SearchInput } from '../../common/SearchInput';
import { Modal } from '../../common/Modal';
import { EmptyState } from '../../common/EmptyState';

interface AssetsModuleProps {
  assets: Asset[];
  onAddAsset: (newAsset: Asset) => void;
}

export const AssetsModule: React.FC<AssetsModuleProps> = ({ assets, onAddAsset }) => {
  const { matchesCompany } = useCompany();
  const { success } = useToast();

  const [search, setSearch] = useState('');
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New Asset Form State
  const [form, setForm] = useState({
    name: '',
    serialNumber: '',
    category: 'Heavy Plant & Machinery',
    entity: 'FITCO' as EntityId,
    assignedProject: 'Shedgum Plant Decarbonization Ph-2',
    custodian: 'Eng. Khalid Al-Shehri',
    acquisitionCostSAR: '',
    location: 'Central Field Yard',
  });

  const filteredAssets = assets.filter((ast) => {
    const matchesScope = matchesCompany(ast.entity);
    const matchesQuery =
      ast.assetTag.toLowerCase().includes(search.toLowerCase()) ||
      ast.name.toLowerCase().includes(search.toLowerCase()) ||
      ast.assignedProject.toLowerCase().includes(search.toLowerCase()) ||
      ast.custodian.toLowerCase().includes(search.toLowerCase());
    return matchesScope && matchesQuery;
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.serialNumber) return;

    const newAsset: Asset = {
      id: `AST-${Date.now().toString().slice(-4)}`,
      assetTag: `AST-${form.entity === 'FITCO' ? 'FTC' : 'ARB'}-${Math.floor(100 + Math.random() * 899)}`,
      name: form.name,
      serialNumber: form.serialNumber,
      category: form.category,
      entity: form.entity,
      assignedProject: form.assignedProject,
      custodian: form.custodian,
      acquisitionCostSAR: parseFloat(form.acquisitionCostSAR) || 0,
      purchaseDate: new Date().toISOString().split('T')[0],
      condition: 'Operational',
      lastInspectionDate: new Date().toISOString().split('T')[0],
      nextInspectionDate: '2027-01-15',
      location: form.location,
    };

    onAddAsset(newAsset);
    success('Fixed Asset Registered', `${newAsset.assetTag} tagged and registered to ${newAsset.custodian}.`);
    setIsModalOpen(false);
  };

  const getConditionBadge = (cond: AssetCondition) => {
    switch (cond) {
      case 'Operational':
        return 'emerald';
      case 'In Maintenance':
        return 'amber';
      case 'Calibration Required':
        return 'rose';
      default:
        return 'slate';
    }
  };

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <Wrench className="w-6 h-6 text-cyan-400" />
            Capital Assets & Field Equipment
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-0.5">
            Heavy machinery fleet, instrumentation assets, custodian assignments, and scheduled calibration cycles
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setIsModalOpen(true)}
        >
          Tag New Asset
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by asset tag, machinery name, site or custodian..."
          className="w-full sm:w-96"
        />

        <div className="text-xs text-slate-400">
          Total tracked capital assets: <span className="font-semibold text-slate-200">{filteredAssets.length}</span> units
        </div>
      </div>

      {/* Assets Grid */}
      {filteredAssets.length === 0 ? (
        <EmptyState
          title="No assets registered"
          description="Tag heavy machinery or diagnostic equipment to begin tracking."
          actionLabel="Tag New Asset"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredAssets.map((asset) => (
            <div
              key={asset.id}
              className="glass-panel p-5 rounded-xl border border-slate-800 hover:border-slate-700/80 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-cyan-300">
                      {asset.assetTag}
                    </span>
                    <Badge variant={asset.entity === 'FITCO' ? 'cyan' : 'emerald'}>
                      {asset.entity}
                    </Badge>
                  </div>
                  <Badge variant={getConditionBadge(asset.condition)} dot>
                    {asset.condition}
                  </Badge>
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-100">{asset.name}</h3>
                  <div className="text-xs text-slate-400 flex items-center gap-2 mt-1 font-mono">
                    <span>SN: {asset.serialNumber}</span>
                    <span>•</span>
                    <span>Cat: {asset.category}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Assigned Project</span>
                    <span className="font-medium text-slate-200 truncate block">
                      {asset.assignedProject}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Responsible Custodian</span>
                    <span className="font-medium text-slate-200 truncate block">
                      {asset.custodian}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Acquisition Value</span>
                    <span className="font-mono font-bold text-slate-200">
                      SAR {asset.acquisitionCostSAR.toLocaleString()}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Next Inspection</span>
                    <span className="font-medium text-slate-300">
                      {asset.nextInspectionDate}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <span className="text-slate-400 flex items-center gap-1 text-[11px]">
                  <MapPin className="w-3 h-3 text-cyan-400" /> {asset.location}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedAsset(asset)}
                  className="text-xs py-1 px-3"
                >
                  Maintenance Log
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Asset Maintenance Log Modal */}
      {selectedAsset && (
        <Modal
          isOpen={!!selectedAsset}
          onClose={() => setSelectedAsset(null)}
          title={`Asset Dossier: ${selectedAsset.assetTag}`}
          subtitle={`${selectedAsset.name} | S/N: ${selectedAsset.serialNumber}`}
          maxWidth="lg"
          footer={
            <Button variant="outline" size="sm" onClick={() => setSelectedAsset(null)}>
              Close Log
            </Button>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-400">Current Health Status:</span>
                <span className="font-bold text-emerald-400">{selectedAsset.condition}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Project Allocation:</span>
                <span className="text-slate-200">{selectedAsset.assignedProject}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Last Service / Overhaul:</span>
                <span className="text-slate-200">{selectedAsset.lastInspectionDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Next Scheduled Calibration:</span>
                <span className="text-cyan-400 font-bold">{selectedAsset.nextInspectionDate}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed">
              Certified under Aramco Safety Standard OSPAS-102. All scheduled maintenance intervals are logged into the ProcureOS Fixed Asset Ledger with biometric signoff.
            </p>
          </div>
        </Modal>
      )}

      {/* Add Asset Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Tag New Capital Asset"
        subtitle="Register heavy equipment or plant machinery into fixed asset ledger"
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-300 mb-1">Entity Ownership *</label>
              <select
                value={form.entity}
                onChange={(e) => setForm({ ...form, entity: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none"
              >
                <option value="FITCO">FITCO Telematics & AI Safety</option>
                <option value="ARABITRA">Arabitra Fleet & LMI Tracking</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-300 mb-1">Serial Number *</label>
              <input
                type="text"
                required
                placeholder="Manufacturer Serial No."
                value={form.serialNumber}
                onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 font-mono focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-300 mb-1">Equipment Name / Model *</label>
            <input
              type="text"
              required
              placeholder="e.g. Caterpillar D8T Heavy Track Bulldozer"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-300 mb-1">Assigned Project *</label>
              <input
                type="text"
                required
                value={form.assignedProject}
                onChange={(e) => setForm({ ...form, assignedProject: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-300 mb-1">Designated Custodian *</label>
              <input
                type="text"
                required
                value={form.custodian}
                onChange={(e) => setForm({ ...form, custodian: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-300 mb-1">Acquisition Cost (SAR) *</label>
              <input
                type="number"
                required
                placeholder="e.g. 1450000"
                value={form.acquisitionCostSAR}
                onChange={(e) => setForm({ ...form, acquisitionCostSAR: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 font-mono focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-300 mb-1">Yard / Depot Location</label>
              <input
                type="text"
                value={form.location}
                onChange={(e) => setForm({ ...form, location: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Register Asset
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
