
import React, { useState } from 'react';
import { PricingResult, Marketplace } from '../types';
import { GST_RATE } from '../constants';

interface ResultCardProps {
  result: PricingResult;
  baseTp: number;
  targetSettlement: number;
}

const ResultCard: React.FC<ResultCardProps> = ({ result, baseTp, targetSettlement }) => {
  const [showBreakdown, setShowBreakdown] = useState(false);

  const format = (val: number, decimals: number = 2) => 
    `₹${val.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;

  const marketplaceCosts = (result.commission || 0) + ((result.fixedFee || 0) * (1 + GST_RATE)) + ((result.reverseLogisticsFee || 0) * (1 + GST_RATE)) + (result.tcs || 0) + (result.tds || 0);
  const netProfit = result.totalActualSettlement - baseTp;
  const roi = (baseTp > 0) ? (netProfit / baseTp) * 100 : 0;
  const markupAmount = targetSettlement - baseTp;

  // Check if target and payout match within a tight tolerance
  const isMatched = Math.abs(result.totalActualSettlement - targetSettlement) < 0.1;

  if (result.marketplace === Marketplace.AJIO) {
    return (
      <div className="bg-white p-4 rounded-2xl border border-forest-accent shadow-lg ring-1 ring-inset ring-white/60 space-y-4 dark:bg-forest-pine/40 dark:border-forest-leaf/30 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-20 h-20 bg-forest-leaf/5 blur-2xl pointer-events-none"></div>
        <div className="flex items-center justify-between border-b border-forest-accent pb-3 dark:border-forest-leaf/20">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 bg-forest-accent/30 rounded-full flex items-center justify-center text-forest-leaf dark:bg-forest-leaf/20 dark:text-forest-sage">
               <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /></svg>
            </div>
            <h3 className="text-sm font-black text-forest-pine uppercase tracking-tight dark:text-forest-mint">AJIO Analysis</h3>
          </div>
          <div className="px-3 py-1 bg-forest-pine text-white text-[9px] font-black uppercase rounded-full dark:bg-forest-leaf">Live</div>
        </div>

        <div className="space-y-1">
          <AjioRow label="AVG MRP" value={format(result.mrp || 0)} />
          <AjioRow label={`Trade (${result.tradeDiscountPercent}%)`} value={`${result.tradeDiscountPercent}%`} />
          <AjioRow label="ASP (Gross)" value={format(result.aspGross || 0)} isBold />
          <AjioRow label={`GST on ASP (${result.gstOnAspPercent}%)`} value={format(result.gstOnAspAmt || 0)} />
          <AjioRow label="Net Sales" value={format(result.netSalesValue || 0)} />
          <AjioRow label={`Margin (${result.commissionRate}%)`} value={format(result.commission)} />
          <AjioRow label="Purchase price" value={format(result.purchasePrice || 0)} isBold />
          <AjioRow label={`GST on Purchase (${result.gstOnPurchasePercent}%)`} value={format(result.gstOnPurchaseAmt || 0)} />
          
          <div className="mt-3 bg-forest-pine p-4 rounded-xl text-white flex justify-between items-center shadow-md relative overflow-hidden dark:bg-forest-leaf/40">
             <div className="relative z-10 flex flex-col">
                <span className="text-[9px] font-black text-forest-accent/60 uppercase tracking-widest mb-1">Bank Settlement</span>
                <span className="text-3xl font-black tracking-tighter italic">{format(result.totalActualSettlement)}</span>
             </div>
             <div className="relative z-10 w-8 h-8 bg-white/10 rounded-lg flex items-center justify-center backdrop-blur-md border border-white/20">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" d="M5 13l4 4L19 7" /></svg>
             </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="bg-forest-mint p-4 rounded-xl border border-forest-accent flex flex-col items-center text-center dark:bg-forest-pine/60 dark:border-forest-leaf/30 shadow-sm">
               <span className="text-[8px] font-black text-forest-leaf/50 uppercase tracking-widest mb-1">Net Profit</span>
               <span className={`text-xl font-black ${netProfit >= 0 ? 'text-forest-leaf dark:text-forest-sage' : 'text-rose-600'}`}>
                 {format(netProfit)}
               </span>
            </div>
            <div className="bg-forest-mint p-4 rounded-xl border border-forest-accent flex flex-col items-center text-center dark:bg-forest-pine/60 dark:border-forest-leaf/30 shadow-sm">
               <span className="text-[8px] font-black text-forest-leaf/50 uppercase tracking-widest mb-1">ROI</span>
               <span className={`text-xl font-black ${netProfit >= 0 ? 'text-forest-leaf dark:text-forest-sage' : 'text-rose-600'}`}>
                 {roi.toFixed(2)}%
               </span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-in fade-in duration-700">
      <div className="bg-forest-pine p-6 rounded-[2rem] text-white shadow-xl relative overflow-hidden dark:bg-forest-leaf/80 ring-1 ring-white/10">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full blur-[60px] -mr-16 -mt-16"></div>
        <div className="relative z-10 space-y-4 text-center">
          <div className="flex flex-col items-center gap-1.5">
            <div className="inline-flex items-center gap-1.5 bg-white/10 backdrop-blur-md px-3 py-1 rounded-full border border-white/20">
              <span className="text-[9px] font-black uppercase tracking-widest text-forest-accent">Selling Price (AISP)</span>
            </div>
            {result.brand && (
              <span className="text-[10px] font-black uppercase tracking-[0.05em] text-white/40">
                {result.brand} • {result.articleType}
              </span>
            )}
          </div>
          
          <h3 className="text-5xl font-black tracking-tighter leading-none italic drop-shadow-xl">
            {format(result.aisp)}
          </h3>
          
          <div className="flex justify-center gap-8 pt-4 border-t border-white/10">
            <div className="flex flex-col items-center">
              <span className="text-forest-accent/30 uppercase text-[8px] font-black tracking-widest mb-0.5">Consumer Price</span>
              <span className="text-2xl font-black tracking-tight">{format(result.customerPrice)}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-forest-accent/30 uppercase text-[8px] font-black tracking-widest mb-0.5">Logistics Cost</span>
              <span className="text-2xl font-black tracking-tight text-forest-sage">{format(result.logisticsFee)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-forest-accent shadow-md text-center flex flex-col justify-center items-center dark:bg-forest-pine/40 dark:border-forest-leaf/30 transition-all hover:scale-[1.01]">
          <span className="text-[10px] font-black text-forest-leaf/60 uppercase tracking-widest mb-2">Net Profit</span>
          <span className={`text-3xl font-black tracking-tighter ${netProfit >= 0 ? 'text-forest-pine dark:text-forest-mint' : 'text-rose-600'}`}>
            {format(netProfit)}
          </span>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-forest-accent shadow-md text-center flex flex-col justify-center items-center dark:bg-forest-pine/40 dark:border-forest-leaf/30 transition-all hover:scale-[1.01]">
          <span className="text-[10px] font-black text-forest-leaf/60 uppercase tracking-widest mb-2">ROI</span>
          <span className={`text-3xl font-black tracking-tighter ${netProfit >= 0 ? 'text-forest-pine dark:text-forest-mint' : 'text-rose-600'}`}>
            {roi.toFixed(2)}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-forest-accent shadow-sm space-y-4 dark:bg-forest-pine/40 dark:border-forest-leaf/30">
          <h4 className="text-[10px] font-black text-forest-leaf uppercase tracking-widest flex items-center gap-2 dark:text-forest-sage">
            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full"></span> Platform Deductions
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-bold text-forest-pine/40 uppercase">Commission %</span>
              <span className="font-black text-sm text-forest-pine dark:text-forest-mint">{result.commissionRate}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-bold text-forest-pine/40 uppercase">Commission Amt</span>
              <span className="font-black text-sm text-forest-pine dark:text-forest-mint">{format(result.commission)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-bold text-forest-pine/40 uppercase">Fixed Fee & GST</span>
              <span className="font-black text-sm text-forest-pine dark:text-forest-mint">{format(result.fixedFee * (1 + GST_RATE))}</span>
            </div>
            {result.reverseLogisticsFee > 0 && (
              <div className="flex justify-between items-center">
                <span className="text-[9px] font-bold text-forest-pine/40 uppercase">Reverse Log. & GST</span>
                <span className="font-black text-sm text-forest-pine dark:text-forest-mint">{format(result.reverseLogisticsFee * (1 + GST_RATE))}</span>
              </div>
            )}
            <div className="pt-2 border-t border-forest-accent flex justify-between items-center dark:border-forest-leaf/20">
              <span className="text-[10px] font-black text-forest-pine uppercase dark:text-forest-mint">Total Leakage</span>
              <span className="font-black text-rose-600 text-base">-{format(marketplaceCosts)}</span>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-2xl border border-forest-accent shadow-sm space-y-4 dark:bg-forest-pine/40 dark:border-forest-leaf/30">
          <h4 className="text-[10px] font-black text-forest-leaf uppercase tracking-widest flex items-center gap-2 dark:text-forest-sage">
            <span className="w-1.5 h-1.5 bg-forest-leaf rounded-full"></span> Value Allocation
          </h4>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-bold text-forest-pine/40 uppercase">Transfer Cost</span>
              <span className="font-black text-sm text-forest-pine dark:text-forest-mint">{format(baseTp)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[9px] font-bold text-forest-pine/40 uppercase">Business Markup</span>
              <span className="font-black text-sm text-forest-leaf dark:text-forest-sage">+{format(markupAmount)}</span>
            </div>
            <div className="pt-2 border-t border-forest-accent flex justify-between items-center dark:border-forest-leaf/20">
              <span className="text-[10px] font-black text-forest-pine uppercase dark:text-forest-mint">Net Goal</span>
              <span className="font-black text-forest-pine text-base dark:text-forest-mint">{format(targetSettlement)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className={`bg-white border rounded-2xl p-5 flex justify-between items-center shadow-lg dark:bg-forest-pine/60 relative overflow-hidden group/final transition-all duration-500 ${isMatched ? 'border-forest-leaf dark:border-forest-sage ring-2 ring-forest-leaf/5 shadow-[0_0_20px_rgba(45,90,58,0.05)]' : 'border-forest-accent'}`}>
        {isMatched && (
          <div className="absolute top-0 right-0 w-24 h-24 bg-forest-leaf/10 rounded-full blur-2xl pointer-events-none animate-pulse"></div>
        )}
        <div className="flex flex-col relative z-10">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-black text-forest-leaf uppercase tracking-widest dark:text-forest-sage">Settlement Payout</span>
            {isMatched && (
              <div className="flex items-center gap-1 px-2 py-1 bg-forest-leaf text-white text-[8px] font-black uppercase rounded shadow-sm animate-in slide-in-from-left-2 duration-500">
                Verified
              </div>
            )}
          </div>
          <span className="text-4xl font-black text-forest-pine tracking-tighter italic dark:text-forest-mint transition-all">
            {format(result.totalActualSettlement)}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowBreakdown(true)}
            className="px-3 py-2 bg-forest-accent/20 text-forest-pine text-[8px] font-black uppercase rounded-xl hover:bg-forest-accent/40 transition-all dark:text-forest-mint dark:bg-forest-leaf/20"
          >
            Breakdown
          </button>
          <div className={`w-10 h-10 text-white flex items-center justify-center rounded-xl shadow-md relative z-10 transition-all duration-700 ${isMatched ? 'bg-forest-leaf dark:bg-forest-sage scale-105' : 'bg-forest-accent/50'}`}>
             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" /></svg>
          </div>
        </div>
      </div>

      {showBreakdown && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-forest-pine/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl border border-forest-accent overflow-hidden dark:bg-forest-pine dark:border-forest-leaf/30 animate-in zoom-in-95 duration-300">
            <div className="p-6 border-b border-forest-accent dark:border-forest-leaf/20 flex justify-between items-center bg-forest-mint/30 dark:bg-forest-leaf/5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-forest-pine rounded-2xl flex items-center justify-center text-white dark:bg-forest-leaf">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 17v-2m3 2v-4m3 2v-6m-8-4h8a2 2 0 012 2v11a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" /></svg>
                </div>
                <div>
                  <h3 className="text-sm font-black text-forest-pine uppercase tracking-tight dark:text-forest-mint">Fee Breakdown</h3>
                  <p className="text-[8px] text-forest-leaf/50 font-black uppercase tracking-widest">Detailed Deduction Matrix</p>
                </div>
              </div>
              <button 
                onClick={() => setShowBreakdown(false)}
                className="w-8 h-8 rounded-full bg-forest-accent/20 flex items-center justify-center text-forest-pine hover:bg-forest-accent/40 transition-all dark:text-forest-mint"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              <BreakdownRow label="Platform Commission" subLabel={`${result.commissionRate}% of CP`} value={format(result.commission)} />
              <BreakdownRow label="Logistics Fee" subLabel={`Tier: ${result.level || 'N/A'}`} value={format(result.logisticsFee)} />
              <BreakdownRow label="Fixed Fee" subLabel="Base Fee" value={format(result.fixedFee)} />
              <BreakdownRow label="GST on Fixed Fee" subLabel={`${GST_RATE * 100}% GST`} value={format(result.fixedFee * GST_RATE)} />
              
              {result.reverseLogisticsFee > 0 && (
                <>
                  <BreakdownRow label="Reverse Logistics" subLabel={result.reverseMode} value={format(result.reverseLogisticsFee)} />
                  <BreakdownRow label="GST on Reverse Log." subLabel={`${GST_RATE * 100}% GST`} value={format(result.reverseLogisticsFee * GST_RATE)} />
                </>
              )}

              <div className="pt-2 border-t border-forest-accent/30 dark:border-forest-leaf/10">
                <BreakdownRow label="TCS" subLabel="0.5% of Taxable Value" value={format(result.tcs || 0)} />
                <BreakdownRow label="TDS" subLabel="0.1% of Taxable Value" value={format(result.tds || 0)} />
              </div>

              <div className="mt-4 p-4 bg-rose-50 rounded-2xl border border-rose-100 dark:bg-rose-900/10 dark:border-rose-900/20">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-black text-rose-700 uppercase tracking-widest dark:text-rose-400">Total Deductions</span>
                  <span className="text-lg font-black text-rose-700 dark:text-rose-400">-{format(marketplaceCosts)}</span>
                </div>
              </div>
            </div>

            <div className="p-6 bg-forest-pine text-white dark:bg-forest-leaf/80">
              <div className="flex justify-between items-center">
                <div className="flex flex-col">
                  <span className="text-[8px] font-black text-forest-accent/60 uppercase tracking-widest mb-0.5">Final Settlement</span>
                  <span className="text-2xl font-black tracking-tighter italic">{format(result.totalActualSettlement)}</span>
                </div>
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center backdrop-blur-md border border-white/20">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" d="M5 13l4 4L19 7" /></svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const BreakdownRow: React.FC<{ label: string; subLabel: string; value: string }> = ({ label, subLabel, value }) => (
  <div className="flex justify-between items-center group">
    <div className="flex flex-col">
      <span className="text-[10px] font-black text-forest-pine uppercase tracking-tight dark:text-forest-mint">{label}</span>
      <span className="text-[7px] font-bold text-forest-leaf/40 uppercase tracking-widest">{subLabel}</span>
    </div>
    <span className="text-xs font-black text-forest-pine dark:text-forest-mint">{value}</span>
  </div>
);

const AjioRow: React.FC<{ label: string; value: string; isBold?: boolean }> = ({ label, value, isBold }) => (
  <div className={`flex justify-between items-center px-4 py-2 rounded-lg transition-all ${isBold ? 'bg-forest-accent/20 dark:bg-forest-leaf/10' : 'hover:bg-forest-mint dark:hover:bg-forest-pine/60'}`}>
    <span className={`text-[9px] uppercase font-black tracking-widest ${isBold ? 'text-forest-pine dark:text-forest-mint' : 'text-forest-pine/40 dark:text-forest-sage/40'}`}>{label}</span>
    <span className={`text-sm font-black tracking-tight text-forest-pine dark:text-forest-mint`}>{value}</span>
  </div>
);

export default ResultCard;
