'use client';

import React, { useState } from 'react';
import { 
  CreditCard, 
  Users, 
  Clock, 
  History, 
  Settings, 
  FileText, 
  FileCheck, 
  Terminal, 
  CheckCircle2, 
  AlertTriangle,
  Download,
  Plus,
  Send,
  Printer,
  TrendingUp,
  Fingerprint,
  Camera,
  Layers,
  ArrowRightLeft
} from 'lucide-react';

interface PayrollViewProps {
  onNavigateSection?: (section: any) => void;
}

export const PayrollView: React.FC<PayrollViewProps> = ({ onNavigateSection }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'employees' | 'timesheets' | 'transactions' | 'taxes'>('dashboard');
  
  // Roster state for interactive employee directory and detailed inspector
  const [employeesList, setEmployeesList] = useState([
    {
      id: 'EMP-0101',
      name: 'Marcus Reyes',
      role: 'Sr Master Groomer',
      class: 'W-2 Salon',
      baseWage: 26.00,
      commissionRate: 45,
      otMultiplier: 1.5,
      w4Status: 'Single (0)',
      account: 'Chase ••••4192',
      routing: '021000021',
      status: 'ACTIVE',
      ytdGross: 31450.00,
      ytdNet: 22439.58,
      ytdTax: 9010.42,
      regHours: 72.0,
      otHours: 4.5,
      commissionAmt: 1180.00,
      tipsAmt: 420.00,
    },
    {
      id: 'EMP-0102',
      name: 'Sarah Miller',
      role: 'Lead Canine Stylist',
      class: 'W-2 Salon',
      baseWage: 24.00,
      commissionRate: 40,
      otMultiplier: 1.5,
      w4Status: 'Married (2)',
      account: 'Wells ••••8812',
      routing: '121000248',
      status: 'ACTIVE',
      ytdGross: 28500.00,
      ytdNet: 20520.00,
      ytdTax: 7980.00,
      regHours: 74.0,
      otHours: 2.0,
      commissionAmt: 980.00,
      tipsAmt: 380.00,
    },
    {
      id: 'EMP-0103',
      name: 'Elena Rostova',
      role: 'Sr Hydrotherapist',
      class: 'W-2 Salon',
      baseWage: 20.00,
      commissionRate: 0,
      otMultiplier: 1.5,
      w4Status: 'Single (1)',
      account: 'Citi ••••3041',
      routing: '021000089',
      status: 'ACTIVE',
      ytdGross: 19800.00,
      ytdNet: 14256.00,
      ytdTax: 5544.00,
      regHours: 80.0,
      otHours: 0.0,
      commissionAmt: 0.00,
      tipsAmt: 220.00,
    },
    {
      id: 'EMP-0104',
      name: 'David Kim',
      role: 'Grooming Tech',
      class: 'W-2 Salon',
      baseWage: 19.50,
      commissionRate: 30,
      otMultiplier: 1.5,
      w4Status: 'Single (0)',
      account: 'BOA ••••9914',
      routing: '111000025',
      status: 'ACTIVE',
      ytdGross: 18200.00,
      ytdNet: 13104.00,
      ytdTax: 5096.00,
      regHours: 78.0,
      otHours: 1.5,
      commissionAmt: 210.00,
      tipsAmt: 190.00,
    },
    {
      id: 'EMP-0105',
      name: 'Chloe Bennett',
      role: 'Front Desk Ops',
      class: 'W-2 Admin',
      baseWage: 21.00,
      commissionRate: 0,
      otMultiplier: 1.5,
      w4Status: 'Single (0)',
      account: 'Capital One ••••1120',
      routing: '051400549',
      status: 'ACTIVE',
      ytdGross: 19100.00,
      ytdNet: 14120.00,
      ytdTax: 4980.00,
      regHours: 80.0,
      otHours: 0.0,
      commissionAmt: 0.00,
      tipsAmt: 120.00,
    },
    {
      id: 'CON-0201',
      name: 'Dr. Aris Thorne',
      role: 'Relief Vet Specialist',
      class: '1099-NEC',
      baseWage: 120.00,
      commissionRate: 0,
      otMultiplier: 1.0,
      w4Status: 'W-9 Verified',
      account: 'Wire ••••5521',
      routing: '021000021',
      status: 'ACTIVE',
      ytdGross: 14400.00,
      ytdNet: 14400.00,
      ytdTax: 0.00,
      regHours: 24.0,
      otHours: 0.0,
      commissionAmt: 0.00,
      tipsAmt: 0.00,
    }
  ]);

  const [selectedEmpId, setSelectedEmployeeId] = useState<string>('EMP-0101');
  const [filterClass, setFilterFilterClass] = useState<string>('ALL');

  // Timesheets State
  const [timesheetPunches, setTimesheetPunches] = useState([
    { id: 'EMP-0101', name: 'Marcus Reyes', station: 'Salon Bay 01', punchIn: '07:55 AM', punchOut: '05:05 PM', break: '45m', regHr: 8.2, otHr: 0.8, status: 'OVERTIME ATTN', comm: 7, tips: 125 },
    { id: 'EMP-0102', name: 'Sarah Miller', station: 'Salon Bay 02', punchIn: '08:00 AM', punchOut: '04:30 PM', break: '30m', regHr: 8.0, otHr: 0.0, status: 'APPROVED', comm: 6, tips: 95 },
    { id: 'EMP-0103', name: 'Elena Rostova', station: 'Spa / Tub 01', punchIn: '08:15 AM', punchOut: '04:45 PM', break: '30m', regHr: 8.0, otHr: 0.0, status: 'APPROVED', comm: 5, tips: 60 },
    { id: 'EMP-0104', name: 'David Kim', station: 'Drying Bay', punchIn: '08:30 AM', punchOut: '[OPEN]', break: '--', regHr: 7.5, otHr: 0.0, status: 'MISSED PUNCH OUT', comm: 5, tips: 40 },
    { id: 'EMP-0105', name: 'Chloe Bennett', station: 'Reception Desk', punchIn: '07:30 AM', punchOut: '04:00 PM', break: '30m', regHr: 8.0, otHr: 0.0, status: 'APPROVED', comm: 0, tips: 0 },
  ]);

  const [selectedPunchId, setSelectedPunchId] = useState<string>('EMP-0104');
  const [adjustedTime, setAdjustedTime] = useState<string>('17:00 EST');

  const selectedEmployee = employeesList.find(e => e.id === selectedEmpId) || employeesList[0];
  const selectedPunch = timesheetPunches.find(p => p.id === selectedPunchId) || timesheetPunches[0];

  // Helper calculations for active batch run
  const activeBatchHeadcount = employeesList.length;
  const activeBatchRegularHours = employeesList.reduce((sum, e) => sum + (e.regHours || 0), 0);
  const activeBatchOtHours = employeesList.reduce((sum, e) => sum + (e.otHours || 0), 0);
  const activeBatchCommission = employeesList.reduce((sum, e) => sum + (e.commissionAmt || 0), 0);
  const activeBatchTips = employeesList.reduce((sum, e) => sum + (e.tipsAmt || 0), 0);
  
  const calculateGross = (e: typeof employeesList[0]) => {
    const hourlyGross = (e.regHours * e.baseWage) + (e.otHours * e.baseWage * e.otMultiplier);
    return hourlyGross + e.commissionAmt + e.tipsAmt;
  };

  const calculateNet = (e: typeof employeesList[0]) => {
    if (e.class === '1099-NEC') return calculateGross(e);
    const gross = calculateGross(e);
    const taxWH = gross * 0.2285; // Blended withholding rate
    return gross - taxWH;
  };

  const activeBatchGross = employeesList.reduce((sum, e) => sum + calculateGross(e), 0);
  const activeBatchNet = employeesList.reduce((sum, e) => sum + calculateNet(e), 0);
  const activeBatchTax = activeBatchGross - activeBatchNet;

  const handleOverridePunch = () => {
    setTimesheetPunches(prev => 
      prev.map(p => p.id === selectedPunchId ? { ...p, punchOut: '05:00 PM', status: 'APPROVED', otHr: 0.5 } : p)
    );
    alert(`Biometric state adjusted! David Kim marked as CLOCK_OUT at 05:00 PM.`);
  };

  const handleInitiateDisbursement = () => {
    alert(`NACHA ACH Transmission File queued for ${activeBatchHeadcount} staff members.\nTotal direct deposit amount: $${activeBatchNet.toFixed(2)}.`);
  };

  const handleEftpsWire = () => {
    alert(`EFTPS Web Service Wire Initialized!\nFederal Tax Withholding Payment of $18,240.00 dispatched successfully.`);
  };

  return (
    <div className="flex flex-col w-full text-foreground bg-card select-text text-[12px]">
      {/* CONTEXT STRIP */}
      <div className="w-full bg-muted/40 border-b border-border px-4 py-2 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 bg-black inline-block"></span>
          <span className="font-medium text-[11px] text-muted-foreground">
            Payroll
          </span>
        </div>
        <div className="flex items-center gap-4 text-[10px] uppercase text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 bg-success/100 inline-block"></span>
            <span className="text-foreground font-semibold">LEDGER_SYNC: 100.00% SYNCED [31MS]</span>
          </div>
          <span>|</span>
          <span>FISCAL_CYCLE: <strong className="text-foreground">FY25-Q1 OPEN</strong></span>
        </div>
      </div>

      {/* SUB NAVIGATION TABS */}
      <div className="w-full bg-card border-b border-border flex overflow-x-auto shrink-0 select-none">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-4 py-2.5 border-r border-border flex items-center gap-2 cursor-pointer transition-colors ${
            activeTab === 'dashboard' ? 'bg-primary text-primary-foreground font-semibold' : 'bg-card text-foreground hover:bg-muted/40'
          }`}
        >
          <span>[01]</span>
          <span>PAYROLL DASHBOARD</span>
        </button>
        <button
          onClick={() => setActiveTab('employees')}
          className={`px-4 py-2.5 border-r border-border flex items-center gap-2 cursor-pointer transition-colors ${
            activeTab === 'employees' ? 'bg-primary text-primary-foreground font-semibold' : 'bg-card text-foreground hover:bg-muted/40'
          }`}
        >
          <span>[02]</span>
          <span>EMPLOYEES &amp; DIRECTORY</span>
        </button>
        <button
          onClick={() => setActiveTab('timesheets')}
          className={`px-4 py-2.5 border-r border-border flex items-center gap-2 cursor-pointer transition-colors ${
            activeTab === 'timesheets' ? 'bg-primary text-primary-foreground font-semibold' : 'bg-card text-foreground hover:bg-muted/40'
          }`}
        >
          <span>[03]</span>
          <span>TIMESHEETS &amp; RECONCILIATION</span>
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`px-4 py-2.5 border-r border-border flex items-center gap-2 cursor-pointer transition-colors ${
            activeTab === 'transactions' ? 'bg-primary text-primary-foreground font-semibold' : 'bg-card text-foreground hover:bg-muted/40'
          }`}
        >
          <span>[04]</span>
          <span>TRANSACTIONS &amp; RUNS</span>
        </button>
        <button
          onClick={() => setActiveTab('taxes')}
          className={`px-4 py-2.5 border-r border-border flex items-center gap-2 cursor-pointer transition-colors ${
            activeTab === 'taxes' ? 'bg-primary text-primary-foreground font-semibold' : 'bg-card text-foreground hover:bg-muted/40'
          }`}
        >
          <span>[05]</span>
          <span>PAYROLL TAXES &amp; STATUTORY</span>
        </button>
      </div>

      {/* VIEW: DASHBOARD */}
      {activeTab === 'dashboard' && (
        <div className="flex flex-col w-full animate-fade-in">
          {/* HEADER ACTION BANNER */}
          <div className="p-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-3 bg-card">
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">SEC:3.11 // DISBURSEMENT PROTOCOL &amp; CYCLES</div>
              <h1 className="text-sm font-semibold uppercase mt-0.5">3.11 PAYROLL // EXECUTIVE DASHBOARD &amp; DISBURSEMENT CYCLES</h1>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleInitiateDisbursement}
                className="bg-primary text-primary-foreground hover:bg-primary/90 border border-border px-3.5 py-1.5 font-semibold text-[10px] tracking-wide cursor-pointer"
              >
                + INITIATE DISBURSEMENT RUN
              </button>
              <button 
                onClick={() => alert('NACHA ACH standard batch file downloaded.')}
                className="bg-card text-foreground hover:bg-muted/40 border border-border px-3.5 py-1.5 font-semibold text-[10px] tracking-wide cursor-pointer"
              >
                DOWNLOAD ACH BATCH FILE
              </button>
            </div>
          </div>

          {/* SUMMARY METRICS */}
          <div className="grid grid-cols-1 md:grid-cols-4 border-b border-border divide-y md:divide-y-0 md:divide-x divide-border bg-card">
            <div className="p-4 flex flex-col justify-between">
              <div className="text-[10px] text-muted-foreground font-semibold uppercase">METRIC:01 // NEXT DISBURSEMENT CYCLE</div>
              <div className="my-2">
                <div className="text-lg font-semibold tracking-tight">MAY 15, 2025</div>
                <div className="text-[10px] text-muted-foreground font-sans uppercase font-semibold mt-1">[T-MINUS 48H TO TRANSMISSION]</div>
              </div>
            </div>
            <div className="p-4 flex flex-col justify-between">
              <div className="text-[10px] text-muted-foreground font-semibold uppercase">METRIC:02 // GROSS PAYROLL</div>
              <div className="my-2">
                <div className="text-lg font-semibold tracking-tight">${activeBatchGross.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <div className="text-[10px] text-muted-foreground font-sans uppercase font-semibold mt-1">[{activeBatchHeadcount} ACTIVE ELIGIBLE STAFF]</div>
              </div>
            </div>
            <div className="p-4 flex flex-col justify-between">
              <div className="text-[10px] text-muted-foreground font-semibold uppercase">METRIC:03 // NET CASH REQUIREMENT</div>
              <div className="my-2">
                <div className="text-lg font-semibold tracking-tight">${activeBatchNet.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <div className="text-[10px] text-muted-foreground font-sans uppercase font-semibold mt-1">[TAX WH ESCROW: ${activeBatchTax.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}]</div>
              </div>
            </div>
            <div className="p-4 bg-muted/30 flex flex-col justify-between">
              <div className="text-[10px] text-muted-foreground font-semibold uppercase">METRIC:04 // COMMISSION &amp; TIPS POOL</div>
              <div className="my-2">
                <div className="text-lg font-semibold tracking-tight">${(activeBatchCommission + activeBatchTips).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                <div className="text-[10px] text-muted-foreground font-sans uppercase font-semibold mt-1">[COMM: ${activeBatchCommission} | TIPS: ${activeBatchTips}]</div>
              </div>
            </div>
          </div>

          {/* MAIN GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-12">
            {/* Table Area (8 Cols) */}
            <div className="lg:col-span-8 border-b lg: lg:border-r border-border flex flex-col">
              <div className="p-2.5 border-b border-border bg-muted/30 flex items-center justify-between text-[10px]">
                <span className="font-semibold">BATCH #PR-2025-05A // RUN PREPARATION [MID-MONTH]</span>
                <span className="border border-border px-1.5 py-0.5 bg-card text-[9px] font-semibold">STATUS: STAGED</span>
              </div>
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-[11px] border-collapse min-w-[650px]">
                  <thead>
                    <tr className="border-b border-border text-muted-foreground bg-card font-semibold uppercase text-[10px]">
                      <th className="p-2 border-r border-border text-center w-8">
                        <input type="checkbox" defaultChecked className="h-3 w-3 border-border text-foreground" />
                      </th>
                      <th className="p-2 border-r border-border">EMP ID</th>
                      <th className="p-2 border-r border-border">EMPLOYEE / ROLE</th>
                      <th className="p-2 border-r border-border">CLASS</th>
                      <th className="p-2 border-r border-border text-right">REG HR</th>
                      <th className="p-2 border-r border-border text-right">OT HR</th>
                      <th className="p-2 border-r border-border text-right">COMM</th>
                      <th className="p-2 border-r border-border text-right">TIPS</th>
                      <th className="p-2 border-r border-border text-right">GROSS</th>
                      <th className="p-2 border-r border-border text-right">NET</th>
                      <th className="p-2 text-center">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-card">
                    {employeesList.map((emp) => (
                      <tr key={emp.id} className="hover:bg-muted/30">
                        <td className="p-2 border-r border-border text-center">
                          <input type="checkbox" defaultChecked className="h-3 w-3 border-border text-foreground" />
                        </td>
                        <td className="p-2 border-r border-border font-semibold tabular-nums">{emp.id}</td>
                        <td className="p-2 border-r border-border whitespace-nowrap">
                          <div className="font-semibold">{emp.name}</div>
                          <div className="text-[9px] text-muted-foreground uppercase">{emp.role}</div>
                        </td>
                        <td className="p-2 border-r border-border">{emp.class}</td>
                        <td className="p-2 border-r border-border text-right">{emp.class === 'SALARY' ? '--' : emp.regHours}</td>
                        <td className="p-2 border-r border-border text-right">{emp.class === 'SALARY' ? '--' : emp.otHours}</td>
                        <td className="p-2 border-r border-border text-right">${emp.commissionAmt.toFixed(2)}</td>
                        <td className="p-2 border-r border-border text-right">${emp.tipsAmt.toFixed(2)}</td>
                        <td className="p-2 border-r border-border text-right font-semibold">${calculateGross(emp).toFixed(2)}</td>
                        <td className="p-2 border-r border-border text-right font-semibold text-foreground">${calculateNet(emp).toFixed(2)}</td>
                        <td className="p-2 text-center whitespace-nowrap">
                          <span className="bg-muted/40 text-foreground px-1.5 py-0.5 border border-border text-[9px] font-semibold">READY</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border bg-muted/30 font-semibold uppercase text-[10px]">
                      <td className="p-2 border-r border-border text-center">-</td>
                      <td className="p-2 border-r border-border" colSpan={3}>AGGREGATE RUN TOTALS (6 STAGED)</td>
                      <td className="p-2 border-r border-border text-right">{activeBatchRegularHours}h</td>
                      <td className="p-2 border-r border-border text-right">{activeBatchOtHours}h</td>
                      <td className="p-2 border-r border-border text-right">${activeBatchCommission.toFixed(2)}</td>
                      <td className="p-2 border-r border-border text-right">${activeBatchTips.toFixed(2)}</td>
                      <td className="p-2 border-r border-border text-right">${activeBatchGross.toFixed(2)}</td>
                      <td className="p-2 border-r border-border text-right underline decoration-double">${activeBatchNet.toFixed(2)}</td>
                      <td className="p-2 text-center">100% OK</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Sidebar Inspector (4 Cols) */}
            <div className="lg:col-span-4 p-4 space-y-4 bg-card">
              {/* Source Liquidity */}
              <div className="border border-border bg-card">
                <div className="p-2 border-b border-border bg-muted/30 font-semibold uppercase text-[10px] flex justify-between items-center">
                  <span>TREASURY SOURCE DISBURSEMENT</span>
                  <span className="text-[9px] font-normal">[VERIFIED]</span>
                </div>
                <div className="p-3 space-y-2 text-[11px]">
                  <div>
                    <div className="text-[9px] text-muted-foreground uppercase font-semibold">SOURCE LIQUIDITY DEPOT</div>
                    <div className="font-semibold uppercase mt-0.5 text-[13px]">JPMORGAN CHASE Commercial •••• 9921</div>
                  </div>
                  <div className="border-t border-border pt-2 space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">AVAILABLE CASH:</span>
                      <span className="font-semibold text-sm">$142,850.12</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">REQUIRED FOR RUN:</span>
                      <span className="font-semibold text-sm text-foreground">${activeBatchNet.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center border-t border-border mt-1 pt-1 text-[10px] text-muted-foreground">
                      <span>COVERAGE RATIO:</span>
                      <span className="font-semibold bg-muted/40 border border-border px-1">9.6X SAFETY FACTOR</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Tax Escrow */}
              <div className="border border-border bg-card">
                <div className="p-2 border-b border-border bg-muted/30 font-semibold uppercase text-[10px] flex justify-between items-center">
                  <span>TAX ACCRUAL ESCROW</span>
                  <span className="text-[9px] font-normal">[IRS COMPLIANT]</span>
                </div>
                <div className="p-3 space-y-1.5 text-[11px]">
                  <div className="flex justify-between items-center py-0.5 border-b border-border">
                    <span className="text-muted-foreground">Federal Withholding (941):</span>
                    <span className="font-semibold">${(activeBatchTax * 0.52).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-b border-border">
                    <span className="text-muted-foreground">FICA / Social Security (6.2%):</span>
                    <span className="font-semibold">${(activeBatchTax * 0.32).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-b border-border">
                    <span className="text-muted-foreground">FICA / Medicare (1.45%):</span>
                    <span className="font-semibold">${(activeBatchTax * 0.08).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center py-0.5 border-b border-border">
                    <span className="text-muted-foreground">State SUI/SDI Withholding:</span>
                    <span className="font-semibold">${(activeBatchTax * 0.08).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center pt-2 font-semibold border-t border-border">
                    <span>TOTAL ACCRUED ESCROW:</span>
                    <span className="text-sm font-semibold underline decoration-double">${activeBatchTax.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* NACHA PPD */}
              <div className="border border-border bg-card">
                <div className="p-2 border-b border-border bg-muted/30 font-semibold uppercase text-[10px]">
                  NACHA PPD FILE PROTOCOL
                </div>
                <div className="p-3 space-y-1.5 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ORIGINATOR ID:</span>
                    <span className="font-semibold">1134902811</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">FEDWIRE ROUTING:</span>
                    <span className="font-semibold">021000021</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">FILE FORMAT:</span>
                    <span className="font-semibold">ACH STANDARD 94-BYTE</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">SETTLEMENT DATE:</span>
                    <span className="font-semibold">2025-05-15 (SAME-DAY)</span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-border">
                    <button 
                      onClick={() => alert('Dry run ACH simulation completed successfully. 12 accounts matched.')}
                      className="w-full border border-border bg-card py-1 hover:bg-black hover:text-white uppercase font-semibold text-[9px] transition-colors cursor-pointer"
                    >
                      &gt; RUN DRY TEST SIMULATION
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: EMPLOYEES */}
      {activeTab === 'employees' && (
        <div className="flex flex-col w-full animate-fade-in">
          {/* HEADER ACTION BANNER */}
          <div className="p-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-3 bg-card">
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">SEC:3.11 // WORKFORCE COMPENSATION &amp; TAX ELECTIONS</div>
              <h1 className="text-sm font-semibold uppercase mt-0.5">3.11 PAYROLL // EMPLOYEES DIRECTORY &amp; WAGE SETUP</h1>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => {
                  const name = prompt('Enter employee name:');
                  if (name) {
                    const role = prompt('Enter role:', 'Canine Stylist') || 'Canine Stylist';
                    const wageStr = prompt('Enter base hourly wage:', '22.00');
                    const wage = parseFloat(wageStr || '22');
                    const newEmp = {
                      id: `EMP-0${Math.floor(100 + Math.random() * 900)}`,
                      name,
                      role,
                      class: 'W-2 Salon',
                      baseWage: wage,
                      commissionRate: 40,
                      otMultiplier: 1.5,
                      w4Status: 'Single (0)',
                      account: 'Chase ••••1102',
                      routing: '021000021',
                      status: 'ACTIVE',
                      ytdGross: 0,
                      ytdNet: 0,
                      ytdTax: 0,
                      regHours: 80,
                      otHours: 0,
                      commissionAmt: 0,
                      tipsAmt: 0,
                    };
                    setEmployeesList(prev => [...prev, newEmp]);
                    alert(`Employee record created for ${name}.`);
                  }
                }}
                className="bg-primary text-primary-foreground hover:bg-primary/90 border border-border px-3.5 py-1.5 font-semibold text-[10px] tracking-wide cursor-pointer"
              >
                + ADD EMPLOYEE / CONTRACTOR
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12">
            {/* Table Area (8 Cols) */}
            <div className="lg:col-span-8 border-b lg: lg:border-r border-border flex flex-col bg-card">
              {/* Table Filters */}
              <div className="p-2 border-b border-border bg-muted/30 flex items-center justify-between text-[11px] shrink-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold">FILTER:</span>
                  <button 
                    onClick={() => setFilterFilterClass('ALL')}
                    className={`border border-border px-2 py-0.5 font-semibold cursor-pointer ${filterClass === 'ALL' ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground'}`}
                  >
                    ALL ({employeesList.length})
                  </button>
                  <button 
                    onClick={() => setFilterFilterClass('W-2 Salon')}
                    className={`border border-border px-2 py-0.5 font-semibold cursor-pointer ${filterClass === 'W-2 Salon' ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground'}`}
                  >
                    W-2 SALON ({employeesList.filter(e => e.class === 'W-2 Salon').length})
                  </button>
                  <button 
                    onClick={() => setFilterFilterClass('1099-NEC')}
                    className={`border border-border px-2 py-0.5 font-semibold cursor-pointer ${filterClass === '1099-NEC' ? 'bg-primary text-primary-foreground' : 'bg-card text-foreground'}`}
                  >
                    1099-NEC ({employeesList.filter(e => e.class === '1099-NEC').length})
                  </button>
                </div>
                <div className="text-[10px] uppercase font-semibold text-muted-foreground">SORT: EMP_ID ASC</div>
              </div>

              {/* Roster Table */}
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left text-[11px] border-collapse">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border text-[10px] uppercase font-semibold">
                      <th className="p-2 w-8 text-center border-r border-border">
                        <input type="checkbox" className="h-3.5 w-3.5 border-border text-foreground" />
                      </th>
                      <th className="p-2 border-r border-border w-24">EMP ID</th>
                      <th className="p-2 border-r border-border">NAME &amp; ROLE</th>
                      <th className="p-2 border-r border-border w-28">CLASS</th>
                      <th className="p-2 border-r border-border text-right w-44">PAY BASIS &amp; COMMISSION</th>
                      <th className="p-2 border-r border-border w-28">TAX PROFILE</th>
                      <th className="p-2 border-r border-border w-36">DIRECT DEPOSIT</th>
                      <th className="p-2 text-center w-24">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-card">
                    {employeesList.filter(e => filterClass === 'ALL' || e.class === filterClass).map((emp) => (
                      <tr 
                        key={emp.id} 
                        onClick={() => setSelectedEmployeeId(emp.id)}
                        className={`hover:bg-muted/30 cursor-pointer ${emp.id === selectedEmpId ? 'bg-muted/40 font-semibold border-l-4 border-l-black' : ''}`}
                      >
                        <td className="p-2 border-r border-border text-center" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" className="h-3.5 w-3.5 border-border text-foreground" />
                        </td>
                        <td className="p-2 border-r border-border tabular-nums font-semibold">{emp.id}</td>
                        <td className="p-2 border-r border-border">
                          <div className="font-semibold uppercase text-foreground">{emp.name}</div>
                          <div className="text-[9px] text-muted-foreground">{emp.role}</div>
                        </td>
                        <td className="p-2 border-r border-border">{emp.class}</td>
                        <td className="p-2 border-r border-border text-right">
                          <div className="font-semibold">${emp.baseWage.toFixed(2)}/hr</div>
                          {emp.commissionRate > 0 && <div className="text-[9px] text-muted-foreground">+{emp.commissionRate}% Svc Comm</div>}
                        </td>
                        <td className="p-2 border-r border-border">{emp.w4Status}</td>
                        <td className="p-2 border-r border-border tabular-nums">{emp.account}</td>
                        <td className="p-2 text-center">
                          <span className="bg-primary text-primary-foreground px-1.5 py-0.5 text-[9px] font-semibold">ACTIVE</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Employee Detailed Inspector */}
            <div className="lg:col-span-4 flex flex-col bg-card">
              {/* Header */}
              <div className="p-3 border-b border-border bg-muted/30">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">Employee Record {selectedEmployee.id}</span>
                  <span className="bg-primary text-primary-foreground px-1.5 py-0.5 text-[9px] font-semibold uppercase">{selectedEmployee.class} Verified</span>
                </div>
                <h2 className="font-display text-sm font-semibold tracking-tight text-foreground mt-1">{selectedEmployee.name}</h2>
                <div className="text-[10px] text-muted-foreground font-medium uppercase mt-0.5">{selectedEmployee.role} {"//"} Full-Time</div>
              </div>

              {/* Attributes Details */}
              <div className="p-3.5 space-y-4 flex-1">
                {/* YTD Cumulative */}
                <div className="border border-border p-3 bg-card">
                  <div className="text-[9px] uppercase font-semibold text-muted-foreground">YTD GROSS DISBURSED (FY25)</div>
                  <div className="text-lg font-semibold text-foreground tracking-tight mt-0.5">${selectedEmployee.ytdGross.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
                  <div className="flex justify-between items-center text-[10px] text-muted-foreground border-t border-border pt-1.5 mt-2">
                    <span>YTD NET DISBURSED:</span>
                    <span className="font-semibold text-foreground">${selectedEmployee.ytdNet.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between items-center text-[10px] text-muted-foreground mt-1">
                    <span>TOTAL TAXES WITHHELD:</span>
                    <span className="font-semibold text-foreground">${selectedEmployee.ytdTax.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>

                {/* Earnings Structure */}
                <div className="border border-border p-3 space-y-1.5">
                  <div className="text-[9px] font-semibold text-foreground uppercase border-b border-border pb-1 flex justify-between">
                    <span>EARNINGS STRUCTURE</span>
                    <span className="font-normal text-muted-foreground">TIER-1</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">BASE HOURLY WAGE:</span>
                    <span className="font-semibold">${selectedEmployee.baseWage.toFixed(2)} / HOUR</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">COMMISSION ALLOCATION:</span>
                    <span className="font-semibold">{selectedEmployee.commissionRate}% SERVICE GROSS</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">OVERTIME MULTIPLIER:</span>
                    <span className="font-semibold">{selectedEmployee.otMultiplier}X BASE (${(selectedEmployee.baseWage * selectedEmployee.otMultiplier).toFixed(2)}/HR)</span>
                  </div>
                </div>

                {/* Withholdings */}
                <div className="border border-border p-3 space-y-1.5">
                  <div className="text-[9px] font-semibold text-foreground uppercase border-b border-border pb-1 flex justify-between">
                    <span>WITHHOLDING ELECTIONS</span>
                    <span className="font-normal text-muted-foreground">W-4 CURRENT</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">FEDERAL STATUS:</span>
                    <span className="font-semibold">{selectedEmployee.class === '1099-NEC' ? 'N/A (1099)' : 'SINGLE (0 ALLOWANCES)'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">NY STATE TAX (IT-2104):</span>
                    <span className="font-semibold">{selectedEmployee.class === '1099-NEC' ? 'N/A' : 'SINGLE (0 ALLOWANCES)'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">NYC RESIDENT SURCHARGE:</span>
                    <span className="font-semibold">{selectedEmployee.class === '1099-NEC' ? 'N/A' : 'ACTIVE (NYC RESIDENT)'}</span>
                  </div>
                </div>

                {/* Direct Deposit */}
                <div className="border border-border p-3 space-y-1.5">
                  <div className="text-[9px] font-semibold text-foreground uppercase border-b border-border pb-1 flex justify-between">
                    <span>DISBURSEMENT ROUTING</span>
                    <span className="font-normal text-muted-foreground">ACH TOKEN</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">PRIMARY DEPOSITORY:</span>
                    <span className="font-semibold uppercase">{selectedEmployee.account.split(' ')[0]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ACCOUNT NUMBER:</span>
                    <span className="font-semibold tabular-nums">•••••••••••• {selectedEmployee.account.split('••••')[1]}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ROUTING NUMBER:</span>
                    <span className="font-semibold tabular-nums">{selectedEmployee.routing}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons footer */}
              <div className="border-t border-border p-3.5 bg-muted/30 space-y-2">
                <button 
                  onClick={() => alert(`Compensation editor launched for ${selectedEmployee.name}.`)}
                  className="w-full border border-border bg-primary text-primary-foreground py-1.5 text-[13px] font-semibold hover:bg-muted tracking-wider cursor-pointer"
                >
                  EDIT COMPENSATION &amp; COMMISSIONS
                </button>
                <div className="grid grid-cols-2 gap-1.5 text-[10px]">
                  <button 
                    onClick={() => alert(`Pay stubs generated for ${selectedEmployee.name}.`)}
                    className="border border-border bg-card text-foreground py-1 font-semibold hover:bg-muted/40 cursor-pointer text-center"
                  >
                    VIEW PAY STUBS
                  </button>
                  <button 
                    onClick={() => alert(`W-4 / W-9 Verification document generated.`)}
                    className="border border-border bg-card text-foreground py-1 font-semibold hover:bg-muted/40 cursor-pointer text-center"
                  >
                    DOWNLOAD W-4 PDF
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: TIMESHEETS */}
      {activeTab === 'timesheets' && (
        <div className="flex flex-col w-full animate-fade-in">
          {/* HEADER ACTION BANNER */}
          <div className="p-4 border-b border-border flex flex-col md:flex-row md:items-center justify-between gap-3 bg-card">
            <div>
              <div className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                SEC:3.11 // SHIFT RECONCILIATION &amp; COMMISSION AUDIT
              </div>
              <h1 className="text-sm font-semibold uppercase mt-0.5">
                3.11 PAYROLL // TIMESHEETS &amp; SHIFT CLOCK RECONCILIATION
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => alert('All active clock-ins have been checked out.')}
                className="border border-border px-2.5 py-1 font-semibold hover:bg-black hover:text-white transition-none cursor-pointer"
              >
                + FORCE CLOCK-OUT ALL
              </button>
              <button 
                onClick={() => alert('Biometric time-clock hardware feed re-synchronized.')}
                className="border border-border px-2.5 py-1 font-semibold hover:bg-black hover:text-white transition-none cursor-pointer"
              >
                SYNC TIME CLOCK HW
              </button>
              <button 
                onClick={() => alert('Batch processed timesheet approvals.')}
                className="bg-primary text-primary-foreground border border-border px-2.5 py-1 font-semibold hover:bg-muted transition-none cursor-pointer"
              >
                BATCH APPROVE TIMESHEETS (12)
              </button>
            </div>
          </div>

          {/* TIMESHEET SUMMARY KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 border-b border-border divide-y sm:divide-y-0 sm:divide-x divide-border bg-card">
            <div className="p-3 flex flex-col justify-between">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">TOTAL LOGGED HOURS</span>
              <div className="text-lg font-semibold my-1">486.5 HRS</div>
              <div className="text-[10px] border-t border-border pt-1 text-muted-foreground">
                REGULAR: <strong className="text-foreground">462.0H</strong> | OVERTIME: <strong className="text-foreground">24.5H</strong>
              </div>
            </div>
            <div className="p-3 flex flex-col justify-between">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">TIME CARD ANOMALIES</span>
              <div className="text-lg font-semibold my-1 flex items-center justify-between">
                <span>02 EXCEPTIONS</span>
                <span className="text-[9px] bg-primary text-primary-foreground px-1">ALERT</span>
              </div>
              <div className="text-[10px] border-t border-border pt-1 text-muted-foreground">
                MISSED CLOCK-OUT: <strong className="text-foreground">01</strong> | REST BREAK: <strong className="text-foreground">+15 MIN</strong>
              </div>
            </div>
            <div className="p-3 flex flex-col justify-between">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">PROJECTED OVERTIME COST</span>
              <div className="text-lg font-semibold my-1">$1,120.50</div>
              <div className="text-[10px] border-t border-border pt-1 text-muted-foreground">
                MULTIPLIER: <strong className="text-foreground">1.500X APPLIED</strong>
              </div>
            </div>
            <div className="p-3 flex flex-col justify-between">
              <span className="text-[10px] font-semibold text-muted-foreground uppercase">MANAGER SIGN-OFF</span>
              <div className="text-lg font-semibold my-1">10 / 12 COMPLETE</div>
              <div className="text-[10px] border-t border-border pt-1 text-muted-foreground">
                APPROVAL PENDING: <strong className="text-foreground">02 EMP</strong>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-0">
            {/* Timesheet List Table */}
            <div className="lg:col-span-8 border-b lg: lg:border-r border-border flex flex-col overflow-hidden bg-card">
              <div className="p-2.5 border-b border-border bg-muted/30 flex items-center justify-between text-[11px] font-semibold shrink-0">
                <span>SHIFT CLOCK RECONCILIATION TABLE [2025-05-12]</span>
                <span className="text-[10px] font-normal text-muted-foreground">FILTER: ACTIVE SHIFTS</span>
              </div>
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border text-[10px] uppercase font-semibold tabular-nums">
                      <th className="p-2 border-r border-border text-center w-8">
                        <input type="checkbox" className="h-3 w-3 border-border text-foreground" />
                      </th>
                      <th className="p-2 border-r border-border">EMP ID</th>
                      <th className="p-2 border-r border-border">EMPLOYEE</th>
                      <th className="p-2 border-r border-border">STATION / LANE</th>
                      <th className="p-2 border-r border-border">PUNCH IN</th>
                      <th className="p-2 border-r border-border">PUNCH OUT</th>
                      <th className="p-2 border-r border-border">BREAK</th>
                      <th className="p-2 border-r border-border text-right">REG HR</th>
                      <th className="p-2 border-r border-border text-right">OT HR</th>
                      <th className="p-2 border-r border-border">COMM APPTS</th>
                      <th className="p-2 border-r border-border text-right">TIPS</th>
                      <th className="p-2">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-card">
                    {timesheetPunches.map((punch) => (
                      <tr 
                        key={punch.id} 
                        onClick={() => setSelectedPunchId(punch.id)}
                        className={`hover:bg-muted/30 cursor-pointer ${punch.id === selectedPunchId ? 'bg-muted/40 font-semibold border-l-4 border-l-black' : ''}`}
                      >
                        <td className="p-2 border-r border-border text-center" onClick={(e) => e.stopPropagation()}>
                          <input type="checkbox" className="h-3 w-3 border-border text-foreground" />
                        </td>
                        <td className="p-2 border-r border-border tabular-nums font-semibold">{punch.id}</td>
                        <td className="p-2 border-r border-border font-semibold">{punch.name}</td>
                        <td className="p-2 border-r border-border">{punch.station}</td>
                        <td className="p-2 border-r border-border tabular-nums">{punch.punchIn}</td>
                        <td className={`p-2 border-r border-border tabular-nums ${punch.punchOut.startsWith('[') ? 'text-destructive underline font-semibold' : ''}`}>{punch.punchOut}</td>
                        <td className="p-2 border-r border-border tabular-nums">{punch.break}</td>
                        <td className="p-2 border-r border-border text-right">{punch.regHr}h</td>
                        <td className="p-2 border-r border-border text-right font-semibold">{punch.otHr > 0 ? `${punch.otHr}h` : '0.0h'}</td>
                        <td className="p-2 border-r border-border whitespace-nowrap">{punch.comm} Appts</td>
                        <td className="p-2 border-r border-border text-right">${punch.tips.toFixed(2)}</td>
                        <td className={`p-2 font-semibold text-[10px] uppercase ${punch.status.includes('ATTN') || punch.status.includes('MISSED') ? 'bg-destructive/5 text-destructive' : 'text-success'}`}>
                          {punch.status}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Right Inspector & Biometrics override (4 Cols) */}
            <div className="lg:col-span-4 flex flex-col bg-card overflow-y-auto">
              <div className="p-2 border-b border-border bg-primary text-primary-foreground text-[10px] font-semibold flex justify-between items-center">
                <span>BIOMETRIC AUDIT &amp; EXCEPTION INSPECTOR</span>
                <span className="text-[9px] uppercase tracking-wider">PANEL // 04</span>
              </div>
              <div className="p-4 space-y-4">
                {/* Active Target Profile */}
                <div className="border border-border p-2.5 bg-muted/30 space-y-1">
                  <div className="text-[9px] text-muted-foreground uppercase font-semibold">SELECTED TARGET PROFILE</div>
                  <div className="text-[13px] font-semibold flex justify-between items-center text-foreground">
                    <span>{selectedPunch.id} {selectedPunch.name}</span>
                    <span className="bg-primary text-primary-foreground px-1 text-[9px]">ACTIVE CLOCK</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground">STATION: {selectedPunch.station}</div>
                </div>

                {/* Exception Warning box */}
                <div className="border border-border p-2.5 space-y-2">
                  <div className="text-[9px] font-semibold uppercase bg-primary text-primary-foreground px-1 py-0.5 inline-block">
                    EXCEPTION DETECTED
                  </div>
                  <p className="font-semibold text-foreground leading-normal">
                    {selectedPunch.punchOut.startsWith('[') 
                      ? `Missing clock-out punch at scheduled shift end.` 
                      : `Regular overtime detected exceeding weekly limits.`}
                  </p>
                  <div className="text-[9px] text-muted-foreground border-t border-dashed border-border pt-1.5 uppercase">
                    RULE VIOLATION: SEC-FLSA §778.103 (UNRESOLVED EXCEPTION)
                  </div>
                </div>

                {/* Biometric logs */}
                <div className="border border-border p-3 space-y-2">
                  <div className="font-medium uppercase tracking-wider text-muted-foreground border-b border-border pb-1 text-[9px] flex items-center justify-between">
                    <span>BIOMETRIC SCAN HISTORY</span>
                    <Fingerprint className="w-3.5 h-3.5 text-foreground" />
                  </div>
                  <div className="space-y-1 text-[10px]">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">TERMINAL ID:</span>
                      <span className="font-semibold">BIO-SCAN-LAN-04</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">TERMINAL IP:</span>
                      <span>192.168.10.84</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">LAST VALID SCAN:</span>
                      <span className="text-foreground font-semibold">{selectedPunch.punchIn} EST [PASS]</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">FINGERPRINT MATCH:</span>
                      <span className="font-semibold text-foreground">99.82% CONFIDENCE</span>
                    </div>
                  </div>
                </div>

                {/* Exit Camera Logs */}
                <div className="border border-border p-3 space-y-2">
                  <div className="text-[9px] font-semibold uppercase text-foreground border-b border-border pb-1 flex justify-between items-center">
                    <span>SECURITY CAMERA CROSS VERIFICATION</span>
                    <Camera className="w-3.5 h-3.5 text-foreground" />
                  </div>
                  <div className="bg-muted/30 p-2 border border-border text-[10px] leading-relaxed">
                    <strong>CAM-02 (EXIT_DOOR_NORTH):</strong><br />
                    Badge access log and exit timestamp confirms employee departure at <span className="font-semibold underline">17:04:12 EST</span>.
                  </div>
                </div>

                {/* Manual Override Form */}
                <div className="border border-border p-3.5 space-y-3 bg-muted/30">
                  <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground border-b border-border pb-1">
                    MANAGER MANUAL OVERRIDE
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] text-muted-foreground block font-semibold">ADJUSTED CLOCK-OUT PUNCH:</label>
                    <div className="flex items-center gap-1">
                      <input 
                        value={adjustedTime}
                        onChange={(e) => setAdjustedTime(e.target.value)}
                        className="w-full border border-border bg-card px-2 py-1 text-[13px] tabular-nums font-semibold focus:ring-0 focus:border-border rounded-md" 
                        type="text" 
                      />
                      <span className="border border-border px-2 py-1 bg-muted text-[10px] font-semibold select-none">UTC</span>
                    </div>
                  </div>
                  <button 
                    onClick={handleOverridePunch}
                    className="w-full bg-primary text-primary-foreground font-semibold py-1.5 px-3 text-[13px] hover:bg-muted transition-none flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <span>[APPROVE &amp; POST OVERRIDE]</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: TRANSACTIONS */}
      {activeTab === 'transactions' && (
        <div className="flex flex-col w-full animate-fade-in">
          {/* HEADER ACTION BANNER */}
          <div className="p-4 border-b border-border flex flex-wrap items-center justify-between gap-2 bg-card">
            <div>
              <div className="text-[10px] tracking-wider text-foreground tabular-nums">SEC:3.11 // HISTORICAL DISBURSEMENTS &amp; PAY STUB LEDGER</div>
              <h1 className="text-sm font-semibold uppercase tracking-tight">3.11 PAYROLL // TRANSACTIONS &amp; DISBURSEMENTS ARCHIVE</h1>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={() => alert('General ledger payroll CSV report generated.')}
                className="border border-border px-2.5 py-1 text-[10px] font-semibold hover:bg-black hover:text-white transition-none uppercase cursor-pointer"
              >
                [EXPORT GL CSV]
              </button>
              <button 
                onClick={() => alert('Bulk pay stubs sent to queue.')}
                className="border border-border px-2.5 py-1 text-[10px] font-semibold hover:bg-black hover:text-white transition-none uppercase cursor-pointer"
              >
                [PRINT ALL PAY STUBS]
              </button>
            </div>
          </div>

          {/* HISTORICAL KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 border-b border-border text-[13px] shrink-0">
            <div className="p-3 border-r border-border">
              <div className="text-[10px] uppercase font-semibold text-muted-foreground">YTD CUMULATIVE</div>
              <div className="text-lg font-semibold tracking-tight my-1 tabular-nums">$182,450.00</div>
              <div className="text-[9px] uppercase tabular-nums text-muted-foreground">10 CYCLES SETTLED // ZERO REVERSALS</div>
            </div>
            <div className="p-3 border-r border-border">
              <div className="text-[10px] uppercase font-semibold text-muted-foreground">LAST SETTLEMENT</div>
              <div className="text-lg font-semibold tracking-tight my-1 tabular-nums">$14,890.12</div>
              <div className="text-[9px] uppercase tabular-nums text-muted-foreground">BATCH #PR-2025-04B // CLEARED APR 30</div>
            </div>
            <div className="p-3 border-r border-border">
              <div className="text-[10px] uppercase font-semibold text-muted-foreground">NACHA SUCCESS RATE</div>
              <div className="text-lg font-semibold tracking-tight my-1 tabular-nums">100.0%</div>
              <div className="text-[9px] uppercase tabular-nums text-muted-foreground">120/120 ACH CLEARANCE // ZERO BOUNCE</div>
            </div>
            <div className="p-3">
              <div className="text-[10px] uppercase font-semibold text-muted-foreground">COA #1020 RECONCILIATION</div>
              <div className="text-lg font-semibold tracking-tight my-1 tabular-nums">BALANCED</div>
              <div className="text-[9px] uppercase tabular-nums text-muted-foreground">DRIFT $0.00 // GAAP COMPLIANT</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-0">
            {/* Batches Table (8 Cols) */}
            <div className="lg:col-span-7 border-b lg: lg:border-r border-border flex flex-col bg-card">
              <div className="p-2 border-b border-border flex items-center justify-between text-[11px] bg-muted/30 shrink-0">
                <span className="font-semibold">HISTORICAL BATCH ARCHIVE</span>
                <span className="text-[10px] text-muted-foreground tabular-nums">COMPLIANCE CODE: ASC-958</span>
              </div>
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border text-[10px] uppercase font-semibold tabular-nums">
                      <th className="p-2 border-r border-border">BATCH ID</th>
                      <th className="p-2 border-r border-border">DATE PERIOD</th>
                      <th className="p-2 border-r border-border text-center">HEADCOUNT</th>
                      <th className="p-2 border-r border-border text-right">GROSS</th>
                      <th className="p-2 border-r border-border text-right">TAX WH</th>
                      <th className="p-2 border-r border-border text-right">NET ACH</th>
                      <th className="p-2 text-center">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border tabular-nums">
                    <tr className="bg-muted/30 hover:bg-muted/40 cursor-pointer font-semibold">
                      <td className="p-2 border-r border-border">PR-2025-04B</td>
                      <td className="p-2 border-r border-border whitespace-nowrap">2025-04-16 - 2025-04-30</td>
                      <td className="p-2 border-r border-border text-center">12 Staff</td>
                      <td className="p-2 border-r border-border text-right">$18,120.00</td>
                      <td className="p-2 border-r border-border text-right">$3,450.12</td>
                      <td className="p-2 border-r border-border text-right">$14,669.88</td>
                      <td className="p-2 text-center">
                        <span className="bg-primary text-primary-foreground px-2 py-0.5 text-[9px] font-semibold">SETTLED</span>
                      </td>
                    </tr>
                    <tr className="hover:bg-muted/40 cursor-pointer">
                      <td className="p-2 border-r border-border">PR-2025-04A</td>
                      <td className="p-2 border-r border-border whitespace-nowrap">2025-04-01 - 2025-04-15</td>
                      <td className="p-2 border-r border-border text-center">12 Staff</td>
                      <td className="p-2 border-r border-border text-right">$17,950.00</td>
                      <td className="p-2 border-r border-border text-right">$3,380.00</td>
                      <td className="p-2 border-r border-border text-right">$14,570.00</td>
                      <td className="p-2 text-center">
                        <span className="border border-border px-1.5 py-0.5 text-[9px] font-semibold">SETTLED</span>
                      </td>
                    </tr>
                    <tr className="hover:bg-muted/40 cursor-pointer">
                      <td className="p-2 border-r border-border">PR-2025-03B</td>
                      <td className="p-2 border-r border-border whitespace-nowrap">2025-03-16 - 2025-03-31</td>
                      <td className="p-2 border-r border-border text-center">11 Staff</td>
                      <td className="p-2 border-r border-border text-right">$16,840.00</td>
                      <td className="p-2 border-r border-border text-right">$3,210.00</td>
                      <td className="p-2 border-r border-border text-right">$13,630.00</td>
                      <td className="p-2 text-center">
                        <span className="border border-border px-1.5 py-0.5 text-[9px] font-semibold">SETTLED</span>
                      </td>
                    </tr>
                    <tr className="hover:bg-muted/40 cursor-pointer">
                      <td className="p-2 border-r border-border">PR-2025-03A</td>
                      <td className="p-2 border-r border-border whitespace-nowrap">2025-03-01 - 2025-03-15</td>
                      <td className="p-2 border-r border-border text-center">11 Staff</td>
                      <td className="p-2 border-r border-border text-right">$16,500.00</td>
                      <td className="p-2 border-r border-border text-right">$3,120.00</td>
                      <td className="p-2 border-r border-border text-right">$13,380.00</td>
                      <td className="p-2 text-center">
                        <span className="border border-border px-1.5 py-0.5 text-[9px] font-semibold">SETTLED</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Pay Stub Details & Journal Entry (4 Cols) */}
            <div className="lg:col-span-5 flex flex-col bg-card overflow-y-auto">
              <div className="p-2 border-b border-border bg-primary text-primary-foreground flex justify-between items-center shrink-0">
                <span className="font-semibold text-[10px] tracking-wider uppercase">PAY STUB &amp; VOUCHER INSPECTOR</span>
                <span className="text-[9px] bg-card text-foreground px-1 font-semibold">STUB AUDIT</span>
              </div>
              <div className="p-3.5 space-y-3">
                <div className="border border-border p-3 bg-muted/30 space-y-1">
                  <div className="text-[9px] text-muted-foreground uppercase font-semibold">SELECTED RECIPIENT // BATCH PR-2025-04B</div>
                  <div className="text-sm font-semibold uppercase tracking-tight text-foreground">Marcus Reyes (EMP-0101)</div>
                  <div className="flex justify-between text-[11px] tabular-nums pt-1">
                    <span>TAX ID: <strong>XXX-XX-4192</strong></span>
                    <span>CLASS: <strong>W2 FULL-TIME</strong></span>
                  </div>
                </div>

                {/* Earnings breakdown */}
                <div className="border border-border p-3 space-y-2">
                  <span className="font-semibold text-[9px] uppercase tracking-wider block border-b border-border pb-1">EARNINGS BREAKDOWN</span>
                  <div className="space-y-1 text-[11px] tabular-nums">
                    <div className="flex justify-between">
                      <span>Regular Base (80h @ $26)</span>
                      <span className="font-semibold">$2,080.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Overtime (4h @ $39)</span>
                      <span className="font-semibold">$156.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Service Commission (45% on $2,533.33)</span>
                      <span className="font-semibold">$1,140.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Direct Tips (Pass-through)</span>
                      <span className="font-semibold">$420.00</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-border font-semibold bg-muted/40 px-1">
                      <span>TOTAL GROSS</span>
                      <span>$3,796.00</span>
                    </div>
                  </div>
                </div>

                {/* Statutory deductions */}
                <div className="border border-border p-3 space-y-2">
                  <span className="font-semibold text-[9px] uppercase tracking-wider block border-b border-border pb-1">STATUTORY TAX WITHHOLDINGS</span>
                  <div className="space-y-1 text-[11px] tabular-nums">
                    <div className="flex justify-between text-foreground">
                      <span>Federal Income Tax (FIT)</span>
                      <span>-$412.50</span>
                    </div>
                    <div className="flex justify-between text-foreground">
                      <span>FICA Social Security (6.2%)</span>
                      <span>-$235.35</span>
                    </div>
                    <div className="flex justify-between text-foreground">
                      <span>FICA Medicare (1.45%)</span>
                      <span>-$55.04</span>
                    </div>
                    <div className="flex justify-between text-foreground">
                      <span>NY State Tax (NYS-IT)</span>
                      <span>-$162.20</span>
                    </div>
                    <div className="flex justify-between text-foreground">
                      <span>NY Disability Surcharge (SDI)</span>
                      <span>-$3.25</span>
                    </div>
                    <div className="flex justify-between pt-1 border-t border-border font-semibold bg-muted/40 px-1">
                      <span>TOTAL TAX WITHHELD</span>
                      <span>-$868.34</span>
                    </div>
                  </div>
                </div>

                {/* Net payout direct deposit */}
                <div className="border border-border p-3 space-y-1 text-center bg-card">
                  <div className="text-[9px] uppercase font-semibold text-muted-foreground">NET DISBURSED PAYOUT AMOUNT</div>
                  <div className="text-xl font-semibold tabular-nums text-foreground underline decoration-double">$2,927.66</div>
                  <div className="text-[10px] text-muted-foreground">DIRECT DEPOSIT ACH TRANSFERRED TO Chase ••••4192</div>
                </div>

                {/* Double Entry Verification */}
                <div className="border border-border p-3 space-y-2 bg-muted/30">
                  <div className="flex justify-between items-center text-[10px] font-semibold">
                    <span className="uppercase">GAAP DOUBLE-ENTRY BALANCING</span>
                    <span className="bg-primary text-primary-foreground px-1 text-[9px]">ASC-958</span>
                  </div>
                  <div className="border border-border text-[10px] bg-card divide-y divide-border">
                    <div className="p-1.5 flex justify-between">
                      <div>
                        <span className="font-semibold bg-muted px-1 mr-1">[DR]</span>
                        <span className="font-semibold">#5010</span> Direct Labor Expense
                      </div>
                      <span className="font-semibold">$3,796.00</span>
                    </div>
                    <div className="p-1.5 flex justify-between pl-4">
                      <div>
                        <span className="font-semibold bg-muted px-1 mr-1">[CR]</span>
                        <span className="font-semibold">#2040</span> Payroll Taxes Payable
                      </div>
                      <span className="font-semibold">$868.34</span>
                    </div>
                    <div className="p-1.5 flex justify-between pl-4 bg-muted/30">
                      <div>
                        <span className="font-semibold bg-muted px-1 mr-1">[CR]</span>
                        <span className="font-semibold">#1020</span> Payroll Clearing Cash
                      </div>
                      <span className="font-semibold">$2,927.66</span>
                    </div>
                  </div>
                  <div className="flex justify-between font-semibold text-[9px] text-muted-foreground">
                    <span>DEBITS: $3,796.00</span>
                    <span>CREDITS: $3,796.00</span>
                    <span className="text-success">[BALANCED]</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW: TAXES */}
      {activeTab === 'taxes' && (
        <div className="flex flex-col w-full animate-fade-in">
          {/* HEADER ACTION BANNER */}
          <div className="p-4 border-b border-border flex flex-wrap items-center justify-between gap-3 bg-card">
            <div>
              <div className="text-[10px] text-muted-foreground tracking-wider font-semibold">SEC:3.11 // STATUTORY TAXES &amp; WITHHOLDING COMPLIANCE</div>
              <h1 className="text-sm font-semibold uppercase mt-0.5">3.11 PAYROLL // PAYROLL TAXES &amp; JURISDICTION COMPLIANCE</h1>
            </div>
            <div className="flex items-center gap-2">
              <button 
                onClick={handleEftpsWire}
                className="border border-border bg-primary text-primary-foreground hover:bg-primary/90 px-3 py-1.5 text-[11px] font-semibold cursor-pointer"
              >
                [INITIATE EFTPS TAX PAYMENT]
              </button>
              <button 
                onClick={() => alert('IRS Form 941 Employer Quarterly Tax draft generated.')}
                className="border border-border bg-card hover:bg-muted/40 px-3 py-1.5 text-[11px] font-semibold cursor-pointer"
              >
                [DOWNLOAD IRS FORM 941 DRAFT]
              </button>
            </div>
          </div>

          {/* TAX KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-4 border-b border-border bg-card">
            <div className="p-3.5 border-b lg: lg:border-r border-border flex flex-col justify-between">
              <div className="text-[10px] uppercase font-semibold text-muted-foreground flex justify-between">
                <span>Q1 TOTAL TAX LIABILITY</span>
                <span>[FY25]</span>
              </div>
              <div className="my-2">
                <div className="text-lg font-semibold tracking-tight">$38,420.50</div>
              </div>
              <div className="text-[10px] text-muted-foreground border-t border-dotted border-border pt-1.5 flex justify-between">
                <span>SETTLED: $28,950.00</span>
                <span className="font-semibold text-foreground">PENDING: $9,470.50</span>
              </div>
            </div>
            <div className="p-3.5 border-b lg: lg:border-r border-border flex flex-col justify-between">
              <div className="text-[10px] uppercase font-semibold text-muted-foreground flex justify-between">
                <span>EFTPS NEXT DEPOSIT DUE</span>
                <span className="font-semibold bg-muted px-1 text-foreground text-[9px]">URGENT</span>
              </div>
              <div className="my-2">
                <div className="text-lg font-semibold tracking-tight">MAY 15, 2025</div>
              </div>
              <div className="text-[10px] text-muted-foreground border-t border-dotted border-border pt-1.5">
                <span>SEMI-WEEKLY SCHEDULE // ZERO PENALTY</span>
              </div>
            </div>
            <div className="p-3.5 border-b md: lg:border-r border-border flex flex-col justify-between">
              <div className="text-[10px] uppercase font-semibold text-muted-foreground flex justify-between">
                <span>FED WITHHOLDING 941</span>
                <span>IRS-US</span>
              </div>
              <div className="my-2">
                <div className="text-lg font-semibold tracking-tight">$18,240.00</div>
              </div>
              <div className="text-[10px] text-muted-foreground border-t border-dotted border-border pt-1.5 flex justify-between">
                <span>FIT: $12,410.00</span>
                <span>FICA/MED: $5,830.00</span>
              </div>
            </div>
            <div className="p-3.5 flex flex-col justify-between">
              <div className="text-[10px] uppercase font-semibold text-muted-foreground flex justify-between">
                <span>NY SUTA SURCHARGE</span>
                <span>NYS-DOL</span>
              </div>
              <div className="my-2">
                <div className="text-lg font-semibold tracking-tight">$2,840.10</div>
              </div>
              <div className="text-[10px] text-muted-foreground border-t border-dotted border-border pt-1.5">
                <span>NY NYS-45 RATE: 3.40% // EXP 1.02</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 min-h-0">
            {/* Left Accrual Table (8 Cols) */}
            <div className="lg:col-span-8 border-b lg: lg:border-r border-border flex flex-col bg-card">
              <div className="p-2 border-b border-border bg-muted/30 flex justify-between items-center text-[11px] shrink-0 font-semibold">
                <span>STATUTORY ACCRUAL REGISTER // JURISDICTION BREAKDOWN</span>
                <span className="text-[10px] text-muted-foreground">5 ACTIVE TAX AGENCIES</span>
              </div>
              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="border-b border-border text-[10px] uppercase tracking-wider bg-muted/40 font-semibold">
                      <th className="p-2.5 border-r border-border">JURISDICTION // AGENCY</th>
                      <th className="p-2.5 border-r border-border">DESCRIPTION / CODE</th>
                      <th className="p-2.5 border-r border-border">CYCLE</th>
                      <th className="p-2.5 border-r border-border text-right">BASE WAGES</th>
                      <th className="p-2.5 border-r border-border text-right">EMPLOYEE WH</th>
                      <th className="p-2.5 border-r border-border text-right">EMPLOYER MATCH</th>
                      <th className="p-2.5 border-r border-border text-right">TOTAL LIABILITY</th>
                      <th className="p-2 text-center">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border tabular-nums">
                    <tr className="hover:bg-muted/30">
                      <td className="p-2.5 border-r border-border font-semibold">
                        <div>IRS (Federal)</div>
                        <div className="text-[10px] text-muted-foreground font-normal">TREAS-USA-EFTPS</div>
                      </td>
                      <td className="p-2.5 border-r border-border">
                        <div className="font-semibold">Form 941 Deposit</div>
                        <div className="text-[10px] text-muted-foreground">FIT + FICA + MED</div>
                      </td>
                      <td className="p-2.5 border-r border-border">Semi-Weekly</td>
                      <td className="p-2.5 border-r border-border text-right">$182,450.00</td>
                      <td className="p-2.5 border-r border-border text-right">$12,410.00</td>
                      <td className="p-2.5 border-r border-border text-right">$5,830.00</td>
                      <td className="p-2.5 border-r border-border text-right font-semibold">$18,240.00</td>
                      <td className="p-2.5 text-center whitespace-nowrap">
                        <span className="bg-primary text-primary-foreground px-2 py-0.5 text-[9px] font-semibold">DUE MAY 15</span>
                      </td>
                    </tr>
                    <tr className="hover:bg-muted/30">
                      <td className="p-2.5 border-r border-border font-semibold">
                        <div>IRS (Federal)</div>
                        <div className="text-[10px] text-muted-foreground font-normal">TREAS-USA-FUTA</div>
                      </td>
                      <td className="p-2.5 border-r border-border">
                        <div className="font-semibold">Form 940 FUTA</div>
                        <div className="text-[10px] text-muted-foreground">Unemployment Fed</div>
                      </td>
                      <td className="p-2.5 border-r border-border">Quarterly</td>
                      <td className="p-2.5 border-r border-border text-right">$98,000.00</td>
                      <td className="p-2.5 border-r border-border text-right">$0.00</td>
                      <td className="p-2.5 border-r border-border text-right">$588.00 (0.6%)</td>
                      <td className="p-2.5 border-r border-border text-right font-semibold">$588.00</td>
                      <td className="p-2.5 text-center whitespace-nowrap">
                        <span className="border border-border px-1.5 py-0.5 text-[9px] font-semibold">ACCRUED</span>
                      </td>
                    </tr>
                    <tr className="hover:bg-muted/30">
                      <td className="p-2.5 border-r border-border font-semibold">
                        <div>NY Dept Taxation &amp; Finance</div>
                        <div className="text-[10px] text-muted-foreground font-normal">NYS-TAX-ALBANY</div>
                      </td>
                      <td className="p-2.5 border-r border-border">
                        <div className="font-semibold">NYS-45 Withholding</div>
                        <div className="text-[10px] text-muted-foreground">State Income Tax (SIT)</div>
                      </td>
                      <td className="p-2.5 border-r border-border">Quarterly</td>
                      <td className="p-2.5 border-r border-border text-right">$182,450.00</td>
                      <td className="p-2.5 border-r border-border text-right">$3,480.00</td>
                      <td className="p-2.5 border-r border-border text-right">$0.00</td>
                      <td className="p-2.5 border-r border-border text-right font-semibold">$3,480.00</td>
                      <td className="p-2.5 text-center whitespace-nowrap">
                        <span className="border border-border px-1.5 py-0.5 text-[9px] font-semibold bg-muted/40">DUE APR 30</span>
                      </td>
                    </tr>
                    <tr className="hover:bg-muted/30">
                      <td className="p-2.5 border-r border-border font-semibold">
                        <div>NY Labor NYS-DOL-UI</div>
                        <div className="text-[10px] text-muted-foreground font-normal">NY-UNEMPLOY-DIV</div>
                      </td>
                      <td className="p-2.5 border-r border-border">
                        <div className="font-semibold">State Unemployment</div>
                        <div className="text-[10px] text-muted-foreground">SUTA Rate 3.4%</div>
                      </td>
                      <td className="p-2.5 border-r border-border">Quarterly</td>
                      <td className="p-2.5 border-r border-border text-right">$142,000.00</td>
                      <td className="p-2.5 border-r border-border text-right">$0.00</td>
                      <td className="p-2.5 border-r border-border text-right">$4,828.00</td>
                      <td className="p-2.5 border-r border-border text-right font-semibold">$4,828.00</td>
                      <td className="p-2.5 text-center whitespace-nowrap">
                        <span className="border border-border px-1.5 py-0.5 text-[9px] font-semibold bg-muted/40">DUE APR 30</span>
                      </td>
                    </tr>
                  </tbody>
                  <tfoot>
                    <tr className="border-t-2 border-border bg-muted/30 font-semibold uppercase text-[10px]">
                      <td className="p-2.5 border-r border-border text-left" colSpan={3}>ACCRUAL TOTALS</td>
                      <td className="p-2.5 border-r border-border text-right">$604,900.00</td>
                      <td className="p-2.5 border-r border-border text-right">$15,890.00</td>
                      <td className="p-2.5 border-r border-border text-right">$11,246.00</td>
                      <td className="p-2.5 border-r border-border text-right underline decoration-double">$27,136.00</td>
                      <td className="p-2.5 text-center">OK</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Right EFTPS Gateway Console (4 Cols) */}
            <div className="lg:col-span-4 flex flex-col bg-card">
              <div className="p-2.5 border-b border-border bg-muted/40 flex justify-between items-center text-[11px] shrink-0 font-semibold">
                <span>TAX ESCROW CLEANING &amp; EFTPS WIRE</span>
                <span className="text-[10px] font-semibold border border-border px-1.5 bg-card">GATEWAY: OK</span>
              </div>
              <div className="p-4 space-y-4">
                <div className="border border-border p-3 space-y-1 bg-card">
                  <div className="text-[9px] uppercase font-semibold text-muted-foreground">OPERATING TAX ESCROW ACCOUNT</div>
                  <div className="font-semibold text-[13px] text-foreground">Chase Operating Tax Res •••• 9921</div>
                  <div className="flex justify-between text-[11px] pt-2 border-t border-dotted border-border">
                    <span className="text-muted-foreground">ESCROW LEDGER BALANCE:</span>
                    <span className="font-semibold">$42,910.45</span>
                  </div>
                  <div className="flex justify-between text-[11px]">
                    <span className="text-muted-foreground">ALLOCATED TAX LIABILITY:</span>
                    <span className="font-semibold">${activeBatchTax.toFixed(2)}</span>
                  </div>
                </div>

                {/* Credentials */}
                <div className="border border-border p-3 bg-muted/30 space-y-2">
                  <div className="text-[9px] uppercase font-semibold text-muted-foreground">LEGAL ENTITY CREDENTIALS</div>
                  <div className="grid grid-cols-2 gap-2 text-[10px]">
                    <div>
                      <div className="text-muted-foreground text-[9px]">FED EMPLOYER ID (EIN):</div>
                      <div className="font-semibold">13-8892019</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground text-[9px]">NYS WITHHOLDING ID:</div>
                      <div className="font-semibold">W-9901428-1</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-muted-foreground text-[9px]">LEGAL REGISTERED NAME:</div>
                      <div className="font-semibold">All About Pawz NYC LLC</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-muted-foreground text-[9px]">EFTPS PIN VERIFICATION:</div>
                      <div className="font-semibold flex justify-between">
                        <span>•••• •••• •••• 4091</span>
                        <span className="text-[8px] bg-primary text-primary-foreground px-1">ACTIVE</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Remittance Detail */}
                <div className="border border-border p-3 space-y-2 bg-card">
                  <div className="flex justify-between items-center text-[10px] font-semibold">
                    <span>941 FEDERAL PAYMENT DEPOSIT</span>
                    <span className="border border-border px-1 text-[9px]">PERIOD 05A</span>
                  </div>
                  <div className="text-xl font-semibold tabular-nums tracking-tight">$18,240.00</div>
                  <p className="text-[10px] text-muted-foreground leading-normal border-t border-border pt-2">
                    Deposit triggers secure ACH Credit transmission through FedACH direct route via JPMorgan Chase NA Commercial client portal. Zero penalty compliance guarantee active.
                  </p>
                </div>

                {/* Primary Button Wire */}
                <button 
                  onClick={handleEftpsWire}
                  className="w-full border border-border bg-primary text-primary-foreground hover:bg-primary/90 py-2 font-semibold text-[13px] flex justify-center items-center gap-2 cursor-pointer transition-colors"
                >
                  <span>&gt;&gt; DISPATCH IMMEDIATE IRS WIRE</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="border-t border-border bg-muted/40 p-2.5 flex flex-wrap items-center justify-between gap-2 shrink-0 text-[10px] select-none">
        <div className="flex items-center gap-4 tabular-nums">
          <div className="flex items-center gap-1.5 font-semibold">
            <span className="w-2 h-2 bg-black inline-block"></span>
            <span>DOUBLE-ENTRY EQUILIBRIUM: BALANCED</span>
          </div>
          <span className="text-muted-foreground/70">|</span>
          <span className="text-muted-foreground uppercase">ASC-958 GAAP Compliant</span>
          <span className="text-muted-foreground/70">|</span>
          <span className="text-muted-foreground uppercase">Immutable Ledger Vault Verified</span>
        </div>
        <div className="tabular-nums text-muted-foreground">
          SHA-256 SEAL: <span className="font-semibold text-foreground tabular-nums">8FA4.PAYROLL.2025</span>
        </div>
      </footer>
    </div>
  );
};
