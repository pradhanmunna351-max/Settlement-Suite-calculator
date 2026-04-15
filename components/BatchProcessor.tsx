
import React, { useState, useRef, useMemo, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { Level, Region, ArticleType, ReverseLogisticsMode, Gender, BusinessBuffers, Marketplace, Brand, ManualRateCard } from '../types';
import { findAISPForTarget, calculateBreakdown, calculateAjioBreakdown } from '../services/calculatorService';
import { ARTICLE_SPECIFICATIONS, GST_RATE } from '../constants';

interface BatchProcessorProps {
  marketplace: Marketplace;
  buffers: BusinessBuffers;
  setBuffers: (val: BusinessBuffers) => void;
  marketplaceData: Record<string, any[]>;
  setMarketplaceData: React.Dispatch<React.SetStateAction<Record<string, any[]>>>;
  manualRateCard: ManualRateCard;
  isReverse: boolean;
  setIsReverse: (val: boolean) => void;
  reverseRegion: Region;
  setReverseRegion: (val: Region) => void;
  reverseMode: ReverseLogisticsMode;
  setReverseMode: (val: ReverseLogisticsMode) => void;
  reversePercent: number;
  setReversePercent: (val: number) => void;
}

const BatchProcessor: React.FC<BatchProcessorProps> = ({ 
  marketplace,
  buffers, 
  setBuffers, 
  marketplaceData, 
  setMarketplaceData,
  manualRateCard,
  isReverse,
  setIsReverse,
  reverseRegion,
  setReverseRegion,
  reverseMode,
  setReverseMode,
  reversePercent,
  setReversePercent
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isBuffersEnabled, setIsBuffersEnabled] = useState(true);
  const [currentMarketplace, setCurrentMarketplace] = useState<Marketplace>(marketplace);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCurrentMarketplace(marketplace);
  }, [marketplace]);

  const round = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100;

  const bufferLabelMap: Record<string, string> = {
    adsPercent: 'ADS',
    dealDiscountPercent: 'DEALDISCOUNT',
    reviewPercent: 'REVIEW',
    profitMarginPercent: 'PROFIT MARGIN',
    returnPercent: 'RETURN'
  };

  const downloadTemplate = () => {
    let headers: string[] = [];
    let sampleData: any[] = [];
    if (currentMarketplace === Marketplace.AJIO) {
      headers = ['AJIO SKU*', 'ARTICLE CODE*', 'ASIN*', 'AMAZON SKU*', 'TP COST*'];
      sampleData = [['AJ-001', 'ART-101', 'B0SAMPLE', 'AMZ-101', 450]];
    } else {
      headers = ['Brand*', 'ASIN*', 'Amazon sku*', 'Myntra sku*', 'Sku id*', 'Style id*', 'Gender*', 'Article type*', 'TP (Cost)*'];
      sampleData = [['CB-COLEBROOK', 'B0SAMPLE', 'AMZ-101', 'MYN-101', 'SKU-01', 'STYLE-A', 'Men', 'Trousers', 350]];
    }
    const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, `${currentMarketplace}_Template.xlsx`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const json = XLSX.utils.sheet_to_json(ws) as any[];

        const rows = json.map(row => {
          let tp = parseFloat(String(row['TP COST*'] || row['TP (Cost)*'] || row['TP Cost'] || row['TP'] || 0).replace(/[₹,]/g, ''));
          
          return {
            tp: isNaN(tp) ? 0 : tp,
            brand: (Object.values(Brand).find(v => v.toLowerCase() === String(row['Brand*'] || row['Brand']).toLowerCase()) as Brand) || Brand.BELLSTONE,
            articleCode: row['ARTICLE CODE*'] || row['ARTICLE CODE'] || 'N/A',
            asin: row['ASIN*'] || row['ASIN'] || 'N/A',
            amazonSku: row['AMAZON SKU*'] || row['AMAZON SKU'] || row['Amazon sku*'] || 'N/A',
            myntraSku: row['Myntra sku*'] || row['Myntra SKU'] || 'N/A',
            skuId: row['Sku id*'] || row['Sku ID'] || 'N/A',
            styleId: row['Style id*'] || row['AJIO SKU*'] || row['Style ID'] || row['SKU'] || 'N/A',
            articleType: (Object.values(ArticleType).find(v => v.toLowerCase() === String(row['Article type*'] || row['Article Type']).toLowerCase()) as ArticleType) || ArticleType.TSHIRTS,
            gender: (Object.values(Gender).find(v => v.toLowerCase() === String(row['Gender*'] || row['Gender']).trim().toLowerCase()) as Gender) || Gender.UNISEX,
          };
        }).filter(r => r.tp > 0);

        setMarketplaceData(prev => ({ ...prev, [currentMarketplace]: rows }));
      } catch (err) {
        console.error(err);
        alert("Excel error. Check file format.");
      } finally {
        setIsProcessing(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const results = useMemo(() => {
    if (currentMarketplace === Marketplace.AMAZON) return [];
    const activeData = (marketplaceData[currentMarketplace] || []) as any[];
    const totalBufferSum = buffers.adsPercent + buffers.dealDiscountPercent + buffers.reviewPercent + buffers.profitMarginPercent + buffers.returnPercent;
    const bufferMultiplier = isBuffersEnabled ? (totalBufferSum / 100) : 0;

    return activeData.map(row => {
      const markupAmount = row.tp * bufferMultiplier;
      const target = round(row.tp + markupAmount);
      let breakdown: any;
      if (currentMarketplace === Marketplace.AJIO) {
        breakdown = calculateAjioBreakdown(target, 34, 65);
      } else {
        const spec = ARTICLE_SPECIFICATIONS[row.articleType];
        const level = spec?.defaultLevel || Level.LEVEL_2;
        const aisp = findAISPForTarget(target, level, row.articleType, isReverse, reverseRegion, reverseMode, reversePercent, currentMarketplace, row.brand, undefined, undefined, manualRateCard);
        breakdown = calculateBreakdown(aisp, level, row.articleType, isReverse, reverseRegion, reverseMode, reversePercent, currentMarketplace, row.brand, undefined, undefined, manualRateCard);
        breakdown.level = level;
      }
      return { ...breakdown, baseTp: row.tp, markupAmount, targetSettlement: target, ...row };
    });
  }, [marketplaceData, currentMarketplace, buffers, isBuffersEnabled, manualRateCard]);

  const exportToExcel = () => {
    let wsData: any[][] = [];
    const bufferCols = isBuffersEnabled ? ['ADS AMT', 'DEAL DISCOUNT AMT', 'REVIEW AMT', 'PROFIT MARGIN AMT', 'RETURN AMT'] : [];
    
    if (currentMarketplace === Marketplace.AJIO) {
      const headers = ['AJIO SKU*', 'ARTICLE CODE*', 'ASIN*', 'AMAZON SKU*', 'TP COST*', ...bufferCols, 'FINAL TP COST', 'AVG MRP', 'Trade Discount %', 'SALE DISCOUNT AMT', 'ASP (GROSS)', 'GST % on ASP', 'GST Amt on ASP', 'Net Sales Value', 'AJIO Margin %', 'AJIO Margin (Rs.)', 'Purchase price', 'GST % (Purchase)', 'GST (Purchase)', 'BANK SETTLEMENT', 'NET PROFIT'];
      wsData.push(headers);
      results.forEach(item => {
        const profit = round(item.totalActualSettlement - (item.baseTp || 0));
        const row = [item.styleId, item.articleCode, item.asin, item.amazonSku, round(item.baseTp)];
        if (isBuffersEnabled) row.push(round(item.baseTp * buffers.adsPercent / 100), round(item.baseTp * buffers.dealDiscountPercent / 100), round(item.baseTp * buffers.reviewPercent / 100), round(item.baseTp * buffers.profitMarginPercent / 100), round(item.baseTp * buffers.returnPercent / 100));
        row.push(round(item.targetSettlement), round(item.mrp), `${item.tradeDiscountPercent}%`, round(item.saleDiscountAmt), round(item.aspGross), `${item.gstOnAspPercent}%`, round(item.gstOnAspAmt), round(item.netSalesValue), `${item.commissionRate}%`, round(item.commission), round(item.purchasePrice), `${item.gstOnPurchasePercent}%`, round(item.gstOnPurchaseAmt), round(item.totalActualSettlement), profit);
        wsData.push(row);
      });
    } else {
      const headers = ['Brand*', 'ASIN*', 'Amazon sku*', 'Myntra sku*', 'Sku id*', 'Style id*', 'Gender*', 'Article type*', 'TP (Cost)*', ...bufferCols, 'Target Settlement', 'Seller Price (AISP)', 'GTA Fee (Logistics)', 'Customer Price', 'Commission % (Inc. GST)', 'Commission Amt (Inc. GST)', 'Fixed Fee (Excl. GST)', 'LEVEL', 'Fixed Fee GST AMT', 'Reverse Log. Fee', 'Reverse Log. GST', 'TCS', 'TDS', 'Bank Settlement', 'Net Profit'];
      wsData.push(headers);
      results.forEach(item => {
        const profit = round(item.totalActualSettlement - (item.baseTp || 0));
        const row = [item.brand, item.asin, item.amazonSku, item.myntraSku, item.skuId, item.styleId, item.gender, item.articleType, round(item.baseTp)];
        if (isBuffersEnabled) row.push(round(item.baseTp * buffers.adsPercent / 100), round(item.baseTp * buffers.dealDiscountPercent / 100), round(item.baseTp * buffers.reviewPercent / 100), round(item.baseTp * buffers.profitMarginPercent / 100), round(item.baseTp * buffers.returnPercent / 100));
        row.push(round(item.targetSettlement), round(item.aisp), round(item.logisticsFee), round(item.customerPrice), `${item.commissionRate}%`, round(item.commission), round(item.fixedFee), item.level, round(item.fixedFee * GST_RATE), round(item.reverseLogisticsFee || 0), round((item.reverseLogisticsFee || 0) * GST_RATE), round(item.tcs || 0), round(item.tds || 0), round(item.totalActualSettlement), profit);
        wsData.push(row);
      });
    }
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Autofit columns
    if (wsData.length > 0) {
      const colWidths = wsData[0].map((_, colIdx) => {
        let maxLen = wsData[0][colIdx] ? String(wsData[0][colIdx]).length : 0;
        wsData.forEach(row => {
          const val = row[colIdx];
          const len = val ? String(val).length : 0;
          if (len > maxLen) maxLen = len;
        });
        return { wch: maxLen + 5 };
      });
      ws['!cols'] = colWidths;
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DetailedReport");
    XLSX.writeFile(wb, `${currentMarketplace}_Detailed_Report.xlsx`);
  };

  const hasAnyData = Object.values(marketplaceData).some((arr) => (arr as any[]).length > 0);
  const hasCurrentData = ((marketplaceData[currentMarketplace] || []) as any[]).length > 0;

  const clearAllData = () => {
    if (window.confirm("Are you sure you want to clear ALL imported data across ALL marketplaces?")) {
      setMarketplaceData({
        [Marketplace.MYNTRA]: [],
        [Marketplace.AJIO]: [],
        [Marketplace.AMAZON]: []
      });
    }
  };

  return (
    <div className="w-full flex flex-col items-center gap-6">
      <div className="w-full max-w-[1200px] flex flex-col md:flex-row justify-between items-center gap-4 px-2">
        <div className="flex bg-white/40 p-1 rounded-xl border border-forest-accent shadow-lg dark:bg-forest-pine/40 dark:border-forest-leaf/20">
          {[Marketplace.MYNTRA, Marketplace.AJIO].map((m) => (
            <button 
              key={m} 
              onClick={() => setCurrentMarketplace(m)} 
              className={`px-6 py-2 text-[9px] font-black uppercase rounded-lg transition-all ${currentMarketplace === m ? 'bg-forest-pine text-white shadow-md dark:bg-forest-leaf' : 'text-forest-pine/40 hover:text-forest-pine dark:text-forest-sage/60'}`}
            >
              {m}
            </button>
          ))}
        </div>
        
        <div className="flex items-center gap-3">
          {hasAnyData && (
            <button 
              onClick={clearAllData} 
              className="px-4 py-2 bg-rose-600 text-white border border-rose-700 text-[8px] font-black uppercase rounded-lg tracking-widest hover:bg-rose-700 transition-all shadow-md"
            >
              Flush All Queues
            </button>
          )}
          {hasCurrentData && (
            <button 
              onClick={() => setMarketplaceData({ ...marketplaceData, [currentMarketplace]: [] })} 
              className="text-[8px] font-black text-rose-500 uppercase tracking-widest hover:text-rose-700 transition-colors px-4"
            >
              Clear {currentMarketplace} View
            </button>
          )}
        </div>
      </div>

      <div className="w-full max-w-[1200px] grid grid-cols-1 lg:grid-cols-3 gap-6 px-2">
        <div className="bg-white rounded-3xl shadow-xl ring-1 ring-inset ring-white/40 border border-forest-accent/70 dark:bg-forest-pine/40 overflow-hidden flex flex-col transition-all">
          <div className="p-4 border-b border-forest-accent/50 flex items-center gap-3">
            <span className="w-1.5 h-1.5 bg-forest-leaf rounded-full shadow-[0_0_8px_rgba(45,90,58,0.6)] animate-pulse"></span>
            <h3 className="text-[10px] font-black text-forest-pine dark:text-forest-mint tracking-widest uppercase">
              Batch Pipeline
            </h3>
          </div>
          
          <div className="p-4 flex-grow flex flex-col gap-4">
            <div 
              onClick={() => fileInputRef.current?.click()} 
              className="border-2 border-dashed border-forest-accent rounded-xl p-6 flex flex-col items-center justify-center gap-3 cursor-pointer hover:bg-forest-mint/50 transition-all dark:hover:bg-forest-pine/20 relative group"
            >
              <input type="file" onChange={handleFileUpload} className="hidden" ref={fileInputRef} accept=".xlsx, .xls, .csv" />
              <div className="w-12 h-12 bg-forest-pine text-white rounded-xl flex items-center justify-center shadow-md group-hover:scale-105 transition-all dark:bg-forest-leaf">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
              </div>
              <div className="text-center space-y-1">
                <div className="font-black text-forest-pine uppercase text-xs tracking-widest dark:text-forest-mint">Import XLS</div>
                <div className="text-[7px] font-bold text-forest-pine/30 uppercase tracking-[0.2em]">Detailed Structure Required</div>
              </div>
            </div>

            <button 
              onClick={downloadTemplate}
              className="w-full py-2 border border-forest-leaf/30 rounded-lg text-[8px] font-black text-forest-leaf uppercase tracking-widest hover:bg-forest-leaf hover:text-white transition-all shadow-sm"
            >
              Download Template
            </button>
          </div>
        </div>
        
        <div className="bg-white rounded-3xl shadow-xl ring-1 ring-inset ring-white/40 border border-forest-accent/70 dark:bg-forest-pine/40 overflow-hidden flex flex-col transition-all">
          <div className="p-4 border-b border-forest-accent/50 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 bg-forest-leaf rounded-full shadow-[0_0_8px_rgba(45,90,58,0.6)]"></span>
              <h3 className="text-[10px] font-black text-forest-pine dark:text-forest-mint tracking-widest uppercase">
                Modifiers
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[7px] font-black text-forest-leaf uppercase tracking-[0.1em]">Active</span>
              <button 
                onClick={() => setIsBuffersEnabled(!isBuffersEnabled)} 
                className={`w-10 h-5 rounded-full relative transition-all shadow-inner ring-1 ring-black/5 ${isBuffersEnabled ? 'bg-forest-leaf' : 'bg-forest-accent'}`}
              >
                <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-all transform shadow-sm ${isBuffersEnabled ? 'translate-x-6' : 'translate-x-0.5'}`}></div>
              </button>
            </div>
          </div>
          
          <div className={`p-5 grid grid-cols-2 gap-x-4 gap-y-5 transition-opacity duration-300 ${isBuffersEnabled ? 'opacity-100' : 'opacity-20 pointer-events-none'}`}>
            {Object.entries(buffers).map(([key, value]) => (
              <div key={key} className="space-y-1.5">
                <label className="text-[8px] font-black text-indigo-500 uppercase tracking-tight dark:text-indigo-400">{bufferLabelMap[key] || key.replace('Percent','').toUpperCase()}</label>
                <div className="relative group">
                  <input 
                    type="number" 
                    value={value} 
                    onChange={(e) => setBuffers({...buffers, [key]: Number(e.target.value)})} 
                    className="w-full px-3 py-2 bg-white border border-indigo-100 rounded-xl font-black text-sm text-indigo-500 outline-none focus:border-indigo-300 shadow-sm dark:bg-forest-pine/60 dark:text-indigo-300 dark:border-indigo-900/40" 
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-indigo-300 font-black text-[10px]">%</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl ring-1 ring-inset ring-white/40 border border-forest-accent/70 dark:bg-forest-pine/40 overflow-hidden flex flex-col transition-all">
          <div className="p-4 border-b border-forest-accent/50 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <span className="w-1.5 h-1.5 bg-forest-leaf rounded-full shadow-[0_0_8px_rgba(45,90,58,0.6)]"></span>
              <h3 className="text-[10px] font-black text-forest-pine dark:text-forest-mint tracking-widest uppercase">
                Reverse Log.
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[7px] font-black text-forest-leaf uppercase tracking-[0.1em]">Active</span>
              <button 
                onClick={() => setIsReverse(!isReverse)} 
                className={`w-10 h-5 rounded-full relative transition-all shadow-inner ring-1 ring-black/5 ${isReverse ? 'bg-forest-leaf' : 'bg-forest-accent'}`}
              >
                <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-all transform shadow-sm ${isReverse ? 'translate-x-6' : 'translate-x-0.5'}`}></div>
              </button>
            </div>
          </div>
          
          <div className={`p-4 space-y-4 transition-opacity duration-300 ${isReverse ? 'opacity-100' : 'opacity-20 pointer-events-none'}`}>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[7px] font-black text-forest-pine/40 uppercase tracking-widest dark:text-forest-sage/60">Region</label>
                <select 
                  value={reverseRegion}
                  onChange={(e) => setReverseRegion(e.target.value as Region)}
                  className="w-full px-2 py-1.5 bg-forest-mint/40 border border-forest-accent rounded-lg font-black text-[10px] text-forest-pine outline-none focus:border-forest-leaf shadow-inner dark:bg-forest-pine/60 dark:text-forest-mint"
                >
                  {Object.values(Region).map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[7px] font-black text-forest-pine/40 uppercase tracking-widest dark:text-forest-sage/60">Mode</label>
                <select 
                  value={reverseMode}
                  onChange={(e) => setReverseMode(e.target.value as ReverseLogisticsMode)}
                  className="w-full px-2 py-1.5 bg-forest-mint/40 border border-forest-accent rounded-lg font-black text-[10px] text-forest-pine outline-none focus:border-forest-leaf shadow-inner dark:bg-forest-pine/60 dark:text-forest-mint"
                >
                  {Object.values(ReverseLogisticsMode).map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
            </div>
            
            {reverseMode === ReverseLogisticsMode.PERCENTAGE && (
              <div className="space-y-1">
                <label className="text-[7px] font-black text-forest-pine/40 uppercase tracking-widest dark:text-forest-sage/60">Return Rate %</label>
                <div className="relative group">
                  <input 
                    type="number"
                    value={reversePercent}
                    onChange={(e) => setReversePercent(Number(e.target.value))}
                    className="w-full px-2 py-1.5 bg-forest-mint/40 border border-forest-accent rounded-lg font-black text-xs text-forest-pine outline-none focus:border-forest-leaf shadow-inner dark:bg-forest-pine/60 dark:text-forest-mint"
                  />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 text-forest-leaf font-black text-[8px] opacity-20 group-focus-within:opacity-100">%</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {results.length > 0 && (
        <div className="w-full max-w-[1200px] px-2 mt-4">
          <div className="bg-forest-pine p-6 rounded-3xl flex flex-col md:flex-row justify-between items-center shadow-xl border border-white/10 dark:bg-forest-leaf relative overflow-hidden group">
            <div className="flex flex-col mb-3 md:mb-0 relative z-10">
              <span className="text-[8px] font-black text-forest-accent/40 uppercase tracking-widest mb-1">Queue Clear</span>
              <span className="text-2xl font-black text-white tracking-tighter italic">{results.length} SKUs Processed</span>
            </div>
            <button 
              onClick={exportToExcel}
              className="px-6 py-3 bg-white text-forest-pine rounded-xl font-black text-[10px] uppercase tracking-widest hover:scale-105 transition-all shadow-md ring-1 ring-white relative z-10"
            >
              Export Global Report
            </button>
          </div>
        </div>
      )}

      {results.length > 0 && (
        <div className="w-full max-w-full px-2 pb-12 mt-4 overflow-x-auto">
           <div className="bg-white rounded-3xl border border-forest-accent shadow-xl ring-1 ring-white/60 dark:bg-forest-pine/40 dark:border-forest-leaf/20 overflow-hidden">
             <div className="overflow-x-auto min-w-full">
               <table className="w-full text-[9px] text-left border-collapse min-w-[2400px]">
                 <thead className="bg-forest-mint/90 dark:bg-forest-pine/80 border-b border-forest-accent">
                   <tr className="divide-x divide-forest-accent/30">
                     <th className="px-4 py-3 font-black uppercase text-forest-pine tracking-widest dark:text-forest-sage">Brand</th>
                     <th className="px-4 py-3 font-black uppercase text-forest-pine tracking-widest dark:text-forest-sage">Amazon SKU</th>
                     <th className="px-4 py-3 font-black uppercase text-forest-pine tracking-widest dark:text-forest-sage">Myntra SKU</th>
                     <th className="px-4 py-3 font-black uppercase text-forest-pine tracking-widest dark:text-forest-sage">Article Type</th>
                     <th className="px-4 py-3 font-black uppercase text-forest-pine tracking-widest dark:text-forest-sage">TP Cost</th>
                     <th className="px-4 py-3 font-black uppercase text-forest-pine tracking-widest dark:text-forest-mint bg-forest-mint/50">Target Goal</th>
                     <th className="px-4 py-3 font-black uppercase text-forest-pine tracking-widest dark:text-forest-mint bg-forest-mint/50">AISP (Selling)</th>
                     <th className="px-4 py-3 font-black uppercase text-forest-pine tracking-widest dark:text-forest-mint">Payout</th>
                     <th className="px-4 py-3 font-black uppercase text-forest-pine tracking-widest dark:text-forest-mint">Net Profit</th>
                     <th className="px-4 py-3 font-black uppercase text-forest-pine tracking-widest dark:text-forest-mint">ROI %</th>
                     <th className="px-4 py-3 font-black uppercase text-forest-pine tracking-widest dark:text-forest-mint">Comm %</th>
                     <th className="px-4 py-3 font-black uppercase text-forest-pine tracking-widest dark:text-forest-mint">Rev. Log.</th>
                     <th className="px-4 py-3 font-black uppercase text-forest-pine tracking-widest dark:text-forest-mint text-right">Efficiency</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y divide-forest-accent/20">
                   {results.map((row, idx) => {
                     const profit = round(row.totalActualSettlement - row.baseTp);
                     const roi = (row.baseTp > 0) ? round((profit / row.baseTp) * 100) : 0;

                     return (
                       <tr key={idx} className="hover:bg-forest-mint/80 dark:hover:bg-forest-pine/40 transition-all divide-x divide-forest-accent/10">
                         <td className="px-4 py-2.5 font-black text-forest-pine dark:text-forest-mint">{row.brand}</td>
                         <td className="px-4 py-2.5 text-forest-pine/60 dark:text-forest-sage/60">{row.amazonSku}</td>
                         <td className="px-4 py-2.5 text-forest-pine/60 dark:text-forest-sage/60">{row.myntraSku}</td>
                         <td className="px-4 py-2.5 text-forest-pine/60 dark:text-forest-sage/60">{row.articleType}</td>
                         <td className="px-4 py-2.5 font-bold text-forest-pine dark:text-forest-mint">₹{row.baseTp.toFixed(2)}</td>
                         <td className="px-4 py-2.5 font-black text-forest-pine dark:text-forest-mint bg-forest-mint/40">₹{row.targetSettlement.toFixed(2)}</td>
                         <td className="px-4 py-2.5 font-black text-forest-pine text-[10px] dark:text-forest-mint bg-forest-mint/20">₹{row.aisp.toFixed(2)}</td>
                         <td className="px-4 py-2.5 font-black text-forest-leaf dark:text-forest-sage">₹{row.totalActualSettlement.toFixed(2)}</td>
                         <td className={`px-4 py-2.5 font-black ${profit >= 0 ? 'text-forest-leaf' : 'text-rose-500'}`}>₹{profit.toFixed(2)}</td>
                         <td className={`px-4 py-2.5 font-black ${roi >= 0 ? 'text-forest-leaf' : 'text-rose-500'}`}>{roi}%</td>
                         <td className="px-4 py-2.5 font-bold text-forest-leaf dark:text-forest-sage">{row.commissionRate}%</td>
                          <td className="px-4 py-2.5 font-bold text-forest-leaf dark:text-forest-sage">₹{(row.reverseLogisticsFee || 0).toFixed(2)}</td>
                         <td className="px-4 py-2.5 font-black text-right">
                           <span className={`px-3 py-1 rounded-md italic border ${roi >= 0 ? 'bg-forest-leaf/10 text-forest-leaf border-forest-leaf/30' : 'bg-rose-50 text-rose-500 border-rose-500/30'}`}>{roi}%</span>
                         </td>
                       </tr>
                     );
                   })}
                 </tbody>
               </table>
             </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default BatchProcessor;
