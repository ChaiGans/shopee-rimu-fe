export interface Shop {
  id: number;
  identifier: number;
  name?: string;
  marketplace: string;
  shop_code: string;
  auto_shipment_enabled?: boolean;
  has_telegram_config?: boolean;
  token_connected?: boolean;
  refresh_token_expired?: boolean;
  refresh_token_expires_at?: string | null;
}
