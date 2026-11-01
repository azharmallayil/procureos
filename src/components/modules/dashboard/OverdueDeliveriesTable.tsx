import React from 'react';
import { AlertTriangle, Phone, CheckCircle2, MapPin, Truck } from 'lucide-react';
import { Delivery } from '../../../types/procurement';
import { Badge } from '../../common/Badge';
import { Button } from '../../common/Button';
import { useToast } from '../../../context/ToastContext';

interface OverdueDeliveriesTableProps {
  deliveries: Delivery[];
  onMarkInspected: (deliveryId: string) => void;
}

export const OverdueDeliveriesTable: React.FC<OverdueDeliveriesTableProps> = ({
  deliveries,
  onMarkInspected,
}) => {
  const { info, success } = useToast();

  const flaggedDeliveries = deliveries.filter(
    (d) => d.isOverdue || d.status === 'Delayed' || d.status === 'In Transit'
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="bg-slate-950 text-slate-400 text-[11px] border-b border-slate-800">
          <tr>
            <th className="py-3 px-3">Waybill / Tracking</th>
            <th className="py-3 px-3">Associated PO</th>
            <th className="py-3 px-3">Vendor & Carrier</th>
            <th className="py-3 px-3">Destination Site</th>
            <th className="py-3 px-3">Expected Date</th>
            <th className="py-3 px-3">Status</th>
            <th className="py-3 px-3 text-right">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800/70">
          {flaggedDeliveries.map((del) => (
            <tr
              key={del.id}
              className={`hover:bg-slate-800/40 transition-colors ${
                del.isOverdue ? 'bg-rose-950/10' : ''
              }`}
            >
              <td className="py-3 px-3 font-mono text-cyan-300 font-semibold whitespace-nowrap">
                <div className="flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-slate-400" />
                  {del.trackingNumber}
                </div>
              </td>
              <td className="py-3 px-3 font-mono text-slate-300">{del.poNumber}</td>
              <td className="py-3 px-3">
                <div className="font-medium text-slate-200">{del.vendorName}</div>
                <div className="text-[11px] text-slate-400">{del.carrier}</div>
              </td>
              <td className="py-3 px-3">
                <div className="flex items-center gap-1 text-slate-300">
                  <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
                  <span className="truncate max-w-[180px]">{del.destinationSite}</span>
                </div>
              </td>
              <td className="py-3 px-3 whitespace-nowrap font-mono">
                <span className={del.isOverdue ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                  {del.expectedDate}
                </span>
                {del.isOverdue && (
                  <span className="block text-[10px] text-rose-400 uppercase font-bold">Overdue</span>
                )}
              </td>
              <td className="py-3 px-3 whitespace-nowrap">
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
              <td className="py-3 px-3 text-right whitespace-nowrap">
                <div className="flex items-center justify-end gap-1.5">
                  {del.driverContact && (
                    <button
                      onClick={() =>
                        info(
                          'Driver Contacted',
                          `Connecting to ${del.driverName || 'driver'} via ${del.driverContact}`
                        )
                      }
                      className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800 transition-colors"
                      title="Contact Dispatch Driver"
                    >
                      <Phone className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => {
                      onMarkInspected(del.id);
                      success('QC Receipt Completed', `${del.trackingNumber} inspected and accepted.`);
                    }}
                    className="text-[11px] py-1 px-2.5"
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Accept Receipt
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
