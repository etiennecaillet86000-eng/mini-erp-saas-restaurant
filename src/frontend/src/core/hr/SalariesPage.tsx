import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { useAppStore } from "@/core/store/useAppStore";
import type { Salarie, TypeContrat } from "@/core/types/models";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
import { useState } from "react";

const CONTRAT_OPTIONS: TypeContrat[] = [
  "CDI",
  "CDD",
  "Apprenti",
  "Stagiaire",
  "Extra",
];

const CONTRAT_BADGE_COLORS: Record<TypeContrat, string> = {
  CDI: "bg-emerald-100 text-emerald-800 border-emerald-200",
  CDD: "bg-blue-100 text-blue-800 border-blue-200",
  Apprenti: "bg-violet-100 text-violet-800 border-violet-200",
  Stagiaire: "bg-amber-100 text-amber-800 border-amber-200",
  Extra: "bg-orange-100 text-orange-800 border-orange-200",
};

const emptyForm = (): Omit<Salarie, "id"> => ({
  prenom: "",
  nom: "",
  poste: "",
  typeContrat: "CDI",
  heuresHebdo: 35,
  salaireNet: 0,
  chargesPatronales: 0,
  coutTotalEmployeur: 0,
});

export default function SalariesPage() {
  // ── Global store (source of truth) ──────────────────────────────────────────
  const salaries = useAppStore((s) => s.salaries);
  const setSalaries = useAppStore((s) => s.setSalaries);

  // ── Local UI state ───────────────────────────────────────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<Salarie, "id">>(emptyForm());

  const totalMasseSalariale = salaries.reduce(
    (sum, s) => sum + s.coutTotalEmployeur,
    0,
  );

  const handleOpenAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const handleOpenEdit = (s: Salarie) => {
    setEditingId(s.id);
    setForm({
      prenom: s.prenom,
      nom: s.nom,
      poste: s.poste,
      typeContrat: s.typeContrat,
      heuresHebdo: s.heuresHebdo,
      salaireNet: s.salaireNet,
      chargesPatronales: s.chargesPatronales,
      coutTotalEmployeur: s.coutTotalEmployeur,
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Supprimer ce salarié ?")) {
      setSalaries(salaries.filter((s) => s.id !== id));
    }
  };

  const handleSubmit = () => {
    if (editingId) {
      setSalaries(
        salaries.map((s) =>
          s.id === editingId ? { ...form, id: editingId } : s,
        ),
      );
    } else {
      setSalaries([...salaries, { ...form, id: crypto.randomUUID() }]);
    }
    setDialogOpen(false);
  };

  const setField = <K extends keyof Omit<Salarie, "id">>(
    key: K,
    value: Omit<Salarie, "id">[K],
  ) => setForm((f) => ({ ...f, [key]: value }));

  const fmt = (n: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <div className="space-y-6" data-ocid="salaries.page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">
            Gestion des Salariés
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gérez votre équipe et les informations contractuelles
          </p>
        </div>
        <Button
          onClick={handleOpenAdd}
          data-ocid="salaries.add_button"
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Ajouter un salarié
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-lg border border-border bg-card p-5 flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Users className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Effectif
            </p>
            <p className="text-2xl font-semibold text-foreground">
              {salaries.length}
            </p>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-5 flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <span className="text-sm font-bold text-primary">€</span>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Masse salariale mensuelle
            </p>
            <p className="text-2xl font-semibold text-foreground">
              {fmt(totalMasseSalariale)}
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Nom & Prénom</TableHead>
              <TableHead>Poste</TableHead>
              <TableHead>Contrat</TableHead>
              <TableHead className="text-right">Heures/Sem</TableHead>
              <TableHead className="text-right">Salaire Net</TableHead>
              <TableHead className="text-right">Coût Total</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {salaries.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={7}
                  className="text-center py-12 text-muted-foreground"
                  data-ocid="salaries.empty_state"
                >
                  Aucun salarié enregistré. Ajoutez votre premier employé.
                </TableCell>
              </TableRow>
            ) : (
              salaries.map((s, i) => (
                <TableRow key={s.id} data-ocid={`salaries.item.${i + 1}`}>
                  <TableCell className="font-medium">
                    {s.prenom} {s.nom}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {s.poste}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={CONTRAT_BADGE_COLORS[s.typeContrat]}
                    >
                      {s.typeContrat}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {s.heuresHebdo}h
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmt(s.salaireNet)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {fmt(s.coutTotalEmployeur)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleOpenEdit(s)}
                        data-ocid={`salaries.edit_button.${i + 1}`}
                        aria-label="Modifier"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(s.id)}
                        data-ocid={`salaries.delete_button.${i + 1}`}
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
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg" data-ocid="salaries.dialog">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Modifier le salarié" : "Ajouter un salarié"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="sal-prenom">Prénom</Label>
              <Input
                id="sal-prenom"
                value={form.prenom}
                onChange={(e) => setField("prenom", e.target.value)}
                placeholder="Marie"
                data-ocid="salaries.prenom.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sal-nom">Nom</Label>
              <Input
                id="sal-nom"
                value={form.nom}
                onChange={(e) => setField("nom", e.target.value)}
                placeholder="Dupont"
                data-ocid="salaries.nom.input"
              />
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="sal-poste">Poste</Label>
              <Input
                id="sal-poste"
                value={form.poste}
                onChange={(e) => setField("poste", e.target.value)}
                placeholder="Cuisinière"
                data-ocid="salaries.poste.input"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sal-contrat">Type de contrat</Label>
              <Select
                value={form.typeContrat}
                onValueChange={(v) => setField("typeContrat", v as TypeContrat)}
              >
                <SelectTrigger
                  id="sal-contrat"
                  data-ocid="salaries.typeContrat.select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTRAT_OPTIONS.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sal-heures">Heures hebdo</Label>
              <Input
                id="sal-heures"
                type="number"
                min={0}
                max={60}
                value={form.heuresHebdo}
                onChange={(e) =>
                  setField("heuresHebdo", Number(e.target.value))
                }
                data-ocid="salaries.heuresHebdo.input"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sal-net">Salaire net (€)</Label>
              <Input
                id="sal-net"
                type="number"
                min={0}
                value={form.salaireNet}
                onChange={(e) => setField("salaireNet", Number(e.target.value))}
                data-ocid="salaries.salaireNet.input"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sal-charges">Charges patronales (€)</Label>
              <Input
                id="sal-charges"
                type="number"
                min={0}
                value={form.chargesPatronales}
                onChange={(e) =>
                  setField("chargesPatronales", Number(e.target.value))
                }
                data-ocid="salaries.chargesPatronales.input"
              />
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="sal-cout">Coût total employeur (€)</Label>
              <Input
                id="sal-cout"
                type="number"
                min={0}
                value={form.coutTotalEmployeur}
                onChange={(e) =>
                  setField("coutTotalEmployeur", Number(e.target.value))
                }
                data-ocid="salaries.coutTotal.input"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              data-ocid="salaries.cancel_button"
            >
              Annuler
            </Button>
            <Button onClick={handleSubmit} data-ocid="salaries.submit_button">
              {editingId ? "Enregistrer" : "Ajouter"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
