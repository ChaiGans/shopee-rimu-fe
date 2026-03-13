export type ProductStatus =
  | "NORMAL"
  | "BANNED"
  | "UNLIST"
  | "REVIEWING"
  | "SELLER_DELETE"
  | "SHOPEE_DELETE";

export interface ProductPriceInfo {
  currency?: string;
  original_price?: number;
  current_price?: number;
  inflated_price_of_original_price?: number;
  inflated_price_of_current_price?: number;
  sip_item_price?: number;
  sip_item_price_source?: string;
  local_price?: number;
  local_promotion_price?: number;
}

export interface ProductStockSummaryInfo {
  total_reserved_stock?: number;
  total_available_stock?: number;
}

export interface ProductSellerStockInfo {
  location_id?: string;
  stock?: number;
  if_saleable?: boolean;
}

export interface ProductShopeeStockInfo {
  location_id?: string;
  stock?: number;
}

export interface ProductAdvanceStockInfo {
  sellable_advance_stock?: number;
  in_transit_advance_stock?: number;
}

export interface ProductDimensionInfo {
  package_length?: number;
  package_width?: number;
  package_height?: number;
}

export interface ProductStockInfoV2 {
  summary_info?: ProductStockSummaryInfo;
  seller_stock?: ProductSellerStockInfo[];
  shopee_stock?: ProductShopeeStockInfo[];
  advance_stock?: ProductAdvanceStockInfo;
}

export interface ProductTierVariation {
  name?: string;
  option_list?: string[];
}

export interface ProductModelPreOrderInfo {
  is_pre_order?: boolean;
  days_to_ship?: number;
}

export interface ProductModel {
  model_id: number;
  tier_index?: number[];
  promotion_id?: number;
  has_promotion?: boolean;
  model_sku?: string;
  model_status?: string;
  price_info: ProductPriceInfo[];
  pre_order?: ProductModelPreOrderInfo;
  stock_info_v2?: ProductStockInfoV2;
  gtin_code?: string;
  weight?: string;
  dimension?: ProductDimensionInfo;
  is_fulfillment_by_shopee?: boolean;
  raw_model: Record<string, unknown>;
}

export interface ProductItem {
  item_id: number;
  item_name?: string;
  item_sku?: string;
  item_status: string;
  update_time: number;
  price_info: ProductPriceInfo[];
  stock_info_v2?: ProductStockInfoV2;
  has_model: boolean;
  tier_variation: ProductTierVariation[];
  standardise_tier_variation: Record<string, unknown>[];
  models: ProductModel[];
  raw_item: Record<string, unknown>;
}

export interface ProductPagination {
  page: number;
  size: number;
  total_count: number;
  has_next_page: boolean;
  next_offset: number;
}

export interface ProductListData {
  items: ProductItem[];
  pagination: ProductPagination;
  applied_statuses: string[];
}
