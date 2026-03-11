import axios from "axios";
import { useEffect, useState } from "react";

import { getApiErrorMessage } from "@/lib/api-error";
import Loading from "@/components/loading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import {
  getLogisticsChannelConfig,
  replaceLogisticsChannelConfig,
  syncLogisticsChannels,
} from "@/services/autoShippingConfigService";
import { getShops } from "@/services/shopService";
import { LogisticsChannelConfigItem } from "@/types/LogisticsChannelConfig";
import { Shop } from "@/types/Shop";
import { normalizeClockToWIB, HHMM_PATTERN } from "@/utils/timeFormatter";

const SELECTED_SHOP_STORAGE_KEY = "auto_shipping_config_selected_shop_id";

const normalizeChannels = (
  channels: LogisticsChannelConfigItem[]
): LogisticsChannelConfigItem[] =>
  channels.map((channel) => ({
    ...channel,
    auto_shipment_window_start: normalizeClockToWIB(channel.auto_shipment_window_start)  ?? "",
    auto_shipment_window_end: normalizeClockToWIB(channel.auto_shipment_window_end) ?? "",
  }));

const boolLabel = (value: boolean): string => (value ? "Yes" : "No");

const resolveShopLabel = (shop: Shop): string => {
  if (shop.name && shop.name.trim() !== "") {
    return `${shop.name} (${shop.identifier})`;
  }
  return `Shop ${shop.identifier}`;
};

function AutoShippingConfigMain() {
  const { toast } = useToast();

  const [shops, setShops] = useState<Shop[]>([]);
  const [shopsLoading, setShopsLoading] = useState(true);
  const [selectedShopId, setSelectedShopId] = useState<number | null>(null);

  const [channels, setChannels] = useState<LogisticsChannelConfigItem[]>([]);
  const [configLoading, setConfigLoading] = useState(false);
  const [configError, setConfigError] = useState<string | null>(null);
  const [isNotSynced, setIsNotSynced] = useState(false);

  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const loadShops = async () => {
      setShopsLoading(true);
      try {
        const nextShops = await getShops();
        setShops(nextShops);

        if (nextShops.length === 0) {
          setSelectedShopId(null);
          return;
        }

        const savedShopIDRaw = localStorage.getItem(SELECTED_SHOP_STORAGE_KEY);
        const savedShopID = savedShopIDRaw ? Number(savedShopIDRaw) : NaN;
        const hasSavedShop = Number.isInteger(savedShopID)
          ? nextShops.some((shop) => shop.id === savedShopID)
          : false;

        const initialShopID = hasSavedShop ? savedShopID : nextShops[0].id;
        setSelectedShopId(initialShopID);
        localStorage.setItem(
          SELECTED_SHOP_STORAGE_KEY,
          initialShopID.toString()
        );
      } catch (error) {
        toast({
          title: "Failed to load shops",
          description: getApiErrorMessage(error, "Unable to load shop list."),
          variant: "destructive",
        });
      } finally {
        setShopsLoading(false);
      }
    };

    void loadShops();
  }, [toast]);

  useEffect(() => {
    const loadConfig = async (shopID: number) => {
      setConfigLoading(true);
      setConfigError(null);
      setIsNotSynced(false);

      try {
        const config = await getLogisticsChannelConfig(shopID);
        setChannels(normalizeChannels(config));
      } catch (error) {
        if (axios.isAxiosError(error) && error.response?.status === 409) {
          setIsNotSynced(true);
          setChannels([]);
        } else {
          setConfigError(
            getApiErrorMessage(error, "Unable to load logistics config.")
          );
          setChannels([]);
        }
      } finally {
        setConfigLoading(false);
      }
    };

    if (selectedShopId === null) {
      setChannels([]);
      setConfigError(null);
      setIsNotSynced(false);
      return;
    }

    void loadConfig(selectedShopId);
  }, [selectedShopId]);

  const handleShopChange = (shopID: number) => {
    setSelectedShopId(shopID);
    localStorage.setItem(SELECTED_SHOP_STORAGE_KEY, shopID.toString());
  };

  const updateChannel = (
    logisticsChannelID: number,
    partial: Partial<LogisticsChannelConfigItem>
  ) => {
    setChannels((prev) =>
      prev.map((channel) =>
        channel.logistics_channel_id === logisticsChannelID
          ? { ...channel, ...partial }
          : channel
      )
    );
  };

  const validateChannels = (): string | null => {
    for (const channel of channels) {
      if (!channel.auto_shipment_enabled) {
        continue;
      }

      const start = channel.auto_shipment_window_start ?? "";
      const end = channel.auto_shipment_window_end ?? "";

      if (!start || !end) {
        return `Channel ${channel.logistics_channel_name} requires both start and end times when enabled.`;
      }
      if (!HHMM_PATTERN.test(start) || !HHMM_PATTERN.test(end)) {
        return `Channel ${channel.logistics_channel_name} has invalid time format. Use HH:mm.`;
      }
    }
    return null;
  };

  const handleSave = async () => {
    if (selectedShopId === null) {
      return;
    }

    const validationError = validateChannels();
    if (validationError) {
      toast({
        title: "Invalid configuration",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      await replaceLogisticsChannelConfig(selectedShopId, {
        channels: channels.map((channel) => ({
          logistics_channel_id: channel.logistics_channel_id,
          auto_shipment_enabled: channel.auto_shipment_enabled,
          window_start: channel.auto_shipment_window_start ?? "",
          window_end: channel.auto_shipment_window_end ?? "",
        })),
      });

      toast({
        title: "Saved",
        description: "Auto shipping configuration updated successfully.",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Save failed",
        description: getApiErrorMessage(
          error,
          "Unable to update auto shipping configuration."
        ),
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleSyncChannels = async () => {
    if (selectedShopId === null) {
      return;
    }

    setSyncing(true);
    try {
      await syncLogisticsChannels(selectedShopId);
      const config = await getLogisticsChannelConfig(selectedShopId);
      setChannels(normalizeChannels(config));
      setIsNotSynced(false);
      setConfigError(null);

      toast({
        title: "Sync complete",
        description: "Logistics channels synced successfully.",
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Sync failed",
        description: getApiErrorMessage(error, "Unable to sync channels."),
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <CardHeader className="px-2">
        <CardTitle>Auto Shipping Config</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {shopsLoading ? (
          <Loading />
        ) : shops.length === 0 ? (
          <p className="text-sm text-slate-600">
            No shops found. Create a shop first to configure auto shipping.
          </p>
        ) : (
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="w-full md:max-w-md">
              <label className="mb-2 block text-sm font-medium">Shop</label>
              <select
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm"
                value={selectedShopId ?? ""}
                onChange={(event) => handleShopChange(Number(event.target.value))}
              >
                {shops.map((shop) => (
                  <option key={shop.id} value={shop.id}>
                    {resolveShopLabel(shop)}
                  </option>
                ))}
              </select>
            </div>

            <Button
              onClick={handleSave}
              disabled={
                selectedShopId === null ||
                channels.length === 0 ||
                saving ||
                configLoading ||
                isNotSynced
              }
            >
              {saving ? "Saving..." : "Save Configuration"}
            </Button>
          </div>
        )}

        {configLoading ? <Loading /> : null}

        {!configLoading && configError ? (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {configError}
          </div>
        ) : null}

        {!configLoading && isNotSynced ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm text-amber-700">
              Logistics channels have not been synced yet for this shop.
            </p>
            <Button
              className="mt-3"
              onClick={handleSyncChannels}
              disabled={syncing}
            >
              {syncing ? "Syncing..." : "Sync Channels"}
            </Button>
          </div>
        ) : null}

        {!configLoading &&
        !configError &&
        !isNotSynced &&
        selectedShopId !== null &&
        channels.length === 0 ? (
          <p className="text-sm text-slate-600">
            No logistics channels available for this shop.
          </p>
        ) : null}

        {!configLoading && !configError && !isNotSynced && channels.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Channel ID</TableHead>
                  <TableHead>Channel Name</TableHead>
                  <TableHead>Enabled</TableHead>
                  <TableHead>Mask Channel</TableHead>
                  <TableHead>Service Type</TableHead>
                  <TableHead>Preprint</TableHead>
                  <TableHead>Auto Shipment</TableHead>
                  <TableHead>Window Start (GMT+7)</TableHead>
                  <TableHead>Window End (GMT+7)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {channels.map((channel) => (
                  <TableRow key={channel.logistics_channel_id}>
                    <TableCell>{channel.logistics_channel_id}</TableCell>
                    <TableCell>{channel.logistics_channel_name}</TableCell>
                    <TableCell>{boolLabel(channel.enabled)}</TableCell>
                    <TableCell>{channel.mask_channel_id}</TableCell>
                    <TableCell>
                      {channel.service_type_identifier?.trim() || "-"}
                    </TableCell>
                    <TableCell>{boolLabel(channel.preprint)}</TableCell>
                    <TableCell>
                      <Switch
                        checked={channel.auto_shipment_enabled}
                        onCheckedChange={(checked) =>
                          updateChannel(channel.logistics_channel_id, {
                            auto_shipment_enabled: checked,
                          })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="time"
                        value={channel.auto_shipment_window_start ?? ""}
                        disabled={!channel.auto_shipment_enabled}
                        onChange={(event) =>
                          updateChannel(channel.logistics_channel_id, {
                            auto_shipment_window_start: event.target.value,
                          })
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="time"
                        value={channel.auto_shipment_window_end ?? ""}
                        disabled={!channel.auto_shipment_enabled}
                        onChange={(event) =>
                          updateChannel(channel.logistics_channel_id, {
                            auto_shipment_window_end: event.target.value,
                          })
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default AutoShippingConfigMain;
