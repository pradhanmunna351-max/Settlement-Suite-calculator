
import { Level, Region, PricingResult, ArticleType, MasterCategory, ReverseLogisticsMode, Marketplace, Brand, ManualRateCard, ManualRateRule } from '../types';
import { 
  PLATFORM_LOGISTICS_FEES, 
  REVERSE_LOGISTICS_FEES, 
  GST_RATE, 
  PRODUCT_GST_RATE,
  TCS_RATE_VAL,
  TDS_RATE_VAL,
  ARTICLE_SPECIFICATIONS,
  BRAND_COMMISSION_SLABS,
  BRAND_FIXED_FEE_SLABS,
  FREE_ITEMS_COMMISSION_SLABS
} from '../constants';

const getCommissionRate = (price: number, articleType: ArticleType, brand: Brand, manualRateCard?: ManualRateCard): number => {
  if (manualRateCard?.enabled) {
    const rule = manualRateCard.rules.find(r => 
      r.type === 'COMMISSION' &&
      (r.brand === 'ALL' || r.brand === brand) &&
      (r.articleType === 'ALL' || r.articleType === articleType) &&
      price >= r.lowerLimit && price <= r.upperLimit
    );
    if (rule && rule.rate !== undefined) return rule.rate;
  }

  const spec = ARTICLE_SPECIFICATIONS[articleType];
  if (spec.category === MasterCategory.FREE_ITEMS) {
    const slab = FREE_ITEMS_COMMISSION_SLABS.find(s => price >= s.lower && price <= s.upper) || FREE_ITEMS_COMMISSION_SLABS[0];
    return slab.rate;
  }

  const brandRules = BRAND_COMMISSION_SLABS[brand] || BRAND_COMMISSION_SLABS.default;
  const articleRules = brandRules[articleType] || brandRules.ALL || BRAND_COMMISSION_SLABS.default.ALL;
  
  const slab = articleRules.find(s => price >= s.lower && price < s.upper) || articleRules[articleRules.length - 1];
  return slab.rate;
};

const getFixedFee = (aisp: number, articleType: ArticleType, brand: Brand, manualRateCard?: ManualRateCard): number => {
  if (manualRateCard?.enabled) {
    const rule = manualRateCard.rules.find(r => 
      r.type === 'FIXED_FEE' &&
      (r.brand === 'ALL' || r.brand === brand) &&
      (r.articleType === 'ALL' || r.articleType === articleType) &&
      aisp >= r.lowerLimit && aisp <= r.upperLimit
    );
    if (rule && rule.fee !== undefined) return rule.fee;
  }

  const brandRules = BRAND_FIXED_FEE_SLABS[brand] || BRAND_FIXED_FEE_SLABS.default;
  const articleRules = brandRules[articleType] || brandRules.ALL || BRAND_FIXED_FEE_SLABS.default.ALL;
  
  const slab = articleRules.find(s => aisp >= s.lower && aisp < s.upper) || articleRules[articleRules.length - 1];
  return slab.fee;
};

export const calculateAjioBreakdown = (
  bankSettlement: number,
  ajioMarginPercent: number = 34,
  tradeDiscountPercent: number = 65
): PricingResult => {
  let gstOnPurchasePercent = 0.05;
  let purchasePrice = bankSettlement / (1 + gstOnPurchasePercent);
  
  if (purchasePrice > 2500) {
    gstOnPurchasePercent = 0.18;
    purchasePrice = bankSettlement / (1 + gstOnPurchasePercent);
  }
  const gstOnPurchaseAmt = bankSettlement - purchasePrice;

  let gstOnAspPercent = 0.05;
  let marginRate = ajioMarginPercent / 100;
  let aspGross = purchasePrice / ( (1 / (1 + gstOnAspPercent)) - marginRate );
  
  if (aspGross > 2500) {
    gstOnAspPercent = 0.18;
    aspGross = purchasePrice / ( (1 / (1 + gstOnAspPercent)) - marginRate );
  }

  const gstOnAspAmt = aspGross - (aspGross / (1 + gstOnAspPercent));
  const netSalesValue = aspGross - gstOnAspAmt;
  const ajioMarginAmt = aspGross * marginRate;

  const tradeDiscountRate = tradeDiscountPercent / 100;
  const mrp = tradeDiscountRate < 1 ? aspGross / (1 - tradeDiscountRate) : aspGross;
  const saleDiscountAmt = mrp - aspGross;

  return {
    aisp: aspGross,
    customerPrice: aspGross,
    commissionRate: ajioMarginPercent,
    commission: ajioMarginAmt,
    fixedFee: 0,
    logisticsFee: 0,
    reverseLogisticsFee: 0,
    reverseMode: ReverseLogisticsMode.FIXED,
    gstOnFees: 0,
    tcs: 0,
    tds: 0,
    totalActualSettlement: bankSettlement,
    marketplace: Marketplace.AJIO,
    mrp,
    tradeDiscountPercent,
    saleDiscountAmt,
    aspGross,
    gstOnAspPercent: gstOnAspPercent * 100,
    gstOnAspAmt,
    netSalesValue,
    purchasePrice,
    gstOnPurchasePercent: gstOnPurchasePercent * 100,
    gstOnPurchaseAmt
  };
};

export const calculateBreakdown = (
  aisp: number, 
  level: Level,
  articleType: ArticleType,
  isReverseLogistics: boolean,
  reverseRegion: Region,
  reverseMode: ReverseLogisticsMode = ReverseLogisticsMode.FIXED,
  reversePercent: number = 0,
  marketplace: Marketplace = Marketplace.MYNTRA,
  brand: Brand = Brand.BELLSTONE,
  ajioMargin?: number,
  ajioTradeDiscount?: number,
  manualRateCard?: ManualRateCard
): PricingResult => {
  if (marketplace === Marketplace.AJIO) {
    return calculateAjioBreakdown(aisp, ajioMargin, ajioTradeDiscount);
  }

  let commissionRate = 0;
  let fixedFee = 0;

  const gtaFees = PLATFORM_LOGISTICS_FEES[level];
  const LOGISTICS_SLABS = [ { min: 0, max: 299 }, { min: 300, max: 499 }, { min: 500, max: 999 }, { min: 1000, max: 1999 }, { min: 2000, max: Infinity } ];
  
  // Determine logistics fee based on CP (Customer Price)
  let gtaFee = gtaFees[1]; 
  for (let i = 0; i < LOGISTICS_SLABS.length; i++) {
    const feeCandidate = gtaFees[i + 1]; 
    const range = LOGISTICS_SLABS[i];
    const potentialCP = aisp + feeCandidate;
    if (potentialCP >= range.min - 0.0001 && potentialCP < range.max + 0.9999) {
      gtaFee = feeCandidate;
      break;
    }
  }
  const tempCP = aisp + gtaFee;
  const useManual = manualRateCard?.enabled && marketplace === Marketplace.MYNTRA;
  commissionRate = getCommissionRate(tempCP, articleType, brand, useManual ? manualRateCard : undefined);
  fixedFee = getFixedFee(aisp, articleType, brand, useManual ? manualRateCard : undefined);

  const customerPrice = aisp + gtaFee;
  const commission = (aisp * commissionRate) / 100;

  let reverseLogisticsFee = 0;
  if (isReverseLogistics) {
    if (reverseMode === ReverseLogisticsMode.FIXED) {
      reverseLogisticsFee = REVERSE_LOGISTICS_FEES[level][reverseRegion];
    } else {
      reverseLogisticsFee = (aisp * reversePercent) / 100;
    }
  }

  const taxableValue = aisp / (1 + PRODUCT_GST_RATE);
  const tcs = taxableValue * TCS_RATE_VAL;
  const tds = taxableValue * TDS_RATE_VAL;
  const gstOnFixedFee = fixedFee * GST_RATE;
  const gstOnReverse = reverseLogisticsFee * GST_RATE;
  const totalActualSettlement = aisp - commission - fixedFee - gstOnFixedFee - tcs - tds - reverseLogisticsFee - gstOnReverse;

  return {
    aisp, customerPrice, commissionRate, commission, fixedFee, logisticsFee: gtaFee,
    reverseLogisticsFee, reverseMode, reversePercent, gstOnFees: gstOnFixedFee + gstOnReverse,
    tcs, tds, totalActualSettlement, marketplace: Marketplace.MYNTRA, brand, articleType, level
  };
};

export const findAISPForTarget = (
  target: number,
  level: Level,
  articleType: ArticleType,
  isReverseLogistics: boolean,
  reverseRegion: Region,
  reverseMode: ReverseLogisticsMode = ReverseLogisticsMode.FIXED,
  reversePercent: number = 0,
  marketplace: Marketplace = Marketplace.MYNTRA,
  brand: Brand = Brand.BELLSTONE,
  ajioMargin?: number,
  ajioTradeDiscount?: number,
  manualRateCard?: ManualRateCard
): number => {
  if (marketplace === Marketplace.AJIO) {
    const res = calculateAjioBreakdown(target, ajioMargin, ajioTradeDiscount);
    return res.aisp;
  }

  // PLATFORM FEE SOLVER 2.0
  // Since payout is piecewise linear with jumps, we use a robust search
  
  // Step 1: Linear scan with small steps to handle jumps across slabs
  let lowLimit = target;
  let highLimit = target * 4;
  let coarseBestAisp = target;
  let foundBracket = false;

  // We scan in ₹2 steps to find a point where payout >= target
  for (let potentialAisp = lowLimit; potentialAisp < highLimit; potentialAisp += 2) {
    const res = calculateBreakdown(potentialAisp, level, articleType, isReverseLogistics, reverseRegion, reverseMode, reversePercent, Marketplace.MYNTRA, brand, undefined, undefined, manualRateCard);
    if (res.totalActualSettlement >= target) {
      coarseBestAisp = potentialAisp;
      foundBracket = true;
      break;
    }
  }

  // Step 2: High-precision Binary Search (50 iterations for 0.00001 precision)
  let left = foundBracket ? Math.max(target, coarseBestAisp - 4) : target;
  let right = foundBracket ? coarseBestAisp + 1 : highLimit;

  for (let i = 0; i < 50; i++) {
    const mid = (left + right) / 2;
    const res = calculateBreakdown(mid, level, articleType, isReverseLogistics, reverseRegion, reverseMode, reversePercent, Marketplace.MYNTRA, brand, undefined, undefined, manualRateCard);
    
    if (res.totalActualSettlement < target) {
      left = mid;
    } else {
      right = mid;
    }
  }

  return (left + right) / 2;
};
