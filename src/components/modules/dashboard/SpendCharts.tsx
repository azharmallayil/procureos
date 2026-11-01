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

export const SpendCharts: React.FC = () => {
  const { activeCompany } = useCompany();

  const customTooltipStyle = {
    backgroundColor: '#0f172a',
    borderColor: '#334155',
    borderRadius: '0.75rem',
    color: '#f8fafc',
    boxShadow: '0 10px 25px -5px rgba(0,0,0,0.5)',
    fontSize: '12px',
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Monthly Spend Trend (Area Chart) */}
      <div className="lg:col-span-8">
        <Card
          title="Procurement Spend Trajectory (SAR Millions)"
          subtitle="Multi-entity historical commitments & monthly disbursements"
          icon={<TrendingUp className="w-5 h-5 text-cyan-400" />}
          headerAction={
            <div className="flex items-center gap-4 text-xs">
              {(activeCompany === 'ALL' || activeCompany === 'FITCO') && (
                <div className="flex items-center gap-1.5 text-cyan-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                  <span>FITCO</span>
                </div>
              )}
              {(activeCompany === 'ALL' || activeCompany === 'ARABITRA') && (
                <div className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span>Arabitra</span>
                </div>
              )}
              {activeCompany === 'ALL' && (
                <div className="flex items-center gap-1.5 text-indigo-400">
                  <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                  <span>Combined</span>
                </div>
              )}
            </div>
          }
        >
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={SPEND_BY_MONTH} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorFitco" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorArabitra" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis dataKey="month" stroke="#64748b" tick={{ fontSize: 11 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 11 }} unit="M" />
                <Tooltip
                  contentStyle={customTooltipStyle}
                  formatter={(val: any) => [`SAR ${val}M`, '']}
                />
                {(activeCompany === 'ALL' || activeCompany === 'FITCO') && (
                  <Area
                    type="monotone"
                    dataKey="fitco"
                    name="FITCO Spend"
                    stroke="#06b6d4"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorFitco)"
                  />
                )}
                {(activeCompany === 'ALL' || activeCompany === 'ARABITRA') && (
                  <Area
                    type="monotone"
                    dataKey="arabitra"
                    name="Arabitra Spend"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorArabitra)"
                  />
                )}
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
          <div className="h-52 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={SPEND_BY_CATEGORY}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={78}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {SPEND_BY_CATEGORY.map((entry, index) => (
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
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80">
            {SPEND_BY_CATEGORY.map((cat) => (
              <div key={cat.name} className="flex items-center gap-1.5 text-[11px] truncate">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: cat.color }} />
                <span className="text-slate-300 truncate" title={cat.name}>
                  {cat.name}
                </span>
                <span className="text-slate-400 ml-auto font-mono">{cat.value}M</span>
              </div>
            ))}
          </div>
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
                data={SUPPLIER_PERFORMANCE_METRICS}
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
