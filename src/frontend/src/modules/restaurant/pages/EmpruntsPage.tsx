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
import { useAppStore } from "@/core/store/useAppStore";
import type { Emprunt } from "@/core/store/useAppStore";
import { Pencil, Plus, Trash2, TrendingDown } from "lucide-react";
import { useMemo, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LignAmortissement {
  mois: number;
  capitalDebut: number;
  mensualite: number;
  interets: number;
  capitalRembourse: number;
  capitalFin: number;
}

// ─── Calculs purs ─────────────────────────────────────────────────────────────

function calculerMensualite(
  capital: number,
  tauxAnnuel: number,
  dureeMois: number,
): number {
  if (tauxAnnuel === 0) return capital / dureeMois;
  const tauxMensuel = tauxAnnuel / 100 / 12;
  return (capital * tauxMensuel) / (1 - (1 + tauxMensuel) ** -dureeMois);
}

function calculerTableauAmortissement(emprunt: Emprunt): LignAmortissement[] {
  const { capitalInitial, tauxAnnuel, dureeMois } = emprunt;
  const mensualite = calculerMensualite(capitalInitial, tauxAnnuel, dureeMois);
  const tauxMensuel = tauxAnnuel / 100 / 12;
  const lignes: LignAmortissement[] = [];
  let capitalDebut = capitalInitial;

  for (let mois = 1; mois <= dureeMois; mois++) {
    const interets = capitalDebut * tauxMensuel;
    const capitalRembourse = mensualite - interets;
    const capitalFin = Math.max(0, capitalDebut - capitalRembourse);
    lignes.push({
      mois,
      capitalDebut: Math.round(capitalDebut * 100) / 100,
      mensualite: Math.round(mensualite * 100) / 100,
      interets: Math.round(interets * 100) / 100,
      capitalRembourse: Math.round(capitalRembourse * 100) / 100,
      capitalFin: Math.round(capitalFin * 100) / 100,
    });
    capitalDebut = capitalFin;
  }
  return lignes;
}

function calculerSynthese5Ans(lignes: LignAmortissement[]) {
  const lignes60 = lignes.slice(0, 60);
  const totalInterets = lignes60.reduce((s, l) => s + l.interets, 0);
  const totalCapital = lignes60.reduce((s, l) => s + l.capitalRembourse, 0);
  const totalMensualites = lignes60.reduce((s, l) => s + l.mensualite, 0);
  return {
    totalInterets: Math.round(totalInterets * 100) / 100,
    totalCapital: Math.round(totalCapital * 100) / 100,
    totalMensualites: Math.round(totalMensualites * 100) / 100,
  };
}

// ─── Formulaire vide ──────────────────────────────────────────────────────────

const emptyForm = {
  nom: "",
  capitalInitial: 0,
  tauxAnnuel: 0,
  dureeMois: 60,
  dateDebut: new Date().toISOString().slice(0, 10),
};

const fmt = (n: number) =>
  n.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

// ─── Composant ────────────────────────────────────────────────────────────────

export default function EmpruntsPage() {
  const emprunts = useAppStore((s) => s.emprunts);
  const addEmprunt = useAppStore((s) => s.addEmprunt);
  const updateEmprunt = useAppStore((s) => s.updateEmprunt);
  const removeEmprunt = useAppStore((s) => s.removeEmprunt);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedEmprunt =
    emprunts.find((e) => e.id === selectedId) ?? emprunts[0] ?? null;

  const tableau = useMemo(
    () =>
      selectedEmprunt ? calculerTableauAmortissement(selectedEmprunt) : [],
    [selectedEmprunt],
  );

  const synthese = useMemo(() => calculerSynthese5Ans(tableau), [tableau]);

  const handleOpen = (emprunt?: Emprunt) => {
    if (emprunt) {
      setEditingId(emprunt.id);
      setForm({
        nom: emprunt.nom,
        capitalInitial: emprunt.capitalInitial,
        tauxAnnuel: emprunt.tauxAnnuel,
        dureeMois: emprunt.dureeMois,
        dateDebut: emprunt.dateDebut,
      });
    } else {
      setEditingId(null);
      setForm(emptyForm);
    }
    setOpen(true);
  };

  const handleSave = () => {
    if (!form.nom.trim()) return;
    if (editingId) {
      updateEmprunt(editingId, form);
    } else {
      addEmprunt({ ...form, id: crypto.randomUUID() });
    }
    setOpen(false);
  };

  const mensualite = useMemo(
    () =>
      form.capitalInitial > 0 && form.dureeMois > 0
        ? calculerMensualite(
            form.capitalInitial,
            form.tauxAnnuel,
            form.dureeMois,
          )
        : 0,
    [form.capitalInitial, form.tauxAnnuel, form.dureeMois],
  );

  return (
    <div className="space-y-6" data-ocid="emprunts.page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Emprunts Bancaires
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gestion des crédits et tableau de remboursement
          </p>
        </div>
        <Button onClick={() => handleOpen()} data-ocid="emprunts.add_button">
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un emprunt
        </Button>
      </div>

      {/* Liste des emprunts */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingDown className="h-4 w-4 text-primary" />
            Liste des emprunts
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {emprunts.length === 0 ? (
            <div
              className="py-12 text-center text-muted-foreground"
              data-ocid="emprunts.empty_state"
            >
              <TrendingDown className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Aucun emprunt enregistré</p>
              <p className="text-sm mt-1">
                Ajoutez votre premier crédit bancaire pour commencer
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead className="text-right">Capital (€)</TableHead>
                  <TableHead className="text-right">Taux annuel</TableHead>
                  <TableHead className="text-right">Durée (mois)</TableHead>
                  <TableHead className="text-right">Mensualité (€)</TableHead>
                  <TableHead className="text-right">Début</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {emprunts.map((e, i) => {
                  const m = calculerMensualite(
                    e.capitalInitial,
                    e.tauxAnnuel,
                    e.dureeMois,
                  );
                  const isSelected = (selectedId ?? emprunts[0]?.id) === e.id;
                  return (
                    <TableRow
                      key={e.id}
                      className={
                        isSelected
                          ? "bg-primary/5"
                          : "cursor-pointer hover:bg-muted/50"
                      }
                      onClick={() => setSelectedId(e.id)}
                      data-ocid={`emprunts.item.${i + 1}`}
                    >
                      <TableCell className="font-medium">
                        {e.nom}
                        {isSelected && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            Sélectionné
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {fmt(e.capitalInitial)}
                      </TableCell>
                      <TableCell className="text-right">
                        {e.tauxAnnuel.toFixed(2)} %
                      </TableCell>
                      <TableCell className="text-right">
                        {e.dureeMois} mois
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {fmt(m)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-sm">
                        {e.dateDebut}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              handleOpen(e);
                            }}
                            data-ocid={`emprunts.edit_button.${i + 1}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              removeEmprunt(e.id);
                            }}
                            data-ocid={`emprunts.delete_button.${i + 1}`}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Synthèse Business Plan 5 ans */}
      {selectedEmprunt && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Total mensualités (60 mois)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">
                {fmt(synthese.totalMensualites)} €
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Synthèse Business Plan — 5 ans
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Capital remboursé (5 ans)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-foreground">
                {fmt(synthese.totalCapital)} €
              </p>
            </CardContent>
          </Card>
          <Card className="border-destructive/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Total intérêts (5 ans)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-destructive">
                {fmt(synthese.totalInterets)} €
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Charge financière déductible
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tableau de remboursement complet */}
      {selectedEmprunt && tableau.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Tableau de remboursement — {selectedEmprunt.nom}
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Mensualité fixe : {fmt(tableau[0].mensualite)} € ·{" "}
              {selectedEmprunt.dureeMois} mois
            </p>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-96 overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-card">
                  <TableRow>
                    <TableHead className="w-16">Mois</TableHead>
                    <TableHead className="text-right">
                      Capital début (€)
                    </TableHead>
                    <TableHead className="text-right">Mensualité (€)</TableHead>
                    <TableHead className="text-right">Intérêts (€)</TableHead>
                    <TableHead className="text-right">
                      Capital remboursé (€)
                    </TableHead>
                    <TableHead className="text-right">
                      Capital restant (€)
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tableau.map((l) => (
                    <TableRow
                      key={l.mois}
                      className={l.mois <= 60 ? "bg-primary/3" : undefined}
                    >
                      <TableCell>
                        <span className="font-mono text-sm">{l.mois}</span>
                        {l.mois === 60 && (
                          <Badge variant="outline" className="ml-1 text-[10px]">
                            fin 5 ans
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {fmt(l.capitalDebut)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold">
                        {fmt(l.mensualite)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-destructive">
                        {fmt(l.interets)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm text-green-600">
                        {fmt(l.capitalRembourse)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">
                        {fmt(l.capitalFin)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dialog ajout / édition */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md" data-ocid="emprunts.dialog">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Modifier l'emprunt" : "Nouvel emprunt"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Nom / Libellé</Label>
              <Input
                data-ocid="emprunts.nom.input"
                value={form.nom}
                onChange={(e) =>
                  setForm((f) => ({ ...f, nom: e.target.value }))
                }
                placeholder="ex: Crédit matériel cuisine"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Capital initial (€)</Label>
                <Input
                  data-ocid="emprunts.capital.input"
                  type="number"
                  min={0}
                  value={form.capitalInitial || ""}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      capitalInitial: Number.parseFloat(e.target.value) || 0,
                    }))
                  }
                  placeholder="50000"
                />
              </div>
              <div className="space-y-1">
                <Label>Taux annuel (%)</Label>
                <Input
                  data-ocid="emprunts.taux.input"
                  type="number"
                  step={0.01}
                  min={0}
                  value={form.tauxAnnuel || ""}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      tauxAnnuel: Number.parseFloat(e.target.value) || 0,
                    }))
                  }
                  placeholder="3.5"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Durée (mois)</Label>
                <Input
                  data-ocid="emprunts.duree.input"
                  type="number"
                  min={1}
                  value={form.dureeMois || ""}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      dureeMois: Number.parseInt(e.target.value) || 1,
                    }))
                  }
                  placeholder="60"
                />
              </div>
              <div className="space-y-1">
                <Label>Date de début</Label>
                <Input
                  data-ocid="emprunts.date.input"
                  type="date"
                  value={form.dateDebut}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, dateDebut: e.target.value }))
                  }
                />
              </div>
            </div>
            {mensualite > 0 && (
              <div className="rounded-md bg-muted p-3 text-sm">
                <span className="text-muted-foreground">
                  Mensualité calculée :{" "}
                </span>
                <span className="font-bold text-foreground">
                  {fmt(mensualite)} € / mois
                </span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              data-ocid="emprunts.cancel_button"
            >
              Annuler
            </Button>
            <Button onClick={handleSave} data-ocid="emprunts.submit_button">
              {editingId ? "Enregistrer" : "Ajouter"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
