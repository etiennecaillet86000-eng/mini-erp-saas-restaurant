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
import type {
  CategoriesFrais,
  FraisFixe,
  FrequenceFrais,
} from "@/core/types/models";
import { LayoutList, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

const CATEGORIES: CategoriesFrais[] = [
  "Loyer",
  "Énergie",
  "Assurance",
  "Abonnement SaaS",
  "Marketing",
  "Honoraires",
  "Autre",
];

const FREQUENCES: FrequenceFrais[] = ["Mensuel", "Annuel"];

const CATEGORIE_BADGE: Record<CategoriesFrais, string> = {
  Loyer: "bg-blue-100 text-blue-800 border-blue-200",
  Énergie: "bg-yellow-100 text-yellow-800 border-yellow-200",
  Assurance: "bg-purple-100 text-purple-800 border-purple-200",
  "Abonnement SaaS": "bg-cyan-100 text-cyan-800 border-cyan-200",
  Marketing: "bg-pink-100 text-pink-800 border-pink-200",
  Honoraires: "bg-indigo-100 text-indigo-800 border-indigo-200",
  Autre: "bg-muted text-muted-foreground border-border",
};

const emptyForm = (): Omit<FraisFixe, "id"> => ({
  libelle: "",
  montant: 0,
  categorie: "Autre",
  frequence: "Mensuel",
});

export default function FraisFixesPage() {
  // ── Global store (source of truth) ──────────────────────────────────────────
  const frais = useAppStore((s) => s.fraisFixes);
  const setFraisFixes = useAppStore((s) => s.setFraisFixes);

  // ── Local UI state ───────────────────────────────────────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<Omit<FraisFixe, "id">>(emptyForm());

  const totalMensuel = frais.reduce(
    (sum, f) => sum + (f.frequence === "Mensuel" ? f.montant : f.montant / 12),
    0,
  );
  const totalAnnuel = frais.reduce(
    (sum, f) => sum + (f.frequence === "Annuel" ? f.montant : f.montant * 12),
    0,
  );

  const handleOpenAdd = () => {
    setEditingId(null);
    setForm(emptyForm());
    setDialogOpen(true);
  };

  const handleOpenEdit = (f: FraisFixe) => {
    setEditingId(f.id);
    setForm({
      libelle: f.libelle,
      montant: f.montant,
      categorie: f.categorie,
      frequence: f.frequence,
    });
    setDialogOpen(true);
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Supprimer cette charge ?")) {
      setFraisFixes(frais.filter((f) => f.id !== id));
    }
  };

  const handleSubmit = () => {
    if (editingId) {
      setFraisFixes(
        frais.map((f) => (f.id === editingId ? { ...form, id: editingId } : f)),
      );
    } else {
      setFraisFixes([...frais, { ...form, id: crypto.randomUUID() }]);
    }
    setDialogOpen(false);
  };

  const setField = <K extends keyof Omit<FraisFixe, "id">>(
    key: K,
    value: Omit<FraisFixe, "id">[K],
  ) => setForm((f) => ({ ...f, [key]: value }));

  const fmt = (n: number) =>
    new Intl.NumberFormat("fr-FR", {
      style: "currency",
      currency: "EUR",
      maximumFractionDigits: 0,
    }).format(n);

  return (
    <div className="space-y-6" data-ocid="frais-fixes.page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">
            Charges Fixes
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Suivez et gérez vos charges récurrentes
          </p>
        </div>
        <Button
          onClick={handleOpenAdd}
          data-ocid="frais-fixes.add_button"
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Ajouter une charge
        </Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-card p-5 flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <LayoutList className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Nombre de charges
            </p>
            <p className="text-2xl font-semibold text-foreground">
              {frais.length}
            </p>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-5 flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <span className="text-sm font-bold text-primary">€</span>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Total mensuel estimé
            </p>
            <p className="text-2xl font-semibold text-foreground">
              {fmt(totalMensuel)}
            </p>
          </div>
        </div>
        <div className="rounded-lg border border-border bg-card p-5 flex items-center gap-4">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <span className="text-sm font-bold text-primary">€</span>
          </div>
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">
              Total annuel estimé
            </p>
            <p className="text-2xl font-semibold text-foreground">
              {fmt(totalAnnuel)}
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/40 hover:bg-muted/40">
              <TableHead>Libellé</TableHead>
              <TableHead>Catégorie</TableHead>
              <TableHead>Fréquence</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {frais.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-12 text-muted-foreground"
                  data-ocid="frais-fixes.empty_state"
                >
                  Aucune charge enregistrée. Ajoutez votre première charge.
                </TableCell>
              </TableRow>
            ) : (
              frais.map((f, i) => (
                <TableRow key={f.id} data-ocid={`frais-fixes.item.${i + 1}`}>
                  <TableCell className="font-medium">{f.libelle}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={CATEGORIE_BADGE[f.categorie]}
                    >
                      {f.categorie}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={
                        f.frequence === "Mensuel"
                          ? "bg-muted text-muted-foreground border-border"
                          : "bg-emerald-100 text-emerald-800 border-emerald-200"
                      }
                    >
                      {f.frequence}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">
                    {fmt(f.montant)}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleOpenEdit(f)}
                        data-ocid={`frais-fixes.edit_button.${i + 1}`}
                        aria-label="Modifier"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(f.id)}
                        data-ocid={`frais-fixes.delete_button.${i + 1}`}
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
        <DialogContent className="sm:max-w-md" data-ocid="frais-fixes.dialog">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Modifier la charge" : "Ajouter une charge"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="ff-libelle">Libellé</Label>
              <Input
                id="ff-libelle"
                value={form.libelle}
                onChange={(e) => setField("libelle", e.target.value)}
                placeholder="Loyer du local commercial"
                data-ocid="frais-fixes.libelle.input"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ff-montant">Montant (€)</Label>
              <Input
                id="ff-montant"
                type="number"
                min={0}
                value={form.montant}
                onChange={(e) => setField("montant", Number(e.target.value))}
                data-ocid="frais-fixes.montant.input"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="ff-categorie">Catégorie</Label>
                <Select
                  value={form.categorie}
                  onValueChange={(v) =>
                    setField("categorie", v as CategoriesFrais)
                  }
                >
                  <SelectTrigger
                    id="ff-categorie"
                    data-ocid="frais-fixes.categorie.select"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="ff-frequence">Fréquence</Label>
                <Select
                  value={form.frequence}
                  onValueChange={(v) =>
                    setField("frequence", v as FrequenceFrais)
                  }
                >
                  <SelectTrigger
                    id="ff-frequence"
                    data-ocid="frais-fixes.frequence.select"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FREQUENCES.map((f) => (
                      <SelectItem key={f} value={f}>
                        {f}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              data-ocid="frais-fixes.cancel_button"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSubmit}
              data-ocid="frais-fixes.submit_button"
            >
              {editingId ? "Enregistrer" : "Ajouter"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
