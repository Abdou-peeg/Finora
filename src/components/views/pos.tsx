"use client";

import { useMemo, useState } from "react";
import { Banknote, Minus, Plus, Printer, Search, ShoppingBag, Trash2, UserRound, X } from "lucide-react";
import { useCreateSale, useList } from "@/hooks/use-data";
import { currency } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type CartLine = { productId: string; qty: number };
const round2 = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100;

export function PosView() {
  const { data: productsData, isLoading: productsLoading } = useList("products", "");
  const { data: customersData } = useList("customers", "");
  const createSale = useCreateSale();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("Toutes");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [customerPicker, setCustomerPicker] = useState(false);
  const [customerQuery, setCustomerQuery] = useState("");
  const [received, setReceived] = useState("");
  const [receipt, setReceipt] = useState<any>(null);

  const products = productsData?.items ?? [];
  const customers = customersData?.items ?? [];
  const selectedCustomer = customers.find((customer: any) => customer.id === customerId);
  const categories = useMemo(() => ["Toutes", ...Array.from(new Set(products.map((p: any) => p.category).filter(Boolean)))], [products]);
  const visibleProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return products.filter((product: any) => {
      const matchesSearch = !normalized || product.name.toLowerCase().includes(normalized) || product.sku.toLowerCase().includes(normalized);
      return product.active !== false && matchesSearch && (category === "Toutes" || product.category === category);
    });
  }, [products, query, category]);
  const detailedCart = cart.map((line) => ({ ...line, product: products.find((p: any) => p.id === line.productId) })).filter((line) => line.product);
  const totals = useMemo(() => detailedCart.reduce((sum, line: any) => {
    const subtotal = line.qty * Number(line.product.salePrice);
    const tax = subtotal * Number(line.product.taxRate) / 100;
    return { subtotal: sum.subtotal + subtotal, tax: sum.tax + tax, total: sum.total + subtotal + tax };
  }, { subtotal: 0, tax: 0, total: 0 }), [detailedCart]);
  const total = round2(totals.total);
  const receivedNumber = Number(received.replace(",", ".")) || 0;
  const change = Math.max(0, round2(receivedNumber - total));

  function addProduct(product: any) {
    setCart((current) => {
      const found = current.find((line) => line.productId === product.id);
      return found ? current.map((line) => line.productId === product.id ? { ...line, qty: line.qty + 1 } : line) : [...current, { productId: product.id, qty: 1 }];
    });
  }
  function changeQty(productId: string, delta: number) {
    setCart((current) => current.flatMap((line) => {
      if (line.productId !== productId) return [line];
      const qty = line.qty + delta;
      return qty > 0 ? [{ ...line, qty }] : [];
    }));
  }
  function resetSale() { setCart([]); setCustomerId(""); setReceived(""); setQuery(""); setCategory("Toutes"); }
  async function checkout() {
    if (!cart.length) return toast.error("Ajoutez au moins un produit au panier");
    if (receivedNumber < total) return toast.error("Le montant reçu est insuffisant");
    try {
      const sale = await createSale.mutateAsync({
        customerId: customerId || undefined,
        customerName: customerId ? undefined : "Comptant",
        posDefaultCustomer: !customerId,
        confirm: true,
        items: detailedCart.map((line: any) => ({ productId: line.productId, qty: line.qty, unitPrice: Number(line.product.salePrice), taxRate: Number(line.product.taxRate) })),
      });
      setReceipt({ sale, received: receivedNumber || total, change });
      resetSale();
    } catch { /* Toast is handled by the shared mutation hook. */ }
  }
  function printReceipt() {
    if (!receipt) return;
    const escape = (value: unknown) => String(value ?? "").replace(/[&<>\"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character] || character);
    const lines = receipt.sale.items?.map((item: any) => `<tr><td>${escape(item.qty)} × ${escape(item.product?.name)}</td><td>${escape(currency(Number(item.lineTotal)))}</td></tr>`).join("") || "";
    const win = window.open("", "_blank", "width=420,height=640");
    if (!win) return toast.error("Autorisez les fenêtres surgissantes pour imprimer le reçu");
    win.document.write(`<!doctype html><html><head><title>Reçu ${escape(receipt.sale.reference)}</title><style>body{font:14px system-ui;padding:24px;max-width:330px;margin:auto}h1,p{text-align:center;margin:4px}table{width:100%;border-collapse:collapse;margin:18px 0}td{padding:5px 0;vertical-align:top}td:last-child{text-align:right;white-space:nowrap}.total{border-top:1px solid #222;padding-top:10px;font-size:17px;font-weight:700}.row{display:flex;justify-content:space-between;margin:6px 0}</style></head><body><h1>Reçu de caisse</h1><p>${escape(receipt.sale.reference)}</p><table>${lines}</table><div class="row total"><span>Total TTC</span><span>${escape(currency(Number(receipt.sale.total)))}</span></div><div class="row"><span>Reçu</span><span>${escape(currency(receipt.received))}</span></div><div class="row"><span>Monnaie rendue</span><span>${escape(currency(receipt.change))}</span></div></body></html>`);
    win.document.close();
    win.focus();
    win.print();
  }

  return <div className="space-y-4 print:hidden">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div><h1 className="text-2xl font-bold tracking-tight">Caisse tactile</h1><p className="mt-0.5 text-sm text-muted-foreground">Encaissement rapide, stock et caisse mis à jour instantanément.</p></div>
      <Button variant="outline" className="min-h-11" onClick={resetSale}><X className="mr-2 h-4 w-4" /> Nouvelle caisse</Button>
    </div>
    <div className="grid min-h-[calc(100vh-13rem)] gap-4 xl:grid-cols-[minmax(0,1fr)_410px]">
      <section className="rounded-xl border bg-card p-4 shadow-sm">
        <div className="relative mb-3"><Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" /><Input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher un produit ou un code…" className="h-12 pl-10 text-base" /></div>
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">{categories.map((item) => <Button key={item as string} variant={category === item ? "default" : "outline"} className="h-10 whitespace-nowrap" onClick={() => setCategory(item as string)}>{item as string}</Button>)}</div>
        {productsLoading ? <div className="py-16 text-center text-sm text-muted-foreground">Chargement des produits…</div> : visibleProducts.length === 0 ? <div className="py-16 text-center text-sm text-muted-foreground">Aucun produit trouvé.</div> : <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5">{visibleProducts.map((product: any) => <button key={product.id} type="button" onClick={() => addProduct(product)} className="min-h-32 rounded-xl border bg-background p-3 text-left shadow-sm transition active:scale-[.98] hover:border-primary hover:bg-primary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><p className="line-clamp-2 font-semibold leading-tight">{product.name}</p><p className="mt-1 text-xs text-muted-foreground">{product.sku}{product.category ? ` · ${product.category}` : ""}</p><p className="mt-3 text-lg font-bold text-primary">{currency(Number(product.salePrice) * (1 + Number(product.taxRate) / 100))}</p><p className="text-[11px] text-muted-foreground">TTC · stock {Number(product.stockQty)}</p></button>)}</div>}
      </section>
      <aside className="flex flex-col rounded-xl border bg-card shadow-sm">
        <div className="border-b p-4"><div className="flex items-center justify-between"><h2 className="font-semibold">Panier <span className="text-muted-foreground">({cart.reduce((sum, line) => sum + line.qty, 0)})</span></h2>{cart.length > 0 && <Button variant="ghost" size="sm" className="text-rose-600" onClick={() => setCart([])}><Trash2 className="mr-1 h-4 w-4" /> Vider</Button>}</div><Button variant="outline" className="mt-3 h-11 w-full justify-start" onClick={() => setCustomerPicker(true)}><UserRound className="mr-2 h-4 w-4" />{selectedCustomer ? selectedCustomer.name : "Comptant"}</Button></div>
        <div className="min-h-40 flex-1 space-y-2 overflow-y-auto p-3">{detailedCart.length === 0 ? <div className="flex h-40 flex-col items-center justify-center text-center text-sm text-muted-foreground"><ShoppingBag className="mb-2 h-8 w-8 opacity-40" />Touchez un produit pour l’ajouter.</div> : detailedCart.map((line: any) => <div key={line.productId} className="rounded-lg bg-muted/55 p-2.5"><div className="flex justify-between gap-2"><p className="line-clamp-1 text-sm font-medium">{line.product.name}</p><p className="whitespace-nowrap text-sm font-semibold">{currency(line.qty * Number(line.product.salePrice) * (1 + Number(line.product.taxRate) / 100))}</p></div><div className="mt-2 flex items-center justify-between"><span className="text-xs text-muted-foreground">{currency(Number(line.product.salePrice))} HT</span><div className="flex items-center gap-1"><Button size="icon" variant="outline" className="h-9 w-9" onClick={() => changeQty(line.productId, -1)}><Minus className="h-4 w-4" /></Button><span className="w-8 text-center font-semibold tabular-nums">{line.qty}</span><Button size="icon" variant="outline" className="h-9 w-9" onClick={() => changeQty(line.productId, 1)}><Plus className="h-4 w-4" /></Button></div></div></div>)}</div>
        <div className="space-y-3 border-t p-4"><div className="space-y-1 text-sm"><div className="flex justify-between text-muted-foreground"><span>Sous-total HT</span><span>{currency(round2(totals.subtotal))}</span></div><div className="flex justify-between text-muted-foreground"><span>TVA</span><span>{currency(round2(totals.tax))}</span></div><div className="flex justify-between pt-1 text-xl font-bold"><span>Total TTC</span><span className="text-primary">{currency(total)}</span></div></div><div><label className="mb-1.5 flex items-center gap-1.5 text-sm font-medium"><Banknote className="h-4 w-4" /> Espèces reçues</label><Input inputMode="decimal" value={received} onChange={(e) => setReceived(e.target.value)} placeholder={total ? String(total) : "0"} className="h-12 text-lg font-semibold" /><div className={cn("mt-1.5 flex justify-between text-sm", receivedNumber >= total ? "text-emerald-600" : "text-muted-foreground")}><span>Monnaie à rendre</span><strong>{currency(change)}</strong></div></div><Button className="h-14 w-full text-lg font-bold" disabled={!cart.length || createSale.isPending} onClick={checkout}>{createSale.isPending ? "Encaissement…" : "Encaisser"}</Button></div>
      </aside>
    </div>
    <Dialog open={customerPicker} onOpenChange={setCustomerPicker}><DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Choisir un client</DialogTitle></DialogHeader><Input autoFocus value={customerQuery} onChange={(e) => setCustomerQuery(e.target.value)} placeholder="Rechercher un client…" /><div className="max-h-80 space-y-1 overflow-y-auto"><Button variant={!customerId ? "secondary" : "ghost"} className="h-12 w-full justify-start" onClick={() => { setCustomerId(""); setCustomerPicker(false); }}>Comptant</Button>{customers.filter((customer: any) => `${customer.code} ${customer.name}`.toLowerCase().includes(customerQuery.toLowerCase())).map((customer: any) => <Button key={customer.id} variant={customerId === customer.id ? "secondary" : "ghost"} className="h-12 w-full justify-start" onClick={() => { setCustomerId(customer.id); setCustomerPicker(false); }}><span className="mr-2 font-mono text-xs text-muted-foreground">{customer.code}</span>{customer.name}</Button>)}</div></DialogContent></Dialog>
    <Dialog open={!!receipt} onOpenChange={(open) => !open && setReceipt(null)}>{receipt && <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Vente encaissée</DialogTitle></DialogHeader><div className="space-y-3 text-sm"><div className="text-center"><p className="text-lg font-bold">Reçu de caisse</p><p className="font-mono text-xs text-muted-foreground">{receipt.sale.reference}</p></div><div className="border-y py-2">{receipt.sale.items?.map((item: any) => <div key={item.id} className="flex justify-between gap-3 py-1"><span>{item.qty} × {item.product?.name}</span><span>{currency(Number(item.lineTotal))}</span></div>)}</div><div className="space-y-1"><div className="flex justify-between text-lg font-bold"><span>Total TTC</span><span>{currency(Number(receipt.sale.total))}</span></div><div className="flex justify-between"><span>Reçu</span><span>{currency(receipt.received)}</span></div><div className="flex justify-between font-semibold text-emerald-600"><span>Monnaie rendue</span><span>{currency(receipt.change)}</span></div></div></div><Button className="h-11 w-full" onClick={printReceipt}><Printer className="mr-2 h-4 w-4" /> Imprimer le reçu</Button></DialogContent>}</Dialog>
  </div>;
}
