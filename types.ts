
export enum Level {
  LEVEL_1 = 'Level 1',
  LEVEL_2 = 'Level 2',
  LEVEL_3 = 'Level 3',
  LEVEL_4 = 'Level 4',
  LEVEL_5 = 'Level 5'
}

export enum Marketplace {
  MYNTRA = 'Myntra',
  AJIO = 'AJIO',
  AMAZON = 'Amazon'
}

export enum Brand {
  BELLSTONE = 'Bellstone',
  INDOPRIMO = 'INDOPRIMO',
  DEELMO = 'Deelmo',
  CB_COLEBROOK = 'CB-COLEBROOK',
  OTHER = 'Other'
}

export enum Region {
  LOCAL = 'Local',
  ZONE = 'Zone',
  NATIONAL = 'National'
}

export enum ReverseLogisticsMode {
  FIXED = 'Fixed Value',
  PERCENTAGE = 'Percentage %'
}

export enum Gender {
  MEN = 'Men',
  WOMEN = 'Women',
  UNISEX = 'Unisex'
}

export enum MasterCategory {
  APPAREL = 'APPAREL',
  FREE_ITEMS = 'FREE_ITEMS'
}

export enum ArticleType {
  BOXERS = 'Boxers',
  TSHIRTS = 'Tshirts',
  JEANS = 'Jeans',
  TROUSERS = 'Trousers',
  SHORTS = 'Shorts',
  INNERWEAR_VESTS = 'Innerwear Vests',
  SWEATSHIRTS = 'Sweatshirts',
  SWEATERS = 'Sweaters',
  JACKETS = 'Jackets',
  PYJAMAS = 'Pyjamas',
  SHIRTS = 'Shirts',
  KURTAS = 'Kurtas',
  DRESSES = 'Dresses',
  TRACK_PANTS = 'Track Pants',
  FREE_GIFTS = 'Free Gifts'
}

export interface ArticleConfig {
  category: MasterCategory;
  gender: Gender;
  defaultLevel: Level;
}

export interface BusinessBuffers {
  adsPercent: number;
  dealDiscountPercent: number;
  reviewPercent: number;
  profitMarginPercent: number;
  returnPercent: number;
}

// Added missing interface ManualRateRule
export interface ManualRateRule {
  brand: Brand | 'ALL';
  articleType: ArticleType | 'ALL';
  gender: Gender | 'ALL';
  lowerLimit: number;
  upperLimit: number;
  rate?: number; // For commission
  fee?: number;  // For fixed fee
  type: 'COMMISSION' | 'FIXED_FEE';
}

export interface ManualRateCard {
  enabled: boolean;
  rules: ManualRateRule[];
}

export interface RateCardHistoryEntry {
  timestamp: string;
  rules: ManualRateRule[];
}

export interface PricingResult {
  aisp: number;
  customerPrice: number;
  commissionRate: number;
  commission: number;
  fixedFee: number;
  logisticsFee: number;
  reverseLogisticsFee: number;
  reverseMode: ReverseLogisticsMode;
  reversePercent?: number;
  gstOnFees: number;
  tcs: number;
  tds: number;
  totalActualSettlement: number;
  marketplace?: Marketplace;
  brand?: Brand;
  
  // AJIO Specific spreadsheet fields
  mrp?: number;
  tradeDiscountPercent?: number;
  saleDiscountAmt?: number;
  aspGross?: number;
  gstOnAspPercent?: number;
  gstOnAspAmt?: number;
  netSalesValue?: number;
  purchasePrice?: number;
  gstOnPurchasePercent?: number;
  gstOnPurchaseAmt?: number;
  
  // Metadata
  styleId?: string;
  articleType?: ArticleType;
  gender?: Gender;
  masterCategory?: MasterCategory;
  level?: Level;
  baseTp?: number;
  targetSettlement?: number;
}