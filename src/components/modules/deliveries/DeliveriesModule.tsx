import React, { useState } from 'react';
import {
  Truck,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Clock,
  MapPin,
  Phone,
  FileCheck,
  ShieldCheck,
} from 'lucide-react';
import { Delivery, DeliveryStatus, EntityId } from '../../../types/procurement';
import { useCompany } from '../../../context/CompanyContext';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { Button } from '../../common/Button';
import { Badge } from '../../common/Badge';
import { SearchInput } from '../../common/SearchInput';
import { Modal } from '../../common/Modal';
import { EmptyState } from '../../common/EmptyState';

interface DeliveriesModuleProps {
  deliveries: Delivery[];
  onMarkInspected: (deliveryId: string) => void;
  onAddDelivery: (newDelivery: Delivery) => void;
  openCreateModal?: boolean;
  onCloseCreateModal?: () => void;
}

export const DeliveriesModule: React.FC<DeliveriesModuleProps> = ({
  deliveries,
  onMarkInspected,
  onAddDelivery,
  openCreateModal = false,
  onCloseCreateModal,
}) => {
  const { matchesCompany } = useCompany();
  const { permissions: _perms, activeRole } = useAuth(); const permissions = _perms!;
  const { success, warning } = useToast();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [selectedDelivery, setSelectedDelivery] = useState<Delivery | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(openCreateModal);

  // Form State
  const [form, setForm] = useState({
    poNumber: 'PO-FTC-26-0491',
    vendorName: 'Al-Tamimi Industrial Flow Systems Co.',
    entity: 'FITCO' as EntityId,
    destinationSite: 'Shedgum Gas Compression Station 3',
    carrier: 'Hala Supply Chain Services',
    driverName: 'Mustafa Kamel',
    driverContact: '+966 55 981 7261',
    expectedDate: '2026-10-18',
  });

  const filteredDeliveries = deliveries.filter((d) => {
    const matchesScope = matchesCompany(d.entity);
    const matchesStatus = statusFilter === 'ALL' || d.status === statusFilter;
    const matchesQuery =
      d.trackingNumber.toLowerCase().includes(search.toLowerCase()) ||
      d.poNumber.toLowerCase().includes(search.toLowerCase()) ||
      d.vendorName.toLowerCase().includes(search.toLowerCase()) ||
      d.destinationSite.toLowerCase().includes(search.toLowerCase());
    return matchesScope && matchesStatus && matchesQuery;
  });

  const handleInspect = (del: Delivery) => {
    if (!permissions.canReceiveShipment) {
      warning(
        'Site Receiving Clearance Required',
        `Role '${activeRole}' does not hold site inspection and material acceptance authorization.`
      );
      return;
    }
    onMarkInspected(del.id);
    success('Goods Receipt Note (GRN) Verified', `${del.trackingNumber} inspected and cleared.`);
    setSelectedDelivery(null);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const newDelivery: Delivery = {
      id: `DEL-${Date.now().toString().slice(-3)}`,
      trackingNumber: `TRK-${form.entity === 'FITCO' ? 'FTC' : 'ARB'}-26-${Math.floor(1000 + Math.random() * 8999)}`,
      poNumber: form.poNumber,
      vendorName: form.vendorName,
      entity: form.entity,
      destinationSite: form.destinationSite,
      carrier: form.carrier,
      driverName: form.driverName,
      driverContact: form.driverContact,
      dispatchDate: new Date().toISOString().split('T')[0],
      expectedDate: form.expectedDate,
      status: 'In Transit',
      isOverdue: false,
      qcInspectionStatus: 'Pending Inspection',
      remarks: 'Consignment booked in logistics dispatch ledger.',
    };

    onAddDelivery(newDelivery);
    success('Shipment Registered', `${newDelivery.trackingNumber} created with live tracking.`);
    setIsModalOpen(false);
    if (onCloseCreateModal) onCloseCreateModal();
  };

  return (
    <div className="space-y-6">
      {/* Module Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
            <Truck className="w-6 h-6 text-cyan-400" />
            Deliveries & Goods Receipt Logistics (GRN)
          </h1>
          <p className="text-xs md:text-sm text-slate-400 mt-0.5">
            Real-time waybill tracking, transport carriers, site gate pass entries, and QA/QC inspections
          </p>
        </div>

        <Button
          variant="primary"
          size="sm"
          icon={<Plus className="w-4 h-4" />}
          onClick={() => setIsModalOpen(true)}
        >
          Log Inbound Consignment
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search by waybill, PO number, site or vendor..."
          className="w-full sm:w-96"
        />

        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          {['ALL', 'In Transit', 'Delayed', 'Inspected & Accepted', 'Delivered'].map((s) => (
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

      {/* Deliveries Table */}
      {filteredDeliveries.length === 0 ? (
        <EmptyState
          title="No deliveries found"
          description="Adjust your search filters or record an inbound shipment consignment."
          actionLabel="Log Inbound Consignment"
          onAction={() => setIsModalOpen(true)}
        />
      ) : (
        <div className="glass-panel rounded-xl overflow-hidden border border-slate-800">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 text-[11px] border-b border-slate-800">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Waybill / Tracking #</th>
                  <th className="py-3.5 px-4 font-semibold">Linked PO #</th>
                  <th className="py-3.5 px-4 font-semibold">Entity</th>
                  <th className="py-3.5 px-4 font-semibold">Vendor & Logistics Carrier</th>
                  <th className="py-3.5 px-4 font-semibold">Destination Site</th>
                  <th className="py-3.5 px-4 font-semibold">Expected Date</th>
                  <th className="py-3.5 px-4 font-semibold">Transit Status</th>
                  <th className="py-3.5 px-4 font-semibold">QC Inspection</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredDeliveries.map((del) => (
                  <tr
                    key={del.id}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      del.isOverdue ? 'bg-rose-950/10' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4 font-mono font-bold text-cyan-300 whitespace-nowrap">
                      {del.trackingNumber}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-300 whitespace-nowrap">
                      {del.poNumber}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <Badge variant={del.entity === 'FITCO' ? 'cyan' : 'emerald'}>
                        {del.entity}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-slate-100">{del.vendorName}</div>
                      <div className="text-[11px] text-slate-400">{del.carrier}</div>
                    </td>
                    <td className="py-3.5 px-4 min-w-[180px]">
                      <div className="flex items-center gap-1.5 text-slate-200">
                        <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span className="truncate">{del.destinationSite}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap font-mono">
                      <span className={del.isOverdue ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                        {del.expectedDate}
                      </span>
                      {del.isOverdue && (
                        <span className="block text-[10px] text-rose-400 uppercase font-bold">
                          Overdue
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <Badge
                        variant={
                          del.status === 'Delayed'
                            ? 'rose'
                            : del.status === 'In Transit'
                            ? 'cyan'
                            : 'emerald'
                        }
                        dot
                      >
                        {del.status}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <Badge
                        variant={
                          del.qcInspectionStatus === 'Passed'
                            ? 'emerald'
                            : del.qcInspectionStatus === 'Pending Inspection'
                            ? 'amber'
                            : 'rose'
                        }
                      >
                        {del.qcInspectionStatus}
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setSelectedDelivery(del)}
                          className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:text-cyan-300 text-xs font-medium transition-colors"
                        >
                          Dossier
                        </button>
                        {del.qcInspectionStatus === 'Pending Inspection' && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleInspect(del)}
                            className="text-[11px] py-1 px-2.5"
                          >
                            Pass QC
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delivery Inspection Dossier Modal */}
      {selectedDelivery && (
        <Modal
          isOpen={!!selectedDelivery}
          onClose={() => setSelectedDelivery(null)}
          title={`Delivery Inspection: ${selectedDelivery.trackingNumber}`}
          subtitle={`PO: ${selectedDelivery.poNumber} | Carrier: ${selectedDelivery.carrier}`}
          maxWidth="xl"
          footer={
            <div className="flex justify-between w-full">
              <Button variant="outline" size="sm" onClick={() => setSelectedDelivery(null)}>
                Close
              </Button>
              {selectedDelivery.qcInspectionStatus === 'Pending Inspection' && (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleInspect(selectedDelivery)}
                >
                  Confirm QC Acceptance & File GRN
                </Button>
              )}
            </div>
          }
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-950 border border-slate-800">
              <div>
                <span className="text-slate-400 block text-[10px]">Vendor Consignor</span>
                <span className="font-semibold text-slate-100">{selectedDelivery.vendorName}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Destination Site</span>
                <span className="font-semibold text-slate-100">{selectedDelivery.destinationSite}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Assigned Driver</span>
                <span className="text-slate-200">
                  {selectedDelivery.driverName || 'Designated Driver'} ({selectedDelivery.driverContact || 'N/A'})
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">QC Inspection Status</span>
                <span className="text-cyan-300 font-bold">{selectedDelivery.qcInspectionStatus}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800">
              <h5 className="font-semibold text-slate-300 text-xs mb-1">Logistics Dispatch Remarks</h5>
              <p className="text-slate-400 text-xs leading-relaxed">
                {selectedDelivery.remarks || 'No issues reported during transit.'}
              </p>
            </div>
          </div>
        </Modal>
      )}

      {/* Log Delivery Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          if (onCloseCreateModal) onCloseCreateModal();
        }}
        title="Log Inbound Delivery Consignment"
        subtitle="Record carrier dispatch details for goods receiving"
        maxWidth="lg"
      >
        <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-300 mb-1">Target Entity *</label>
              <select
                value={form.entity}
                onChange={(e) => setForm({ ...form, entity: e.target.value as any })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none"
              >
                <option value="FITCO">FITCO Energy & Industrial</option>
                <option value="ARABITRA">Arabitra Heavy Infrastructure</option>
              </select>
            </div>
            <div>
              <label className="block font-medium text-slate-300 mb-1">Expected Delivery Date *</label>
              <input
                type="date"
                required
                value={form.expectedDate}
                onChange={(e) => setForm({ ...form, expectedDate: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-300 mb-1">Associated PO # *</label>
              <input
                type="text"
                required
                value={form.poNumber}
                onChange={(e) => setForm({ ...form, poNumber: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 font-mono focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-300 mb-1">Vendor Name *</label>
              <input
                type="text"
                required
                value={form.vendorName}
                onChange={(e) => setForm({ ...form, vendorName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-300 mb-1">Destination Project Site *</label>
            <input
              type="text"
              required
              value={form.destinationSite}
              onChange={(e) => setForm({ ...form, destinationSite: e.target.value })}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-medium text-slate-300 mb-1">Logistics Carrier Fleet</label>
              <input
                type="text"
                value={form.carrier}
                onChange={(e) => setForm({ ...form, carrier: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-300 mb-1">Driver Contact Number</label>
              <input
                type="tel"
                value={form.driverContact}
                onChange={(e) => setForm({ ...form, driverContact: e.target.value })}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-lg text-xs text-slate-100 focus:outline-none"
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
              Log Consignment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
