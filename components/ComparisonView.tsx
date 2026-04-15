
import React, { useMemo } from 'react';
import * as XLSX from 'xlsx';
import { PricingResult, Marketplace, Level, ArticleType, Region, ReverseLogisticsMode, Brand, ManualRateCard } from '../types';
import { calculateBreakdown, calculateAjioBreakdown, findAISPForTarget } from '../services/calculatorService';
import { GST_RATE } from '../constants';

interface ComparisonViewProps {
  marketplace: Marketplace;
  setMarketplace: (val: Marketplace) => void;
  targetSettlement: number;
  level: Level;
  articleType: ArticleType;
  isReverse: boolean;
  reverseRegion: Region;
  reverseMode: ReverseLogisticsMode;
  reversePercent: number;
  brand: Brand;
  ajioMargin: number;
  setAjioMargin: (val: number) => void;
  ajioTradeDiscount: number;
  setAjioTradeDiscount: (val: number) => void;
  manualRateCard: ManualRateCard;
  tpPrice: number;
}

const ComparisonView: React.FC<ComparisonViewProps> = ({
  marketplace,
  setMarketplace,
  targetSettlement,
  level,
  articleType,
  isReverse,
  reverseRegion,
  reverseMode,
  reversePercent,
  brand,
  ajioMargin,
  setAjioMargin,
  ajioTradeDiscount,
  setAjioTradeDiscount,
  manualRateCard,
  tpPrice
}) => {
  const [isLocked, setIsLocked] = React.useState(true);

  const myntraResult = useMemo(() => {
    const aisp = findAISPForTarget(
      targetSettlement,
      level,
      articleType,
      isReverse,
      reverseRegion,
      reverseMode,
      reversePercent,
      Marketplace.MYNTRA,
      brand,
      ajioMargin,
      ajioTradeDiscount,
      manualRateCard
    );
    return calculateBreakdown(
      aisp,
      level,
      articleType,
      isReverse,
      reverseRegion,
      reverseMode,
      reversePercent,
      Marketplace.MYNTRA,
      brand,
      ajioMargin,
      ajioTradeDiscount,
      manualRateCard
    );
  }, [targetSettlement, level, articleType, isReverse, reverseRegion, reverseMode, reversePercent, brand, ajioMargin, ajioTradeDiscount, manualRateCard]);

  const ajioResult = useMemo(() => {
    return calculateAjioBreakdown(targetSettlement, ajioMargin, ajioTradeDiscount);
  }, [targetSettlement, ajioMargin, ajioTradeDiscount]);

  const format = (val: number, decimals: number = 2) =>
    `₹${val.toLocaleString('en-IN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;

  const myntraHeaders = [
    "Channel",
    "Target",
    "AISP",
    "Comm %",
    "Comm Amt",
    "Fees+GST",
    "TCS/TDS",
    "Settlement",
    "Profit"
  ];

  const ajioHeaders = [
    "Channel",
    "MRP",
    "Trade %",
    "ASP Gross",
    "GST ASP",
    "Net Sales",
    "Margin %",
    "Purchase",
    "GST Pur",
    "Settlement",
    "Profit"
  ];

  const headers = marketplace === Marketplace.MYNTRA ? myntraHeaders : ajioHeaders;

  const exportToExcel = () => {
    const data = marketplace === Marketplace.MYNTRA ? [
      {
        "Channel": "MYNTRA",
        "Target": targetSettlement,
        "AISP": myntraResult.aisp,
        "Comm %": myntraResult.commissionRate,
        "Comm Amt": myntraResult.commission,
        "Fees+GST": (myntraResult.fixedFee || 0) * (1 + GST_RATE) + (myntraResult.logisticsFee || 0) + (myntraResult.reverseLogisticsFee || 0) * (1 + GST_RATE),
        "TCS/TDS": (myntraResult.tcs || 0) + (myntraResult.tds || 0),
        "Settlement": myntraResult.totalActualSettlement,
        "Profit": myntraResult.totalActualSettlement - tpPrice
      }
    ] : [
      {
        "Channel": "AJIO",
        "MRP": ajioResult.mrp,
        "Trade %": ajioResult.tradeDiscountPercent,
        "ASP Gross": ajioResult.aspGross,
        "GST ASP": ajioResult.gstOnAspAmt,
        "Net Sales": ajioResult.netSalesValue,
        "Margin %": ajioResult.commissionRate,
        "Purchase": ajioResult.purchasePrice,
        "GST Pur": ajioResult.gstOnPurchaseAmt,
        "Settlement": ajioResult.totalActualSettlement,
        "Profit": ajioResult.totalActualSettlement - tpPrice
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, marketplace);
    XLSX.writeFile(workbook, `${marketplace}_Simulator_Report.xlsx`);
  };

  const renderAjioRow = (res: PricingResult) => {
    const profit = res.totalActualSettlement - tpPrice;
    return (
      <tr className="border-b border-forest-accent/20 dark:border-forest-leaf/10 hover:bg-forest-mint/30 dark:hover:bg-forest-pine/20 transition-colors">
        <td className="px-4 py-4 text-[10px] font-black text-forest-pine dark:text-forest-mint uppercase tracking-widest">AJIO</td>
        <td className="px-4 py-4 text-xs font-black text-forest-pine dark:text-forest-mint">{format(res.mrp || 0)}</td>
        <td className="px-4 py-4 text-xs font-bold text-forest-pine/60 dark:text-forest-sage/60">{res.tradeDiscountPercent}%</td>
        <td className="px-4 py-4 text-xs font-bold text-forest-pine/60 dark:text-forest-sage/60">{format(res.aspGross || 0)}</td>
        <td className="px-4 py-4 text-xs font-bold text-rose-500">-{format(res.gstOnAspAmt || 0)}</td>
        <td className="px-4 py-4 text-xs font-bold text-forest-pine/60 dark:text-forest-sage/60">{format(res.netSalesValue || 0)}</td>
        <td className="px-4 py-4 text-xs font-bold text-forest-pine/60 dark:text-forest-sage/60">{res.commissionRate}%</td>
        <td className="px-4 py-4 text-xs font-bold text-forest-pine/60 dark:text-forest-sage/60">{format(res.purchasePrice || 0)}</td>
        <td className="px-4 py-4 text-xs font-bold text-rose-500">-{format(res.gstOnPurchaseAmt || 0)}</td>
        <td className="px-4 py-4 text-xs font-black text-forest-leaf dark:text-forest-sage">{format(res.totalActualSettlement)}</td>
        <td className={`px-4 py-4 text-xs font-black ${profit >= 0 ? 'text-forest-leaf dark:text-forest-sage' : 'text-rose-600'}`}>{format(profit)}</td>
      </tr>
    );
  };

  const renderMyntraRow = (res: PricingResult) => {
    const profit = res.totalActualSettlement - tpPrice;
    const fees = (res.fixedFee || 0) * (1 + GST_RATE) + (res.logisticsFee || 0) + (res.reverseLogisticsFee || 0) * (1 + GST_RATE);
    const taxes = (res.tcs || 0) + (res.tds || 0);

    return (
      <tr className="border-b border-forest-accent/20 dark:border-forest-leaf/10 hover:bg-forest-mint/30 dark:hover:bg-forest-pine/20 transition-colors">
        <td className="px-4 py-4 text-[10px] font-black text-forest-pine dark:text-forest-mint uppercase tracking-widest">MYNTRA</td>
        <td className="px-4 py-4 text-xs font-black text-forest-pine dark:text-forest-mint">{format(targetSettlement)}</td>
        <td className="px-4 py-4 text-xs font-bold text-forest-pine/60 dark:text-forest-sage/60">{format(res.aisp)}</td>
        <td className="px-4 py-4 text-xs font-bold text-forest-pine/60 dark:text-forest-sage/60">{res.commissionRate}%</td>
        <td className="px-4 py-4 text-xs font-bold text-rose-500">-{format(res.commission)}</td>
        <td className="px-4 py-4 text-xs font-bold text-rose-500">-{format(fees)}</td>
        <td className="px-4 py-4 text-xs font-bold text-rose-500">-{format(taxes)}</td>
        <td className="px-4 py-4 text-xs font-black text-forest-leaf dark:text-forest-sage">{format(res.totalActualSettlement)}</td>
        <td className={`px-4 py-4 text-xs font-black ${profit >= 0 ? 'text-forest-leaf dark:text-forest-sage' : 'text-rose-600'}`}>{format(profit)}</td>
      </tr>
    );
  };

  return (
    <div className="bg-white rounded-[2.5rem] border border-forest-accent shadow-2xl overflow-hidden dark:bg-forest-pine dark:border-forest-leaf/30 animate-in fade-in zoom-in-95 duration-500">
      <div className="bg-forest-pine text-white p-6 dark:bg-forest-leaf/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/20">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 17v-2m3 2v-4m3 2v-6m-8-4h8a2 2 0 012 2v11a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z" /></svg>
          </div>
          <div>
            <h3 className="text-sm font-black uppercase tracking-tight">Channel Audit Matrix</h3>
            <p className="text-[8px] text-forest-accent/60 font-black uppercase tracking-widest">Horizontal Intelligence View</p>
          </div>
        </div>

        {marketplace === Marketplace.AJIO && (
          <div className="flex items-center gap-3 bg-white/5 p-2 rounded-2xl border border-white/10">
            <div className="flex items-center gap-2">
              <label className="text-[8px] font-black text-forest-accent uppercase tracking-widest">Trade %</label>
              <input 
                type="number" 
                value={ajioTradeDiscount}
                disabled={isLocked}
                onChange={(e) => setAjioTradeDiscount(Number(e.target.value))}
                className={`w-14 px-2 py-1 bg-white/10 border border-white/20 rounded-lg text-xs font-black text-white outline-none transition-all ${isLocked ? 'opacity-50 cursor-not-allowed' : 'focus:border-white/40'}`}
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-[8px] font-black text-forest-accent uppercase tracking-widest">Margin %</label>
              <input 
                type="number" 
                value={ajioMargin}
                disabled={isLocked}
                onChange={(e) => setAjioMargin(Number(e.target.value))}
                className={`w-14 px-2 py-1 bg-white/10 border border-white/20 rounded-lg text-xs font-black text-white outline-none transition-all ${isLocked ? 'opacity-50 cursor-not-allowed' : 'focus:border-white/40'}`}
              />
            </div>
            <button 
              onClick={() => setIsLocked(!isLocked)}
              className={`p-1.5 rounded-lg transition-all ${isLocked ? 'bg-white/10 text-white/60 hover:text-white' : 'bg-forest-leaf text-white shadow-lg'}`}
            >
              {isLocked ? (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
              ) : (
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>
              )}
            </button>
          </div>
        )}

        <div className="flex items-center gap-4">
          <button 
            onClick={exportToExcel}
            className="flex items-center gap-2 px-4 py-2 bg-forest-leaf text-white text-[10px] font-black uppercase rounded-xl shadow-lg hover:bg-forest-pine transition-all active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
            Export Excel
          </button>
          <div className="flex bg-white/10 p-0.5 rounded-lg border border-white/10">
            {[Marketplace.MYNTRA, Marketplace.AJIO].map(m => (
              <button 
                key={m}
                onClick={() => setMarketplace(m)}
                className={`px-3 py-1 text-[8px] font-black uppercase rounded transition-all ${marketplace === m ? 'bg-white text-forest-pine shadow-sm' : 'text-white/40 hover:text-white'}`}
              >
                {m}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
             <div className="w-2 h-2 bg-forest-leaf rounded-full animate-pulse"></div>
             <span className="text-[8px] font-black text-forest-accent uppercase tracking-widest">Live Audit</span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-forest-mint/30 dark:bg-forest-leaf/10 border-b border-forest-accent/30">
              {headers.map(h => (
                <th key={h} className="px-4 py-3 text-[9px] font-black text-forest-leaf uppercase tracking-widest whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {marketplace === Marketplace.MYNTRA ? renderMyntraRow(myntraResult) : renderAjioRow(ajioResult)}
          </tbody>
        </table>
      </div>

      <div className="p-4 bg-forest-mint/10 dark:bg-forest-pine/40 border-t border-forest-accent/30 text-center">
        <p className="text-[8px] font-black text-forest-pine/40 uppercase tracking-widest">
          Calculated at {new Date().toLocaleTimeString()} • All values inclusive of applicable taxes
        </p>
      </div>
    </div>
  );
};

export default ComparisonView;
