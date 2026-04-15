
import { Level, ArticleType, MasterCategory, Gender, ArticleConfig, Brand } from './types';

export const LOGISTICS_RANGES = [
  { min: 0, max: 299, label: '0-299' },
  { min: 300, max: 499, label: '300-499' },
  { min: 500, max: 999, label: '500-999' },
  { min: 1000, max: 1999, label: '1000-1999' },
  { min: 2000, max: Infinity, label: '>2000' }
];

export const PLATFORM_LOGISTICS_FEES: Record<Level, number[]> = {
  [Level.LEVEL_1]: [0, 59, 59, 94, 171, 207],
  [Level.LEVEL_2]: [0, 83, 83, 118, 195, 230],
  [Level.LEVEL_3]: [0, 100, 106, 148, 230, 266],
  [Level.LEVEL_4]: [0, 100, 153, 189, 277, 313],
  [Level.LEVEL_5]: [0, 100, 189, 283, 395, 431]
};

export const REVERSE_LOGISTICS_FEES: Record<Level, { Local: number; Zone: number; National: number }> = {
  [Level.LEVEL_1]: { Local: 91, Zone: 112, National: 167 },
  [Level.LEVEL_2]: { Local: 112, Zone: 153, National: 218 },
  [Level.LEVEL_3]: { Local: 142, Zone: 194, National: 259 },
  [Level.LEVEL_4]: { Local: 214, Zone: 276, National: 331 },
  [Level.LEVEL_5]: { Local: 460, Zone: 542, National: 649 }
};

export const ARTICLE_SPECIFICATIONS: Record<ArticleType, ArticleConfig> = {
  [ArticleType.BOXERS]: { category: MasterCategory.APPAREL, gender: Gender.MEN, defaultLevel: Level.LEVEL_1 },
  [ArticleType.TSHIRTS]: { category: MasterCategory.APPAREL, gender: Gender.MEN, defaultLevel: Level.LEVEL_2 },
  [ArticleType.JEANS]: { category: MasterCategory.APPAREL, gender: Gender.MEN, defaultLevel: Level.LEVEL_1 },
  [ArticleType.TROUSERS]: { category: MasterCategory.APPAREL, gender: Gender.MEN, defaultLevel: Level.LEVEL_2 },
  [ArticleType.SHORTS]: { category: MasterCategory.APPAREL, gender: Gender.MEN, defaultLevel: Level.LEVEL_1 },
  [ArticleType.INNERWEAR_VESTS]: { category: MasterCategory.APPAREL, gender: Gender.MEN, defaultLevel: Level.LEVEL_1 },
  [ArticleType.SWEATSHIRTS]: { category: MasterCategory.APPAREL, gender: Gender.MEN, defaultLevel: Level.LEVEL_2 },
  [ArticleType.SWEATERS]: { category: MasterCategory.APPAREL, gender: Gender.MEN, defaultLevel: Level.LEVEL_2 },
  [ArticleType.JACKETS]: { category: MasterCategory.APPAREL, gender: Gender.MEN, defaultLevel: Level.LEVEL_2 },
  [ArticleType.PYJAMAS]: { category: MasterCategory.APPAREL, gender: Gender.MEN, defaultLevel: Level.LEVEL_1 },
  [ArticleType.SHIRTS]: { category: MasterCategory.APPAREL, gender: Gender.MEN, defaultLevel: Level.LEVEL_1 },
  [ArticleType.KURTAS]: { category: MasterCategory.APPAREL, gender: Gender.MEN, defaultLevel: Level.LEVEL_1 },
  [ArticleType.DRESSES]: { category: MasterCategory.APPAREL, gender: Gender.WOMEN, defaultLevel: Level.LEVEL_1 },
  [ArticleType.TRACK_PANTS]: { category: MasterCategory.APPAREL, gender: Gender.MEN, defaultLevel: Level.LEVEL_1 },
  [ArticleType.FREE_GIFTS]: { category: MasterCategory.FREE_ITEMS, gender: Gender.UNISEX, defaultLevel: Level.LEVEL_1 },
};

// Commission Slabs (inclusive of 18% GST as per user screenshots)
export const BRAND_COMMISSION_SLABS: Record<string, Record<string, { lower: number; upper: number; rate: number }[]>> = {
  default: {
    ALL: [
      { lower: 0, upper: 300, rate: 0.0 },
      { lower: 300, upper: 500, rate: 1.5 },
      { lower: 500, upper: 1000, rate: 12.0 },
      { lower: 1000, upper: 2000, rate: 16.0 },
      { lower: 2000, upper: Infinity, rate: 20.0 }
    ]
  },
  [Brand.CB_COLEBROOK]: {
    ALL: [
      { lower: 0, upper: 300, rate: 0.0 },
      { lower: 300, upper: 500, rate: 1.5 },
      { lower: 500, upper: 1000, rate: 12.0 },
      { lower: 1000, upper: 2000, rate: 16.0 },
      { lower: 2000, upper: Infinity, rate: 20.0 }
    ],
    [ArticleType.TROUSERS]: [
      { lower: 0, upper: 600, rate: 0.0 },
      { lower: 600, upper: 800, rate: 6.0 },
      { lower: 800, upper: Infinity, rate: 15.0 }
    ],
    [ArticleType.SHIRTS]: [
      { lower: 0, upper: 600, rate: 0.0 },
      { lower: 600, upper: 800, rate: 2.0 },
      { lower: 800, upper: Infinity, rate: 15.0 }
    ]
  },
  [Brand.INDOPRIMO]: {
    ALL: [
      { lower: 0, upper: 300, rate: 0.0 },
      { lower: 300, upper: 500, rate: 1.5 },
      { lower: 500, upper: 1000, rate: 12.0 },
      { lower: 1000, upper: 2000, rate: 16.0 },
      { lower: 2000, upper: Infinity, rate: 20.0 }
    ],
    [ArticleType.DRESSES]: [
      { lower: 0, upper: 800, rate: 4.0 },
      { lower: 800, upper: 1000, rate: 18.0 },
      { lower: 1000, upper: 2000, rate: 16.0 },
      { lower: 2000, upper: Infinity, rate: 17.0 }
    ],
    [ArticleType.SHIRTS]: [
      { lower: 0, upper: 600, rate: 0.0 },
      { lower: 600, upper: 800, rate: 2.0 },
      { lower: 800, upper: Infinity, rate: 15.0 }
    ]
  },
  [Brand.DEELMO]: {
    ALL: [
      { lower: 0, upper: 300, rate: 0.0 },
      { lower: 300, upper: 500, rate: 1.5 },
      { lower: 500, upper: 1000, rate: 12.0 },
      { lower: 1000, upper: 2000, rate: 16.0 },
      { lower: 2000, upper: Infinity, rate: 20.0 }
    ],
    [ArticleType.KURTAS]: [
      { lower: 0, upper: 600, rate: 0.0 },
      { lower: 600, upper: 750, rate: 2.0 },
      { lower: 750, upper: Infinity, rate: 15.0 }
    ],
    [ArticleType.SHIRTS]: [
      { lower: 0, upper: 600, rate: 0.0 },
      { lower: 600, upper: 800, rate: 2.0 },
      { lower: 800, upper: Infinity, rate: 15.0 }
    ]
  },
  [Brand.BELLSTONE]: {
    ALL: [
      { lower: 0, upper: 300, rate: 0.0 },
      { lower: 300, upper: 500, rate: 1.5 },
      { lower: 500, upper: 1000, rate: 12.0 },
      { lower: 1000, upper: 2000, rate: 16.0 },
      { lower: 2000, upper: Infinity, rate: 20.0 }
    ],
    [ArticleType.KURTAS]: [
      { lower: 0, upper: 600, rate: 0.0 },
      { lower: 600, upper: 750, rate: 2.0 },
      { lower: 750, upper: Infinity, rate: 15.0 }
    ],
    [ArticleType.SHIRTS]: [
      { lower: 0, upper: 600, rate: 0.0 },
      { lower: 600, upper: 800, rate: 2.0 },
      { lower: 800, upper: Infinity, rate: 15.0 }
    ]
  }
};

// Exact Fixed Fee Slaps from User Screenshots (Myntra only) - Base Fees (exclusive of GST)
export const BRAND_FIXED_FEE_SLABS: Record<string, Record<string, { lower: number; upper: number; fee: number }[]>> = {
  default: {
    ALL: [
      { lower: 0, upper: 1000, fee: 27 },
      { lower: 1000, upper: 2000, fee: 45 },
      { lower: 2000, upper: Infinity, fee: 61 }
    ]
  },
  [Brand.CB_COLEBROOK]: {
    [ArticleType.TROUSERS]: [
      { lower: 0, upper: 500, fee: 0 },
      { lower: 500, upper: 600, fee: 3 },
      { lower: 600, upper: 1000, fee: 27 },
      { lower: 1000, upper: 2000, fee: 45 },
      { lower: 2000, upper: Infinity, fee: 61 }
    ],
    [ArticleType.SHIRTS]: [
      { lower: 0, upper: 300, fee: 4 },
      { lower: 300, upper: 400, fee: 5 },
      { lower: 400, upper: 500, fee: 6 },
      { lower: 500, upper: 600, fee: 7 },
      { lower: 600, upper: 1000, fee: 27 },
      { lower: 1000, upper: 2000, fee: 45 },
      { lower: 2000, upper: Infinity, fee: 61 }
    ]
  },
  [Brand.INDOPRIMO]: {
    [ArticleType.SHIRTS]: [
      { lower: 0, upper: 300, fee: 4 },
      { lower: 300, upper: 400, fee: 5 },
      { lower: 400, upper: 500, fee: 6 },
      { lower: 500, upper: 600, fee: 7 },
      { lower: 600, upper: 1000, fee: 27 },
      { lower: 1000, upper: 2000, fee: 45 },
      { lower: 2000, upper: Infinity, fee: 61 }
    ],
    [ArticleType.DRESSES]: [
      { lower: 0, upper: 400, fee: 0 },
      { lower: 400, upper: 500, fee: 0 },
      { lower: 500, upper: 600, fee: 3 },
      { lower: 600, upper: 1000, fee: 27 },
      { lower: 1000, upper: 2000, fee: 45 },
      { lower: 2000, upper: Infinity, fee: 61 }
    ]
  },
  [Brand.DEELMO]: {
    [ArticleType.KURTAS]: [
      { lower: 0, upper: 400, fee: 0 },
      { lower: 400, upper: 500, fee: 4 },
      { lower: 500, upper: 600, fee: 9 },
      { lower: 600, upper: 1000, fee: 27 },
      { lower: 1000, upper: 2000, fee: 45 },
      { lower: 2000, upper: Infinity, fee: 61 }
    ],
    [ArticleType.SHIRTS]: [
      { lower: 0, upper: 300, fee: 4 },
      { lower: 300, upper: 400, fee: 5 },
      { lower: 400, upper: 500, fee: 6 },
      { lower: 500, upper: 600, fee: 7 },
      { lower: 600, upper: 1000, fee: 27 },
      { lower: 1000, upper: 2000, fee: 45 },
      { lower: 2000, upper: Infinity, fee: 61 }
    ]
  },
  [Brand.BELLSTONE]: {
    [ArticleType.KURTAS]: [
      { lower: 0, upper: 400, fee: 0 },
      { lower: 400, upper: 500, fee: 4 },
      { lower: 500, upper: 600, fee: 9 },
      { lower: 600, upper: 1000, fee: 27 },
      { lower: 1000, upper: 2000, fee: 45 },
      { lower: 2000, upper: Infinity, fee: 61 }
    ],
    [ArticleType.SHIRTS]: [
      { lower: 0, upper: 300, fee: 4 },
      { lower: 300, upper: 400, fee: 5 },
      { lower: 400, upper: 500, fee: 6 },
      { lower: 500, upper: 600, fee: 7 },
      { lower: 600, upper: 1000, fee: 27 },
      { lower: 1000, upper: 2000, fee: 45 },
      { lower: 2000, upper: Infinity, fee: 61 }
    ]
  }
};

export const FREE_ITEMS_COMMISSION_SLABS = [
  { lower: 0, upper: 499, rate: 9.0 },
  { lower: 500, upper: Infinity, rate: 18.0 }
];

export const GST_RATE = 0.18;
export const PRODUCT_GST_RATE = 0.05;
export const TCS_RATE_VAL = 0.005; 
export const TDS_RATE_VAL = 0.001;
