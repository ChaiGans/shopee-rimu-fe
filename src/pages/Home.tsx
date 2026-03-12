import Loading from "@/components/loading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { getShops } from "@/services/shopService";
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
    return "";
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
    if (!connectURL) {
      toast({
        title: "Configuration Missing",
        description: "VITE_API_URL is not configured.",
        variant: "destructive",
      });
      return;
    }

    window.location.assign(connectURL);
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
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shops.map((shop) => {
                    const status = resolveTokenStatus(shop);
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
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default Home;
