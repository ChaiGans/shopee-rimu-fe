export interface LogisticsChannelConfigItem {
  logistics_channel_id: number;
  logistics_channel_name: string;
  enabled: boolean;
  mask_channel_id: number;
  service_type_identifier: string;
  preprint: boolean;
  auto_shipment_enabled: boolean;
  auto_shipment_window_start?: string;
  auto_shipment_window_end?: string;
}

export interface ReplaceLogisticsChannelConfigItem {
  logistics_channel_id: number;
  auto_shipment_enabled: boolean;
  window_start?: string;
  window_end?: string;
}

export interface ReplaceLogisticsChannelConfigRequest {
  channels: ReplaceLogisticsChannelConfigItem[];
}
