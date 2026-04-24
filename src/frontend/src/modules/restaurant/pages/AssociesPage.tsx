import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
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
import type { Associe } from "@/core/store/useAppStore";
import { useAppStore } from "@/core/store/useAppStore";
import { Building2, Pencil, Plus, Trash2, Users } from "lucide-react";
import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type AssocieForm = Omit<Associe, "id">;

const emptyForm = (): AssocieForm => ({
  nom: "",
  remunerationMensuelle: 0,
  apportInitial: 0,
  montantRembourse: 0,
});

// ─── Component ────────────────────────────────────────────────────────────────

export default function AssociesPage() {
  // ── Store selectors (individual for fine-grained reactivity) ─────────────
  const associes = useAppStore((s) => s.associes);
  const addAssocie = useAppStore((s) => s.addAssocie);
  const updateAssocie = useAppStore((s) => s.updateAssocie);
  const removeAssocie = useAppStore((s) => s.removeAssocie);
  const hypothesesBP = useAppStore((s) => s.hypothesesBP);
  const updateHypotheses = useAppStore((s) => s.updateHypotheses);

  // Taux de charges sociales selon le statut juridique
  // SASU : 80% sur la rémunération nette, SARL : 45%
  const statutJuridique = hypothesesBP.statutJuridique ?? "SASU";
  const tauxChargesAssocies = statutJuridique === "SASU" ? 80 : 45;

  // ── Local UI state ────────────────────────────────────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<AssocieForm>(emptyForm());

  // ── Computed KPIs ─────────────────────────────────────────────────────────
  const totalApportsCCA = associes.reduce(
    (sum, a) => sum + a.apportInitial - a.montantRembourse,
    0,
  );
  const totalRemunerations = associes.reduce(
    (sum, a) => sum + a.remunerationMensuelle,
    0,
  );
  const totalChargesAssocies = totalRemunerations * (tauxChargesAssocies / 100);
  const totalCoutAssocies = totalRemunerations + totalChargesAssocies;

  // ── Derived dialog values ─────────────────────────────────────────────────
  const chargesSocialesForm =
    form.remunerationMensuelle * (tauxChargesAssocies / 100);
  const coutTotalForm = form.remunerationMensuelle + chargesSocialesForm;

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleOpenAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const handleOpenEdit = (a: Associe) => {
    setEditingId(a.id);
    setForm({
      nom: a.nom,
      remunerationMensuelle: a.remunerationMensuelle,
      apportInitial: a.apportInitial,
      montantRembourse: a.montantRembourse,
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Supprimer cet associé ?")) {
      removeAssocie(id);
    }
  };

  const handleSubmit = () => {
    if (!form.nom.trim()) return;
    if (editingId) {
      updateAssocie(editingId, form);
    } else {
      addAssocie(form);
    }
    setDialogOpen(false);
  };

  const setField = <K extends keyof AssocieForm>(
    key: K,
    value: AssocieForm[K],
  ) => setForm((f) => ({ ...f, [key]: value }));

  const fmt = (n: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(n);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6" data-ocid="associes.page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">
            Gestion des Associés
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gérez les apports en compte courant et les rémunérations des
            associés
          </p>
        </div>
        <Button
          onClick={handleOpenAdd}
          className="gap-2"
          data-ocid="associes.add_button"
        >
          <Plus className="h-4 w-4" />
          Ajouter un associé
        </Button>
      </div>

      {/* Statut Juridique — persisté dans le store global */}
      <Card data-ocid="associes.statut_juridique.card">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            Statut Juridique de la société
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="w-full sm:w-72">
              <Select
                value={statutJuridique}
                onValueChange={(v) =>
                  updateHypotheses({ statutJuridique: v as "SASU" | "SARL" })
                }
                data-ocid="associes.statut_juridique.select"
              >
                <SelectTrigger data-ocid="associes.statut_juridique.select">
                  <SelectValue placeholder="Sélectionner un statut" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SASU">
                    SASU — Président assimilé salarié
                  </SelectItem>
                  <SelectItem value="SARL">
                    SARL — Gérant majoritaire TNS
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Taux de charges sociales appliqué :</span>
              <Badge
                variant="outline"
                className={
                  statutJuridique === "SASU"
                    ? "bg-blue-50 text-blue-700 border-blue-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                }
              >
                {tauxChargesAssocies}%
              </Badge>
              <span className="text-xs">
                {statutJuridique === "SASU"
                  ? "(régime assimilé salarié)"
                  : "(régime TNS / indépendant)"}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card data-ocid="associes.effectif.card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
              <Users className="h-4 w-4" />
              Nombre d'associés
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-foreground">
              {associes.length}
            </p>
          </CardContent>
        </Card>

        <Card data-ocid="associes.apports.card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Total Apports CCA (net)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-foreground">
              {fmt(totalApportsCCA)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Apports initiaux − remboursements
            </p>
          </CardContent>
        </Card>

        <Card data-ocid="associes.remunerations.card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Total Rémunérations / mois
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-foreground">
              {fmt(totalRemunerations)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {fmt(totalRemunerations * 12)} / an
            </p>
          </CardContent>
        </Card>

        <Card data-ocid="associes.cout_total.card">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Coût Total Associés / mois
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold text-foreground">
              {fmt(totalCoutAssocies)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Rémun. + charges ({tauxChargesAssocies}%)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Nom</TableHead>
              <TableHead className="text-right">Rémunération / mois</TableHead>
              <TableHead className="text-right">
                Charges ({tauxChargesAssocies}%)
              </TableHead>
              <TableHead className="text-right">Coût total / mois</TableHead>
              <TableHead className="text-right">Apport CCA (€)</TableHead>
              <TableHead className="text-right">Remboursé CCA (€)</TableHead>
              <TableHead className="text-right">CCA Net (€)</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {associes.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={8}
                  className="text-center py-16 text-muted-foreground"
                  data-ocid="associes.empty_state"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Users className="h-8 w-8 opacity-30" />
                    <p className="font-medium">Aucun associé enregistré</p>
                    <p className="text-xs">
                      Ajoutez votre premier associé pour commencer.
                    </p>
                    <Button
                      size="sm"
                      className="mt-2"
                      onClick={handleOpenAdd}
                      data-ocid="associes.empty_add_button"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Ajouter un associé
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              associes.map((a, i) => {
                const ccaNet = a.apportInitial - a.montantRembourse;
                const charges =
                  a.remunerationMensuelle * (tauxChargesAssocies / 100);
                const coutTotal = a.remunerationMensuelle + charges;
                return (
                  <TableRow key={a.id} data-ocid={`associes.item.${i + 1}`}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary uppercase">
                          {a.nom.charAt(0)}
                        </div>
                        {a.nom}
                      </div>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmt(a.remunerationMensuelle)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {fmt(charges)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-medium">
                      {fmt(coutTotal)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {fmt(a.apportInitial)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {fmt(a.montantRembourse)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      <Badge
                        variant="outline"
                        className={
                          ccaNet > 0
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-muted text-muted-foreground"
                        }
                      >
                        {fmt(ccaNet)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleOpenEdit(a)}
                          data-ocid={`associes.edit_button.${i + 1}`}
                          aria-label="Modifier"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(a.id)}
                          data-ocid={`associes.delete_button.${i + 1}`}
                          aria-label="Supprimer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md" data-ocid="associes.dialog">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Modifier l'associé" : "Ajouter un associé"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="assoc-nom">Nom de l'associé</Label>
              <Input
                id="assoc-nom"
                value={form.nom}
                onChange={(e) => setField("nom", e.target.value)}
                placeholder="Jean Dupont"
                data-ocid="associes.nom.input"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="assoc-remun">
                Rémunération mensuelle nette (€)
              </Label>
              <Input
                id="assoc-remun"
                type="number"
                min={0}
                value={form.remunerationMensuelle}
                onChange={(e) =>
                  setField("remunerationMensuelle", Number(e.target.value))
                }
                data-ocid="associes.remuneration.input"
              />
            </div>

            {/* Charges sociales calculées automatiquement */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="assoc-charges">
                  Charges Sociales (€){" "}
                  <span className="text-xs text-muted-foreground font-normal">
                    {tauxChargesAssocies}% — {statutJuridique}
                  </span>
                </Label>
                <Input
                  id="assoc-charges"
                  type="text"
                  value={fmt(chargesSocialesForm)}
                  readOnly
                  className="bg-muted/40 cursor-default"
                  data-ocid="associes.charges_sociales.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="assoc-cout-total">
                  Coût Total Associé (€){" "}
                  <span className="text-xs text-muted-foreground font-normal">
                    calculé
                  </span>
                </Label>
                <Input
                  id="assoc-cout-total"
                  type="text"
                  value={fmt(coutTotalForm)}
                  readOnly
                  className="bg-muted/40 cursor-default font-medium"
                  data-ocid="associes.cout_total.input"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="assoc-apport">Apport initial CCA (€)</Label>
                <Input
                  id="assoc-apport"
                  type="number"
                  min={0}
                  value={form.apportInitial}
                  onChange={(e) =>
                    setField("apportInitial", Number(e.target.value))
                  }
                  data-ocid="associes.apport.input"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="assoc-rembourse">
                  Montant remboursé CCA (€)
                </Label>
                <Input
                  id="assoc-rembourse"
                  type="number"
                  min={0}
                  value={form.montantRembourse}
                  onChange={(e) =>
                    setField("montantRembourse", Number(e.target.value))
                  }
                  data-ocid="associes.rembourse.input"
                />
              </div>
            </div>

            {/* CCA Net preview */}
            <div className="rounded-md bg-muted/40 px-4 py-3 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">CCA Net (calculé)</span>
              <span className="font-semibold text-foreground">
                {fmt(form.apportInitial - form.montantRembourse)}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              data-ocid="associes.cancel_button"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!form.nom.trim()}
              data-ocid="associes.submit_button"
            >
              {editingId ? "Enregistrer" : "Ajouter"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
