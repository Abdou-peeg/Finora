"use client";

import { useRef, useState } from "react";
import { useCompany, useUpdateCompany } from "@/hooks/use-data";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Save, Upload, X, Image as ImageIcon, FileSignature } from "lucide-react";
import { SENEGAL_CITIES } from "@/lib/format";
import { toast } from "sonner";

const LEGAL_FORMS = ["SARL", "SA", "EURL", "SAS", "Entreprise individuelle", "Autre"];

export function CompanySettingsView() {
  const { data, isLoading } = useCompany();
  const updateM = useUpdateCompany();
  const logoInputRef = useRef<HTMLInputElement>(null);
  const sigInputRef = useRef<HTMLInputElement>(null);

  const s = data?.settings;
  const tenant = data?.tenant;

  const [form, setForm] = useState<any>({
    legalName: s?.legalName || tenant?.name || "",
    legalForm: s?.legalForm || "SARL",
    rc: s?.rc || "",
    ninea: s?.ninea || "",
    nCompte: s?.nCompte || "",
    capital: s?.capital || 0,
    address: s?.address || "",
    city: s?.city || "Dakar",
    postalCode: s?.postalCode || "",
    country: s?.country || "Sénégal",
    phone: s?.phone || "+221 ",
    email: s?.email || "",
    website: s?.website || "",
    bankName: s?.bankName || "",
    bankIban: s?.bankIban || "",
    bankBic: s?.bankBic || "",
    footerNote: s?.footerNote || "",
    logo: s?.logo || "",
    signature: s?.signature || "",
  });

  // Sync form once data loads
  if (isLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-10 w-72" />
        <div className="grid lg:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-64" />)}
        </div>
      </div>
    );
  }

  function setField(k: string, v: any) {
    setForm((prev: any) => ({ ...prev, [k]: v }));
  }

  async function handleFile(field: "logo" | "signature", file: File) {
    if (file.size > 2_000_000) {
      toast.error("Image trop volumineuse (max 2 Mo). Compressez-la d'abord.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setField(field, reader.result as string);
    reader.readAsDataURL(file);
  }

  async function submit() {
    if (!form.legalName) { toast.error("Raison sociale requise"); return; }
    await updateM.mutateAsync(form);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" /> Paramètres de l'entreprise
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Ces informations apparaissent sur les factures, devis, bons de commande et de livraison générés.
          </p>
        </div>
        <Button onClick={submit} disabled={updateM.isPending}>
          <Save className="h-4 w-4 mr-2" /> Enregistrer
        </Button>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Identity */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Identité légale</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Raison sociale *</Label>
              <Input value={form.legalName} onChange={(e) => setField("legalName", e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Forme juridique</Label>
                <Select value={form.legalForm} onValueChange={(v) => setField("legalForm", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LEGAL_FORMS.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Capital social (FCFA)</Label>
                <Input type="number" value={form.capital} onChange={(e) => setField("capital", Number(e.target.value))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>RC (Registre Commerce)</Label>
                <Input value={form.rc} onChange={(e) => setField("rc", e.target.value)} placeholder="SN-DKR-2024-B-12345" />
              </div>
              <div className="space-y-1.5">
                <Label>NINEA</Label>
                <Input value={form.ninea} onChange={(e) => setField("ninea", e.target.value)} placeholder="123456789" />
              </div>
              <div className="space-y-1.5">
                <Label>N° compte contribuable</Label>
                <Input value={form.nCompte} onChange={(e) => setField("nCompte", e.target.value)} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Coordonnées */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Coordonnées</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Adresse</Label>
              <Input value={form.address} onChange={(e) => setField("address", e.target.value)} placeholder="Rue, quartier, numéro" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>Ville</Label>
                <Select value={form.city} onValueChange={(v) => setField("city", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SENEGAL_CITIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Boîte postale</Label>
                <Input value={form.postalCode} onChange={(e) => setField("postalCode", e.target.value)} placeholder="BP 1234" />
              </div>
              <div className="space-y-1.5">
                <Label>Pays</Label>
                <Input value={form.country} onChange={(e) => setField("country", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Téléphone</Label>
                <Input value={form.phone} onChange={(e) => setField("phone", e.target.value)} placeholder="+221 ..." />
              </div>
              <div className="space-y-1.5">
                <Label>Email</Label>
                <Input type="email" value={form.email} onChange={(e) => setField("email", e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Site web</Label>
              <Input value={form.website} onChange={(e) => setField("website", e.target.value)} placeholder="www.entreprise.sn" />
            </div>
          </CardContent>
        </Card>

        {/* Branding : logo + signature */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2"><ImageIcon className="h-4 w-4" /> Logo & Signature</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Logo de l'entreprise</Label>
              <div className="flex items-start gap-3">
                <div className="h-24 w-32 border-2 border-dashed rounded-md flex items-center justify-center overflow-hidden bg-muted/30">
                  {form.logo ? (
                    <img src={form.logo} alt="Logo" className="h-full w-full object-contain" />
                  ) : (
                    <ImageIcon className="h-8 w-8 text-muted-foreground/40" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/svg+xml"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFile("logo", e.target.files[0])}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => logoInputRef.current?.click()}>
                    <Upload className="h-3.5 w-3.5 mr-1.5" /> Choisir un logo
                  </Button>
                  {form.logo && (
                    <Button type="button" variant="ghost" size="sm" className="text-rose-600" onClick={() => setField("logo", "")}>
                      <X className="h-3.5 w-3.5 mr-1.5" /> Retirer
                    </Button>
                  )}
                  <p className="text-[11px] text-muted-foreground">PNG, JPG ou SVG. Max 2 Mo. Recommandé : ratio paysage (ex: 240×80px).</p>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Signature / Cachet</Label>
              <div className="flex items-start gap-3">
                <div className="h-20 w-32 border-2 border-dashed rounded-md flex items-center justify-center overflow-hidden bg-muted/30">
                  {form.signature ? (
                    <img src={form.signature} alt="Signature" className="h-full w-full object-contain" />
                  ) : (
                    <FileSignature className="h-7 w-7 text-muted-foreground/40" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <input
                    ref={sigInputRef}
                    type="file"
                    accept="image/png,image/jpeg"
                    className="hidden"
                    onChange={(e) => e.target.files?.[0] && handleFile("signature", e.target.files[0])}
                  />
                  <Button type="button" variant="outline" size="sm" onClick={() => sigInputRef.current?.click()}>
                    <Upload className="h-3.5 w-3.5 mr-1.5" /> Choisir une signature
                  </Button>
                  {form.signature && (
                    <Button type="button" variant="ghost" size="sm" className="text-rose-600" onClick={() => setField("signature", "")}>
                      <X className="h-3.5 w-3.5 mr-1.5" /> Retirer
                    </Button>
                  )}
                  <p className="text-[11px] text-muted-foreground">PNG transparent recommandé. Apparaîtra en bas des documents PDF.</p>
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Mention pied de page</Label>
              <Textarea
                value={form.footerNote}
                onChange={(e) => setField("footerNote", e.target.value)}
                rows={2}
                placeholder="Ex: Cachet et signature — Merci de votre confiance"
              />
            </div>
          </CardContent>
        </Card>

        {/* Bank info */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Coordonnées bancaires</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <Label>Banque</Label>
              <Input value={form.bankName} onChange={(e) => setField("bankName", e.target.value)} placeholder="Ex: Ecobank, CBAO, Banque Atlantique..." />
            </div>
            <div className="space-y-1.5">
              <Label>IBAN / RIB</Label>
              <Input value={form.bankIban} onChange={(e) => setField("bankIban", e.target.value)} placeholder="N° de compte bancaire" />
            </div>
            <div className="space-y-1.5">
              <Label>Code BIC / SWIFT</Label>
              <Input value={form.bankBic} onChange={(e) => setField("bankBic", e.target.value)} placeholder="Ex: ECOCSNDA" />
            </div>
            <p className="text-[11px] text-muted-foreground pt-2 border-t">
              Ces informations apparaissent en bas des factures et devis pour faciliter les règlements de vos clients.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
