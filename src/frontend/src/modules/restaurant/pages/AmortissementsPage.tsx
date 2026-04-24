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
import { Package, Pencil, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";

// ─── Logique amortissement fiscal français ────────────────────────────────────

/**
 * Coefficients fiscaux dégressifs (dérogatoire) selon la durée :
 * 3-4 ans → 1,25 | 5-6 ans → 1,75 | >6 ans → 2,25
 */
function getCoefficientFiscal(dureeAns: number): number {
  if (dureeAns <= 4) return 1.25;
  if (dureeAns <= 6) return 1.75;
  return 2.25;
}

interface LigneProjection {
  annee: number;
  dotation: number;
  vnc: number; // Valeur Nette Comptable en fin d'année
}

function calculerProjection(immo: Immobilisation): LigneProjection[] {
  const { valeurAchatHT, dureeAmortissementAns, type } = immo;
  const tauxLineaire = 1 / dureeAmortissementAns;
  const lignes: LigneProjection[] = [];

  if (type === "linéaire") {
    const dotation = valeurAchatHT * tauxLineaire;
    let vnc = valeurAchatHT;
    for (let annee = 1; annee <= Math.min(dureeAmortissementAns, 5); annee++) {
      vnc = Math.max(0, vnc - dotation);
      lignes.push({
        annee,
        dotation: Math.round(dotation * 100) / 100,
        vnc: Math.round(vnc * 100) / 100,
      });
    }
  } else {
    // Dérogatoire (dégressif)
    const coeff = getCoefficientFiscal(dureeAmortissementAns);
    let vnc = valeurAchatHT;
    for (let annee = 1; annee <= Math.min(dureeAmortissementAns, 5); annee++) {
      const anneeRestantes = dureeAmortissementAns - annee + 1;
      const tauxDegressif = tauxLineaire * coeff;
      const tauxLineaireResidue = 1 / anneeRestantes;
      // On bascule au linéaire quand c'est plus avantageux
      const taux = Math.max(tauxDegressif, tauxLineaireResidue);
      const dotation = vnc * taux;
      vnc = Math.max(0, vnc - dotation);
      lignes.push({
        annee,
        dotation: Math.round(dotation * 100) / 100,
        vnc: Math.round(vnc * 100) / 100,
      });
    }
  }
  return lignes;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const emptyForm = {
  nom: "",
  valeurAchatHT: 0,
  dureeAmortissementAns: 5,
  type: "linéaire" as "linéaire" | "dérogatoire",
  dateAchat: new Date().toISOString().slice(0, 10),
};

// ─── Composant ────────────────────────────────────────────────────────────────

export default function AmortissementsPage() {
  const immobilisations = useAppStore((s) => s.immobilisations);
  const addImmobilisation = useAppStore((s) => s.addImmobilisation);
  const updateImmobilisation = useAppStore((s) => s.updateImmobilisation);
  const removeImmobilisation = useAppStore((s) => s.removeImmobilisation);

  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selectedImmo =
    immobilisations.find((i) => i.id === selectedId) ??
    immobilisations[0] ??
    null;

  const projection = useMemo(
    () => (selectedImmo ? calculerProjection(selectedImmo) : []),
    [selectedImmo],
  );

  // Total dotations sur 5 ans (toutes immobilisations)
  const totalDotations5Ans = useMemo(() => {
    return immobilisations.reduce((sum, immo) => {
      const proj = calculerProjection(immo);
      return sum + proj.reduce((s, l) => s + l.dotation, 0);
    }, 0);
  }, [immobilisations]);

  const handleOpen = (immo?: Immobilisation) => {
    if (immo) {
      setEditingId(immo.id);
      setForm({
        nom: immo.nom,
        valeurAchatHT: immo.valeurAchatHT,
        dureeAmortissementAns: immo.dureeAmortissementAns,
        type: immo.type,
        dateAchat: immo.dateAchat,
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
      updateImmobilisation(editingId, form);
    } else {
      addImmobilisation({ ...form, id: crypto.randomUUID() });
    }
    setOpen(false);
  };

  // Dotation annuelle de prévisualisation dans le formulaire
  const previewDotation = useMemo(() => {
    if (!form.valeurAchatHT || !form.dureeAmortissementAns) return 0;
    const preview = calculerProjection({ ...form, id: "", nom: "" });
    return preview[0]?.dotation ?? 0;
  }, [form]);

  return (
    <div className="space-y-6" data-ocid="amortissements.page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Amortissements</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Immobilisations et projection fiscale sur 5 ans
          </p>
        </div>
        <Button
          onClick={() => handleOpen()}
          data-ocid="amortissements.add_button"
        >
          <Plus className="h-4 w-4 mr-2" />
          Ajouter une immobilisation
        </Button>
      </div>

      {/* KPI global */}
      {immobilisations.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-primary/20 bg-primary/5">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Total immobilisations HT
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">
                {fmt(immobilisations.reduce((s, i) => s + i.valeurAchatHT, 0))}{" "}
                €
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Dotations totales (5 ans)
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{fmt(totalDotations5Ans)} €</p>
              <p className="text-xs text-muted-foreground mt-1">
                Charge déductible projetée
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Nombre d'immobilisations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{immobilisations.length}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Liste */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Package className="h-4 w-4 text-primary" />
            Liste des investissements
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {immobilisations.length === 0 ? (
            <div
              className="py-12 text-center text-muted-foreground"
              data-ocid="amortissements.empty_state"
            >
              <Package className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">Aucune immobilisation enregistrée</p>
              <p className="text-sm mt-1">
                Ajoutez vos investissements pour calculer les amortissements
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom</TableHead>
                  <TableHead className="text-right">Valeur HT (€)</TableHead>
                  <TableHead className="text-right">Durée (ans)</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">
                    Dotation an 1 (€)
                  </TableHead>
                  <TableHead className="text-right">Date achat</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {immobilisations.map((immo, i) => {
                  const proj = calculerProjection(immo);
                  const dotAn1 = proj[0]?.dotation ?? 0;
                  const isSelected =
                    (selectedId ?? immobilisations[0]?.id) === immo.id;
                  return (
                    <TableRow
                      key={immo.id}
                      className={
                        isSelected
                          ? "bg-primary/5 cursor-pointer"
                          : "cursor-pointer hover:bg-muted/50"
                      }
                      onClick={() => setSelectedId(immo.id)}
                      data-ocid={`amortissements.item.${i + 1}`}
                    >
                      <TableCell className="font-medium">
                        {immo.nom}
                        {isSelected && (
                          <Badge variant="secondary" className="ml-2 text-xs">
                            Sélectionné
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {fmt(immo.valeurAchatHT)}
                      </TableCell>
                      <TableCell className="text-right">
                        {immo.dureeAmortissementAns} ans
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            immo.type === "dérogatoire" ? "default" : "outline"
                          }
                          className="text-xs"
                        >
                          {immo.type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {fmt(dotAn1)}
                      </TableCell>
                      <TableCell className="text-right text-muted-foreground text-sm">
                        {immo.dateAchat}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              handleOpen(immo);
                            }}
                            data-ocid={`amortissements.edit_button.${i + 1}`}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              removeImmobilisation(immo.id);
                            }}
                            data-ocid={`amortissements.delete_button.${i + 1}`}
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

      {/* Projection 5 ans */}
      {selectedImmo && projection.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">
                  Projection des dotations — {selectedImmo.nom}
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Méthode : <strong>{selectedImmo.type}</strong>
                  {selectedImmo.type === "dérogatoire" && (
                    <span className="ml-1">
                      · Coefficient fiscal :{" "}
                      {getCoefficientFiscal(selectedImmo.dureeAmortissementAns)}
                      (durée {selectedImmo.dureeAmortissementAns} ans)
                    </span>
                  )}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Année</TableHead>
                  <TableHead className="text-right">Dotation (€)</TableHead>
                  <TableHead className="text-right">
                    VNC fin d'année (€)
                  </TableHead>
                  <TableHead className="text-right">Taux effectif</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projection.map((l) => {
                  const tauxEffectif =
                    selectedImmo.valeurAchatHT > 0
                      ? (l.dotation / selectedImmo.valeurAchatHT) * 100
                      : 0;
                  return (
                    <TableRow key={l.annee}>
                      <TableCell>
                        <span className="font-semibold">Année {l.annee}</span>
                      </TableCell>
                      <TableCell className="text-right font-mono font-semibold text-foreground">
                        {fmt(l.dotation)} €
                      </TableCell>
                      <TableCell className="text-right font-mono text-muted-foreground">
                        {fmt(l.vnc)} €
                      </TableCell>
                      <TableCell className="text-right text-sm text-muted-foreground">
                        {tauxEffectif.toFixed(1)} %
                      </TableCell>
                    </TableRow>
                  );
                })}
                <TableRow className="bg-muted/40 font-semibold">
                  <TableCell>Total 5 ans</TableCell>
                  <TableCell className="text-right font-mono">
                    {fmt(projection.reduce((s, l) => s + l.dotation, 0))} €
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground font-mono text-sm">
                    VNC : {fmt(projection[projection.length - 1]?.vnc ?? 0)} €
                  </TableCell>
                  <TableCell />
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Dialog ajout / édition */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md" data-ocid="amortissements.dialog">
          <DialogHeader>
            <DialogTitle>
              {editingId
                ? "Modifier l'immobilisation"
                : "Nouvelle immobilisation"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Nom de l'immobilisation</Label>
              <Input
                data-ocid="amortissements.nom.input"
                value={form.nom}
                onChange={(e) =>
                  setForm((f) => ({ ...f, nom: e.target.value }))
                }
                placeholder="ex: Matériel de cuisine"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Valeur d'achat HT (€)</Label>
                <Input
                  data-ocid="amortissements.valeur.input"
                  type="number"
                  min={0}
                  value={form.valeurAchatHT || ""}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      valeurAchatHT: Number.parseFloat(e.target.value) || 0,
                    }))
                  }
                  placeholder="10000"
                />
              </div>
              <div className="space-y-1">
                <Label>Durée amort. (ans)</Label>
                <Input
                  data-ocid="amortissements.duree.input"
                  type="number"
                  min={1}
                  max={20}
                  value={form.dureeAmortissementAns || ""}
                  onFocus={(e) => e.target.select()}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      dureeAmortissementAns:
                        Number.parseInt(e.target.value) || 1,
                    }))
                  }
                  placeholder="5"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Type d'amortissement</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) =>
                    setForm((f) => ({
                      ...f,
                      type: v as "linéaire" | "dérogatoire",
                    }))
                  }
                >
                  <SelectTrigger data-ocid="amortissements.type.select">
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
              <div className="space-y-1">
                <Label>Date d'achat</Label>
                <Input
                  data-ocid="amortissements.date.input"
                  type="date"
                  value={form.dateAchat}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, dateAchat: e.target.value }))
                  }
                />
              </div>
            </div>

            {/* Info coefficient fiscal */}
            {form.type === "dérogatoire" && form.dureeAmortissementAns > 0 && (
              <div className="rounded-md bg-primary/5 border border-primary/20 p-3 text-sm space-y-1">
                <p className="font-semibold text-foreground">
                  Paramètres fiscaux (dérogatoire)
                </p>
                <p className="text-muted-foreground">
                  Durée {form.dureeAmortissementAns} ans → coefficient{" "}
                  {getCoefficientFiscal(form.dureeAmortissementAns)}
                </p>
                {previewDotation > 0 && (
                  <p>
                    Dotation an 1 estimée :{" "}
                    <span className="font-bold text-foreground">
                      {fmt(previewDotation)} €
                    </span>
                  </p>
                )}
              </div>
            )}
            {form.type === "linéaire" && previewDotation > 0 && (
              <div className="rounded-md bg-muted p-3 text-sm">
                <span className="text-muted-foreground">
                  Dotation annuelle :{" "}
                </span>
                <span className="font-bold text-foreground">
                  {fmt(previewDotation)} €
                </span>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              data-ocid="amortissements.cancel_button"
            >
              Annuler
            </Button>
            <Button
              onClick={handleSave}
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
