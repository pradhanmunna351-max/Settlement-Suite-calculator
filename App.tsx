
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Level, Region, ArticleType, ReverseLogisticsMode, BusinessBuffers, Marketplace, Brand, ManualRateCard, RateCardHistoryEntry } from './types';
import { findAISPForTarget, calculateBreakdown, calculateAjioBreakdown } from './services/calculatorService';
import CalculatorForm from './components/CalculatorForm';
import ResultCard from './components/ResultCard';
import BatchProcessor from './components/BatchProcessor';
import RateCardConfig from './components/RateCardConfig';
import ComparisonView from './components/ComparisonView';

const DEFAULT_BUFFERS: BusinessBuffers = {
  adsPercent: 5,
  dealDiscountPercent: 10,
  reviewPercent: 2,
  profitMarginPercent: 15,
  returnPercent: 5
};

const DEFAULT_MANUAL_RATE_CARD: ManualRateCard = {
  enabled: false,
  rules: []
};

const THEMES = [
  { id: 'forest', name: 'Forest', class: '', color: '#2D5A3A' },
  { id: 'midnight', name: 'Midnight', class: 'theme-midnight', color: '#102A43' },
  { id: 'cyberpunk', name: 'Cyberpunk', class: 'theme-cyberpunk', color: '#FF0055' },
  { id: 'royal', name: 'Royal', class: 'theme-royal', color: '#5A189A' },
  { id: 'ocean', name: 'Ocean', class: 'theme-ocean', color: '#0077B6' },
  { id: 'sakura', name: 'Sakura', class: 'theme-sakura', color: '#D81B60' },
  { id: 'desert', name: 'Desert', class: 'theme-desert', color: '#99582A' },
  { id: 'nordic', name: 'Nordic', class: 'theme-nordic', color: '#495057' },
  { id: 'volcano', name: 'Volcano', class: 'theme-volcano', color: '#FF4D00' },
  { id: 'coffee', name: 'Coffee', class: 'theme-coffee', color: '#3E2723' },
  { id: 'glass', name: 'Glass', class: 'theme-glass', color: '#0EA5E9' },
  { id: 'glass-blur', name: 'Glass Blur', class: 'theme-glass-blur', color: '#818CF8' }
];

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'ratecard' | 'New Simulator'>('New Simulator');
  const [marketplace, setMarketplace] = useState<Marketplace>(Marketplace.MYNTRA);
  const [brand, setBrand] = useState<Brand>(Brand.BELLSTONE);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
    }
    return 'light';
  });
  
  const [currentThemeClass, setCurrentThemeClass] = useState<string>(() => {
    return localStorage.getItem('visual-theme') || '';
  });

  const [isThemeMenuOpen, setIsThemeMenuOpen] = useState(false);
  const themeMenuRef = useRef<HTMLDivElement>(null);

  const [tpPrice, setTpPrice] = useState<number>(300);
  const [targetSettlement, setTargetSettlement] = useState<number>(397.83);
  const [articleType, setArticleType] = useState<ArticleType>(ArticleType.TSHIRTS);
  const [level, setLevel] = useState<Level>(Level.LEVEL_2);
  const [isReverse, setIsReverse] = useState<boolean>(false);
  const [reverseRegion, setReverseRegion] = useState<Region>(Region.LOCAL);
  const [reverseMode, setReverseMode] = useState<ReverseLogisticsMode>(ReverseLogisticsMode.FIXED);
  const [reversePercent, setReversePercent] = useState<number>(10);
  
  const [marketplaceData, setMarketplaceData] = useState<Record<string, any[]>>({
    [Marketplace.MYNTRA]: [],
    [Marketplace.AJIO]: [],
    [Marketplace.AMAZON]: []
  });

  const [ajioTradeDiscount, setAjioTradeDiscount] = useState<number>(65);
  const [ajioMargin, setAjioMargin] = useState<number>(34);
  
  const [buffers, setBuffers] = useState<BusinessBuffers>(DEFAULT_BUFFERS);
  const [manualRateCard, setManualRateCard] = useState<ManualRateCard>(DEFAULT_MANUAL_RATE_CARD);
  const [rateCardHistory, setRateCardHistory] = useState<RateCardHistoryEntry[]>([]);

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    THEMES.forEach(t => {
      if (t.class) root.classList.remove(t.class);
    });
    if (currentThemeClass) {
      root.classList.add(currentThemeClass);
    }

    localStorage.setItem('theme', theme);
    localStorage.setItem('visual-theme', currentThemeClass);
  }, [theme, currentThemeClass]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (themeMenuRef.current && !themeMenuRef.current.contains(event.target as Node)) {
        setIsThemeMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const totalCost = tpPrice * (1 + buffers.profitMarginPercent / 100);
    const otherBuffersSum = buffers.adsPercent + buffers.dealDiscountPercent + buffers.reviewPercent + buffers.returnPercent;
    const newTarget = totalCost * (1 + otherBuffersSum / 100);
    setTargetSettlement(parseFloat(newTarget.toFixed(2)));
  }, [tpPrice, buffers]);

  const handleRefreshApp = () => {
    if (window.confirm("REFRESH APP? This will clear all calculations and imported data.")) {
      resetForm();
      setMarketplaceData({
        [Marketplace.MYNTRA]: [],
        [Marketplace.AJIO]: [],
        [Marketplace.AMAZON]: []
      });
      setManualRateCard(DEFAULT_MANUAL_RATE_CARD);
      setActiveTab('single');
    }
  };

  const resetForm = () => {
    setTpPrice(300);
    setArticleType(ArticleType.TSHIRTS);
    setLevel(Level.LEVEL_2);
    setBuffers(DEFAULT_BUFFERS);
    setMarketplace(Marketplace.MYNTRA);
    setBrand(Brand.BELLSTONE);
    setIsReverse(false);
    setReverseRegion(Region.LOCAL);
    setReverseMode(ReverseLogisticsMode.FIXED);
    setReversePercent(10);
    setAjioTradeDiscount(65);
    setAjioMargin(34);
  };

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const result = useMemo(() => {
    if (marketplace === Marketplace.AMAZON) {
      return {
        aisp: 0,
        customerPrice: 0,
        commissionRate: 0,
        commission: 0,
        fixedFee: 0,
        logisticsFee: 0,
        reverseLogisticsFee: 0,
        reverseMode: ReverseLogisticsMode.FIXED,
        gstOnFees: 0,
        tcs: 0,
        tds: 0,
        totalActualSettlement: 0,
        marketplace: Marketplace.AMAZON
      };
    }

    if (marketplace === Marketplace.AJIO) {
      return calculateAjioBreakdown(targetSettlement, ajioMargin, ajioTradeDiscount);
    }
    
    const aisp = findAISPForTarget(
      targetSettlement, 
      level, 
      articleType, 
      isReverse, 
      reverseRegion, 
      reverseMode, 
      reversePercent, 
      marketplace,
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
      marketplace,
      brand,
      ajioMargin,
      ajioTradeDiscount,
      manualRateCard
    );
  }, [targetSettlement, level, articleType, isReverse, reverseRegion, reverseMode, reversePercent, marketplace, brand, ajioMargin, ajioTradeDiscount, manualRateCard]);

  return (
    <div className="min-h-screen theme-transition bg-forest-mint text-forest-pine font-sans selection:bg-forest-leaf selection:text-white dark:bg-[#0F1A13] dark:text-forest-mint">
      <div className="max-w-[1600px] mx-auto px-4 py-6">
        <header className="mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-forest-pine rounded-2xl flex items-center justify-center text-forest-mint shadow-lg ring-1 ring-white/10 dark:bg-forest-leaf">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>
            </div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight leading-none text-forest-pine dark:text-forest-mint italic">Settlement Suite</h1>
              <p className="text-[10px] text-forest-leaf font-bold tracking-[0.2em] uppercase mt-1 dark:text-forest-sage opacity-60">High-Performance Intelligence</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="bg-forest-accent/30 p-1 flex rounded-xl border border-forest-accent/50 dark:bg-forest-leaf/10 dark:border-forest-leaf/20 shadow-inner">
              <button 
                onClick={() => setActiveTab('New Simulator')} 
                className={`px-6 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${activeTab === 'New Simulator' ? 'bg-forest-pine text-white shadow-md ring-1 ring-white/20 dark:bg-forest-leaf' : 'text-forest-pine/40 hover:text-forest-pine dark:text-forest-sage/60 dark:hover:text-forest-mint'}`}
              >
                Simulator
              </button>
              <button 
                onClick={() => setActiveTab('ratecard')} 
                className={`px-6 py-2 text-[10px] font-black uppercase rounded-lg transition-all ${activeTab === 'ratecard' ? 'bg-forest-pine text-white shadow-md ring-1 ring-white/20 dark:bg-forest-leaf' : 'text-forest-pine/40 hover:text-forest-pine dark:text-forest-sage/60 dark:hover:text-forest-mint'}`}
              >
                Matrix
              </button>
            </div>
            
            <div className="flex items-center gap-2 relative">
              <div ref={themeMenuRef}>
                <button 
                  onClick={() => setIsThemeMenuOpen(!isThemeMenuOpen)}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-forest-accent rounded-xl text-forest-leaf hover:bg-forest-pine hover:text-white transition-all shadow-md dark:bg-forest-pine dark:border-forest-leaf dark:text-forest-sage group"
                >
                  <span className="text-[10px] font-black uppercase tracking-widest hidden sm:inline">Visuals</span>
                  <svg className="w-4 h-4 group-hover:rotate-45 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                  </svg>
                </button>
                
                {isThemeMenuOpen && (
                  <div className="absolute right-0 top-full mt-3 w-[260px] bg-white border border-forest-accent rounded-3xl shadow-2xl z-[100] p-4 dark:bg-forest-pine dark:border-forest-leaf animate-in fade-in zoom-in duration-300">
                    <div className="mb-3 px-2 flex justify-between items-center">
                      <span className="text-[9px] font-black uppercase tracking-[0.2em] text-forest-leaf/50">Top 12 Themes</span>
                      <div className="w-1.5 h-1.5 bg-forest-leaf rounded-full animate-pulse"></div>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {THEMES.map(t => (
                        <button
                          key={t.id}
                          onClick={() => {
                            setCurrentThemeClass(t.class);
                            setIsThemeMenuOpen(false);
                          }}
                          className={`flex items-center gap-3 p-2 rounded-xl border-2 transition-all hover:bg-forest-accent/20 active:scale-95 ${currentThemeClass === t.class ? 'border-forest-pine bg-forest-mint/50 dark:border-white' : 'border-transparent bg-forest-mint/30'}`}
                        >
                          <div 
                            className="w-6 h-6 rounded-full border border-black/5" 
                            style={{ backgroundColor: t.color }}
                          />
                          <span className="text-[9px] font-bold text-forest-pine dark:text-forest-mint">{t.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <button 
                onClick={toggleTheme}
                className="p-2.5 bg-white border border-forest-accent rounded-xl text-forest-leaf hover:bg-forest-pine hover:text-white transition-all shadow-md dark:bg-forest-pine dark:border-forest-leaf dark:text-forest-sage"
              >
                {theme === 'light' ? (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 3v1m0 16v1m9-9h-1M4 9H3m15.364 6.364l-.707-.707M6.364 6.364l-.707-.707m12.728 0l-.707.707M6.364 15.364l-.707.707M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                )}
              </button>

              <button 
                onClick={handleRefreshApp}
                className="p-2.5 bg-white border border-forest-accent rounded-xl text-forest-leaf hover:bg-rose-500 hover:text-white transition-all shadow-md group dark:bg-forest-pine dark:border-forest-leaf dark:text-forest-sage"
              >
                <svg className="w-4 h-4 group-hover:rotate-180 transition-transform duration-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        <main>
          {activeTab === 'batch' && (
            <BatchProcessor 
              marketplace={marketplace}
              buffers={buffers} 
              setBuffers={setBuffers} 
              marketplaceData={marketplaceData} 
              setMarketplaceData={setMarketplaceData}
              manualRateCard={manualRateCard}
              isReverse={isReverse}
              setIsReverse={setIsReverse}
              reverseRegion={reverseRegion}
              setReverseRegion={setReverseRegion}
              reverseMode={reverseMode}
              setReverseMode={setReverseMode}
              reversePercent={reversePercent}
              setReversePercent={setReversePercent}
            />
          )}

          {activeTab === 'ratecard' && (
            <RateCardConfig 
              manualRateCard={manualRateCard}
              setManualRateCard={setManualRateCard}
              rateCardHistory={rateCardHistory}
              setRateCardHistory={setRateCardHistory}
            />
          )}

          {activeTab === 'New Simulator' && (
            <div className="space-y-8">
              <CalculatorForm 
                marketplace={marketplace}
                setMarketplace={setMarketplace}
                brand={brand}
                setBrand={setBrand}
                articleType={articleType} 
                setArticleType={setArticleType} 
                tpPrice={tpPrice} 
                setTpPrice={setTpPrice} 
                targetSettlement={targetSettlement} 
                setTargetSettlement={setTargetSettlement} 
                level={level} 
                setLevel={setLevel} 
                isReverse={isReverse} 
                setIsReverse={setIsReverse} 
                reverseRegion={reverseRegion} 
                setReverseRegion={setReverseRegion} 
                reverseMode={reverseMode} 
                setReverseMode={setReverseMode} 
                reversePercent={reversePercent} 
                setReversePercent={setReversePercent} 
                buffers={buffers} 
                setBuffers={setBuffers}
                ajioTradeDiscount={ajioTradeDiscount}
                setAjioTradeDiscount={setAjioTradeDiscount}
                ajioMargin={ajioMargin}
                setAjioMargin={setAjioMargin}
                manualRateCardActive={manualRateCard.enabled}
                manualRateCard={manualRateCard}
                showResultsRow={true}
                marketplaceData={marketplaceData}
                setMarketplaceData={setMarketplaceData}
                onClear={resetForm}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
