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
import { getShops, updateShop } from "@/services/shopService";
import { Shop } from "@/types/Shop";
import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

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
  const [isSavingShopName, setIsSavingShopName] = useState(false);
  const [savingAutoShippingShopID, setSavingAutoShippingShopID] = useState<
    number | null
  >(null);

  const handledSearchRef = useRef<string | null>(null);
  const connectURL = useMemo(() => getConnectURL(), []);

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
  };

  const handleEditDialogChange = (open: boolean) => {
    if (!open) {
      setEditingShop(null);
      setShopNameInput("");
      setIsSavingShopName(false);
    }
  };

  const handleSaveShopName = async () => {
    if (!editingShop) {
      return;
    }

    setIsSavingShopName(true);
    try {
      const updatedShop = await updateShop(editingShop.id, {
        shop_name: shopNameInput.trim(),
      });

      setShops((prev) =>
        prev.map((shop) =>
          shop.id === editingShop.id
            ? {
                ...shop,
                ...updatedShop,
              }
            : shop,
        ),
      );

      toast({
        title: "Shop Updated",
        description: "Shop name updated successfully.",
        variant: "success",
      });

      handleEditDialogChange(false);
    } catch (error) {
      toast({
        title: "Update Failed",
        description: getApiErrorMessage(error, "Unable to update shop name."),
        variant: "destructive",
      });
      setIsSavingShopName(false);
    }
  };

  const handleAutoShipmentToggle = async (shop: Shop, checked: boolean) => {
    setSavingAutoShippingShopID(shop.id);

    try {
      const updatedShop = await updateShop(shop.id, {
        auto_shipment_enabled: checked,
      });

      setShops((prev) =>
        prev.map((currentShop) =>
          currentShop.id === shop.id
            ? {
                ...currentShop,
                ...updatedShop,
              }
            : currentShop,
        ),
      );

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
                    <TableHead>Refresh Token Expires At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shops.map((shop) => {
                    const status = resolveTokenStatus(shop);
                    const isSavingAutoShipment =
                      savingAutoShippingShopID === shop.id;

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
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditShopDialog(shop)}
                            >
                              Edit Name
                            </Button>
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
            <DialogTitle>Edit Shop Name</DialogTitle>
            <DialogDescription>
              Set a friendly name for this connected Shopee shop. Leave it empty to fall back to the shop identifier.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label className="text-sm font-medium" htmlFor="shop-name-input">
              Shop Name
            </label>
            <Input
              id="shop-name-input"
              placeholder="e.g. Rimu Medan Main Store"
              value={shopNameInput}
              onChange={(event) => setShopNameInput(event.target.value)}
              disabled={isSavingShopName}
            />
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleEditDialogChange(false)}
              disabled={isSavingShopName}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveShopName} disabled={isSavingShopName}>
              {isSavingShopName ? "Saving..." : "Save Name"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Home;
