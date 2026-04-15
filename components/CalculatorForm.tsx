
import React, { useState, useMemo } from 'react';
import { Level, Region, ReverseLogisticsMode, ArticleType, BusinessBuffers, Marketplace, Brand, ManualRateCard } from '../types';
import { ARTICLE_SPECIFICATIONS } from '../constants';
import { calculateAjioBreakdown, calculateBreakdown, findAISPForTarget } from '../services/calculatorService';

interface CalculatorFormProps {
  marketplace: Marketplace;
  setMarketplace: (val: Marketplace) => void;
  brand: Brand;
  setBrand: (val: Brand) => void;
  articleType: ArticleType;
  setArticleType: (val: ArticleType) => void;
  tpPrice: number;
  setTpPrice: (val: number) => void;
  targetSettlement: number;
  setTargetSettlement: (val: number) => void;
  level: Level;
  setLevel: (val: Level) => void;
  isReverse: boolean;
  setIsReverse: (val: boolean) => void;
  reverseRegion: Region;
  setReverseRegion: (val: Region) => void;
  reverseMode: ReverseLogisticsMode;
  setReverseMode: (val: ReverseLogisticsMode) => void;
  reversePercent: number;
  setReversePercent: (val: number) => void;
  buffers: BusinessBuffers;
  setBuffers: (val: BusinessBuffers) => void;
  ajioTradeDiscount: number;
  setAjioTradeDiscount: (val: number) => void;
  ajioMargin: number;
  setAjioMargin: (val: number) => void;
  manualRateCardActive?: boolean;
  manualRateCard?: ManualRateCard;
  showResultsRow?: boolean;
  marketplaceData: Record<string, any[]>;
  setMarketplaceData: React.Dispatch<React.SetStateAction<Record<string, any[]>>>;
  onClear: () => void;
}

const CalculatorForm: React.FC<CalculatorFormProps> = ({
  marketplace,
  setMarketplace,
  brand,
  setBrand,
  articleType,
  setArticleType,
  tpPrice,
  setTpPrice,
  targetSettlement,
  setTargetSettlement,
  level,
  setLevel,
  buffers,
  setBuffers,
  ajioTradeDiscount,
  setAjioTradeDiscount,
  ajioMargin,
  setAjioMargin,
  manualRateCardActive,
  manualRateCard,
  showResultsRow,
  marketplaceData,
  setMarketplaceData,
  onClear,
  isReverse,
  setIsReverse,
  reverseRegion,
  setReverseRegion,
  reverseMode,
  setReverseMode,
  reversePercent,
  setReversePercent
}) => {
  const [isLocked, setIsLocked] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(100);
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [pendingRows, setPendingRows] = useState<any[]>([]);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const ajioResult = useMemo(() => {
    return calculateAjioBreakdown(targetSettlement, ajioMargin, ajioTradeDiscount);
  }, [targetSettlement, ajioMargin, ajioTradeDiscount]);

  const myntraResult = useMemo(() => {
    if (!manualRateCard) return null;
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

  const handleArticleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newType = e.target.value as ArticleType;
    setArticleType(newType);
    const spec = ARTICLE_SPECIFICATIONS[newType];
    if (spec) setLevel(spec.defaultLevel);
  };

  const updateBuffer = (key: keyof BusinessBuffers, val: number) => {
    setBuffers({ ...buffers, [key]: val });
  };

  const downloadTemplate = () => {
    let headers: string[] = [];
    let sampleData: any[] = [];
    if (marketplace === Marketplace.AJIO) {
      headers = ['AJIO SKU*', 'ARTICLE CODE*', 'ASIN*', 'AMAZON SKU*', 'TP COST*'];
      sampleData = [['AJ-001', 'ART-101', 'B0SAMPLE', 'AMZ-101', 450]];
    } else {
      headers = ['Brand*', 'ASIN*', 'Amazon sku*', 'Myntra sku*', 'Sku id*', 'Style id*', 'Gender*', 'Article type*', 'TP (Cost)*'];
      sampleData = [['CB-COLEBROOK', 'B0SAMPLE', 'AMZ-101', 'MYN-101', 'SKU-01', 'STYLE-A', 'Men', 'Trousers', 350]];
    }
    import('xlsx').then(XLSX => {
      const ws = XLSX.utils.aoa_to_sheet([headers, ...sampleData]);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Template");
      XLSX.writeFile(wb, `${marketplace}_Template.xlsx`);
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setUploadStatus('idle');
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const XLSX = await import('xlsx');
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const json = XLSX.utils.sheet_to_json(ws) as any[];

        const rows = json.map(row => {
          let tp = parseFloat(String(row['TP COST*'] || row['TP (Cost)*'] || row['TP Cost'] || row['TP'] || 0).replace(/[₹,]/g, ''));
          
          return {
            ...row, // Preserve all original headers
            tp: isNaN(tp) ? 0 : tp,
            brand: (Object.values(Brand).find(v => v.toLowerCase() === String(row['Brand*'] || row['Brand']).toLowerCase()) as Brand) || Brand.BELLSTONE,
            articleCode: row['ARTICLE CODE*'] || row['ARTICLE CODE'] || 'N/A',
            asin: row['ASIN*'] || row['ASIN'] || 'N/A',
            amazonSku: row['AMAZON SKU*'] || row['AMAZON SKU'] || row['Amazon sku*'] || 'N/A',
            myntraSku: row['Myntra sku*'] || row['Myntra SKU'] || 'N/A',
            skuId: row['Sku id*'] || row['Sku ID'] || 'N/A',
            styleId: row['Style id*'] || row['AJIO SKU*'] || row['Style ID'] || row['SKU'] || 'N/A',
            articleType: (Object.values(ArticleType).find(v => v.toLowerCase() === String(row['Article type*'] || row['Article Type']).toLowerCase()) as ArticleType) || ArticleType.TSHIRTS,
            gender: row['Gender*'] || row['Gender'] || 'Unisex',
          };
        }).filter(r => r.tp > 0);

        setPendingRows(rows);
        setShowGoalModal(true);
      } catch (err) {
        console.error(err);
        setUploadStatus('error');
        setIsProcessing(false);
      } finally {
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsBinaryString(file);
  };

  const finalizeUpload = () => {
    setMarketplaceData(prev => ({ ...prev, [marketplace]: pendingRows }));
    setCurrentPage(1);
    setUploadStatus('success');
    setShowGoalModal(false);
    setPendingRows([]);
    setIsProcessing(false);
    setTimeout(() => setUploadStatus('idle'), 3000);
  };

  const exportBulkReport = async () => {
    const XLSX = await import('xlsx');
    
    const dataToExport = bulkResults.map(item => {
      if (marketplace === Marketplace.AJIO) {
        const profitMarginAmt = (item.baseTp * buffers.profitMarginPercent / 100);
        const totalTpCost = item.baseTp + profitMarginAmt;
        const adsAmt = (totalTpCost * buffers.adsPercent / 100);
        const dealDiscountAmt = (totalTpCost * buffers.dealDiscountPercent / 100);
        const reviewAmt = (totalTpCost * buffers.reviewPercent / 100);
        const netProfit = item.totalActualSettlement - item.baseTp;

        return {
          'AJIO SKU*': item['AJIO SKU*'] || item.styleId || 'N/A',
          'ARTICLE CODE*': item['ARTICLE CODE*'] || item.articleCode || 'N/A',
          'ASIN*': item['ASIN*'] || item.asin || 'N/A',
          'AMAZON SKU*': item['AMAZON SKU*'] || item.amazonSku || 'N/A',
          'TP COST*': Number(item.baseTp.toFixed(2)),
          'PROFIT MARGIN %': Number(buffers.profitMarginPercent.toFixed(2)),
          'COMPANY PROFIT MARGIN': Number(profitMarginAmt.toFixed(2)),
          'Total TP Cost': Number(totalTpCost.toFixed(2)),
          'ADS %': Number(buffers.adsPercent.toFixed(2)),
          'ADS': Number(adsAmt.toFixed(2)),
          'DEAL DISCOUNT %': Number(buffers.dealDiscountPercent.toFixed(2)),
          'DEAL DISCOUNT': Number(dealDiscountAmt.toFixed(2)),
          'REVIEW %': Number(buffers.reviewPercent.toFixed(2)),
          'REVIEW': Number(reviewAmt.toFixed(2)),
          'RETURN %': Number(buffers.returnPercent.toFixed(2)),
          'FINAL TP COST': Number(item.targetSettlement.toFixed(2)),
          'MRP': Number(item.mrp.toFixed(2)),
          'SALE DISCOUNT AMT': Number(item.saleDiscountAmt.toFixed(2)),
          'ASP (GROSS)': Number(item.aspGross.toFixed(2)),
          'GST%': Number(item.gstOnAspPercent.toFixed(2)),
          'GST': Number(item.gstOnAspAmt.toFixed(2)),
          'NET SALE': Number(item.netSalesValue.toFixed(2)),
          'AJIO MARGIN 34%': Number(item.commissionRate.toFixed(2)),
          'PURCHASE': Number(item.purchasePrice.toFixed(2)),
          'GST%2': Number(item.gstOnPurchasePercent.toFixed(2)),
          'GST2': Number(item.gstOnPurchaseAmt.toFixed(2)),
          'BANK SETTLEMENT': Number(item.totalActualSettlement.toFixed(2)),
          'NET PROFIT': Number(netProfit.toFixed(2))
        };
      } else {
        const profit = item.totalActualSettlement - item.baseTp;
        const result: any = {};
        
        // Add original row data first
        originalHeaders.forEach(key => {
          const val = item[key];
          result[key] = typeof val === 'number' ? Number(val.toFixed(2)) : val;
        });

        // Add calculated columns for Myntra
        result['AISP'] = Number(item.aisp.toFixed(2));
        result['Comm %'] = item.commissionRate + '%';
        result['Logistics Fee'] = Number(item.logisticsFee.toFixed(2));
        result['Settlement'] = Number(item.totalActualSettlement.toFixed(2));
        result['Profit'] = Number(profit.toFixed(2));
        
        return result;
      }
    });

    const ws = XLSX.utils.json_to_sheet(dataToExport);

    // Autofit columns
    if (dataToExport.length > 0) {
      const colWidths = Object.keys(dataToExport[0]).map(key => {
        let maxLen = key.length;
        dataToExport.forEach(row => {
          const val = row[key];
          const len = val ? String(val).length : 0;
          if (len > maxLen) maxLen = len;
        });
        return { wch: maxLen + 5 }; // Add some padding
      });
      ws['!cols'] = colWidths;
    }

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    XLSX.writeFile(wb, `${marketplace}_Bulk_Report.xlsx`);
  };

  const bulkResults = useMemo(() => {
    const activeData = (marketplaceData[marketplace] || []) as any[];
    
    return activeData.map(row => {
      const totalCost = row.tp * (1 + buffers.profitMarginPercent / 100);
      const otherBuffersSum = buffers.adsPercent + buffers.dealDiscountPercent + buffers.reviewPercent + buffers.returnPercent;
      const target = Math.round((totalCost * (1 + otherBuffersSum / 100) + Number.EPSILON) * 100) / 100;
      
      let breakdown: any;
      if (marketplace === Marketplace.AJIO) {
        breakdown = calculateAjioBreakdown(target, ajioMargin, ajioTradeDiscount);
      } else {
        const spec = ARTICLE_SPECIFICATIONS[row.articleType];
        const level = spec?.defaultLevel || Level.LEVEL_2;
        const aisp = findAISPForTarget(target, level, row.articleType, isReverse, reverseRegion, reverseMode, reversePercent, marketplace, row.brand, ajioMargin, ajioTradeDiscount, manualRateCard!);
        breakdown = calculateBreakdown(aisp, level, row.articleType, isReverse, reverseRegion, reverseMode, reversePercent, marketplace, row.brand, ajioMargin, ajioTradeDiscount, manualRateCard!);
      }
      return { ...breakdown, baseTp: row.tp, targetSettlement: target, ...row };
    });
  }, [marketplaceData, marketplace, buffers, ajioMargin, ajioTradeDiscount, isReverse, reverseRegion, reverseMode, reversePercent, manualRateCard]);

  const paginatedResults = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return bulkResults.slice(start, start + itemsPerPage);
  }, [bulkResults, currentPage]);

  const totalPages = Math.ceil(bulkResults.length / itemsPerPage);

  const originalHeaders = useMemo(() => {
    const data = marketplaceData[marketplace] || [];
    if (data.length === 0) return [];
    // Filter out our internal normalized keys to get only original Excel headers
    const internalKeys = ['tp', 'brand', 'articleCode', 'asin', 'amazonSku', 'myntraSku', 'skuId', 'styleId', 'articleType', 'gender', 'targetSettlement', 'totalActualSettlement', 'commission', 'commissionRate', 'mrp', 'tradeDiscountPercent', 'aspGross', 'gstOnAspAmt', 'netSalesValue', 'purchasePrice', 'gstOnPurchaseAmt', 'aisp', 'logisticsFee', 'customerPrice', 'fixedFee', 'level', 'reverseLogisticsFee', 'tcs', 'tds', 'baseTp', 'markupAmount', 'saleDiscountAmt', 'gstOnAspPercent', 'gstOnPurchasePercent'];
    return Object.keys(data[0]).filter(key => !internalKeys.includes(key));
  }, [marketplaceData, marketplace]);

  return (
    <div className="bg-white p-5 rounded-2xl border border-forest-accent shadow-lg ring-1 ring-inset ring-white/60 space-y-4 dark:bg-forest-pine/40 dark:border-forest-leaf/30 relative overflow-hidden group">
      {/* Goal Modal */}
      {showGoalModal && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-forest-pine/60 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl border border-forest-accent overflow-hidden dark:bg-forest-pine dark:border-forest-leaf/30 animate-in zoom-in-95 duration-300">
            <div className="p-8 border-b border-forest-accent/30 dark:border-forest-leaf/20 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-black text-forest-pine uppercase tracking-tighter dark:text-forest-mint">Set Calculation Goals</h3>
                <p className="text-[10px] font-bold text-forest-leaf/60 uppercase tracking-widest mt-1">Configure buffers for {pendingRows.length} SKUs</p>
              </div>
              <button 
                onClick={() => {
                  setShowGoalModal(false);
                  setIsProcessing(false);
                  setPendingRows([]);
                }}
                className="p-2 hover:bg-rose-50 rounded-full text-rose-500 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"/></svg>
              </button>
            </div>

            <div className="p-8 grid grid-cols-2 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-forest-leaf uppercase tracking-widest block">Margin %</label>
                <div className="relative group">
                  <input 
                    type="number" 
                    value={buffers.profitMarginPercent}
                    onChange={(e) => updateBuffer('profitMarginPercent', Number(e.target.value))}
                    className="w-full px-4 py-3 bg-forest-mint/30 border border-forest-accent rounded-2xl font-black text-lg text-forest-pine outline-none focus:border-forest-leaf transition-all shadow-inner dark:bg-forest-pine/60 dark:text-forest-mint"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-forest-leaf/30 font-black">%</span>
                  <div className="absolute -bottom-4 right-2 pointer-events-none opacity-40">
                    <span className="text-forest-leaf font-black text-[9px] italic">₹{(300 * buffers.profitMarginPercent / 100).toFixed(0)}</span>
                  </div>
                </div>
              </div>

              {Object.entries(buffers).filter(([key]) => key !== 'profitMarginPercent').map(([key, value]) => {
                const totalCost = 300 * (1 + buffers.profitMarginPercent / 100);
                return (
                  <div key={key} className="space-y-2">
                    <label className="text-[9px] font-black text-forest-leaf uppercase tracking-widest block">{key.replace('Percent','').toUpperCase()}</label>
                    <div className="relative group">
                      <input 
                        type="number" 
                        value={value}
                        onChange={(e) => updateBuffer(key as keyof BusinessBuffers, Number(e.target.value))}
                        className="w-full px-4 py-3 bg-forest-mint/30 border border-forest-accent rounded-2xl font-black text-lg text-forest-pine outline-none focus:border-forest-leaf transition-all shadow-inner dark:bg-forest-pine/60 dark:text-forest-mint"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-forest-leaf/30 font-black">%</span>
                      <div className="absolute -bottom-4 right-2 pointer-events-none opacity-40">
                        <span className="text-forest-leaf font-black text-[9px] italic">₹{(totalCost * (value as number) / 100).toFixed(0)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Sample Calculation Preview */}
            <div className="px-8 pb-8">
              <div className="bg-forest-pine/5 rounded-3xl p-6 border border-forest-accent/30 dark:bg-forest-leaf/5">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-black text-forest-pine/40 uppercase tracking-widest">Sample Goal Preview (TP: ₹300)</span>
                  <div className="h-px flex-grow mx-4 bg-forest-accent/30"></div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-forest-leaf uppercase">Total Cost</span>
                    <span className="text-xl font-black text-forest-pine dark:text-forest-mint">₹{(300 * (1 + buffers.profitMarginPercent / 100)).toFixed(0)}</span>
                  </div>
                  <div className="text-2xl font-black text-forest-accent/40">→</div>
                  <div className="flex flex-col items-end">
                    <span className="text-[8px] font-black text-orange-600 uppercase">Target Goal</span>
                    <span className="text-2xl font-black text-orange-600">
                      ₹{(
                        (300 * (1 + buffers.profitMarginPercent / 100)) * 
                        (1 + (buffers.adsPercent + buffers.dealDiscountPercent + buffers.reviewPercent + buffers.returnPercent) / 100)
                      ).toFixed(0)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 bg-forest-mint/20 flex gap-4 dark:bg-forest-leaf/5">
              <button 
                onClick={finalizeUpload}
                className="flex-grow py-4 bg-forest-pine text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:bg-forest-leaf transition-all active:scale-[0.98] dark:bg-forest-leaf"
              >
                Calculate & Process
              </button>
              <button 
                onClick={finalizeUpload}
                className="px-8 py-4 border-2 border-forest-accent rounded-2xl font-black text-xs uppercase tracking-[0.2em] text-forest-pine hover:bg-white transition-all dark:text-forest-mint dark:border-forest-leaf/40"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="relative z-10 flex items-center justify-between border-b border-forest-accent/50 pb-3 dark:border-forest-leaf/20">
        <div className="flex items-center gap-3">
          <h2 className="text-[9px] font-black text-forest-pine uppercase tracking-widest dark:text-forest-mint">Configuration</h2>
          <button 
            onClick={onClear}
            className="px-2 py-0.5 bg-rose-500/10 text-rose-500 text-[7px] font-black uppercase rounded border border-rose-500/20 hover:bg-rose-500 hover:text-white transition-all"
          >
            Clear Form
          </button>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileUpload} 
              className="hidden" 
              accept=".xlsx, .xls, .csv" 
            />
            <div className="flex items-center gap-2">
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isProcessing}
                className={`flex items-center gap-2 px-3 py-1.5 bg-forest-pine text-white text-[9px] font-black uppercase rounded-xl shadow-lg hover:bg-forest-leaf transition-all active:scale-95 dark:bg-forest-leaf ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isProcessing ? (
                  <svg className="w-3 h-3 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/></svg>
                ) : (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"/></svg>
                )}
                {isProcessing ? 'Processing...' : 'Bulk Upload'}
              </button>
              
              {uploadStatus === 'success' && (
                <span className="flex items-center gap-1 text-[8px] font-black text-forest-leaf uppercase animate-in fade-in zoom-in duration-300">
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7"/></svg>
                  Done
                </span>
              )}
            </div>

            <button 
              onClick={downloadTemplate}
              className="px-3 py-1.5 border border-forest-accent rounded-xl text-[9px] font-black text-forest-pine uppercase tracking-widest hover:bg-forest-mint transition-all dark:text-forest-mint dark:border-forest-leaf/40"
            >
              Template
            </button>
          </div>
          {marketplace === Marketplace.AJIO && (
            <div className="flex items-center gap-2 mr-2 bg-forest-accent/10 px-2 py-1 rounded-xl border border-forest-accent/20">
              <div className="flex items-center gap-2">
                <div className="flex flex-col items-end">
                  <label className="text-[7px] font-black text-forest-leaf uppercase tracking-tighter">Trade %</label>
                  <input
                    type="number"
                    value={ajioTradeDiscount}
                    disabled={isLocked}
                    onChange={(e) => setAjioTradeDiscount(Number(e.target.value))}
                    className={`w-10 px-1 py-0.5 bg-white border border-forest-accent rounded font-black text-[10px] text-forest-pine outline-none focus:border-forest-leaf text-right shadow-sm transition-all ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                </div>
                <div className="flex flex-col items-end">
                  <label className="text-[7px] font-black text-forest-leaf uppercase tracking-tighter">Ajio Margin %</label>
                  <input
                    type="number"
                    value={ajioMargin}
                    disabled={isLocked}
                    onChange={(e) => setAjioMargin(Number(e.target.value))}
                    className={`w-10 px-1 py-0.5 bg-white border border-forest-accent rounded font-black text-[10px] text-forest-pine outline-none focus:border-forest-leaf text-right shadow-sm transition-all ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}`}
                  />
                </div>
              </div>
              <button 
                onClick={() => setIsLocked(!isLocked)}
                className={`p-1 rounded-lg transition-all ${isLocked ? 'bg-forest-pine/10 text-forest-pine/60 hover:text-forest-pine' : 'bg-forest-leaf text-white shadow-lg'}`}
              >
                {isLocked ? (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                ) : (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" /></svg>
                )}
              </button>
            </div>
          )}
          <div className="flex bg-forest-accent/30 p-0.5 rounded-lg shadow-inner dark:bg-forest-leaf/20">
            {[Marketplace.MYNTRA, Marketplace.AJIO].map(m => (
              <button 
                key={m}
                onClick={() => setMarketplace(m)}
                className={`px-3 py-1 text-[8px] font-black uppercase rounded transition-all ${marketplace === m ? 'bg-forest-pine text-white shadow-sm dark:bg-forest-leaf' : 'text-forest-pine/40 hover:text-forest-pine dark:text-forest-sage/60'}`}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      {manualRateCardActive && marketplace === Marketplace.MYNTRA && (
        <div className="relative z-10 px-2 py-1 bg-amber-50 border border-amber-200 rounded flex items-center gap-1.5 dark:bg-amber-900/20 dark:border-amber-800/40">
          <span className="w-1 h-1 bg-amber-500 rounded-full animate-pulse"></span>
          <span className="text-[7px] font-black text-amber-700 uppercase dark:text-amber-400">Manual Card Active</span>
        </div>
      )}

      <div className="relative z-10 flex items-end gap-2 overflow-x-auto pb-4 no-scrollbar">
        {marketplace === Marketplace.MYNTRA && (
          <div className="space-y-1 min-w-[120px]">
            <label className="text-[7px] font-black text-forest-leaf uppercase block dark:text-forest-sage">Partner Brand</label>
            <div className="relative">
              <select 
                value={brand}
                onChange={(e) => setBrand(e.target.value as Brand)}
                className="w-full pl-2 pr-6 py-1 bg-white border border-forest-accent rounded-lg font-bold text-[10px] text-gray-900 outline-none focus:border-forest-leaf appearance-none cursor-pointer dark:bg-white dark:border-forest-leaf/40 shadow-sm"
              >
                {Object.values(Brand).map(b => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-forest-leaf opacity-40">
                <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>
        )}

        {marketplace === Marketplace.MYNTRA && (
          <div className="space-y-1 min-w-[140px]">
            <label className="text-[7px] font-black text-forest-leaf uppercase block dark:text-forest-sage">Article Type</label>
            <div className="relative">
              <select 
                value={articleType}
                onChange={handleArticleChange}
                className="w-full pl-2 pr-6 py-1 bg-white border border-forest-accent rounded-lg font-bold text-[10px] text-gray-900 outline-none focus:border-forest-leaf appearance-none cursor-pointer dark:bg-white dark:border-forest-leaf/40 shadow-sm"
              >
                {Object.values(ArticleType).map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-forest-leaf opacity-40">
                <svg className="w-2 h-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M19 9l-7 7-7-7" /></svg>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-[8px] font-black text-forest-leaf uppercase tracking-widest block dark:text-forest-sage">TP Cost</label>
          <div className="relative group/input w-[100px]">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-forest-pine font-black text-xs opacity-20 dark:text-forest-mint">₹</span>
            <input
              type="number"
              value={tpPrice || ''}
              onChange={(e) => setTpPrice(Number(e.target.value))}
              className="w-full pl-5 pr-2 py-1 bg-white border border-forest-accent rounded-xl font-black text-sm text-forest-pine outline-none focus:border-forest-leaf transition-all shadow-inner dark:bg-forest-pine/60 dark:border-forest-leaf/40 dark:text-forest-mint"
              placeholder="0.00"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[8px] font-black text-forest-leaf uppercase tracking-widest block dark:text-forest-sage">Margin %</label>
          <div className="relative group/input w-[100px]">
            <input
              type="number"
              value={buffers.profitMarginPercent}
              onChange={(e) => updateBuffer('profitMarginPercent', Number(e.target.value))}
              className="w-full px-2 py-1 bg-white border border-forest-accent rounded-xl font-black text-sm text-forest-pine outline-none focus:border-forest-leaf transition-all shadow-inner dark:bg-forest-pine/60 dark:border-forest-leaf/40 dark:text-forest-mint"
              placeholder="0"
            />
            <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
              <span className="text-forest-leaf font-black text-[10px] italic">₹{((tpPrice * buffers.profitMarginPercent) / 100).toFixed(0)}</span>
            </div>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[8px] font-black text-forest-leaf uppercase tracking-widest block dark:text-forest-sage">Total Cost</label>
          <div className="relative group/input w-[100px]">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-forest-pine font-black text-xs opacity-20 dark:text-forest-mint">₹</span>
            <input
              type="number"
              value={(tpPrice + (tpPrice * buffers.profitMarginPercent / 100)).toFixed(0)}
              onChange={(e) => {
                const newTotal = Number(e.target.value);
                if (tpPrice > 0) {
                  const newMargin = ((newTotal / tpPrice) - 1) * 100;
                  updateBuffer('profitMarginPercent', parseFloat(newMargin.toFixed(2)));
                }
              }}
              className="w-full pl-5 pr-2 py-1 bg-forest-accent/10 border border-forest-accent rounded-xl font-black text-sm text-forest-pine outline-none focus:border-forest-leaf transition-all shadow-inner dark:bg-forest-pine/60 dark:border-forest-leaf/40 dark:text-forest-mint"
            />
          </div>
        </div>

        {Object.keys(buffers).filter(key => key !== 'profitMarginPercent').map((key) => {
          const totalCost = tpPrice + (tpPrice * buffers.profitMarginPercent / 100);
          return (
            <div key={key} className="space-y-1">
              <label className="text-[8px] font-black text-forest-leaf uppercase tracking-widest block dark:text-forest-sage">{key.replace('Percent','').replace('Margin',' MARGIN')}</label>
              <div className="relative group/input w-[90px]">
                <input 
                  type="number" 
                  value={(buffers as any)[key]} 
                  onChange={(e) => updateBuffer(key as keyof BusinessBuffers, Number(e.target.value))} 
                  className="w-full px-2 py-1 bg-white border border-forest-accent rounded-xl font-black text-sm text-forest-pine outline-none focus:border-forest-leaf transition-all shadow-inner dark:bg-forest-pine/60 dark:border-forest-leaf/40 dark:text-forest-mint" 
                />
                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-40">
                  <span className="text-forest-leaf font-black text-[9px] italic">₹{((totalCost * (buffers as any)[key]) / 100).toFixed(0)}</span>
                </div>
              </div>
            </div>
          );
        })}

        <div className="space-y-1">
          <label className="text-[8px] font-black text-orange-600 uppercase tracking-widest block dark:text-orange-400">Goal</label>
          <div className="relative group/input w-[110px]">
            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-orange-600 font-black text-xs opacity-40">₹</span>
            <input
              type="number"
              value={targetSettlement}
              onChange={(e) => setTargetSettlement(Number(e.target.value))}
              className="w-full pl-5 pr-2 py-1 bg-orange-50 border border-orange-200 rounded-xl font-black text-sm text-orange-900 outline-none focus:border-orange-500 transition-all shadow-md dark:bg-orange-900/20 dark:border-orange-800/40 dark:text-orange-100"
              placeholder="0.00"
            />
          </div>
        </div>

        {/* AJIO Results Section */}
        {showResultsRow && marketplace === Marketplace.AJIO && (
          <div className="flex items-end gap-2 pl-3 border-l-2 border-forest-accent/30 ml-1">
            <div className="space-y-1">
              <label className="text-[7px] font-black text-forest-leaf/50 uppercase block">MRP</label>
              <div className="px-2 py-1 bg-forest-accent/10 rounded-lg font-black text-xs text-forest-pine dark:text-forest-mint min-w-[70px]">
                ₹{ajioResult.mrp?.toFixed(0)}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[7px] font-black text-forest-leaf/50 uppercase block">Trade %</label>
              <div className="px-2 py-1 bg-forest-accent/5 rounded-lg font-black text-xs text-forest-pine/60 dark:text-forest-sage/60 min-w-[50px]">
                {ajioResult.tradeDiscountPercent}%
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[7px] font-black text-forest-leaf/50 uppercase block">ASP Gross</label>
              <div className="px-2 py-1 bg-forest-accent/10 rounded-lg font-black text-xs text-forest-pine dark:text-forest-mint min-w-[70px]">
                ₹{ajioResult.aspGross?.toFixed(0)}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[7px] font-black text-forest-leaf/50 uppercase block">GST ASP</label>
              <div className="px-2 py-1 bg-rose-50 rounded-lg font-black text-xs text-rose-600 min-w-[60px]">
                -₹{ajioResult.gstOnAspAmt?.toFixed(0)}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[7px] font-black text-forest-leaf/50 uppercase block">Net Sales</label>
              <div className="px-2 py-1 bg-forest-accent/10 rounded-lg font-black text-xs text-forest-pine dark:text-forest-mint min-w-[70px]">
                ₹{ajioResult.netSalesValue?.toFixed(0)}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[7px] font-black text-forest-leaf/50 uppercase block">Margin %</label>
              <div className="px-2 py-1 bg-forest-accent/5 rounded-lg font-black text-xs text-forest-pine/60 dark:text-forest-sage/60 min-w-[50px]">
                {ajioResult.commissionRate}%
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[7px] font-black text-forest-leaf/50 uppercase block">Purchase</label>
              <div className="px-2 py-1 bg-forest-accent/10 rounded-lg font-black text-xs text-forest-pine dark:text-forest-mint min-w-[70px]">
                ₹{ajioResult.purchasePrice?.toFixed(0)}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[7px] font-black text-forest-leaf/50 uppercase block">GST Pur</label>
              <div className="px-2 py-1 bg-rose-50 rounded-lg font-black text-xs text-rose-600 min-w-[60px]">
                -₹{ajioResult.gstOnPurchaseAmt?.toFixed(0)}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[7px] font-black text-forest-leaf/50 uppercase block">Settlement</label>
              <div className="px-2 py-1 bg-forest-leaf/10 rounded-lg font-black text-xs text-forest-leaf min-w-[70px]">
                ₹{ajioResult.totalActualSettlement?.toFixed(0)}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[7px] font-black text-forest-leaf/50 uppercase block">Profit</label>
              <div className={`px-2 py-1 rounded-lg font-black text-xs min-w-[70px] ${(ajioResult.totalActualSettlement - tpPrice) >= 0 ? 'bg-forest-leaf/10 text-forest-leaf' : 'bg-rose-50 text-rose-600'}`}>
                ₹{(ajioResult.totalActualSettlement - tpPrice).toFixed(0)}
              </div>
            </div>
          </div>
        )}

        {/* MYNTRA Results Section */}
        {showResultsRow && marketplace === Marketplace.MYNTRA && myntraResult && (
          <div className="flex items-end gap-2 pl-3 border-l-2 border-forest-accent/30 ml-1">
            <div className="space-y-1">
              <label className="text-[7px] font-black text-forest-leaf/50 uppercase block">AISP</label>
              <div className="px-2 py-1 bg-forest-accent/10 rounded-lg font-black text-xs text-forest-pine dark:text-forest-mint min-w-[70px]">
                ₹{myntraResult.aisp?.toFixed(0)}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[7px] font-black text-forest-leaf/50 uppercase block">Comm</label>
              <div className="px-2 py-1 bg-rose-50 rounded-lg font-black text-xs text-rose-600 min-w-[60px]">
                -₹{myntraResult.commission?.toFixed(0)}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[7px] font-black text-forest-leaf/50 uppercase block">Fees</label>
              <div className="px-2 py-1 bg-rose-50 rounded-lg font-black text-xs text-rose-600 min-w-[60px]">
                -₹{((myntraResult.fixedFee || 0) * (1 + 0.18) + (myntraResult.logisticsFee || 0) + (myntraResult.reverseLogisticsFee || 0) * (1 + 0.18)).toFixed(0)}
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[7px] font-black text-forest-leaf/50 uppercase block">Profit</label>
              <div className={`px-2 py-1 rounded-lg font-black text-xs min-w-[70px] ${(myntraResult.totalActualSettlement - tpPrice) >= 0 ? 'bg-forest-leaf/10 text-forest-leaf' : 'bg-rose-50 text-rose-600'}`}>
                ₹{(myntraResult.totalActualSettlement - tpPrice).toFixed(0)}
              </div>
            </div>
          </div>
        )}
      </div>

      {bulkResults.length > 0 && (
        <div className="relative z-10 mt-6 pt-6 border-t border-forest-accent/30">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <h4 className="text-[10px] font-black text-forest-pine uppercase tracking-widest dark:text-forest-mint">Bulk Results ({bulkResults.length})</h4>
              <button 
                onClick={exportBulkReport}
                className="px-3 py-1 bg-forest-leaf text-white text-[8px] font-black uppercase rounded-lg shadow hover:bg-forest-pine transition-all"
              >
                Download Report
              </button>
            </div>
          </div>
          
          <div className="overflow-x-auto rounded-2xl border border-forest-accent/30">
            <table className="w-full text-left border-collapse min-w-[2500px]">
              <thead className="bg-forest-mint/50 dark:bg-forest-pine/20">
                <tr>
                  {originalHeaders.map(header => (
                    <th key={header} className="px-4 py-2 text-[8px] font-black text-forest-leaf uppercase tracking-widest border-r border-forest-accent/20 sticky left-0 bg-forest-mint/50 z-20">{header}</th>
                  ))}
                  {marketplace === Marketplace.AJIO ? (
                    <>
                      <th className="px-4 py-2 text-[8px] font-black text-forest-leaf uppercase tracking-widest border-r border-forest-accent/20">TP COST</th>
                      <th className="px-4 py-2 text-[8px] font-black text-forest-leaf uppercase tracking-widest border-r border-forest-accent/20">MARGIN %</th>
                      <th className="px-4 py-2 text-[8px] font-black text-forest-leaf uppercase tracking-widest border-r border-forest-accent/20">CO. MARGIN</th>
                      <th className="px-4 py-2 text-[8px] font-black text-forest-leaf uppercase tracking-widest border-r border-forest-accent/20">TOTAL TP</th>
                      <th className="px-4 py-2 text-[8px] font-black text-forest-leaf uppercase tracking-widest border-r border-forest-accent/20">ADS %</th>
                      <th className="px-4 py-2 text-[8px] font-black text-forest-leaf uppercase tracking-widest border-r border-forest-accent/20">ADS AMT</th>
                      <th className="px-4 py-2 text-[8px] font-black text-forest-leaf uppercase tracking-widest border-r border-forest-accent/20">DEAL %</th>
                      <th className="px-4 py-2 text-[8px] font-black text-forest-leaf uppercase tracking-widest border-r border-forest-accent/20">DEAL AMT</th>
                      <th className="px-4 py-2 text-[8px] font-black text-forest-leaf uppercase tracking-widest border-r border-forest-accent/20">REVIEW %</th>
                      <th className="px-4 py-2 text-[8px] font-black text-forest-leaf uppercase tracking-widest border-r border-forest-accent/20">REVIEW AMT</th>
                      <th className="px-4 py-2 text-[8px] font-black text-forest-leaf uppercase tracking-widest border-r border-forest-accent/20">RETURN %</th>
                      <th className="px-4 py-2 text-[8px] font-black text-forest-leaf uppercase tracking-widest border-r border-forest-accent/20">FINAL TP</th>
                      <th className="px-4 py-2 text-[8px] font-black text-forest-leaf uppercase tracking-widest border-r border-forest-accent/20">MRP</th>
                      <th className="px-4 py-2 text-[8px] font-black text-forest-leaf uppercase tracking-widest border-r border-forest-accent/20">SALE DISC</th>
                      <th className="px-4 py-2 text-[8px] font-black text-forest-leaf uppercase tracking-widest border-r border-forest-accent/20">ASP GROSS</th>
                      <th className="px-4 py-2 text-[8px] font-black text-forest-leaf uppercase tracking-widest border-r border-forest-accent/20">GST %</th>
                      <th className="px-4 py-2 text-[8px] font-black text-forest-leaf uppercase tracking-widest border-r border-forest-accent/20">GST AMT</th>
                      <th className="px-4 py-2 text-[8px] font-black text-forest-leaf uppercase tracking-widest border-r border-forest-accent/20">NET SALE</th>
                      <th className="px-4 py-2 text-[8px] font-black text-forest-leaf uppercase tracking-widest border-r border-forest-accent/20">AJIO MARGIN</th>
                      <th className="px-4 py-2 text-[8px] font-black text-forest-leaf uppercase tracking-widest border-r border-forest-accent/20">PURCHASE</th>
                      <th className="px-4 py-2 text-[8px] font-black text-forest-leaf uppercase tracking-widest border-r border-forest-accent/20">GST%2</th>
                      <th className="px-4 py-2 text-[8px] font-black text-forest-leaf uppercase tracking-widest border-r border-forest-accent/20">GST2</th>
                      <th className="px-4 py-2 text-[8px] font-black text-forest-leaf uppercase tracking-widest border-r border-forest-accent/20">SETTLEMENT</th>
                      <th className="px-4 py-2 text-[8px] font-black text-forest-leaf uppercase tracking-widest">NET PROFIT</th>
                    </>
                  ) : (
                    <>
                      <th className="px-4 py-2 text-[8px] font-black text-forest-leaf uppercase tracking-widest border-r border-forest-accent/20">AISP</th>
                      <th className="px-4 py-2 text-[8px] font-black text-forest-leaf uppercase tracking-widest border-r border-forest-accent/20">Comm %</th>
                      <th className="px-4 py-2 text-[8px] font-black text-forest-leaf uppercase tracking-widest border-r border-forest-accent/20">Logistics</th>
                      <th className="px-4 py-2 text-[8px] font-black text-forest-leaf uppercase tracking-widest border-r border-forest-accent/20">Settlement</th>
                      <th className="px-4 py-2 text-[8px] font-black text-forest-leaf uppercase tracking-widest">Profit</th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-forest-accent/10">
                {paginatedResults.map((row, idx) => {
                  const profit = row.totalActualSettlement - row.baseTp;
                  
                  // AJIO specific calculations for table
                  const profitMarginAmt = (row.baseTp * buffers.profitMarginPercent / 100);
                  const totalTpCost = row.baseTp + profitMarginAmt;
                  const adsAmt = (totalTpCost * buffers.adsPercent / 100);
                  const dealDiscountAmt = (totalTpCost * buffers.dealDiscountPercent / 100);
                  const reviewAmt = (totalTpCost * buffers.reviewPercent / 100);

                  return (
                    <tr key={idx} className="hover:bg-forest-mint/30 dark:hover:bg-forest-pine/10">
                      {originalHeaders.map(header => (
                        <td key={header} className="px-4 py-2 text-[10px] font-bold text-forest-pine dark:text-forest-mint border-r border-forest-accent/10 sticky left-0 bg-white z-10">{row[header]}</td>
                      ))}
                      {marketplace === Marketplace.AJIO ? (
                        <>
                          <td className="px-4 py-2 text-[10px] font-bold text-forest-pine/60 border-r border-forest-accent/10">₹{row.baseTp.toFixed(2)}</td>
                          <td className="px-4 py-2 text-[10px] font-bold text-forest-pine/60 border-r border-forest-accent/10">{buffers.profitMarginPercent}%</td>
                          <td className="px-4 py-2 text-[10px] font-bold text-forest-pine/60 border-r border-forest-accent/10">₹{profitMarginAmt.toFixed(2)}</td>
                          <td className="px-4 py-2 text-[10px] font-bold text-forest-pine/60 border-r border-forest-accent/10">₹{totalTpCost.toFixed(2)}</td>
                          <td className="px-4 py-2 text-[10px] font-bold text-forest-pine/60 border-r border-forest-accent/10">{buffers.adsPercent}%</td>
                          <td className="px-4 py-2 text-[10px] font-bold text-forest-pine/60 border-r border-forest-accent/10">₹{adsAmt.toFixed(2)}</td>
                          <td className="px-4 py-2 text-[10px] font-bold text-forest-pine/60 border-r border-forest-accent/10">{buffers.dealDiscountPercent}%</td>
                          <td className="px-4 py-2 text-[10px] font-bold text-forest-pine/60 border-r border-forest-accent/10">₹{dealDiscountAmt.toFixed(2)}</td>
                          <td className="px-4 py-2 text-[10px] font-bold text-forest-pine/60 border-r border-forest-accent/10">{buffers.reviewPercent}%</td>
                          <td className="px-4 py-2 text-[10px] font-bold text-forest-pine/60 border-r border-forest-accent/10">₹{reviewAmt.toFixed(2)}</td>
                          <td className="px-4 py-2 text-[10px] font-bold text-forest-pine/60 border-r border-forest-accent/10">{buffers.returnPercent}%</td>
                          <td className="px-4 py-2 text-[10px] font-bold text-forest-pine/60 border-r border-forest-accent/10">₹{row.targetSettlement.toFixed(2)}</td>
                          <td className="px-4 py-2 text-[10px] font-bold text-forest-pine/60 border-r border-forest-accent/10">₹{row.mrp?.toFixed(2)}</td>
                          <td className="px-4 py-2 text-[10px] font-bold text-forest-pine/60 border-r border-forest-accent/10">₹{row.saleDiscountAmt?.toFixed(2)}</td>
                          <td className="px-4 py-2 text-[10px] font-bold text-forest-pine/60 border-r border-forest-accent/10">₹{row.aspGross?.toFixed(2)}</td>
                          <td className="px-4 py-2 text-[10px] font-bold text-forest-pine/60 border-r border-forest-accent/10">{row.gstOnAspPercent}%</td>
                          <td className="px-4 py-2 text-[10px] font-bold text-forest-pine/60 border-r border-forest-accent/10">₹{row.gstOnAspAmt?.toFixed(2)}</td>
                          <td className="px-4 py-2 text-[10px] font-bold text-forest-pine/60 border-r border-forest-accent/10">₹{row.netSalesValue?.toFixed(2)}</td>
                          <td className="px-4 py-2 text-[10px] font-bold text-forest-pine/60 border-r border-forest-accent/10">{row.commissionRate}%</td>
                          <td className="px-4 py-2 text-[10px] font-bold text-forest-pine/60 border-r border-forest-accent/10">₹{row.purchasePrice?.toFixed(2)}</td>
                          <td className="px-4 py-2 text-[10px] font-bold text-forest-pine/60 border-r border-forest-accent/10">{row.gstOnPurchasePercent}%</td>
                          <td className="px-4 py-2 text-[10px] font-bold text-forest-pine/60 border-r border-forest-accent/10">₹{row.gstOnPurchaseAmt?.toFixed(2)}</td>
                          <td className="px-4 py-2 text-[10px] font-black text-forest-leaf border-r border-forest-accent/10">₹{row.totalActualSettlement.toFixed(2)}</td>
                          <td className={`px-4 py-2 text-[10px] font-black ${profit >= 0 ? 'text-forest-leaf' : 'text-rose-600'}`}>₹{profit.toFixed(2)}</td>
                        </>
                      ) : (
                        <>
                          <td className="px-4 py-2 text-[10px] font-bold text-forest-pine/60 border-r border-forest-accent/10">₹{row.aisp?.toFixed(2)}</td>
                          <td className="px-4 py-2 text-[10px] font-bold text-forest-pine/60 border-r border-forest-accent/10">{row.commissionRate}%</td>
                          <td className="px-4 py-2 text-[10px] font-bold text-forest-pine/60 border-r border-forest-accent/10">₹{row.logisticsFee?.toFixed(2)}</td>
                          <td className="px-4 py-2 text-[10px] font-black text-forest-leaf border-r border-forest-accent/10">₹{row.totalActualSettlement.toFixed(2)}</td>
                          <td className={`px-4 py-2 text-[10px] font-black ${profit >= 0 ? 'text-forest-leaf' : 'text-rose-600'}`}>₹{profit.toFixed(2)}</td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between mt-4 bg-forest-accent/5 p-3 rounded-xl border border-forest-accent/20">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-[8px] font-black text-forest-leaf uppercase tracking-widest">Rows per page:</label>
                <select 
                  value={itemsPerPage}
                  onChange={(e) => {
                    setItemsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-white border border-forest-accent rounded px-2 py-1 text-[10px] font-black text-forest-pine outline-none focus:border-forest-leaf dark:bg-forest-pine/40 dark:text-forest-mint"
                >
                  {[100, 200, 500, 1000].map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>
              <span className="text-[8px] font-black text-forest-pine/40 uppercase tracking-widest">
                Showing {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, bulkResults.length)} of {bulkResults.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button 
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg bg-white border border-forest-accent text-forest-pine disabled:opacity-30 hover:bg-forest-mint transition-all shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7" /></svg>
              </button>
              <div className="flex items-center gap-1">
                <span className="text-[10px] font-black text-forest-pine dark:text-forest-mint">Page</span>
                <input 
                  type="number"
                  value={currentPage}
                  onChange={(e) => {
                    const val = Math.min(Math.max(1, Number(e.target.value)), totalPages);
                    setCurrentPage(val);
                  }}
                  className="w-10 px-1 py-0.5 bg-white border border-forest-accent rounded font-black text-[10px] text-center text-forest-pine outline-none focus:border-forest-leaf"
                />
                <span className="text-[10px] font-black text-forest-pine/40 dark:text-forest-sage/40">of {totalPages}</span>
              </div>
              <button 
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg bg-white border border-forest-accent text-forest-pine disabled:opacity-30 hover:bg-forest-mint transition-all shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7" /></svg>
              </button>
            </div>
          </div>
        </div>
      )}

        {marketplace === Marketplace.MYNTRA && (
          <div className="space-y-2 pt-1 border-t border-forest-accent/20 dark:border-forest-leaf/20">
            <label className="text-[8px] font-black text-forest-leaf uppercase block tracking-widest dark:text-forest-sage">Logistics Tier</label>
            <div className={`grid grid-cols-5 gap-1.5 transition-all ${manualRateCardActive ? 'opacity-30 grayscale pointer-events-none' : ''}`}>
              {Object.values(Level).map((l) => (
                <button
                  key={l}
                  onClick={() => setLevel(l)}
                  className={`py-1.5 text-[9px] font-black rounded border transition-all ${
                    level === l ? 'bg-forest-leaf text-white border-forest-leaf shadow-sm' : 'bg-white text-forest-pine/40 border-forest-accent dark:bg-forest-pine/40 dark:border-forest-leaf/20'
                  }`}
                >
                  {l.replace('Level ', 'L')}
                </button>
              ))}
            </div>
          </div>
        )}
        {marketplace === Marketplace.MYNTRA && (
          <div className="space-y-3 pt-3 border-t border-forest-accent/20 dark:border-forest-leaf/20">
            <div className="flex items-center justify-between">
              <label className="text-[8px] font-black text-forest-leaf uppercase tracking-widest dark:text-forest-sage">Reverse Logistics</label>
              <button 
                onClick={() => setIsReverse(!isReverse)}
                className={`w-10 h-5 rounded-full relative transition-all shadow-inner border border-black/5 ${isReverse ? 'bg-forest-leaf' : 'bg-forest-accent'}`}
              >
                <div className={`w-3.5 h-3.5 bg-white rounded-full absolute top-0.5 transition-all transform shadow-md ${isReverse ? 'translate-x-5.5' : 'translate-x-1'}`}></div>
              </button>
            </div>

            {isReverse && (
              <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[7px] font-black text-forest-leaf/50 uppercase dark:text-forest-sage/40">Region</label>
                    <select 
                      value={reverseRegion}
                      onChange={(e) => setReverseRegion(e.target.value as Region)}
                      className="w-full px-2 py-1 bg-white border border-forest-accent rounded font-black text-[10px] text-forest-pine outline-none focus:border-forest-leaf dark:bg-forest-pine/60 dark:text-forest-mint"
                    >
                      {Object.values(Region).map(r => <option key={r} value={r}>{r}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[7px] font-black text-forest-leaf/50 uppercase dark:text-forest-sage/40">Mode</label>
                    <select 
                      value={reverseMode}
                      onChange={(e) => setReverseMode(e.target.value as ReverseLogisticsMode)}
                      className="w-full px-2 py-1 bg-white border border-forest-accent rounded font-black text-[10px] text-forest-pine outline-none focus:border-forest-leaf dark:bg-forest-pine/60 dark:text-forest-mint"
                    >
                      {Object.values(ReverseLogisticsMode).map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
                
                {reverseMode === ReverseLogisticsMode.PERCENTAGE && (
                  <div className="space-y-1">
                    <label className="text-[7px] font-black text-forest-leaf/50 uppercase dark:text-forest-sage/40">Return Rate %</label>
                    <div className="relative">
                      <input 
                        type="number"
                        value={reversePercent}
                        onChange={(e) => setReversePercent(Number(e.target.value))}
                        className="w-full px-2 py-1 bg-white border border-forest-accent rounded font-black text-xs text-forest-pine outline-none focus:border-forest-leaf dark:bg-forest-pine/60 dark:text-forest-mint"
                      />
                      <span className="absolute right-2 top-1/2 -translate-y-1/2 text-forest-leaf/20 font-black text-[8px]">%</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
    </div>
  );
};

export default CalculatorForm;
