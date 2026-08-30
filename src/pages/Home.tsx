import Loading from "@/components/loading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { getApiErrorMessage } from "@/lib/api-error";
import { getShops, pingTelegram, updateShop } from "@/services/shopService";
import { Shop } from "@/types/Shop";
import { MoreHorizontal } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router-dom";

const shopActionMenuWidth = 192;
const shopActionMenuHeight = 136;

const resolveShopLabel = (shop: Shop): string => {
  if (shop.name && shop.name.trim() !== "") {
    return shop.name;
  }
  return `Shop ${shop.identifier}`;
};

const resolveTokenStatus = (shop: Shop): {
  label: string;
  className: string;
} => {
  if (!shop.token_connected) {
    return {
      label: "Not Connected",
      className: "bg-slate-100 text-slate-700",
    };
  }

  if (shop.refresh_token_expired) {
    return {
      label: "Re-authentication Required",
      className: "bg-red-100 text-red-700",
    };
  }

  return {
    label: "Connected",
    className: "bg-emerald-100 text-emerald-700",
  };
};

const getConnectURL = (): string => {
  const apiURL = (import.meta.env.VITE_API_URL as string | undefined)?.trim();
  if (!apiURL) {
    return "/api/auth/shopee/connect";
  }

  return `${apiURL.replace(/\/+$/, "")}/api/auth/shopee/connect`;
};

const resolveFailureReason = (reason: string | null): string => {
  switch (reason) {
    case "unauthorized":
      return "Session not found. Please login and try again.";
    case "invalid_callback":
      return "Shopee callback is missing required parameters.";
    case "invalid_shop_id":
      return "Shopee callback returned an invalid shop id.";
    case "shop_owned_by_other_user":
      return "This Shopee shop is already linked to another account.";
    case "token_exchange_failed":
      return "Shopee token exchange failed. Please try reconnecting.";
    default:
      return "Shopee connection failed. Please try again.";
  }
};

function Home() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [shops, setShops] = useState<Shop[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [editingShop, setEditingShop] = useState<Shop | null>(null);
  const [shopNameInput, setShopNameInput] = useState("");
  const [telegramBotTokenInput, setTelegramBotTokenInput] = useState("");
  const [telegramChatIDInput, setTelegramChatIDInput] = useState("");
  const [isSavingShopDetails, setIsSavingShopDetails] = useState(false);
  const [clearingTelegramShopID, setClearingTelegramShopID] = useState<number | null>(null);
  const [pingingTelegramShopID, setPingingTelegramShopID] = useState<number | null>(null);
  const [openShopActionsID, setOpenShopActionsID] = useState<number | null>(null);
  const [shopActionsPosition, setShopActionsPosition] = useState<
    { top: number; left: number } | null
  >(null);
  const [savingAutoShippingShopID, setSavingAutoShippingShopID] = useState<
    number | null
  >(null);

  const handledSearchRef = useRef<string | null>(null);
  const shopActionButtonRefs = useRef<Record<number, HTMLButtonElement | null>>({});
  const connectURL = useMemo(() => getConnectURL(), []);

  const closeShopActions = () => {
    setOpenShopActionsID(null);
    setShopActionsPosition(null);
  };

  const toggleShopActions = (shopID: number) => {
    if (openShopActionsID === shopID) {
      closeShopActions();
      return;
    }

    const button = shopActionButtonRefs.current[shopID];
    if (!button) {
      return;
    }

    const buttonBounds = button.getBoundingClientRect();
    const maxLeft = Math.max(8, window.innerWidth - shopActionMenuWidth - 8);
    const left = Math.min(
      maxLeft,
      Math.max(8, buttonBounds.right - shopActionMenuWidth),
    );
    const opensAbove =
      window.innerHeight - buttonBounds.bottom < shopActionMenuHeight + 8 &&
      buttonBounds.top >= shopActionMenuHeight + 8;
    const top = opensAbove
      ? buttonBounds.top - shopActionMenuHeight - 8
      : buttonBounds.bottom + 8;

    setShopActionsPosition({ top, left });
    setOpenShopActionsID(shopID);
  };

  useEffect(() => {
    if (openShopActionsID === null) {
      return;
    }

    const handleDocumentPointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest("[data-shop-actions]")) {
        return;
      }
      closeShopActions();
    };

    const handleDocumentKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeShopActions();
      }
    };

    document.addEventListener("pointerdown", handleDocumentPointerDown);
    document.addEventListener("keydown", handleDocumentKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handleDocumentPointerDown);
      document.removeEventListener("keydown", handleDocumentKeyDown);
    };
  }, [openShopActionsID]);

  useEffect(() => {
    if (openShopActionsID === null) {
      return;
    }

    const closeOnViewportChange = () => closeShopActions();
    window.addEventListener("resize", closeOnViewportChange);
    window.addEventListener("scroll", closeOnViewportChange, true);
    return () => {
      window.removeEventListener("resize", closeOnViewportChange);
      window.removeEventListener("scroll", closeOnViewportChange, true);
    };
  }, [openShopActionsID]);

  useEffect(() => {
    const loadShops = async () => {
      setLoading(true);
      try {
        const response = await getShops();
        setShops(response);
      } catch (error) {
        toast({
          title: "Failed to load shops",
          description: getApiErrorMessage(error, "Unable to retrieve connected shops."),
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    void loadShops();
  }, [toast]);

  useEffect(() => {
    if (!location.search || handledSearchRef.current === location.search) {
      return;
    }

    const params = new URLSearchParams(location.search);
    const shopeeConnectStatus = params.get("shopee_connect");
    if (!shopeeConnectStatus) {
      return;
    }

    handledSearchRef.current = location.search;

    if (shopeeConnectStatus === "success") {
      const shopID = params.get("shop_id");
      toast({
        title: "Shopee Connected",
        description: shopID
          ? `Shop ${shopID} has been connected successfully.`
          : "Shopee account connected successfully.",
        variant: "success",
      });
    } else {
      const reason = params.get("reason");
      toast({
        title: "Shopee Connection Failed",
        description: resolveFailureReason(reason),
        variant: "destructive",
      });
    }

    params.delete("shopee_connect");
    params.delete("reason");
    params.delete("shop_id");

    const cleanSearch = params.toString();
    navigate(
      {
        pathname: location.pathname,
        search: cleanSearch ? `?${cleanSearch}` : "",
      },
      { replace: true },
    );
  }, [location.pathname, location.search, navigate, toast]);

  const handleConnectShopee = () => {
    window.location.assign(connectURL);
  };

  const openEditShopDialog = (shop: Shop) => {
    setEditingShop(shop);
    setShopNameInput(shop.name ?? "");
    setTelegramBotTokenInput("");
    setTelegramChatIDInput("");
    setIsSavingShopDetails(false);
  };

  const handleEditDialogChange = (open: boolean) => {
    if (!open) {
      setEditingShop(null);
      setShopNameInput("");
      setTelegramBotTokenInput("");
      setTelegramChatIDInput("");
      setIsSavingShopDetails(false);
    }
  };

  const mergeUpdatedShop = (updatedShop: Shop) => {
    setShops((prev) =>
      prev.map((shop) =>
        shop.id === updatedShop.id
          ? {
              ...shop,
              ...updatedShop,
            }
          : shop,
      ),
    );
  };

  const handleSaveShopDetails = async () => {
    if (!editingShop) {
      return;
    }

    const telegramBotToken = telegramBotTokenInput.trim();
    const telegramChatID = telegramChatIDInput.trim();
    const hasTelegramBotToken = telegramBotToken !== "";
    const hasTelegramChatID = telegramChatID !== "";

    if (hasTelegramBotToken !== hasTelegramChatID) {
      toast({
        title: "Invalid Telegram Configuration",
        description: "Telegram bot token and chat ID must be filled together.",
        variant: "destructive",
      });
      return;
    }

    setIsSavingShopDetails(true);
    try {
      const updatedShop = await updateShop(editingShop.id, {
        shop_name: shopNameInput.trim(),
        ...(hasTelegramBotToken && hasTelegramChatID
          ? {
              telegram_bot_token: telegramBotToken,
              telegram_chat_id: telegramChatID,
            }
          : {}),
      });

      mergeUpdatedShop(updatedShop);

      toast({
        title: "Shop Updated",
        description:
          hasTelegramBotToken && hasTelegramChatID
            ? "Shop details and Telegram configuration updated successfully."
            : "Shop name updated successfully.",
        variant: "success",
      });

      handleEditDialogChange(false);
    } catch (error) {
      toast({
        title: "Update Failed",
        description: getApiErrorMessage(error, "Unable to update shop settings."),
        variant: "destructive",
      });
      setIsSavingShopDetails(false);
    }
  };

  const handleClearTelegramConfig = async (shop: Shop) => {
    closeShopActions();
    setClearingTelegramShopID(shop.id);
    try {
      const updatedShop = await updateShop(shop.id, {
        clear_telegram_config: true,
      });

      mergeUpdatedShop(updatedShop);

      toast({
        title: "Telegram Configuration Cleared",
        description: `${resolveShopLabel(shop)} Telegram delivery has been removed.`,
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Clear Failed",
        description: getApiErrorMessage(error, "Unable to clear Telegram configuration."),
        variant: "destructive",
      });
    } finally {
      setClearingTelegramShopID((current) => (current === shop.id ? null : current));
    }
  };

  const handlePingTelegram = async (shop: Shop) => {
    closeShopActions();
    setPingingTelegramShopID(shop.id);
    try {
      await pingTelegram(shop.id);
      toast({
        title: "Telegram Ping Sent",
        description: `${resolveShopLabel(shop)} accepted the Telegram test message.`,
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Telegram Ping Failed",
        description: getApiErrorMessage(error, "Unable to send a Telegram test message."),
        variant: "destructive",
      });
    } finally {
      setPingingTelegramShopID((current) => (current === shop.id ? null : current));
    }
  };

  const handleAutoShipmentToggle = async (shop: Shop, checked: boolean) => {
    setSavingAutoShippingShopID(shop.id);

    try {
      const updatedShop = await updateShop(shop.id, {
        auto_shipment_enabled: checked,
      });

      mergeUpdatedShop(updatedShop);

      toast({
        title: checked ? "Auto Shipment Enabled" : "Auto Shipment Disabled",
        description: `${resolveShopLabel(shop)} updated successfully.`,
        variant: "success",
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: getApiErrorMessage(
          error,
          "Unable to update auto shipment setting.",
        ),
        variant: "destructive",
      });
    } finally {
      setSavingAutoShippingShopID((current) =>
        current === shop.id ? null : current,
      );
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Connected Shopee Shops</CardTitle>
          <Button onClick={handleConnectShopee}>Connect Shopee Account</Button>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600">
            Connect a Shopee account to this user, and re-authenticate any shop with an expired refresh token.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Shop Status</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Loading />
          ) : shops.length === 0 ? (
            <p className="text-sm text-slate-600">
              No shops connected yet. Click "Connect Shopee Account" to start.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Shop</TableHead>
                    <TableHead>Identifier</TableHead>
                    <TableHead>Marketplace</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Telegram</TableHead>
                    <TableHead>Refresh Token Expires At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shops.map((shop) => {
                    const status = resolveTokenStatus(shop);
                    const isSavingAutoShipment =
                      savingAutoShippingShopID === shop.id;
                    const isTelegramActionBusy =
                      clearingTelegramShopID === shop.id ||
                      pingingTelegramShopID === shop.id;

                    return (
                      <TableRow key={shop.id}>
                        <TableCell>{resolveShopLabel(shop)}</TableCell>
                        <TableCell>{shop.identifier}</TableCell>
                        <TableCell className="capitalize">{shop.marketplace}</TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ${status.className}`}
                          >
                            {status.label}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-flex rounded-md px-2 py-1 text-xs font-medium ${
                              shop.has_telegram_config
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {shop.has_telegram_config ? "Configured" : "Not Configured"}
                          </span>
                        </TableCell>
                        <TableCell>
                          {shop.refresh_token_expires_at
                            ? new Date(shop.refresh_token_expires_at).toLocaleString()
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex flex-col items-end gap-2 md:flex-row md:items-center md:justify-end">
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-slate-500">
                                Auto Shipment
                              </span>
                              <Switch
                                checked={Boolean(shop.auto_shipment_enabled)}
                                disabled={isSavingAutoShipment}
                                aria-label={`Toggle auto shipment for ${resolveShopLabel(shop)}`}
                                onCheckedChange={(checked) =>
                                  void handleAutoShipmentToggle(shop, checked)
                                }
                              />
                            </div>
                            <div className="relative" data-shop-actions>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                ref={(element) => {
                                  shopActionButtonRefs.current[shop.id] = element;
                                }}
                                aria-label={`More actions for ${resolveShopLabel(shop)}`}
                                aria-haspopup="menu"
                                aria-expanded={openShopActionsID === shop.id}
                                onClick={() => toggleShopActions(shop.id)}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Shop actions</span>
                              </Button>
                            </div>
                            {openShopActionsID === shop.id && shopActionsPosition
                              ? createPortal(
                                  <div
                                    data-shop-actions
                                    role="menu"
                                    aria-label={`Actions for ${resolveShopLabel(shop)}`}
                                    className="fixed z-50 w-48 rounded-md border border-slate-200 bg-white p-1 text-left shadow-lg"
                                    style={{
                                      top: shopActionsPosition.top,
                                      left: shopActionsPosition.left,
                                    }}
                                  >
                                    <button
                                      type="button"
                                      role="menuitem"
                                      className="flex w-full items-center rounded-sm px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 focus:bg-slate-100 focus:outline-none"
                                      onClick={() => {
                                        closeShopActions();
                                        openEditShopDialog(shop);
                                      }}
                                    >
                                      Edit Shop
                                    </button>
                                    <button
                                      type="button"
                                      role="menuitem"
                                      disabled={!shop.has_telegram_config || isTelegramActionBusy}
                                      className="flex w-full items-center rounded-sm px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 focus:bg-slate-100 focus:outline-none disabled:pointer-events-none disabled:opacity-50"
                                      onClick={() => void handleClearTelegramConfig(shop)}
                                    >
                                      {clearingTelegramShopID === shop.id
                                        ? "Clearing..."
                                        : "Clear Telegram"}
                                    </button>
                                    <button
                                      type="button"
                                      role="menuitem"
                                      disabled={!shop.has_telegram_config || isTelegramActionBusy}
                                      className="flex w-full items-center rounded-sm px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 focus:bg-slate-100 focus:outline-none disabled:pointer-events-none disabled:opacity-50"
                                      onClick={() => void handlePingTelegram(shop)}
                                    >
                                      {pingingTelegramShopID === shop.id
                                        ? "Pinging..."
                                        : "Ping Telegram"}
                                    </button>
                                  </div>,
                                  document.body,
                                )
                              : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(editingShop)} onOpenChange={handleEditDialogChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Shop</DialogTitle>
            <DialogDescription>
              Update the shop name and Telegram destination for this connected Shopee shop. Saved Telegram credentials are write-only and will not be shown again.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              Telegram status:{" "}
              <span className="font-medium text-slate-900">
                {editingShop?.has_telegram_config ? "Configured" : "Not configured"}
              </span>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="shop-name-input">
                Shop Name
              </label>
              <Input
                id="shop-name-input"
                placeholder="e.g. Rimu Medan Main Store"
                value={shopNameInput}
                onChange={(event) => setShopNameInput(event.target.value)}
                disabled={isSavingShopDetails}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="telegram-bot-token-input">
                Telegram Bot Token
              </label>
              <Input
                id="telegram-bot-token-input"
                type="password"
                placeholder="Enter a new bot token to set or replace"
                value={telegramBotTokenInput}
                onChange={(event) => setTelegramBotTokenInput(event.target.value)}
                disabled={isSavingShopDetails}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor="telegram-chat-id-input">
                Telegram Chat ID
              </label>
              <Input
                id="telegram-chat-id-input"
                placeholder="e.g. -1001234567890"
                value={telegramChatIDInput}
                onChange={(event) => setTelegramChatIDInput(event.target.value)}
                disabled={isSavingShopDetails}
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => handleEditDialogChange(false)}
              disabled={isSavingShopDetails}
            >
              Cancel
            </Button>
            <Button
              onClick={() => void handleSaveShopDetails()}
              disabled={isSavingShopDetails}
            >
              {isSavingShopDetails ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Home;
