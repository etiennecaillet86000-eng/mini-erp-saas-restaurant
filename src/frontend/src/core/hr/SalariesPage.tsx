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
import { useAppStore } from "@/core/store/useAppStore";
import type { Salarie, TypeContrat } from "@/core/types/models";
import { Pencil, Plus, Trash2, Users } from "lucide-react";
import { useMemo, useState } from "react";

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
  salaireBrut: 0,
  chargesPatronales: 0,
  coutTotalEmployeur: 0,
});

export default function SalariesPage() {
  // ── Global store (source of truth) ──────────────────────────────────────────
  const salaries = useAppStore((s) => s.salaries);
  const setSalaries = useAppStore((s) => s.setSalaries);
  const hypothesesBP = useAppStore((s) => s.hypothesesBP);
  const tauxChargesSalariales =
    useAppStore((s) => s.hypothesesBP.tauxChargesSalariales) ?? 22;
  const tauxChargesPatronales =
    useAppStore((s) => s.hypothesesBP.tauxChargesPatronales) ?? 42;

  // ── KPI Dashboard calculations ───────────────────────────────────────────────
  const masseSalarialeMensuelle = useMemo(
    () => salaries.reduce((sum, s) => sum + (s.coutTotalEmployeur ?? 0), 0),
    [salaries],
  );
  const masseSalarialeAnnuelle = masseSalarialeMensuelle * 12;
  const objectifCAannuel = hypothesesBP?.objectifCAannuel ?? 0;
  const ratioMasseSalariale = useMemo(() => {
    if (!objectifCAannuel) return 0;
    return (masseSalarialeAnnuelle / objectifCAannuel) * 100;
  }, [masseSalarialeAnnuelle, objectifCAannuel]);

  const ratioColorClass =
    ratioMasseSalariale <= 35
      ? "text-green-600"
      : ratioMasseSalariale <= 40
        ? "text-amber-500"
        : "text-red-600";

  const ratioLabel =
    ratioMasseSalariale <= 35
      ? { text: "Ratio sain", cls: "text-green-600" }
      : ratioMasseSalariale <= 40
        ? { text: "Zone de vigilance", cls: "text-amber-500" }
        : { text: "Zone de danger", cls: "text-red-600" };

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
      salaireBrut: s.salaireBrut ?? calcFromNet(s.salaireNet).salaireBrut,
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

  /** Recalcule brut, charges patronales et coût total depuis le salaire net */
  const calcFromNet = (net: number) => {
    const brut = net / (1 - tauxChargesSalariales / 100);
    const charges = brut * (tauxChargesPatronales / 100);
    return {
      salaireNet: net,
      salaireBrut: Math.round(brut * 100) / 100,
      chargesPatronales: Math.round(charges * 100) / 100,
      coutTotalEmployeur: Math.round((brut + charges) * 100) / 100,
    };
  };

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

      {/* KPI Dashboard */}
      <div
        className="grid grid-cols-1 md:grid-cols-3 gap-4"
        data-ocid="salaries.kpi.section"
      >
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Masse Salariale Mensuelle
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-foreground tabular-nums">
              {masseSalarialeMensuelle.toLocaleString("fr-FR")} €
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Coût total employeur / mois
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Masse Salariale Annuelle
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold text-foreground tabular-nums">
              {masseSalarialeAnnuelle.toLocaleString("fr-FR")} €
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Projection sur 12 mois
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ratio Masse Salariale (%)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p
              className={`text-2xl font-semibold tabular-nums ${ratioColorClass}`}
            >
              {ratioMasseSalariale.toFixed(1)} %
            </p>
            <p className={`text-xs font-medium mt-1 ${ratioLabel.cls}`}>
              {ratioLabel.text}
            </p>
          </CardContent>
        </Card>
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
                onChange={(e) => {
                  const computed = calcFromNet(Number(e.target.value));
                  setForm((f) => ({
                    ...f,
                    salaireNet: computed.salaireNet,
                    salaireBrut: computed.salaireBrut,
                    chargesPatronales: computed.chargesPatronales,
                    coutTotalEmployeur: computed.coutTotalEmployeur,
                  }));
                }}
                data-ocid="salaries.salaireNet.input"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sal-brut">
                Salaire brut (€){" "}
                <span className="text-xs text-muted-foreground font-normal">
                  calculé
                </span>
              </Label>
              <Input
                id="sal-brut"
                type="text"
                value={fmt(
                  form.salaireBrut ?? calcFromNet(form.salaireNet).salaireBrut,
                )}
                readOnly
                className="bg-muted/40 cursor-default"
                data-ocid="salaries.salaireBrut.input"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="sal-charges">
                Charges patronales (€){" "}
                <span className="text-xs text-muted-foreground font-normal">
                  calculées ({tauxChargesPatronales}%)
                </span>
              </Label>
              <Input
                id="sal-charges"
                type="text"
                min={0}
                value={fmt(form.chargesPatronales)}
                readOnly
                className="bg-muted/40 cursor-default"
                data-ocid="salaries.chargesPatronales.input"
              />
            </div>

            <div className="col-span-2 space-y-1.5">
              <Label htmlFor="sal-cout">Coût total employeur (€)</Label>
              <Input
                id="sal-cout"
                type="text"
                min={0}
                value={fmt(form.coutTotalEmployeur)}
                readOnly
                className="bg-muted/40 cursor-default"
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
