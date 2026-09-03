"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Package,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  CreditCard,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";
import {
  getProducts,
  getProductStats,
  getProductPurchases,
  createProduct,
  updateProduct,
  deleteProduct,
} from "@/lib/api";

interface ProductsViewProps {
  siteId: string;
}

const CURRENCIES = ["NGN", "USD", "EUR", "GBP"] as const;
const PRODUCT_TYPES = [
  "EBOOK",
  "TEMPLATE",
  "CHECKLIST",
  "COURSE",
  "REPORT",
  "TOOL",
  "MEMBERSHIP",
  "SERVICE",
] as const;

const productStatusVariant: Record<string, string> = {
  DRAFT: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
  ACTIVE:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  INACTIVE:
    "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  ARCHIVED: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

const purchaseStatusVariant: Record<string, string> = {
  COMPLETED:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400",
  PENDING:
    "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400",
  FAILED: "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400",
  REFUNDED:
    "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400",
};

function StatCard({
  title,
  value,
  icon: Icon,
  format = "number",
  currency,
}: {
  title: string;
  value: number | undefined;
  icon: React.ElementType;
  format?: "number" | "currency";
  currency?: string;
}) {
  const displayValue =
    value !== undefined
      ? format === "currency"
        ? new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: currency || "USD",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }).format(value)
        : value.toLocaleString()
      : "—";

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{displayValue}</div>
      </CardContent>
    </Card>
  );
}

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 100);
}

const emptyForm = {
  name: "",
  slug: "",
  description: "",
  price: 0,
  currency: "USD",
  productType: "EBOOK",
  checkoutUrl: "",
  imageUrl: "",
  status: "DRAFT",
};

export function ProductsView({ siteId }: ProductsViewProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"products" | "purchases">(
    "products"
  );

  // Dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Record<
    string,
    unknown
  > | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Queries
  const productsQuery = useQuery({
    queryKey: ["products", siteId],
    queryFn: () => getProducts(siteId),
  });

  const statsQuery = useQuery({
    queryKey: ["productStats", siteId],
    queryFn: () => getProductStats(siteId),
  });

  const purchasesQuery = useQuery({
    queryKey: ["productPurchases", siteId],
    queryFn: () => getProductPurchases(siteId),
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      createProduct(siteId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["productStats"] });
      toast({ title: "Product created successfully" });
      closeDialog();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      updateProduct(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast({ title: "Product updated successfully" });
      closeDialog();
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteProduct(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["productStats"] });
      toast({ title: "Product deleted" });
      setDeleteId(null);
    },
    onError: (err: Error) => {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    },
  });

  // Helpers
  function openCreateDialog() {
    setEditingProduct(null);
    setForm(emptyForm);
    setDialogOpen(true);
  }

  function openEditDialog(product: Record<string, unknown>) {
    setEditingProduct(product);
    setForm({
      name: (product.name as string) || "",
      slug: (product.slug as string) || "",
      description: (product.description as string) || "",
      price: (product.price as number) || 0,
      currency: (product.currency as string) || "USD",
      productType: (product.productType as string) || "EBOOK",
      checkoutUrl: (product.checkoutUrl as string) || "",
      imageUrl: (product.imageUrl as string) || "",
      status: (product.status as string) || "DRAFT",
    });
    setDialogOpen(true);
  }

  function closeDialog() {
    setDialogOpen(false);
    setEditingProduct(null);
    setForm(emptyForm);
  }

  function onSubmit() {
    if (!form.name.trim()) return;
    const slug = form.slug || generateSlug(form.name);
    const data = { ...form, slug };
    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id as string, data });
    } else {
      createMutation.mutate(data);
    }
  }

  function handleNameChange(name: string) {
    setForm({
      ...form,
      name,
      slug: editingProduct ? form.slug : generateSlug(name),
    });
  }

  const stats = (statsQuery.data as Record<string, unknown>) || {};
  const products =
    (productsQuery.data as Record<string, unknown>[]) ||
    (productsQuery.data as unknown as { products?: Record<string, unknown>[] })
      ?.products ||
    [];
  const purchases =
    (purchasesQuery.data as Record<string, unknown>[]) ||
    (purchasesQuery.data as unknown as {
      purchases?: Record<string, unknown>[];
    })?.purchases ||
    [];

  const isSaving = createMutation.isPending || updateMutation.isPending;

  const currencyFormatter = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }),
    []
  );

  if (statsQuery.isError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <p className="text-lg font-medium text-destructive">
          Failed to load product data
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {(statsQuery.error as Error)?.message || "An unexpected error occurred"}
        </p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => statsQuery.refetch()}
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs
        value={activeTab}
        onValueChange={(v) => setActiveTab(v as "products" | "purchases")}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="products" className="gap-2">
              <Package className="h-4 w-4" />
              Products
            </TabsTrigger>
            <TabsTrigger value="purchases" className="gap-2">
              <CreditCard className="h-4 w-4" />
              Purchases
            </TabsTrigger>
          </TabsList>

          <Button
            onClick={openCreateDialog}
            disabled={activeTab !== "products"}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Create Product
          </Button>
        </div>

        {/* Products Tab */}
        <TabsContent value="products" className="space-y-6">
          {statsQuery.isLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardHeader className="pb-2">
                    <Skeleton className="h-4 w-24" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-8 w-16" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Total Products"
                value={stats.totalProducts as number}
                icon={Package}
              />
              <StatCard
                title="Active"
                value={stats.activeProducts as number}
                icon={TrendingUp}
              />
              <StatCard
                title="Total Revenue"
                value={stats.totalRevenue as number}
                icon={DollarSign}
                format="currency"
              />
              <StatCard
                title="Total Purchases"
                value={stats.totalPurchases as number}
                icon={ShoppingCart}
              />
            </div>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Products</CardTitle>
            </CardHeader>
            <CardContent>
              {productsQuery.isLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : products.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <Package className="h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-sm font-medium text-muted-foreground">
                    No products yet
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    Create your first digital product to start selling
                  </p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={openCreateDialog}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Create Product
                  </Button>
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Price</TableHead>
                        <TableHead>Purchases</TableHead>
                        <TableHead>Revenue</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {products.map((p) => {
                        const prodCurrency = (p.currency as string) || "USD";
                        const fmt = new Intl.NumberFormat("en-US", {
                          style: "currency",
                          currency: prodCurrency,
                          minimumFractionDigits: 0,
                          maximumFractionDigits: 2,
                        });
                        return (
                          <TableRow key={p.id as string}>
                            <TableCell className="font-medium">
                              {p.name as string}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {p.productType as string}
                              </Badge>
                            </TableCell>
                            <TableCell>{fmt.format(p.price as number)}</TableCell>
                            <TableCell>
                              {(p.purchases as number)?.toLocaleString() || 0}
                            </TableCell>
                            <TableCell className="font-medium text-emerald-600 dark:text-emerald-400">
                              {fmt.format((p.revenue as number) || 0)}
                            </TableCell>
                            <TableCell>
                              <Badge
                                className={cn(
                                  productStatusVariant[
                                    (p.status as string) || ""
                                  ]
                                )}
                              >
                                {(p.status as string) || "—"}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => openEditDialog(p)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-destructive hover:text-destructive"
                                  onClick={() => setDeleteId(p.id as string)}
                                >
                                  <Trash2 className="h-4 w-4" />
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
        </TabsContent>

        {/* Purchases Tab */}
        <TabsContent value="purchases" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Purchase History</CardTitle>
            </CardHeader>
            <CardContent>
              {purchasesQuery.isLoading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : purchases.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center">
                  <CreditCard className="h-12 w-12 text-muted-foreground/50" />
                  <p className="mt-4 text-sm font-medium text-muted-foreground">
                    No purchases recorded yet
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground/70">
                    Purchases will appear here when customers buy your products
                  </p>
                </div>
              ) : (
                <div className="max-h-96 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {purchases.map((purchase) => (
                        <TableRow key={purchase.id as string}>
                          <TableCell className="font-medium">
                            {purchase.email as string}
                          </TableCell>
                          <TableCell>
                            {(purchase.product as Record<string, unknown>)
                              ?.name as string || (purchase.productName as string) || "—"}
                          </TableCell>
                          <TableCell>
                            {currencyFormatter.format(
                              (purchase.amount as number) || 0
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge
                              className={cn(
                                purchaseStatusVariant[
                                  (purchase.status as string) || ""
                                ]
                              )}
                            >
                              {(purchase.status as string) || "—"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-muted-foreground">
                            {purchase.createdAt
                              ? formatDistanceToNow(new Date(purchase.createdAt as string), {
                                  addSuffix: true,
                                })
                              : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Product Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Edit Product" : "Create Product"}
            </DialogTitle>
            <DialogDescription>
              {editingProduct
                ? "Update the product details."
                : "Add a new digital product to sell."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="prod-name">Name</Label>
              <Input
                id="prod-name"
                value={form.name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="e.g. Ultimate SEO Guide"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="prod-slug">Slug</Label>
              <Input
                id="prod-slug"
                value={form.slug}
                onChange={(e) =>
                  setForm({ ...form, slug: e.target.value })
                }
                placeholder="auto-generated-from-name"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="prod-desc">Description</Label>
              <Textarea
                id="prod-desc"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder="Describe your product..."
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="prod-price">Price</Label>
                <Input
                  id="prod-price"
                  type="number"
                  step="0.01"
                  value={form.price}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      price: parseFloat(e.target.value) || 0,
                    })
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="prod-currency">Currency</Label>
                <Select
                  value={form.currency}
                  onValueChange={(v) =>
                    setForm({ ...form, currency: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="prod-type">Product Type</Label>
                <Select
                  value={form.productType}
                  onValueChange={(v) =>
                    setForm({ ...form, productType: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRODUCT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="prod-status">Status</Label>
                <Select
                  value={form.status}
                  onValueChange={(v) =>
                    setForm({ ...form, status: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                    <SelectItem value="ARCHIVED">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="prod-checkout">Checkout URL</Label>
              <Input
                id="prod-checkout"
                value={form.checkoutUrl}
                onChange={(e) =>
                  setForm({ ...form, checkoutUrl: e.target.value })
                }
                placeholder="https://checkout.example.com/..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="prod-image">Image URL</Label>
              <Input
                id="prod-image"
                value={form.imageUrl}
                onChange={(e) =>
                  setForm({ ...form, imageUrl: e.target.value })
                }
                placeholder="https://example.com/image.png"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeDialog}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={onSubmit}
              disabled={isSaving || !form.name.trim()}
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingProduct ? "Save Changes" : "Create Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Alert */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this product? This action cannot be
              undone. All associated purchase data will be preserved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                deleteId && deleteMutation.mutate(deleteId)
              }
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
