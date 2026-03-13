import { useEffect, useMemo, useState } from "react";

import Loading from "@/components/loading";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
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
import { getMarketplaceProducts } from "@/services/productService";
import { getShops } from "@/services/shopService";
import { ProductItem, ProductListData, ProductStatus } from "@/types/Product";
import { Shop } from "@/types/Shop";

const PRODUCT_STATUSES: ProductStatus[] = [
  "NORMAL",
  "BANNED",
  "UNLIST",
  "REVIEWING",
  "SELLER_DELETE",
  "SHOPEE_DELETE",
];

const SELECTED_SHOP_STORAGE_KEY = "warehouse_products_selected_shop_id";

const resolveShopLabel = (shop: Shop): string => {
  if (shop.name && shop.name.trim() !== "") {
    return `${shop.name} (${shop.identifier})`;
  }
  return `Shop ${shop.identifier}`;
};

const getPrimaryPriceInfo = (item: ProductItem) =>
  item.price_info && item.price_info.length > 0 ? item.price_info[0] : undefined;

const getTotalAvailableStock = (item: ProductItem): string => {
  const totalAvailable = item.stock_info_v2?.summary_info?.total_available_stock;
  if (typeof totalAvailable === "number") {
    return totalAvailable.toString();
  }
  return "-";
};

const formatPrice = (value?: number, currency?: string): string => {
  if (typeof value !== "number") {
    return "-";
  }

  if (currency) {
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }).format(value);
    } catch {
      return `${currency} ${value.toFixed(2)}`;
    }
  }

  return value.toFixed(2);
};

function WarehouseProductsMain() {
  const { toast } = useToast();

  const [shops, setShops] = useState<Shop[]>([]);
  const [shopsLoading, setShopsLoading] = useState(true);
  const [selectedShopId, setSelectedShopId] = useState<number | null>(null);

  const [products, setProducts] = useState<ProductListData | null>(null);
  const [productsLoading, setProductsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [statuses, setStatuses] = useState<ProductStatus[]>(["NORMAL"]);
  const [search, setSearch] = useState("");

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
        localStorage.setItem(SELECTED_SHOP_STORAGE_KEY, initialShopID.toString());
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
    if (selectedShopId === null) {
      setProducts(null);
      return;
    }

    const loadProducts = async () => {
      setProductsLoading(true);
      try {
        const response = await getMarketplaceProducts({
          shopId: selectedShopId,
          page,
          size: pageSize,
          statuses,
        });
        setProducts(response);
      } catch (error) {
        toast({
          title: "Failed to load products",
          description: getApiErrorMessage(error, "Unable to load products."),
          variant: "destructive",
        });
      } finally {
        setProductsLoading(false);
      }
    };

    void loadProducts();
  }, [page, pageSize, selectedShopId, statuses, toast]);

  const totalPages = useMemo(() => {
    const totalCount = products?.pagination.total_count ?? 0;
    if (totalCount === 0) {
      return 1;
    }
    return Math.ceil(totalCount / pageSize);
  }, [products?.pagination.total_count, pageSize]);

  const filteredItems = useMemo(() => {
    const items = products?.items ?? [];
    const keyword = search.trim().toLowerCase();
    if (!keyword) {
      return items;
    }

    return items.filter((item) => {
      const itemID = item.item_id.toString();
      const itemName = (item.item_name ?? "").toLowerCase();
      const itemSKU = (item.item_sku ?? "").toLowerCase();
      const itemStatus = (item.item_status ?? "").toLowerCase();
      const itemStock = getTotalAvailableStock(item).toLowerCase();

      return (
        itemID.includes(keyword) ||
        itemName.includes(keyword) ||
        itemSKU.includes(keyword) ||
        itemStatus.includes(keyword) ||
        itemStock.includes(keyword)
      );
    });
  }, [products?.items, search]);

  const handleShopChange = (shopID: number) => {
    setSelectedShopId(shopID);
    localStorage.setItem(SELECTED_SHOP_STORAGE_KEY, shopID.toString());
    setPage(1);
  };

  const toggleStatus = (status: ProductStatus) => {
    setPage(1);
    setStatuses((prev) => {
      if (prev.includes(status)) {
        const next = prev.filter((s) => s !== status);
        return next.length === 0 ? ["NORMAL"] : next;
      }
      return [...prev, status];
    });
  };

  const selectAllStatuses = () => {
    setPage(1);
    setStatuses([...PRODUCT_STATUSES]);
  };

  return (
    <Card className="p-4 space-y-4">
      <CardHeader>
        <CardTitle>Warehouse - Products</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {shopsLoading ? (
          <Loading />
        ) : shops.length === 0 ? (
          <p className="text-sm text-slate-600">
            No shops found. Connect a Shopee shop first.
          </p>
        ) : (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
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

              <div className="flex items-end gap-3">
                <div>
                  <label className="mb-2 block text-sm font-medium">Page Size</label>
                  <Input
                    type="number"
                    min={1}
                    max={100}
                    value={pageSize}
                    onChange={(event) => {
                      const next = Number(event.target.value);
                      if (!Number.isNaN(next) && next >= 1 && next <= 100) {
                        setPageSize(next);
                        setPage(1);
                      }
                    }}
                    className="w-24"
                  />
                </div>
              </div>
            </div>

            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium">Statuses</label>
                <Button variant="outline" size="sm" onClick={selectAllStatuses}>
                  Select All
                </Button>
              </div>
              <div className="flex flex-wrap gap-3">
                {PRODUCT_STATUSES.map((status) => (
                  <label
                    key={status}
                    className="inline-flex items-center gap-2 rounded-md border px-3 py-1 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={statuses.includes(status)}
                      onChange={() => toggleStatus(status)}
                    />
                    {status}
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">Search (Current Page)</label>
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by item id, name, sku, status, or stock"
                className="max-w-md"
              />
            </div>

            {productsLoading ? (
              <Loading />
            ) : (
              <>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item ID</TableHead>
                        <TableHead>Item Name</TableHead>
                        <TableHead>Item SKU</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Stock</TableHead>

                        <TableHead>Current Price</TableHead>
                        <TableHead>Original Price</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredItems.map((item) => {
                        const priceInfo = getPrimaryPriceInfo(item);
                        return (
                          <TableRow key={item.item_id}>
                            <TableCell>{item.item_id}</TableCell>
                            <TableCell>{item.item_name || "-"}</TableCell>
                            <TableCell>{item.item_sku || "-"}</TableCell>
                            <TableCell>{item.item_status || "-"}</TableCell>
                            <TableCell>{getTotalAvailableStock(item)}</TableCell>
                            <TableCell>
                              {formatPrice(priceInfo?.current_price, priceInfo?.currency)}
                            </TableCell>
                            <TableCell>
                              {formatPrice(priceInfo?.original_price, priceInfo?.currency)}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>

                {(products?.items?.length ?? 0) === 0 ? (
                  <p className="text-sm text-slate-600">No products found for selected filters.</p>
                ) : filteredItems.length === 0 ? (
                  <p className="text-sm text-slate-600">No products matched your search keyword.</p>
                ) : null}

                <div className="text-sm text-slate-600">
                  Showing {filteredItems.length} of {products?.items?.length ?? 0} on this page | Total:{" "}
                  {products?.pagination.total_count ?? 0} items | Page {page} of {totalPages}
                </div>

                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious
                        href="#"
                        onClick={(event) => {
                          event.preventDefault();
                          if (page > 1) {
                            setPage(page - 1);
                          }
                        }}
                      />
                    </PaginationItem>
                    <PaginationItem>
                      <PaginationNext
                        href="#"
                        onClick={(event) => {
                          event.preventDefault();
                          if (page < totalPages) {
                            setPage(page + 1);
                          }
                        }}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default WarehouseProductsMain;
