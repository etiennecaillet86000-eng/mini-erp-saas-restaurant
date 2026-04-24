import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAppStore } from "@/core/store/useAppStore";
import type { Immobilisation } from "@/core/store/useAppStore";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Calculator,
  Pencil,
  Plus,
  Trash2,
  TrendingDown,
} from "lucide-react";
import { useMemo, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DepreciationRow {
  year: number;
  vncDebut: number;
  dotation: number;
  vncFin: number;
  method: "linéaire" | "dégressif";
}

interface SyntheseRow {
  id: string;
  nom: string;
  valeurHT: number;
  type: string;
  dotations: number[]; // [An1, An2, An3, An4, An5]
  total: number;
}

// ─── Pure calculation helpers ─────────────────────────────────────────────────

function getFiscalCoefficient(dureeAns: number): number {
  if (dureeAns <= 4) return 1.25;
  if (dureeAns <= 6) return 1.75;
  return 2.25;
}

/**
 * Calculates pro-rata temporis for year 1 based on purchase date.
 * Returns fraction of year from purchase month to Dec 31.
 */
function getProRataAn1(dateAchat: string): number {
  if (!dateAchat) return 1;
  const date = new Date(dateAchat);
  const month = date.getMonth(); // 0-based
  // Remaining months in year (including purchase month)
  const moisRestants = 12 - month;
  return moisRestants / 12;
}

/**
 * Compute 5-year depreciation schedule for a given asset.
 */
function computeDepreciation(immo: Immobilisation): DepreciationRow[] {
  const { valeurAchatHT, dureeAmortissementAns, type, dateAchat } = immo;
  const rows: DepreciationRow[] = [];

  if (type === "linéaire") {
    const tauxLineaire = 1 / dureeAmortissementAns;
    const dotationPleine = valeurAchatHT * tauxLineaire;
    const proRata = getProRataAn1(dateAchat);

    let vnc = valeurAchatHT;

    for (let y = 1; y <= 5; y++) {
      const vncDebut = vnc;
      if (vncDebut <= 0) {
        rows.push({
          year: y,
          vncDebut: 0,
          dotation: 0,
          vncFin: 0,
          method: "linéaire",
        });
        continue;
      }
      const dotation =
        y === 1
          ? Math.min(dotationPleine * proRata, vncDebut)
          : Math.min(dotationPleine, vncDebut);
      vnc = Math.max(0, vncDebut - dotation);
      rows.push({
        year: y,
        vncDebut,
        dotation,
        vncFin: vnc,
        method: "linéaire",
      });
    }
  } else {
    // Dérogatoire / Dégressif fiscal français
    const tauxLineaire = 1 / dureeAmortissementAns;
    const coefficient = getFiscalCoefficient(dureeAmortissementAns);
    const tauxDegressif = tauxLineaire * coefficient;

    let vnc = valeurAchatHT;
    // Track remaining years (for linear-from-remaining switch)
    // We track how many full years have been depreciated
    let yearsDepreciated = 0;

    for (let y = 1; y <= 5; y++) {
      const vncDebut = vnc;
      if (vncDebut <= 0) {
        rows.push({
          year: y,
          vncDebut: 0,
          dotation: 0,
          vncFin: 0,
          method: "dégressif",
        });
        continue;
      }

      const remainingYears = dureeAmortissementAns - yearsDepreciated;
      if (remainingYears <= 0) {
        rows.push({
          year: y,
          vncDebut,
          dotation: 0,
          vncFin: vncDebut,
          method: "dégressif",
        });
        continue;
      }

      const dotationDegressif = vncDebut * tauxDegressif;
      const dotationLineaireRestant =
        remainingYears > 0 ? vncDebut / remainingYears : 0;

      // French fiscal rule: switch to linear when linear-from-remaining >= declining balance
      const useLinear = dotationLineaireRestant >= dotationDegressif;
      const dotation = Math.min(
        useLinear ? dotationLineaireRestant : dotationDegressif,
        vncDebut,
      );

      vnc = Math.max(0, vncDebut - dotation);
      yearsDepreciated += 1;

      rows.push({
        year: y,
        vncDebut,
        dotation,
        vncFin: vnc,
        method: "dégressif",
      });
    }
  }

  return rows;
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

const fmtEur = (n: number) =>
  n.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtPct = (n: number) =>
  (n * 100).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// ─── Empty form factory ───────────────────────────────────────────────────────

const emptyForm = (): Omit<Immobilisation, "id"> => ({
  nom: "",
  valeurAchatHT: 0,
  dureeAmortissementAns: 5,
  type: "linéaire",
  dateAchat: new Date().toISOString().split("T")[0],
});

// ─── Component ────────────────────────────────────────────────────────────────

export default function AmortissementsPage() {
  const immobilisations = useAppStore((s) => s.immobilisations);
  const addImmobilisation = useAppStore((s) => s.addImmobilisation);
  const updateImmobilisation = useAppStore((s) => s.updateImmobilisation);
  const removeImmobilisation = useAppStore((s) => s.removeImmobilisation);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Immobilisation, "id">>(emptyForm());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // ── Selected asset & its depreciation schedule ────────────────────────────
  const selectedImmo = useMemo(
    () => immobilisations.find((i) => i.id === selectedId) ?? null,
    [immobilisations, selectedId],
  );

  const selectedSchedule = useMemo(
    () => (selectedImmo ? computeDepreciation(selectedImmo) : []),
    [selectedImmo],
  );

  // ── Synthèse globale 5 ans ────────────────────────────────────────────────
  const syntheseRows = useMemo<SyntheseRow[]>(() => {
    return immobilisations.map((immo) => {
      const schedule = computeDepreciation(immo);
      const dotations = schedule.map((r) => r.dotation);
      return {
        id: immo.id,
        nom: immo.nom,
        valeurHT: immo.valeurAchatHT,
        type: immo.type,
        dotations,
        total: dotations.reduce((s, d) => s + d, 0),
      };
    });
  }, [immobilisations]);

  const syntheseTotaux = useMemo(() => {
    const totaux = [0, 0, 0, 0, 0];
    for (const r of syntheseRows) {
      for (let i = 0; i < r.dotations.length; i++) {
        totaux[i] += r.dotations[i];
      }
    }
    return totaux;
  }, [syntheseRows]);

  // ── Dialog handlers ───────────────────────────────────────────────────────
  const handleOpenAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const handleOpenEdit = (immo: Immobilisation) => {
    setEditingId(immo.id);
    setForm({
      nom: immo.nom,
      valeurAchatHT: immo.valeurAchatHT,
      dureeAmortissementAns: immo.dureeAmortissementAns,
      type: immo.type,
      dateAchat: immo.dateAchat,
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Supprimer cette immobilisation ?")) {
      removeImmobilisation(id);
      if (selectedId === id) setSelectedId(null);
    }
  };

  const handleSubmit = () => {
    if (editingId) {
      updateImmobilisation(editingId, form);
    } else {
      addImmobilisation({ ...form, id: crypto.randomUUID() });
    }
    setDialogOpen(false);
  };

  const setField = <K extends keyof Omit<Immobilisation, "id">>(
    key: K,
    value: Omit<Immobilisation, "id">[K],
  ) => setForm((f) => ({ ...f, [key]: value }));

  // ── Coefficient info for selected asset ──────────────────────────────────
  const coeff =
    selectedImmo?.type === "dérogatoire"
      ? getFiscalCoefficient(selectedImmo.dureeAmortissementAns)
      : null;
  const tauxLineaire = selectedImmo
    ? 1 / selectedImmo.dureeAmortissementAns
    : 0;
  const tauxEffectif =
    selectedImmo?.type === "dérogatoire" && coeff
      ? tauxLineaire * coeff
      : tauxLineaire;

  return (
    <div className="space-y-6" data-ocid="amortissements.page">
      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">
            Amortissements
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Plan d'amortissement fiscal sur 5 ans — linéaire et dégressif
          </p>
        </div>
        <Button
          onClick={handleOpenAdd}
          className="gap-2"
          data-ocid="amortissements.add_button"
        >
          <Plus className="h-4 w-4" />
          Ajouter une immobilisation
        </Button>
      </div>

      {/* ── KPI summary ──────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-card p-5 flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <TrendingDown className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Immobilisations
            </p>
            <p className="text-2xl font-semibold text-foreground">
              {immobilisations.length}
            </p>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-5 flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Calculator className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Valeur totale HT
            </p>
            <p className="text-2xl font-semibold text-foreground">
              {fmtEur(immobilisations.reduce((s, i) => s + i.valeurAchatHT, 0))}{" "}
              €
            </p>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-5 flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Dotation An 1 (total)
            </p>
            <p className="text-2xl font-semibold text-foreground">
              {fmtEur(syntheseTotaux[0])} €
            </p>
          </div>
        </div>
      </div>

      {/* ── Asset list ────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Gestion des Immobilisations
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>Nom</TableHead>
                <TableHead className="text-right">Valeur HT (€)</TableHead>
                <TableHead className="text-right">Durée (ans)</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Date d'achat</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {immobilisations.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-12 text-muted-foreground"
                    data-ocid="amortissements.empty_state"
                  >
                    Aucune immobilisation enregistrée. Ajoutez votre premier
                    actif.
                  </TableCell>
                </TableRow>
              ) : (
                immobilisations.map((immo, i) => (
                  <TableRow
                    key={immo.id}
                    className={cn(
                      "cursor-pointer transition-colors",
                      selectedId === immo.id
                        ? "bg-primary/5 border-l-2 border-l-primary"
                        : "hover:bg-muted/30",
                    )}
                    onClick={() =>
                      setSelectedId(selectedId === immo.id ? null : immo.id)
                    }
                    data-ocid={`amortissements.item.${i + 1}`}
                  >
                    <TableCell className="font-medium">{immo.nom}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtEur(immo.valeurAchatHT)} €
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {immo.dureeAmortissementAns} ans
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          immo.type === "linéaire"
                            ? "bg-blue-100 text-blue-800 border-blue-200"
                            : "bg-orange-100 text-orange-800 border-orange-200"
                        }
                      >
                        {immo.type === "linéaire" ? "Linéaire" : "Dérogatoire"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {immo.dateAchat
                        ? new Date(immo.dateAchat).toLocaleDateString("fr-FR")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div
                        className="flex justify-end gap-1"
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleOpenEdit(immo)}
                          data-ocid={`amortissements.edit_button.${i + 1}`}
                          aria-label="Modifier"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(immo.id)}
                          data-ocid={`amortissements.delete_button.${i + 1}`}
                          aria-label="Supprimer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* ── Individual depreciation plan ─────────────────────────────────── */}
      {selectedImmo && (
        <Card data-ocid="amortissements.plan.card">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-base">
                  Plan d'Amortissement — {selectedImmo.nom}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  {selectedImmo.type === "linéaire" ? (
                    <>
                      Méthode :{" "}
                      <span className="font-medium text-blue-700">
                        Linéaire
                      </span>
                      {" · "}Taux : {fmtPct(tauxLineaire)} %
                    </>
                  ) : (
                    <>
                      Méthode :{" "}
                      <span className="font-medium text-orange-700">
                        Dégressif fiscal
                      </span>
                      {" · "}Taux linéaire {fmtPct(tauxLineaire)} % × coeff{" "}
                      {coeff} ={" "}
                      <span className="font-semibold">
                        {fmtPct(tauxEffectif)} %
                      </span>
                    </>
                  )}
                </p>
              </div>
              <Badge
                variant="outline"
                className={
                  selectedImmo.type === "linéaire"
                    ? "bg-blue-100 text-blue-800 border-blue-200"
                    : "bg-orange-100 text-orange-800 border-orange-200"
                }
              >
                {selectedImmo.type === "linéaire" ? "Linéaire" : "Dérogatoire"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>Année</TableHead>
                  <TableHead className="text-right">VNC début (€)</TableHead>
                  <TableHead className="text-right">
                    Dotation annuelle (€)
                  </TableHead>
                  <TableHead className="text-right">VNC fin (€)</TableHead>
                  <TableHead>Méthode appliquée</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedSchedule.map((row) => (
                  <TableRow key={row.year}>
                    <TableCell className="font-medium">An {row.year}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtEur(row.vncDebut)} €
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold text-primary">
                      {fmtEur(row.dotation)} €
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtEur(row.vncFin)} €
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          row.method === "linéaire"
                            ? "bg-blue-50 text-blue-700 border-blue-200 text-xs"
                            : "bg-orange-50 text-orange-700 border-orange-200 text-xs"
                        }
                      >
                        {row.method === "linéaire" ? "Linéaire" : "Dégressif"}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ── Synthèse globale 5 ans ────────────────────────────────────────── */}
      {immobilisations.length > 0 && (
        <Card data-ocid="amortissements.synthese.card">
          <CardHeader>
            <CardTitle className="text-base">
              Synthèse des Dotations (5 ans)
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Charges à déduire annuellement du résultat fiscal
            </p>
          </CardHeader>
          <CardContent className="p-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead>Immobilisation</TableHead>
                  <TableHead className="text-right">Valeur HT (€)</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Dotation An 1</TableHead>
                  <TableHead className="text-right">Dotation An 2</TableHead>
                  <TableHead className="text-right">Dotation An 3</TableHead>
                  <TableHead className="text-right">Dotation An 4</TableHead>
                  <TableHead className="text-right">Dotation An 5</TableHead>
                  <TableHead className="text-right">Total 5 ans</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {syntheseRows.map((row, i) => (
                  <TableRow
                    key={row.id}
                    data-ocid={`amortissements.synthese.item.${i + 1}`}
                  >
                    <TableCell className="font-medium">{row.nom}</TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtEur(row.valeurHT)} €
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={
                          row.type === "linéaire"
                            ? "bg-blue-100 text-blue-800 border-blue-200 text-xs"
                            : "bg-orange-100 text-orange-800 border-orange-200 text-xs"
                        }
                      >
                        {row.type === "linéaire" ? "Linéaire" : "Dérogatoire"}
                      </Badge>
                    </TableCell>
                    {row.dotations.map((d, yi) => (
                      <TableCell
                        key={`dot-${row.id}-y${yi + 1}`}
                        className="text-right tabular-nums text-sm"
                      >
                        {fmtEur(d)} €
                      </TableCell>
                    ))}
                    <TableCell className="text-right tabular-nums font-semibold">
                      {fmtEur(row.total)} €
                    </TableCell>
                  </TableRow>
                ))}
                {/* Total row */}
                <TableRow className="bg-muted/50 font-bold border-t-2">
                  <TableCell colSpan={3} className="font-bold text-foreground">
                    TOTAL
                  </TableCell>
                  {syntheseTotaux.map((t, yi) => (
                    <TableCell
                      key={`total-y${yi + 1}`}
                      className="text-right tabular-nums font-bold text-primary"
                    >
                      {fmtEur(t)} €
                    </TableCell>
                  ))}
                  <TableCell className="text-right tabular-nums font-bold text-primary">
                    {fmtEur(syntheseTotaux.reduce((s, t) => s + t, 0))} €
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* ── Add / Edit Dialog ─────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent
          className="sm:max-w-md"
          data-ocid="amortissements.dialog"
        >
          <DialogHeader>
            <DialogTitle>
              {editingId
                ? "Modifier l'immobilisation"
                : "Ajouter une immobilisation"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="immo-nom">Nom</Label>
              <Input
                id="immo-nom"
                value={form.nom}
                onChange={(e) => setField("nom", e.target.value)}
                placeholder="ex: Matériel de cuisine"
                data-ocid="amortissements.nom.input"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="immo-valeur">Valeur d'achat HT (€)</Label>
              <Input
                id="immo-valeur"
                type="number"
                min={0}
                step={100}
                value={form.valeurAchatHT || ""}
                onFocus={(e) => e.target.select()}
                onChange={(e) =>
                  setField("valeurAchatHT", Number(e.target.value))
                }
                placeholder="0"
                data-ocid="amortissements.valeur.input"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="immo-duree">Durée (ans)</Label>
                <Input
                  id="immo-duree"
                  type="number"
                  min={1}
                  max={50}
                  value={form.dureeAmortissementAns || ""}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) =>
                    setField("dureeAmortissementAns", Number(e.target.value))
                  }
                  data-ocid="amortissements.duree.input"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="immo-type">Type d'amortissement</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) =>
                    setField("type", v as Immobilisation["type"])
                  }
                >
                  <SelectTrigger
                    id="immo-type"
                    data-ocid="amortissements.type.select"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="linéaire">Linéaire</SelectItem>
                    <SelectItem value="dérogatoire">
                      Dérogatoire (fiscal)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Coefficient info for dérogatoire */}
            {form.type === "dérogatoire" && form.dureeAmortissementAns > 0 && (
              <div className="rounded-md bg-orange-50 border border-orange-200 p-3 text-sm text-orange-800">
                <p className="font-medium mb-1">Calcul dégressif fiscal :</p>
                <p>
                  Taux linéaire : {fmtPct(1 / form.dureeAmortissementAns)} % ×
                  coeff {getFiscalCoefficient(form.dureeAmortissementAns)} ={" "}
                  <span className="font-bold">
                    {fmtPct(
                      (1 / form.dureeAmortissementAns) *
                        getFiscalCoefficient(form.dureeAmortissementAns),
                    )}{" "}
                    %
                  </span>
                </p>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="immo-date">Date d'achat</Label>
              <Input
                id="immo-date"
                type="date"
                value={form.dateAchat}
                onChange={(e) => setField("dateAchat", e.target.value)}
                data-ocid="amortissements.date.input"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              data-ocid="amortissements.cancel_button"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              data-ocid="amortissements.submit_button"
            >
              {editingId ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
