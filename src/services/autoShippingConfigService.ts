import api from "@/api/axios";
import { ApiResponse } from "@/types/ApiResponse";
import {
  LogisticsChannelConfigItem,
  ReplaceLogisticsChannelConfigRequest,
} from "@/types/LogisticsChannelConfig";

export const getLogisticsChannelConfig = async (
  shopId: number,
): Promise<LogisticsChannelConfigItem[]> => {
  const response = await api.get<ApiResponse<LogisticsChannelConfigItem[]>>(
    `/api/shop/${shopId}/logistics-channel-config`,
  );
  return response.data.data.map((channel) => ({
    ...channel,
    auto_shipment_window_start: channel.auto_shipment_window_start,
    auto_shipment_window_end: channel.auto_shipment_window_end,
  }));
};

export const replaceLogisticsChannelConfig = async (
  shopId: number,
  payload: ReplaceLogisticsChannelConfigRequest,
): Promise<void> => {
  await api.put(`/api/shop/${shopId}/logistics-channel-config`, {
    channels: payload.channels.map((channel) => ({
      ...channel,
      window_start: channel.window_start,
      window_end: channel.window_end,
    })),
  });
};

export const syncLogisticsChannels = async (shopId: number): Promise<void> => {
  await api.get(`/api/marketplace/shop/${shopId}/channel-list`);
};
