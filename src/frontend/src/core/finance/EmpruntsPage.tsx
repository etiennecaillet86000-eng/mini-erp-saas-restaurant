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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { Emprunt } from "@/core/store/useAppStore";
import { useAppStore } from "@/core/store/useAppStore";
import { Calculator, Pencil, Plus, Trash2, TrendingDown } from "lucide-react";
import { useMemo, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface AmortissementRow {
  mois: number;
  capitalDebutDu: number;
  mensualite: number;
  interets: number;
  capitalRembourse: number;
  capitalFinDu: number;
}

interface EmpruntForm {
  nom: string;
  capitalInitial: number;
  tauxAnnuel: number;
  dureeMois: number;
  dateDebut: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const emptyForm = (): EmpruntForm => ({
  nom: "",
  capitalInitial: 0,
  tauxAnnuel: 0,
  dureeMois: 0,
  dateDebut: new Date().toISOString().split("T")[0],
});

const fmt = (n: number) =>
  `${n.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`;

const fmtPct = (n: number) =>
  `${n.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} %`;

function calcMensualite(
  capitalInitial: number,
  tauxAnnuel: number,
  dureeMois: number,
): number {
  if (dureeMois <= 0 || capitalInitial <= 0) return 0;
  const monthlyRate = tauxAnnuel / 100 / 12;
  if (monthlyRate === 0) {
    return Math.round((capitalInitial / dureeMois) * 100) / 100;
  }
  const mensualite =
    (capitalInitial * monthlyRate) / (1 - (1 + monthlyRate) ** -dureeMois);
  return Math.round(mensualite * 100) / 100;
}

function buildAmortissementTable(emprunt: Emprunt): AmortissementRow[] {
  const { capitalInitial, tauxAnnuel, dureeMois } = emprunt;
  if (dureeMois <= 0 || capitalInitial <= 0) return [];

  const monthlyRate = tauxAnnuel / 100 / 12;
  const mensualite = calcMensualite(capitalInitial, tauxAnnuel, dureeMois);
  const rows: AmortissementRow[] = [];
  let capitalRestant = capitalInitial;

  for (let mois = 1; mois <= dureeMois; mois++) {
    const capitalDebutDu = capitalRestant;
    const interets = Math.round(capitalRestant * monthlyRate * 100) / 100;
    let capitalRembourse = Math.round((mensualite - interets) * 100) / 100;
    let capitalFinDu =
      Math.round((capitalRestant - capitalRembourse) * 100) / 100;

    // Last month: adjust to avoid negative balance
    if (capitalFinDu < 0 || mois === dureeMois) {
      capitalRembourse = capitalRestant;
      capitalFinDu = 0;
    }

    rows.push({
      mois,
      capitalDebutDu,
      mensualite: mois === dureeMois ? interets + capitalRembourse : mensualite,
      interets,
      capitalRembourse,
      capitalFinDu,
    });

    capitalRestant = capitalFinDu;
    if (capitalRestant <= 0) break;
  }

  return rows;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EmpruntsPage() {
  // ── Store selectors ─────────────────────────────────────────────────────────
  const emprunts = useAppStore((s) => s.emprunts ?? []);
  const addEmprunt = useAppStore((s) => s.addEmprunt);
  const updateEmprunt = useAppStore((s) => s.updateEmprunt);
  const removeEmprunt = useAppStore((s) => s.removeEmprunt);

  // ── Local UI state ───────────────────────────────────────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<EmpruntForm>(emptyForm());
  const [selectedEmpruntId, setSelectedEmpruntId] = useState<string | null>(
    null,
  );

  // ── Selected loan & amortization ────────────────────────────────────────────
  const selectedEmprunt = useMemo(
    () => emprunts.find((e) => e.id === selectedEmpruntId) ?? null,
    [emprunts, selectedEmpruntId],
  );

  const amortissementRows = useMemo(
    () => (selectedEmprunt ? buildAmortissementTable(selectedEmprunt) : []),
    [selectedEmprunt],
  );

  // ── Synthèse 5 ans (60 premiers mois) ───────────────────────────────────────
  const synthese5ans = useMemo(() => {
    if (!selectedEmprunt || amortissementRows.length === 0) return null;

    const first60 = amortissementRows.slice(0, 60);
    const totalInterets = first60.reduce((s, r) => s + r.interets, 0);
    const totalCapital = first60.reduce((s, r) => s + r.capitalRembourse, 0);
    const capitalRestantApres5ans =
      amortissementRows.length > 60 ? amortissementRows[59].capitalFinDu : 0;

    const mensualite = calcMensualite(
      selectedEmprunt.capitalInitial,
      selectedEmprunt.tauxAnnuel,
      selectedEmprunt.dureeMois,
    );

    // Year-by-year breakdown (up to 5 years)
    const parAnnee = Array.from({ length: 5 }, (_, yi) => {
      const debut = yi * 12;
      const fin = debut + 12;
      const slice = amortissementRows.slice(debut, fin);
      if (slice.length === 0) return null;
      return {
        annee: yi + 1,
        interets: slice.reduce((s, r) => s + r.interets, 0),
        capitalRembourse: slice.reduce((s, r) => s + r.capitalRembourse, 0),
        capitalFinAnnee: slice[slice.length - 1].capitalFinDu,
      };
    }).filter(Boolean) as {
      annee: number;
      interets: number;
      capitalRembourse: number;
      capitalFinAnnee: number;
    }[];

    return {
      totalInterets,
      totalCapital,
      capitalRestantApres5ans,
      mensualite,
      parAnnee,
    };
  }, [selectedEmprunt, amortissementRows]);

  // ── CRUD handlers ────────────────────────────────────────────────────────────
  const handleOpenAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const handleOpenEdit = (e: Emprunt, ev: React.MouseEvent) => {
    ev.stopPropagation();
    setEditingId(e.id);
    setForm({
      nom: e.nom,
      capitalInitial: e.capitalInitial,
      tauxAnnuel: e.tauxAnnuel,
      dureeMois: e.dureeMois,
      dateDebut: e.dateDebut,
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: string, ev: React.MouseEvent) => {
    ev.stopPropagation();
    if (window.confirm("Supprimer cet emprunt ?")) {
      removeEmprunt(id);
      if (selectedEmpruntId === id) setSelectedEmpruntId(null);
    }
  };

  const handleSubmit = () => {
    if (!form.nom.trim() || form.capitalInitial <= 0 || form.dureeMois <= 0)
      return;

    if (editingId) {
      updateEmprunt(editingId, form);
    } else {
      addEmprunt({ id: crypto.randomUUID(), ...form });
    }
    setDialogOpen(false);
  };

  const setField = <K extends keyof EmpruntForm>(
    key: K,
    value: EmpruntForm[K],
  ) => setForm((f) => ({ ...f, [key]: value }));

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6" data-ocid="emprunts.page">
      {/* ── Page header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">
            Emprunts Bancaires
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gérez vos prêts et consultez les tableaux d'amortissement
          </p>
        </div>
        <Button
          onClick={handleOpenAdd}
          className="gap-2"
          data-ocid="emprunts.add_button"
        >
          <Plus className="h-4 w-4" />
          Ajouter un emprunt
        </Button>
      </div>

      {/* ── Summary KPIs ── */}
      {emprunts.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-lg border border-border bg-card p-5 flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <TrendingDown className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Nombre d'emprunts
              </p>
              <p className="text-2xl font-semibold text-foreground">
                {emprunts.length}
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card p-5 flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <span className="text-sm font-bold text-primary">€</span>
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Capital total emprunté
              </p>
              <p className="text-2xl font-semibold text-foreground">
                {fmt(emprunts.reduce((s, e) => s + e.capitalInitial, 0))}
              </p>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card p-5 flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Calculator className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">
                Mensualités cumulées
              </p>
              <p className="text-2xl font-semibold text-foreground">
                {fmt(
                  emprunts.reduce(
                    (s, e) =>
                      s +
                      calcMensualite(
                        e.capitalInitial,
                        e.tauxAnnuel,
                        e.dureeMois,
                      ),
                    0,
                  ),
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── SECTION 1 — Loan list ── */}
      <Card data-ocid="emprunts.list">
        <CardHeader>
          <CardTitle className="text-base font-semibold">
            Gestion des Emprunts
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableHead>Nom</TableHead>
                <TableHead className="text-right">Capital Initial</TableHead>
                <TableHead className="text-right">Taux Annuel (%)</TableHead>
                <TableHead className="text-right">Durée (mois)</TableHead>
                <TableHead>Date de début</TableHead>
                <TableHead className="text-right">Mensualité</TableHead>
                <TableHead className="w-24 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {emprunts.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={7}
                    className="text-center py-12 text-muted-foreground"
                    data-ocid="emprunts.empty_state"
                  >
                    Aucun emprunt enregistré. Ajoutez votre premier emprunt.
                  </TableCell>
                </TableRow>
              ) : (
                emprunts.map((e, i) => (
                  <TableRow
                    key={e.id}
                    onClick={() =>
                      setSelectedEmpruntId((prev) =>
                        prev === e.id ? null : e.id,
                      )
                    }
                    className={`cursor-pointer transition-colors ${
                      selectedEmpruntId === e.id
                        ? "bg-primary/5 border-l-2 border-l-primary"
                        : "hover:bg-muted/30"
                    }`}
                    data-ocid={`emprunts.item.${i + 1}`}
                  >
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {selectedEmpruntId === e.id && (
                          <span className="h-1.5 w-1.5 rounded-full bg-primary inline-block" />
                        )}
                        {e.nom}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmt(e.capitalInitial)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmtPct(e.tauxAnnuel)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {e.dureeMois} mois
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(e.dateDebut).toLocaleDateString("fr-FR")}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium text-primary">
                      {fmt(
                        calcMensualite(
                          e.capitalInitial,
                          e.tauxAnnuel,
                          e.dureeMois,
                        ),
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={(ev) => handleOpenEdit(e, ev)}
                          data-ocid={`emprunts.edit_button.${i + 1}`}
                          aria-label="Modifier"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(ev) => handleDelete(e.id, ev)}
                          data-ocid={`emprunts.delete_button.${i + 1}`}
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

      {/* ── SECTION 2 — Amortization table ── */}
      {selectedEmprunt && amortissementRows.length > 0 && (
        <Card data-ocid="emprunts.amortissement.panel">
          <CardHeader className="flex flex-row items-center gap-3 pb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <Calculator className="h-4 w-4 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">
                Tableau d'Amortissement — {selectedEmprunt.nom}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Mensualité :{" "}
                <span className="font-semibold text-foreground">
                  {fmt(
                    calcMensualite(
                      selectedEmprunt.capitalInitial,
                      selectedEmprunt.tauxAnnuel,
                      selectedEmprunt.dureeMois,
                    ),
                  )}
                </span>{" "}
                · Durée totale : {selectedEmprunt.dureeMois} mois
              </p>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div
              className={
                amortissementRows.length > 12 ? "max-h-96 overflow-y-auto" : ""
              }
            >
              <Table>
                <TableHeader className="sticky top-0 bg-card z-10">
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="w-16">Mois</TableHead>
                    <TableHead className="text-right">
                      Capital Restant Dû (début)
                    </TableHead>
                    <TableHead className="text-right">Mensualité</TableHead>
                    <TableHead className="text-right">Intérêts</TableHead>
                    <TableHead className="text-right">
                      Capital Remboursé
                    </TableHead>
                    <TableHead className="text-right">
                      Capital Restant Dû (fin)
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {amortissementRows.map((row) => (
                    <TableRow
                      key={row.mois}
                      className={
                        row.mois % 12 === 0 ? "bg-muted/20 font-medium" : ""
                      }
                      data-ocid={`emprunts.amortissement.row.${row.mois}`}
                    >
                      <TableCell className="tabular-nums text-muted-foreground text-sm">
                        {row.mois}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">
                        {fmt(row.capitalDebutDu)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm font-medium">
                        {fmt(row.mensualite)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm text-orange-600">
                        {fmt(row.interets)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm text-emerald-600">
                        {fmt(row.capitalRembourse)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm font-semibold">
                        {fmt(row.capitalFinDu)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── SECTION 3 — Synthèse Business Plan 5 ans ── */}
      {selectedEmprunt && synthese5ans && (
        <Card data-ocid="emprunts.synthese.panel">
          <CardHeader className="flex flex-row items-center gap-3 pb-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10">
              <TrendingDown className="h-4 w-4 text-amber-600" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">
                Synthèse Business Plan (5 ans)
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Agrégat sur les 60 premiers mois — projection fiscale
              </p>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* KPI summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Mensualité fixe
                </p>
                <p className="text-lg font-bold text-foreground tabular-nums">
                  {fmt(synthese5ans.mensualite)}
                </p>
              </div>
              <div className="rounded-lg border border-orange-200 bg-orange-50/50 p-4">
                <p className="text-xs text-orange-600 uppercase tracking-wide mb-1">
                  Intérêts sur 5 ans
                </p>
                <p className="text-lg font-bold text-orange-700 tabular-nums">
                  {fmt(synthese5ans.totalInterets)}
                </p>
                <Badge
                  variant="outline"
                  className="mt-1 text-xs border-orange-300 text-orange-700 bg-orange-50"
                >
                  {(
                    (synthese5ans.totalInterets /
                      selectedEmprunt.capitalInitial) *
                    100
                  ).toFixed(1)}
                  % du capital
                </Badge>
              </div>
              <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
                <p className="text-xs text-emerald-600 uppercase tracking-wide mb-1">
                  Capital remboursé / 5 ans
                </p>
                <p className="text-lg font-bold text-emerald-700 tabular-nums">
                  {fmt(synthese5ans.totalCapital)}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">
                  Capital restant après 5 ans
                </p>
                <p className="text-lg font-bold text-foreground tabular-nums">
                  {fmt(synthese5ans.capitalRestantApres5ans)}
                </p>
              </div>
            </div>

            {/* Year-by-year table */}
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">
                Projection annuelle
              </h3>
              <div className="rounded-lg border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/40 hover:bg-muted/40">
                      <TableHead>Année</TableHead>
                      <TableHead className="text-right">Intérêts</TableHead>
                      <TableHead className="text-right">
                        Capital Remboursé
                      </TableHead>
                      <TableHead className="text-right">
                        Capital Restant Dû (fin)
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {synthese5ans.parAnnee.map((annee) => (
                      <TableRow
                        key={annee.annee}
                        data-ocid={`emprunts.synthese.annee.${annee.annee}`}
                      >
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                              {annee.annee}
                            </span>
                            Année {annee.annee}
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-orange-600 font-medium">
                          {fmt(annee.interets)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-emerald-600 font-medium">
                          {fmt(annee.capitalRembourse)}
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-semibold">
                          {fmt(annee.capitalFinAnnee)}
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Total row */}
                    <TableRow className="bg-muted/30 font-semibold border-t-2 border-border">
                      <TableCell className="font-bold">TOTAL</TableCell>
                      <TableCell className="text-right tabular-nums text-orange-700 font-bold">
                        {fmt(synthese5ans.totalInterets)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-emerald-700 font-bold">
                        {fmt(synthese5ans.totalCapital)}
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-bold">
                        {fmt(synthese5ans.capitalRestantApres5ans)}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Add / Edit Dialog ── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md" data-ocid="emprunts.dialog">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Modifier l'emprunt" : "Ajouter un emprunt"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="emp-nom">Nom de l'emprunt</Label>
              <Input
                id="emp-nom"
                value={form.nom}
                onChange={(e) => setField("nom", e.target.value)}
                placeholder="ex : Prêt équipement cuisine"
                data-ocid="emprunts.nom.input"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="emp-capital">Capital Initial (€)</Label>
              <Input
                id="emp-capital"
                type="number"
                min={0}
                step={1000}
                value={form.capitalInitial || ""}
                onFocus={(e) => e.target.select()}
                onChange={(e) =>
                  setField("capitalInitial", Number(e.target.value))
                }
                placeholder="50000"
                data-ocid="emprunts.capital.input"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="emp-taux">Taux Annuel (%)</Label>
                <Input
                  id="emp-taux"
                  type="number"
                  min={0}
                  step={0.01}
                  value={form.tauxAnnuel || ""}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) =>
                    setField("tauxAnnuel", Number(e.target.value))
                  }
                  placeholder="3.5"
                  data-ocid="emprunts.taux.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="emp-duree">Durée (mois)</Label>
                <Input
                  id="emp-duree"
                  type="number"
                  min={1}
                  step={1}
                  value={form.dureeMois || ""}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) =>
                    setField("dureeMois", Number(e.target.value))
                  }
                  placeholder="84"
                  data-ocid="emprunts.duree.input"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="emp-date">Date de début</Label>
              <Input
                id="emp-date"
                type="date"
                value={form.dateDebut}
                onChange={(e) => setField("dateDebut", e.target.value)}
                data-ocid="emprunts.date.input"
              />
            </div>

            {/* Live preview of monthly payment */}
            {form.capitalInitial > 0 && form.dureeMois > 0 && (
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  Mensualité estimée
                </span>
                <span className="text-base font-bold text-primary tabular-nums">
                  {fmt(
                    calcMensualite(
                      form.capitalInitial,
                      form.tauxAnnuel,
                      form.dureeMois,
                    ),
                  )}
                </span>
              </div>
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              data-ocid="emprunts.cancel_button"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={
                !form.nom.trim() ||
                form.capitalInitial <= 0 ||
                form.dureeMois <= 0
              }
              data-ocid="emprunts.submit_button"
            >
              {editingId ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
