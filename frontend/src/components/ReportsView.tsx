import { useState, useEffect } from 'react';
import { reportsAPI } from '@/services/api';

interface DateRange {
  start_date: string;
  end_date: string;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color: string }) {
  const colorMap: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    green: 'bg-green-50 border-green-200 text-green-800',
    purple: 'bg-purple-50 border-purple-200 text-purple-800',
    orange: 'bg-orange-50 border-orange-200 text-orange-800',
    red: 'bg-red-50 border-red-200 text-red-800',
    teal: 'bg-teal-50 border-teal-200 text-teal-800',
    indigo: 'bg-indigo-50 border-indigo-200 text-indigo-800',
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
  };
  return (
    <div className={`p-4 rounded-lg border ${colorMap[color] || colorMap.blue}`}>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-sm font-medium">{label}</div>
      {sub && <div className="text-xs mt-1 opacity-75">{sub}</div>}
    </div>
  );
}

function SimpleBarChart({ data, labelKey, valueKey, title }: { data: any[]; labelKey: string; valueKey: string; title: string }) {
  if (!data || data.length === 0) return null;
  const maxVal = Math.max(...data.map(d => d[valueKey]), 1);
  return (
    <div className="bg-white p-4 rounded-lg shadow border">
      <h4 className="text-sm font-semibold text-gray-700 mb-3">{title}</h4>
      <div className="space-y-2">
        {data.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <span className="text-xs text-gray-600 w-32 truncate" title={item[labelKey]}>
              {item[labelKey]}
            </span>
            <div className="flex-1 bg-gray-100 rounded-full h-5 overflow-hidden">
              <div
                className="bg-blue-500 h-5 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
                style={{ width: `${Math.max((item[valueKey] / maxVal) * 100, 8)}%` }}
              >
                <span className="text-[10px] font-semibold text-white">{item[valueKey]}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MiniTrendChart({ data, labelKey, valueKeys, title }: { data: any[]; labelKey: string; valueKeys: { key: string; color: string; label: string }[]; title: string }) {
  if (!data || data.length === 0) return null;
  const allVals = data.flatMap(d => valueKeys.map(vk => d[vk.key] || 0));
  const maxVal = Math.max(...allVals, 1);
  const chartH = 120;

  return (
    <div className="bg-white p-4 rounded-lg shadow border">
      <h4 className="text-sm font-semibold text-gray-700 mb-2">{title}</h4>
      <div className="flex items-center gap-4 mb-2">
        {valueKeys.map(vk => (
          <div key={vk.key} className="flex items-center gap-1">
            <div className={`w-3 h-3 rounded-full ${vk.color}`} />
            <span className="text-xs text-gray-500">{vk.label}</span>
          </div>
        ))}
      </div>
      <div className="flex items-end gap-1 overflow-x-auto" style={{ height: chartH }}>
        {data.map((d, idx) => (
          <div key={idx} className="flex flex-col items-center gap-[2px] flex-shrink-0" style={{ minWidth: 18 }}>
            {valueKeys.map(vk => {
              const h = Math.max(((d[vk.key] || 0) / maxVal) * (chartH - 20), 2);
              return (
                <div
                  key={vk.key}
                  className={`${vk.color} rounded-t w-3`}
                  style={{ height: h }}
                  title={`${d[labelKey]}: ${vk.label} ${d[vk.key] || 0}`}
                />
              );
            })}
            {idx % Math.ceil(data.length / 6) === 0 && (
              <span className="text-[8px] text-gray-400 mt-1 rotate-[-45deg] origin-top-left">
                {String(d[labelKey]).slice(5)}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Doctor Report View ───────────────────────────────────────────────────────

function DoctorReportView({ dateRange, onExport, exporting }: { dateRange: DateRange; onExport: () => void; exporting: boolean }) {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadReport();
  }, [dateRange]);

  const loadReport = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await reportsAPI.getDoctorReport({
        start_date: dateRange.start_date,
        end_date: dateRange.end_date
      });
      setReport(data.report);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load doctor report');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  if (error) return <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">{error}</div>;
  if (!report) return null;

  const { totals, doctors, daily_trend } = report;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatCard label="Active Doctors" value={totals.total_doctors} color="blue" />
        <StatCard label="Patients Seen" value={totals.total_patients_seen} color="green" />
        <StatCard label="Lab Tests Ordered" value={totals.total_lab_tests} color="purple" />
        <StatCard label="Prescriptions" value={totals.total_prescriptions} color="orange" />
        <StatCard label="Appointments" value={totals.total_appointments} color="teal" />
      </div>

      {/* Daily Trend */}
      <MiniTrendChart
        data={daily_trend}
        labelKey="date"
        valueKeys={[{ key: 'consultations', color: 'bg-blue-500', label: 'Consultations' }]}
        title="Daily Consultations Trend"
      />

      {/* Per-Doctor Table */}
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        <div className="px-4 py-3 border-b bg-gray-50 flex justify-between items-center">
          <h4 className="text-sm font-semibold text-gray-700">Doctor Performance</h4>
          <button
            onClick={onExport}
            disabled={exporting}
            className="text-xs bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {exporting ? 'Exporting...' : 'Export CSV'}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Doctor</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Patients</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Unique</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Lab Tests</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Rx</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Appts</th>
                <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {doctors.map((doc: any) => (
                <tr key={doc.doctor_id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 font-medium text-gray-900">{doc.doctor_name}</td>
                  <td className="px-4 py-2 text-right">{doc.patients_seen}</td>
                  <td className="px-4 py-2 text-right">{doc.unique_patients}</td>
                  <td className="px-4 py-2 text-right">{doc.lab_tests_ordered}</td>
                  <td className="px-4 py-2 text-right">{doc.prescriptions_written}</td>
                  <td className="px-4 py-2 text-right">{doc.appointments_total}</td>
                  <td className="px-4 py-2 text-right">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                      doc.completion_rate >= 80 ? 'bg-green-100 text-green-800' :
                      doc.completion_rate >= 50 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }`}>
                      {doc.completion_rate}%
                    </span>
                  </td>
                </tr>
              ))}
              {doctors.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No doctor data for this period</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Diagnoses per Doctor */}
      {doctors.filter((d: any) => d.top_diagnoses?.length > 0).slice(0, 3).map((doc: any) => (
        <SimpleBarChart
          key={doc.doctor_id}
          data={doc.top_diagnoses}
          labelKey="diagnosis"
          valueKey="count"
          title={`Top Diagnoses - Dr. ${doc.doctor_name}`}
        />
      ))}
    </div>
  );
}

// ─── Lab Report View ──────────────────────────────────────────────────────────

function LabReportView({ dateRange, onExport, exporting }: { dateRange: DateRange; onExport: () => void; exporting: boolean }) {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadReport();
  }, [dateRange]);

  const loadReport = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await reportsAPI.getLabReport({
        start_date: dateRange.start_date,
        end_date: dateRange.end_date
      });
      setReport(data.report);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load lab report');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  if (error) return <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">{error}</div>;
  if (!report) return null;

  const { overview, tests_by_type, tests_by_urgency, top_tests, technicians, daily_trend } = report;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Tests" value={overview.total_tests} color="blue" />
        <StatCard label="Completed" value={overview.completed} color="green" sub={`In Progress: ${overview.in_progress}`} />
        <StatCard label="Abnormal Results" value={overview.abnormal_results} color="red" sub={`Rate: ${overview.abnormal_rate}%`} />
        <StatCard label="Avg Turnaround" value={`${overview.avg_turnaround_hours}h`} color="purple" />
      </div>

      {/* Status Breakdown */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { label: 'Ordered', value: overview.ordered, color: 'blue' },
          { label: 'Sample Collected', value: overview.sample_collected, color: 'indigo' },
          { label: 'In Progress', value: overview.in_progress, color: 'yellow' },
          { label: 'Completed', value: overview.completed, color: 'green' },
          { label: 'Cancelled', value: overview.cancelled, color: 'red' },
          { label: 'Abnormal', value: overview.abnormal_results, color: 'orange' },
        ].map(s => (
          <StatCard key={s.label} label={s.label} value={s.value} color={s.color} />
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SimpleBarChart data={tests_by_type} labelKey="type" valueKey="count" title="Tests by Type" />
        <SimpleBarChart data={top_tests} labelKey="test_name" valueKey="count" title="Most Ordered Tests" />
      </div>

      {/* Daily Trend */}
      <MiniTrendChart
        data={daily_trend}
        labelKey="date"
        valueKeys={[
          { key: 'ordered', color: 'bg-blue-400', label: 'Ordered' },
          { key: 'completed', color: 'bg-green-500', label: 'Completed' }
        ]}
        title="Daily Lab Test Trend"
      />

      {/* Urgency Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SimpleBarChart data={tests_by_urgency} labelKey="urgency" valueKey="count" title="Tests by Urgency" />

        {/* Technician Performance */}
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-semibold text-gray-700">Technician Performance</h4>
            <button
              onClick={onExport}
              disabled={exporting}
              className="text-xs bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 disabled:opacity-50"
            >
              {exporting ? 'Exporting...' : 'Export CSV'}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 text-xs font-medium text-gray-500">Technician</th>
                  <th className="text-right py-2 text-xs font-medium text-gray-500">Processed</th>
                  <th className="text-right py-2 text-xs font-medium text-gray-500">Completed</th>
                  <th className="text-right py-2 text-xs font-medium text-gray-500">Efficiency</th>
                </tr>
              </thead>
              <tbody>
                {technicians.map((t: any) => (
                  <tr key={t.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 font-medium">{t.name}</td>
                    <td className="py-2 text-right">{t.total_processed}</td>
                    <td className="py-2 text-right">{t.completed}</td>
                    <td className="py-2 text-right">
                      <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${
                        t.efficiency >= 80 ? 'bg-green-100 text-green-800' :
                        t.efficiency >= 50 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {t.efficiency}%
                      </span>
                    </td>
                  </tr>
                ))}
                {technicians.length === 0 && (
                  <tr><td colSpan={4} className="py-6 text-center text-gray-400">No technician data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Pharmacy Report View ─────────────────────────────────────────────────────

function PharmacyReportView({ dateRange, onExport, exporting }: { dateRange: DateRange; onExport: () => void; exporting: boolean }) {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadReport();
  }, [dateRange]);

  const loadReport = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await reportsAPI.getPharmacyReport({
        start_date: dateRange.start_date,
        end_date: dateRange.end_date
      });
      setReport(data.report);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to load pharmacy report');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" /></div>;
  if (error) return <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">{error}</div>;
  if (!report) return null;

  const { prescriptions, inventory, top_medications, pharmacists, daily_trend } = report;

  return (
    <div className="space-y-6">
      {/* Prescription Summary */}
      <div>
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3">Prescriptions Overview</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Prescriptions" value={prescriptions.total} color="blue" />
          <StatCard label="Dispensed" value={prescriptions.dispensed} color="green" sub={`Picked Up: ${prescriptions.picked_up}`} />
          <StatCard label="Fulfillment Rate" value={`${prescriptions.fulfillment_rate}%`} color="teal" />
          <StatCard label="Avg Dispense Time" value={`${prescriptions.avg_dispense_hours}h`} color="purple" />
        </div>
      </div>

      {/* Prescription Status */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
        {[
          { label: 'Pending', value: prescriptions.pending, color: 'yellow' },
          { label: 'Dispensed', value: prescriptions.dispensed, color: 'green' },
          { label: 'Picked Up', value: prescriptions.picked_up, color: 'teal' },
          { label: 'Partial', value: prescriptions.partially_dispensed, color: 'orange' },
          { label: 'Referred', value: prescriptions.referred, color: 'indigo' },
          { label: 'Cancelled', value: prescriptions.cancelled, color: 'red' },
        ].map(s => (
          <StatCard key={s.label} label={s.label} value={s.value} color={s.color} />
        ))}
      </div>

      {/* Inventory Summary */}
      <div>
        <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3">Inventory Status</h3>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <StatCard label="Total Items" value={inventory.total_items} color="blue" />
          <StatCard label="Low Stock" value={inventory.low_stock} color="yellow" />
          <StatCard label="Out of Stock" value={inventory.out_of_stock} color="red" />
          <StatCard label="Expiring Soon" value={inventory.expiring_soon} color="orange" sub="Within 90 days" />
          <StatCard label="Expired" value={inventory.expired} color="red" />
          <StatCard label="Inventory Value" value={`${inventory.total_value.toLocaleString()}`} color="green" />
        </div>
      </div>

      {/* Low Stock Alert */}
      {inventory.low_stock_details?.length > 0 && (
        <div className="bg-white rounded-lg shadow border overflow-hidden">
          <div className="px-4 py-3 border-b bg-yellow-50">
            <h4 className="text-sm font-semibold text-yellow-800">Low Stock Alert</h4>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Medication</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Strength</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">In Stock</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Min Level</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Expiry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {inventory.low_stock_details.map((item: any, idx: number) => (
                  <tr key={idx} className={item.quantity_in_stock === 0 ? 'bg-red-50' : 'hover:bg-gray-50'}>
                    <td className="px-4 py-2 font-medium">{item.medication_name}</td>
                    <td className="px-4 py-2 text-gray-600">{item.strength || '-'}</td>
                    <td className="px-4 py-2 text-right">
                      <span className={`font-semibold ${item.quantity_in_stock === 0 ? 'text-red-700' : 'text-yellow-700'}`}>
                        {item.quantity_in_stock}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-right text-gray-600">{item.minimum_stock_level}</td>
                    <td className="px-4 py-2 text-gray-600">{item.expiry_date || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SimpleBarChart data={top_medications} labelKey="medication_name" valueKey="prescription_count" title="Most Prescribed Medications" />

        {/* Pharmacist Performance */}
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-semibold text-gray-700">Pharmacist Performance</h4>
            <button
              onClick={onExport}
              disabled={exporting}
              className="text-xs bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 disabled:opacity-50"
            >
              {exporting ? 'Exporting...' : 'Export CSV'}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 text-xs font-medium text-gray-500">Pharmacist</th>
                  <th className="text-right py-2 text-xs font-medium text-gray-500">Dispensed</th>
                </tr>
              </thead>
              <tbody>
                {pharmacists.map((p: any) => (
                  <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 font-medium">{p.name}</td>
                    <td className="py-2 text-right">{p.total_dispensed}</td>
                  </tr>
                ))}
                {pharmacists.length === 0 && (
                  <tr><td colSpan={2} className="py-6 text-center text-gray-400">No pharmacist data</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Daily Trend */}
      <MiniTrendChart
        data={daily_trend}
        labelKey="date"
        valueKeys={[{ key: 'dispensed', color: 'bg-green-500', label: 'Dispensed' }]}
        title="Daily Dispensing Trend"
      />
    </div>
  );
}

// ─── Main Reports Component ───────────────────────────────────────────────────

type ReportTab = 'doctor' | 'lab' | 'pharmacy';
type PeriodPreset = 'daily' | 'monthly' | 'annual' | 'custom';

export default function ReportsView() {
  const [activeTab, setActiveTab] = useState<ReportTab>('doctor');
  const [exporting, setExporting] = useState(false);
  const [activePeriod, setActivePeriod] = useState<PeriodPreset>('monthly');

  // Default: current month
  const today = new Date();
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [dateRange, setDateRange] = useState<DateRange>({
    start_date: firstOfMonth.toISOString().split('T')[0],
    end_date: today.toISOString().split('T')[0]
  });

  const [tempRange, setTempRange] = useState<DateRange>({ ...dateRange });

  const applyDateRange = () => {
    setActivePeriod('custom');
    setDateRange({ ...tempRange });
  };

  const setPeriodPreset = (preset: PeriodPreset) => {
    const end = new Date();
    let start: Date;

    if (preset === 'daily') {
      start = new Date(end);
    } else if (preset === 'monthly') {
      start = new Date(end.getFullYear(), end.getMonth(), 1);
    } else {
      // annual
      start = new Date(end.getFullYear(), 0, 1);
    }

    const range: DateRange = {
      start_date: start.toISOString().split('T')[0],
      end_date: end.toISOString().split('T')[0]
    };
    setActivePeriod(preset);
    setTempRange(range);
    setDateRange(range);
  };

  const setQuickRange = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    const range = {
      start_date: start.toISOString().split('T')[0],
      end_date: end.toISOString().split('T')[0]
    };
    setActivePeriod('custom');
    setTempRange(range);
    setDateRange(range);
  };

  const handleExport = async () => {
    try {
      setExporting(true);
      let response;
      const params = { start_date: dateRange.start_date, end_date: dateRange.end_date };

      switch (activeTab) {
        case 'doctor':
          response = await reportsAPI.exportDoctorReport(params);
          break;
        case 'lab':
          response = await reportsAPI.exportLabReport(params);
          break;
        case 'pharmacy':
          response = await reportsAPI.exportPharmacyReport(params);
          break;
      }

      if (response) {
        const blob = new Blob([response.data], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${activeTab}_report_${dateRange.start_date}_${dateRange.end_date}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  };

  const tabs: { key: ReportTab; label: string; color: string }[] = [
    { key: 'doctor', label: 'Doctor Report', color: 'green' },
    { key: 'lab', label: 'Lab Report', color: 'purple' },
    { key: 'pharmacy', label: 'Pharmacy Report', color: 'teal' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow border p-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          {/* Tabs */}
          <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  activeTab === tab.key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Date Range */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Period Preset Buttons */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              {([
                { key: 'daily', label: 'Daily' },
                { key: 'monthly', label: 'Monthly' },
                { key: 'annual', label: 'Annual' },
              ] as { key: PeriodPreset; label: string }[]).map(p => (
                <button
                  key={p.key}
                  onClick={() => setPeriodPreset(p.key)}
                  className={`text-xs px-3 py-1.5 rounded-md font-medium transition-colors ${
                    activePeriod === p.key
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-gray-600 hover:text-gray-800 hover:bg-gray-200'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Divider */}
            <span className="text-gray-300 text-sm">|</span>

            {/* Quick Range shortcuts */}
            <div className="flex gap-1">
              {[7, 14, 30, 90].map(days => (
                <button
                  key={days}
                  onClick={() => setQuickRange(days)}
                  className={`text-xs px-2 py-1 rounded transition-colors ${
                    activePeriod === 'custom'
                      ? 'bg-gray-200 text-gray-700'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  {days}d
                </button>
              ))}
            </div>

            {/* Custom date inputs */}
            <input
              type="date"
              value={tempRange.start_date}
              onChange={(e) => setTempRange({ ...tempRange, start_date: e.target.value })}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            />
            <span className="text-gray-400 text-sm">to</span>
            <input
              type="date"
              value={tempRange.end_date}
              onChange={(e) => setTempRange({ ...tempRange, end_date: e.target.value })}
              className="text-sm border border-gray-300 rounded px-2 py-1"
            />
            <button
              onClick={applyDateRange}
              className="text-xs bg-blue-600 text-white px-3 py-1.5 rounded hover:bg-blue-700"
            >
              Apply
            </button>
          </div>
        </div>
      </div>

      {/* Report Period Badge */}
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        <span>
          {activePeriod !== 'custom' && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 mr-2 capitalize">
              {activePeriod}
            </span>
          )}
          Report period: <strong>{dateRange.start_date}</strong> to <strong>{dateRange.end_date}</strong>
        </span>
      </div>

      {/* Active Report */}
      {activeTab === 'doctor' && <DoctorReportView dateRange={dateRange} onExport={handleExport} exporting={exporting} />}
      {activeTab === 'lab' && <LabReportView dateRange={dateRange} onExport={handleExport} exporting={exporting} />}
      {activeTab === 'pharmacy' && <PharmacyReportView dateRange={dateRange} onExport={handleExport} exporting={exporting} />}
    </div>
  );
}
