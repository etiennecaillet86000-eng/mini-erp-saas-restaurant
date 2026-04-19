/**
 * RecettesPage.tsx — Création et gestion des Fiches Techniques
 * RÈGLE : Aucun calcul métier — uniquement calls vers calculations.ts et store.
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
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
  IngredientFB,
  RecetteFB,
  RecetteIngredient,
} from "@/modules/restaurant/types/models";
import {
  calculerCoutIngredient,
  calculerFoodCostRecette,
} from "@/modules/restaurant/utils/calculations";
import { BookOpen, ChefHat, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormState {
  id: string | null; // null = new recipe
  nom: string;
  categorie: string;
  prixVenteHT: string;
  tva: string;
  lignes: RecetteIngredient[];
}

const INITIAL_FORM: FormState = {
  id: null,
  nom: "",
  categorie: "",
  prixVenteHT: "",
  tva: "10",
  lignes: [],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId(): string {
  return `rec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function formatEur(v: number): string {
  return `${new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v)} €`;
}

function formatPct(v: number): string {
  return `${v.toFixed(1).replace(".", ",")} %`;
}

function getFoodCostColor(pct: number): string {
  if (pct <= 30) return "text-emerald-600 dark:text-emerald-400";
  if (pct <= 40) return "text-amber-600 dark:text-amber-400";
  return "text-destructive";
}

function getMargeColor(pct: number): string {
  if (pct >= 70) return "text-emerald-600 dark:text-emerald-400";
  if (pct >= 55) return "text-amber-600 dark:text-amber-400";
  return "text-destructive";
}

// ─── Sub-component: KPI block ─────────────────────────────────────────────────

interface KpiBlockProps {
  label: string;
  value: string;
  valueClass?: string;
  sub?: string;
}

function KpiBlock({
  label,
  value,
  valueClass = "text-foreground",
  sub,
}: KpiBlockProps) {
  return (
    <div className="flex-1 rounded-lg border border-border bg-muted/30 px-5 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">
        {label}
      </p>
      <p
        className={`text-2xl font-bold font-display tabular-nums ${valueClass}`}
      >
        {value}
      </p>
      {sub && <p className="mt-0.5 text-xs text-muted-foreground">{sub}</p>}
    </div>
  );
}

// ─── Sub-component: existing recipe card ─────────────────────────────────────

interface RecetteCardProps {
  recette: RecetteFB;
  ingredients: IngredientFB[];
  index: number;
  onEdit: (r: RecetteFB) => void;
  onDelete: (id: string) => void;
}

function RecetteCard({
  recette,
  ingredients,
  index,
  onEdit,
  onDelete,
}: RecetteCardProps) {
  const { coutMatiereTotalHT, foodCostPct } = calculerFoodCostRecette(
    recette,
    ingredients,
  );
  const margePct =
    recette.prixVenteHT > 0
      ? ((recette.prixVenteHT - coutMatiereTotalHT) / recette.prixVenteHT) * 100
      : 0;

  return (
    <div
      className="flex items-start justify-between gap-4 rounded-lg border border-border bg-card p-4 hover:bg-muted/20 transition-colors"
      data-ocid={`recettes.item.${index + 1}`}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-foreground truncate">
            {recette.nom}
          </span>
          {recette.categorie && (
            <Badge variant="secondary" className="text-xs shrink-0">
              {recette.categorie}
            </Badge>
          )}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <span>
            Prix vente:{" "}
            <span className="font-medium text-foreground tabular-nums">
              {formatEur(recette.prixVenteHT)}
            </span>
          </span>
          <span>
            Coût matière:{" "}
            <span
              className={`font-medium tabular-nums ${getFoodCostColor(foodCostPct)}`}
            >
              {formatEur(coutMatiereTotalHT)}
            </span>
          </span>
          <span>
            Food Cost:{" "}
            <span
              className={`font-medium tabular-nums ${getFoodCostColor(foodCostPct)}`}
            >
              {formatPct(foodCostPct)}
            </span>
          </span>
          <span>
            Marge:{" "}
            <span
              className={`font-medium tabular-nums ${getMargeColor(margePct)}`}
            >
              {formatPct(margePct)}
            </span>
          </span>
          <span className="text-muted-foreground/60">
            {recette.ingredients.length} ingrédient
            {recette.ingredients.length !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
          onClick={() => onEdit(recette)}
          data-ocid={`recettes.edit_button.${index + 1}`}
          aria-label={`Modifier ${recette.nom}`}
        >
          <Pencil className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          onClick={() => onDelete(recette.id)}
          data-ocid={`recettes.delete_button.${index + 1}`}
          aria-label={`Supprimer ${recette.nom}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function RecettesPage() {
  const ingredients = useAppStore((s) => s.ingredients);
  const recettes = useAppStore((s) => s.recettes);
  const addRecette = useAppStore((s) => s.addRecette);
  const updateRecette = useAppStore((s) => s.updateRecette);
  const deleteRecette = useAppStore((s) => s.deleteRecette);

  const [form, setForm] = useState<FormState>(INITIAL_FORM);

  // Selected ingredient to add
  const [selectedIngId, setSelectedIngId] = useState<string>("");
  const [selectedQte, setSelectedQte] = useState<string>("1");

  // ── Form helpers ────────────────────────────────────────────────────────

  const updateForm = useCallback(
    <K extends keyof FormState>(key: K, value: FormState[K]) =>
      setForm((prev) => ({ ...prev, [key]: value })),
    [],
  );

  const resetForm = useCallback(() => {
    setForm(INITIAL_FORM);
    setSelectedIngId("");
    setSelectedQte("1");
  }, []);

  const loadRecetteIntoForm = useCallback((r: RecetteFB) => {
    setForm({
      id: r.id,
      nom: r.nom,
      categorie: r.categorie,
      prixVenteHT: String(r.prixVenteHT),
      tva: String(r.tva),
      lignes: [...r.ingredients],
    });
    setSelectedIngId("");
    setSelectedQte("1");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // ── Ingredient lines ────────────────────────────────────────────────────

  const handleAddIngredientLine = useCallback(() => {
    if (!selectedIngId) return;
    const qte = Math.max(0.001, Number.parseFloat(selectedQte) || 0);
    const alreadyPresent = form.lignes.some(
      (l) => l.ingredientId === selectedIngId,
    );
    if (alreadyPresent) {
      // Update quantity instead of duplicating
      setForm((prev) => ({
        ...prev,
        lignes: prev.lignes.map((l) =>
          l.ingredientId === selectedIngId
            ? { ...l, quantiteNette: l.quantiteNette + qte }
            : l,
        ),
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        lignes: [
          ...prev.lignes,
          { ingredientId: selectedIngId, quantiteNette: qte },
        ],
      }));
    }
    setSelectedIngId("");
    setSelectedQte("1");
  }, [selectedIngId, selectedQte, form.lignes]);

  const handleUpdateLigne = useCallback(
    (ingredientId: string, quantiteNette: number) =>
      setForm((prev) => ({
        ...prev,
        lignes: prev.lignes.map((l) =>
          l.ingredientId === ingredientId ? { ...l, quantiteNette } : l,
        ),
      })),
    [],
  );

  const handleDeleteLigne = useCallback(
    (ingredientId: string) =>
      setForm((prev) => ({
        ...prev,
        lignes: prev.lignes.filter((l) => l.ingredientId !== ingredientId),
      })),
    [],
  );

  // ── Live cost analysis ──────────────────────────────────────────────────

  const liveAnalysis = useMemo(() => {
    const partialRecette: RecetteFB = {
      id: form.id ?? "",
      nom: form.nom,
      categorie: form.categorie,
      prixVenteHT: Number.parseFloat(form.prixVenteHT) || 0,
      tva: Number.parseFloat(form.tva) || 0,
      ingredients: form.lignes,
    };
    const { coutMatiereTotalHT, foodCostPct } = calculerFoodCostRecette(
      partialRecette,
      ingredients,
    );
    const prixVente = partialRecette.prixVenteHT;
    const margePct =
      prixVente > 0 ? ((prixVente - coutMatiereTotalHT) / prixVente) * 100 : 0;
    return { coutMatiereTotalHT, foodCostPct, margePct };
  }, [form, ingredients]);

  // ── Save ────────────────────────────────────────────────────────────────

  const handleSave = useCallback(() => {
    const recetteData: Omit<RecetteFB, "id"> = {
      nom: form.nom.trim(),
      categorie: form.categorie.trim(),
      prixVenteHT: Number.parseFloat(form.prixVenteHT) || 0,
      tva: Number.parseFloat(form.tva) || 0,
      ingredients: form.lignes,
    };
    if (!recetteData.nom) return;

    if (form.id) {
      updateRecette(form.id, recetteData);
    } else {
      addRecette({ id: generateId(), ...recetteData });
    }
    resetForm();
  }, [form, addRecette, updateRecette, resetForm]);

  const isFormValid = form.nom.trim().length > 0;
  const isEditing = form.id !== null;

  // ── Available ingredients (not yet in recipe) for the add dropdown ──────
  const availableIngredients = ingredients.filter(
    (ing) => !form.lignes.some((l) => l.ingredientId === ing.id),
  );

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6" data-ocid="recettes.page">
      {/* ── Page Header ──────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-display font-semibold text-foreground">
            Fiches Techniques
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Créez vos recettes et calculez leurs coûts matière en temps réel.
          </p>
        </div>
        <Badge
          variant="secondary"
          className="text-xs font-medium self-start sm:self-auto"
          data-ocid="recettes.count.badge"
        >
          {recettes.length} fiche{recettes.length !== 1 ? "s" : ""}
        </Badge>
      </div>

      {/* ── SECTION A — Infos Générales ──────────────────────────────── */}
      <Card className="border-border bg-card" data-ocid="recettes.form.section">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base font-semibold text-foreground">
                {isEditing
                  ? "Modifier la fiche technique"
                  : "Nouvelle Fiche Technique"}
              </CardTitle>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Section A — Informations générales du plat
              </p>
            </div>
            {isEditing && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-muted-foreground"
                onClick={resetForm}
                data-ocid="recettes.cancel_button"
              >
                <X className="h-4 w-4" />
                Annuler
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-1.5">
              <Label htmlFor="rec-nom" className="text-sm font-medium">
                Nom du plat
              </Label>
              <Input
                id="rec-nom"
                placeholder="ex : Poulet Rôti"
                value={form.nom}
                onChange={(e) => updateForm("nom", e.target.value)}
                data-ocid="recettes.nom.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rec-categorie" className="text-sm font-medium">
                Catégorie
              </Label>
              <Input
                id="rec-categorie"
                placeholder="ex : Plat, Entrée, Dessert"
                value={form.categorie}
                onChange={(e) => updateForm("categorie", e.target.value)}
                data-ocid="recettes.categorie.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rec-prix" className="text-sm font-medium">
                Prix de vente HT (€)
              </Label>
              <Input
                id="rec-prix"
                type="number"
                min={0}
                step={0.5}
                placeholder="0,00"
                value={form.prixVenteHT}
                onChange={(e) => updateForm("prixVenteHT", e.target.value)}
                className="tabular-nums"
                data-ocid="recettes.prix.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rec-tva" className="text-sm font-medium">
                TVA (%)
              </Label>
              <Select
                value={form.tva}
                onValueChange={(v) => updateForm("tva", v)}
              >
                <SelectTrigger id="rec-tva" data-ocid="recettes.tva.select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="5.5">5,5 %</SelectItem>
                  <SelectItem value="10">10 %</SelectItem>
                  <SelectItem value="20">20 %</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── SECTION B — Composition ──────────────────────────────────── */}
      <Card
        className="border-border bg-card"
        data-ocid="recettes.composition.section"
      >
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold text-foreground">
            Section B — Composition de la Recette
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Ajoutez les ingrédients et leurs quantités nettes (après perte).
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add ingredient row */}
          <div
            className="flex flex-col gap-3 rounded-lg border border-dashed border-border bg-muted/20 p-4 sm:flex-row sm:items-end"
            data-ocid="recettes.add-ingredient.panel"
          >
            <div className="flex-1 space-y-1.5">
              <Label className="text-sm font-medium">Ingrédient</Label>
              <Select
                value={selectedIngId}
                onValueChange={setSelectedIngId}
                disabled={ingredients.length === 0}
              >
                <SelectTrigger
                  data-ocid="recettes.ingredient.select"
                  className="bg-background"
                >
                  <SelectValue
                    placeholder={
                      ingredients.length === 0
                        ? "Créez d'abord des ingrédients"
                        : "Sélectionner un ingrédient…"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {availableIngredients.map((ing) => (
                    <SelectItem key={ing.id} value={ing.id}>
                      {ing.nom}
                      <span className="ml-2 text-muted-foreground text-xs">
                        ({ing.unite} — {formatEur(ing.prixAchatHT)})
                      </span>
                    </SelectItem>
                  ))}
                  {availableIngredients.length === 0 &&
                    ingredients.length > 0 && (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        Tous les ingrédients sont déjà ajoutés.
                      </div>
                    )}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full space-y-1.5 sm:w-32">
              <Label className="text-sm font-medium">Quantité nette</Label>
              <Input
                type="number"
                min={0}
                step={0.01}
                value={selectedQte}
                onChange={(e) => setSelectedQte(e.target.value)}
                className="tabular-nums bg-background"
                data-ocid="recettes.quantite.input"
                placeholder="1"
              />
            </div>
            <Button
              onClick={handleAddIngredientLine}
              disabled={!selectedIngId}
              size="sm"
              variant="secondary"
              className="gap-2 shrink-0"
              data-ocid="recettes.add-ingredient.button"
            >
              <Plus className="h-4 w-4" />
              Ajouter
            </Button>
          </div>

          {/* Ingredient lines table */}
          {form.lignes.length > 0 ? (
            <div
              className="overflow-x-auto rounded-lg border border-border"
              data-ocid="recettes.lignes.table"
            >
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="pl-4 font-semibold text-foreground">
                      Ingrédient
                    </TableHead>
                    <TableHead className="font-semibold text-foreground">
                      Unité
                    </TableHead>
                    <TableHead className="font-semibold text-foreground w-32">
                      Quantité nette
                    </TableHead>
                    <TableHead className="text-right font-semibold text-foreground">
                      Coût partiel HT
                    </TableHead>
                    <TableHead className="pr-4 w-12" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {form.lignes.map((ligne, idx) => {
                    const ing = ingredients.find(
                      (i) => i.id === ligne.ingredientId,
                    );
                    const cout = ing
                      ? calculerCoutIngredient(ing, ligne.quantiteNette)
                      : 0;
                    return (
                      <TableRow
                        key={ligne.ingredientId}
                        className="border-border hover:bg-muted/40 transition-colors"
                        data-ocid={`recettes.ligne.item.${idx + 1}`}
                      >
                        <TableCell className="pl-4 font-medium text-foreground">
                          {ing?.nom ?? (
                            <span className="text-destructive text-sm">
                              Ingrédient introuvable
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {ing?.unite ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min={0}
                            step={0.01}
                            value={ligne.quantiteNette}
                            onChange={(e) =>
                              handleUpdateLigne(
                                ligne.ingredientId,
                                Math.max(
                                  0,
                                  Number.parseFloat(e.target.value) || 0,
                                ),
                              )
                            }
                            className="h-8 w-28 text-right tabular-nums bg-background"
                            data-ocid={`recettes.qte.input.${idx + 1}`}
                            aria-label={`Quantité — ${ing?.nom ?? "ingrédient"}`}
                          />
                        </TableCell>
                        <TableCell className="text-right tabular-nums font-medium text-foreground">
                          {formatEur(cout)}
                        </TableCell>
                        <TableCell className="pr-4 text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            onClick={() =>
                              handleDeleteLigne(ligne.ingredientId)
                            }
                            data-ocid={`recettes.ligne.delete_button.${idx + 1}`}
                            aria-label={`Retirer ${ing?.nom ?? "ingrédient"}`}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div
              className="flex items-center justify-center gap-2 rounded-lg border border-dashed border-border py-8 text-sm text-muted-foreground"
              data-ocid="recettes.lignes.empty_state"
            >
              <ChefHat className="h-5 w-5 opacity-50" />
              <span>
                Aucun ingrédient ajouté. Utilisez le sélecteur ci-dessus.
              </span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── SECTION C — Analyse Coût ─────────────────────────────────── */}
      <Card
        className="border-border bg-card"
        data-ocid="recettes.analyse.section"
      >
        <CardHeader className="pb-4">
          <CardTitle className="text-base font-semibold text-foreground">
            Section C — Analyse du Coût en Temps Réel
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Se recalcule automatiquement à chaque modification de la recette.
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex flex-col gap-3 sm:flex-row">
            <KpiBlock
              label="Coût Matière Total HT"
              value={formatEur(liveAnalysis.coutMatiereTotalHT)}
              data-ocid="recettes.kpi-cout.card"
            />
            <KpiBlock
              label="Food Cost"
              value={formatPct(liveAnalysis.foodCostPct)}
              valueClass={getFoodCostColor(liveAnalysis.foodCostPct)}
              sub={
                liveAnalysis.foodCostPct > 40
                  ? "⚠ Trop élevé (objectif < 35 %)"
                  : liveAnalysis.foodCostPct > 30
                    ? "Acceptable (objectif < 35 %)"
                    : "Excellent"
              }
              data-ocid="recettes.kpi-foodcost.card"
            />
            <KpiBlock
              label="Marge Brute"
              value={formatPct(liveAnalysis.margePct)}
              valueClass={getMargeColor(liveAnalysis.margePct)}
              sub={
                liveAnalysis.margePct < 60
                  ? "⚠ Marge insuffisante (< 60 %)"
                  : liveAnalysis.margePct >= 70
                    ? "Marge saine (≥ 70 %)"
                    : "Marge correcte"
              }
              data-ocid="recettes.kpi-marge.card"
            />
          </div>

          <Separator className="bg-border" />

          {/* Save button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={!isFormValid}
              className="gap-2"
              data-ocid="recettes.save_button"
            >
              <Save className="h-4 w-4" />
              {isEditing ? "Mettre à jour la fiche" : "Enregistrer la fiche"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ── Existing Recipes List ─────────────────────────────────────── */}
      <div data-ocid="recettes.list.section">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Fiches Enregistrées
          </h2>
          <Badge variant="outline" className="text-xs">
            {recettes.length} fiche{recettes.length !== 1 ? "s" : ""}
          </Badge>
        </div>

        {recettes.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-muted/20 py-14 text-center px-6"
            data-ocid="recettes.list.empty_state"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <BookOpen className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Aucune fiche technique créée
              </p>
              <p className="mt-0.5 text-sm text-muted-foreground">
                Remplissez le formulaire ci-dessus et cliquez sur "Enregistrer".
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-2" data-ocid="recettes.list">
            {recettes.map((r, idx) => (
              <RecetteCard
                key={r.id}
                recette={r}
                ingredients={ingredients}
                index={idx}
                onEdit={loadRecetteIntoForm}
                onDelete={deleteRecette}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
