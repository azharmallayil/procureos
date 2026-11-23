import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend,
} from 'recharts';
import { SPEND_BY_MONTH, SPEND_BY_CATEGORY, SUPPLIER_PERFORMANCE_METRICS } from '../../../data/mockData';
import { Card } from '../../common/Card';
import { TrendingUp, PieChart as PieIcon, Award } from 'lucide-react';
import { useCompany } from '../../../context/CompanyContext';
import { PurchaseOrder, Vendor } from '../../../types/procurement';

interface SpendChartsProps {
  purchaseOrders?: PurchaseOrder[];
  vendors?: Vendor[];
}

export const SpendCharts: React.FC<SpendChartsProps> = ({
  purchaseOrders = [],
  vendors = [],
}) => {
  const { activeCompany, matchesCompany } = useCompany();

  const customTooltipStyle = {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
    borderRadius: '0.75rem',
    color: '#f8fafc',
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
    fontSize: '12px',
  };

  // Compute dynamic monthly spend from actual POs
  const monthlyData = React.useMemo(() => {
    if (purchaseOrders.length === 0) {
      return SPEND_BY_MONTH;
    }

    const months = ['May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov'];
    const result = months.map((m) => ({
      month: `${m} 2026`,
      fitco: 0,
      arabitra: 0,
      total: 0,
    }));

    purchaseOrders.forEach((po) => {
      if (!po.issueDate) return;
      const date = new Date(po.issueDate);
      const monthIndex = date.getMonth(); // 0-11
      // Map May(4)..Nov(10)
      const mappedIdx = monthIndex >= 4 && monthIndex <= 10 ? monthIndex - 4 : 6;
      const amountMillions = Number(((po.grandTotalSAR || 0) / 1000000).toFixed(3));

      result[mappedIdx].arabitra += amountMillions;
      result[mappedIdx].total += amountMillions;
    });

    return result;
  }, [purchaseOrders]);

  // Compute dynamic category breakdown
  const categoryData = React.useMemo(() => {
    const categoryTotals: Record<string, number> = {};
    const palette = ['#06b6d4', '#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899'];

    purchaseOrders.forEach((po) => {
      if (!matchesCompany(po.entity)) return;
      const matchedVendor = vendors.find(
        (v) => v.id === po.vendorId || v.name?.toLowerCase() === po.vendorName?.toLowerCase()
      );
      const cat = matchedVendor?.category || (po as any).category || 'GPS Trackers & Asset Gateways';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + (po.grandTotalSAR || 0);
    });

    const entries = Object.entries(categoryTotals);
    if (entries.length === 0) {
      return [];
    }

    return entries.map(([name, amount], idx) => ({
      name,
      value: Number((amount / 1000000).toFixed(2)),
      color: palette[idx % palette.length],
    }));
  }, [purchaseOrders, vendors, matchesCompany]);

  // Compute supplier performance metrics from real vendors
  const supplierMetrics = React.useMemo(() => {
    const approved = vendors
      .filter((v) => matchesCompany(v.entityScope))
      .slice(0, 5);

    if (approved.length === 0) {
      return [
        { supplier: 'No Active Vendors', onTime: 0, quality: 0 },
      ];
    }

    return approved.map((v) => ({
      supplier: v.name.length > 18 ? `${v.name.slice(0, 16)}…` : v.name,
      onTime: v.onTimeDeliveryRate || (v.rating ? Math.round((v.rating / 5) * 100) : 0),
      quality: v.qualityComplianceRate || (v.rating ? Math.round((v.rating / 5) * 100) : 0),
    }));
  }, [vendors, matchesCompany]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Monthly Spend Trend (Area Chart) */}
      <div className="lg:col-span-8">
        <Card
          title="Procurement Spend Trajectory (SAR Millions)"
          subtitle="Arabitra enterprise commitments & monthly disbursements • Powered by Fitco"
          icon={<TrendingUp className="w-5 h-5 text-cyan-400" />}
          headerAction={
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span>Arabitra Enterprise Spend</span>
              </div>
            </div>
          }
        >
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorArabitra" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} unit="M" />
                <Tooltip
                  contentStyle={customTooltipStyle}
                  formatter={(val: any) => [`SAR ${val}M`, '']}
                />
                <Area
                  type="monotone"
                  dataKey="arabitra"
                  name="Arabitra Spend"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorArabitra)"
                />
                {activeCompany === 'ALL' && (
                  <Area
                    type="monotone"
                    dataKey="total"
                    name="Group Total"
                    stroke="#6366f1"
                    strokeWidth={1.5}
                    strokeDasharray="4 4"
                    fill="url(#colorTotal)"
                  />
                )}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Spend Breakdown by Category (Donut Chart) */}
      <div className="lg:col-span-4">
        <Card
          title="Spend by Commodity Category"
          subtitle="Portfolio allocation YTD in SAR (M)"
          icon={<PieIcon className="w-5 h-5 text-emerald-400" />}
        >
          {categoryData.length === 0 ? (
            <div className="h-52 w-full flex flex-col items-center justify-center text-center p-4">
              <PieIcon className="w-8 h-8 text-slate-600 mb-2" />
              <p className="text-xs font-semibold text-slate-300">No Commodity Spend Recorded</p>
              <p className="text-[11px] text-slate-400 mt-0.5">Commodity allocations will visualize here as purchase orders are issued.</p>
            </div>
          ) : (
            <>
              <div className="h-52 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryData}
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={78}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} stroke="#0b1120" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={customTooltipStyle}
                      formatter={(val: any) => [`SAR ${val}M`, 'Allocation']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Custom Category Legend */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
                {categoryData.map((cat) => (
                  <div key={cat.name} className="flex items-center gap-1.5 text-[11px]">
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                    <span className="text-slate-300 leading-tight break-words flex-1" title={cat.name}>
                      {cat.name}
                    </span>
                    <span className="text-slate-400 font-mono shrink-0 ml-auto pl-1">{cat.value}M</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* Supplier Performance Matrix (Bar Chart) */}
      <div className="lg:col-span-12">
        <Card
          title="Strategic Vendor Performance Index"
          subtitle="On-time delivery % vs quality acceptance % for top suppliers"
          icon={<Award className="w-5 h-5 text-amber-400" />}
        >
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={supplierMetrics}
                margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="supplier" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" domain={[70, 100]} tick={{ fontSize: 11 }} unit="%" />
                <Tooltip
                  contentStyle={customTooltipStyle}
                  formatter={(val: any) => [`${val}%`, '']}
                />
                <Legend
                  wrapperStyle={{ paddingTop: '10px', fontSize: '12px' }}
                />
                <Bar dataKey="onTime" name="On-Time Delivery Rate" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                <Bar dataKey="quality" name="Quality Compliance Rate" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
};
