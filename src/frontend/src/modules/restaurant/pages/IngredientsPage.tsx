/**
 * IngredientsPage.tsx — Gestion CRUD des ingrédients F&B
 * RÈGLE : Aucun calcul métier dans ce composant — uniquement UI & store calls.
 */
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  FamilleIngredient,
  IngredientFB,
} from "@/modules/restaurant/types/models";
import { PackageOpen, Plus, Search, Trash2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────

type Unite = IngredientFB["unite"];

const UNITES: Unite[] = ["Kg", "Litre", "Pièce"];

const FAMILLES: FamilleIngredient[] = [
  "Viandes & Volailles",
  "Marée",
  "B.O.F",
  "Fruits & Légumes",
  "Épicerie Sèche",
  "Surgelés",
  "Liquides",
  "Consommables",
];

// Color mapping for famille badges — using Tailwind classes
const FAMILLE_COLORS: Record<FamilleIngredient, string> = {
  "Viandes & Volailles":
    "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800",
  Marée:
    "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800",
  "B.O.F":
    "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-400 dark:border-yellow-800",
  "Fruits & Légumes":
    "bg-green-100 text-green-700 border-green-200 dark:bg-green-950/40 dark:text-green-400 dark:border-green-800",
  "Épicerie Sèche":
    "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
  Surgelés:
    "bg-cyan-100 text-cyan-700 border-cyan-200 dark:bg-cyan-950/40 dark:text-cyan-400 dark:border-cyan-800",
  Liquides:
    "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-400 dark:border-indigo-800",
  Consommables:
    "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/40 dark:text-purple-400 dark:border-purple-800",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId(): string {
  return `ing-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function formatEur(v: number): string {
  return `${new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v)} €`;
}

// ─── FamilleBadge ─────────────────────────────────────────────────────────────

function FamilleBadge({ famille }: { famille?: FamilleIngredient }) {
  if (!famille) {
    return (
      <span className="inline-flex items-center rounded border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">
        Non classé
      </span>
    );
  }
  return (
    <span
      className={`inline-flex items-center rounded border px-2 py-0.5 text-xs font-medium ${FAMILLE_COLORS[famille]}`}
    >
      {famille}
    </span>
  );
}

// ─── Row component ────────────────────────────────────────────────────────────

interface IngredientRowProps {
  ingredient: IngredientFB;
  index: number;
  onUpdate: (id: string, updates: Partial<IngredientFB>) => void;
  onDelete: (id: string) => void;
}

function IngredientRow({
  ingredient,
  index,
  onUpdate,
  onDelete,
}: IngredientRowProps) {
  return (
    <TableRow
      className="border-border hover:bg-muted/40 transition-colors"
      data-ocid={`ingredients.item.${index + 1}`}
    >
      {/* Nom */}
      <TableCell className="pl-6 min-w-[160px]">
        <Input
          value={ingredient.nom}
          onChange={(e) => onUpdate(ingredient.id, { nom: e.target.value })}
          placeholder="Nom de l'ingrédient"
          className="h-8 text-sm bg-background"
          data-ocid={`ingredients.nom.input.${index + 1}`}
          aria-label={`Nom — ligne ${index + 1}`}
        />
      </TableCell>

      {/* Famille */}
      <TableCell className="min-w-[180px]">
        <Select
          value={ingredient.famille ?? "__none__"}
          onValueChange={(v) =>
            onUpdate(ingredient.id, {
              famille: v === "__none__" ? undefined : (v as FamilleIngredient),
            })
          }
        >
          <SelectTrigger
            className="h-8 text-sm bg-background"
            data-ocid={`ingredients.famille.select.${index + 1}`}
            aria-label={`Famille — ligne ${index + 1}`}
          >
            <SelectValue placeholder="Non classé" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">
              <span className="text-muted-foreground">Non classé</span>
            </SelectItem>
            {FAMILLES.map((f) => (
              <SelectItem key={f} value={f}>
                {f}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>

      {/* Unité */}
      <TableCell className="min-w-[100px]">
        <Select
          value={ingredient.unite}
          onValueChange={(v) => onUpdate(ingredient.id, { unite: v as Unite })}
        >
          <SelectTrigger
            className="h-8 text-sm bg-background"
            data-ocid={`ingredients.unite.select.${index + 1}`}
            aria-label={`Unité — ligne ${index + 1}`}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {UNITES.map((u) => (
              <SelectItem key={u} value={u}>
                {u}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </TableCell>

      {/* Prix Achat HT */}
      <TableCell className="min-w-[130px]">
        <Input
          type="number"
          min={0}
          step={0.01}
          value={ingredient.prixAchatHT}
          onChange={(e) =>
            onUpdate(ingredient.id, {
              prixAchatHT: Math.max(0, Number.parseFloat(e.target.value) || 0),
            })
          }
          className="h-8 text-sm text-right bg-background tabular-nums"
          data-ocid={`ingredients.prix.input.${index + 1}`}
          aria-label={`Prix achat HT — ligne ${index + 1}`}
        />
      </TableCell>

      {/* Perte Matière % */}
      <TableCell className="min-w-[110px]">
        <div className="relative">
          <Input
            type="number"
            min={0}
            max={99}
            step={0.5}
            value={ingredient.perteMatierePct}
            onChange={(e) =>
              onUpdate(ingredient.id, {
                perteMatierePct: Math.min(
                  99,
                  Math.max(0, Number.parseFloat(e.target.value) || 0),
                ),
              })
            }
            className="h-8 text-sm text-right pr-7 bg-background tabular-nums"
            data-ocid={`ingredients.perte.input.${index + 1}`}
            aria-label={`Perte matière % — ligne ${index + 1}`}
          />
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            %
          </span>
        </div>
      </TableCell>

      {/* Prix référence */}
      <TableCell className="text-right tabular-nums text-muted-foreground text-sm pr-2">
        {formatEur(ingredient.prixAchatHT)}
        <span className="ml-1 text-xs text-muted-foreground/60">
          / {ingredient.unite}
        </span>
      </TableCell>

      {/* Actions */}
      <TableCell className="pr-4 text-right">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          onClick={() => onDelete(ingredient.id)}
          data-ocid={`ingredients.delete_button.${index + 1}`}
          aria-label={`Supprimer ${ingredient.nom || "cet ingrédient"}`}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function IngredientsPage() {
  const ingredients = useAppStore((s) => s.ingredients);
  const addIngredient = useAppStore((s) => s.addIngredient);
  const updateIngredient = useAppStore((s) => s.updateIngredient);
  const deleteIngredient = useAppStore((s) => s.deleteIngredient);

  // ── Filters ──────────────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [familleFilter, setFamilleFilter] = useState<
    FamilleIngredient | "__all__"
  >("__all__");

  const filteredIngredients = useMemo(() => {
    return ingredients.filter((ing) => {
      const matchesSearch =
        searchQuery.trim() === "" ||
        ing.nom.toLowerCase().includes(searchQuery.trim().toLowerCase());
      const matchesFamille =
        familleFilter === "__all__" ||
        (ing.famille ?? undefined) === familleFilter;
      return matchesSearch && matchesFamille;
    });
  }, [ingredients, searchQuery, familleFilter]);

  const handleAdd = useCallback(() => {
    const newIng: IngredientFB = {
      id: generateId(),
      nom: "",
      unite: "Kg",
      prixAchatHT: 0,
      perteMatierePct: 0,
    };
    addIngredient(newIng);
  }, [addIngredient]);

  const showEmptyBase = ingredients.length === 0;
  const showEmptyFilter = !showEmptyBase && filteredIngredients.length === 0;

  return (
    <div className="space-y-6" data-ocid="ingredients.page">
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-display font-semibold text-foreground">
            Ingrédients F&amp;B
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            Gérez votre catalogue d'achats et leurs coûts unitaires.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant="secondary"
            className="text-xs font-medium"
            data-ocid="ingredients.count.badge"
          >
            {ingredients.length} ingrédient{ingredients.length !== 1 ? "s" : ""}
          </Badge>
          <Button
            onClick={handleAdd}
            size="sm"
            className="gap-2"
            data-ocid="ingredients.add_button"
          >
            <Plus className="h-4 w-4" />
            Ajouter un Ingrédient
          </Button>
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────── */}
      {!showEmptyBase && (
        <div
          className="flex flex-col gap-3 sm:flex-row sm:items-center"
          data-ocid="ingredients.filters.panel"
        >
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Rechercher par nom…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-background"
              data-ocid="ingredients.search_input"
              aria-label="Rechercher un ingrédient"
            />
          </div>
          {/* Famille filter */}
          <Select
            value={familleFilter}
            onValueChange={(v) =>
              setFamilleFilter(v as FamilleIngredient | "__all__")
            }
          >
            <SelectTrigger
              className="h-9 w-full sm:w-56 bg-background text-sm"
              data-ocid="ingredients.famille_filter.select"
              aria-label="Filtrer par famille"
            >
              <SelectValue placeholder="Toutes les familles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">Toutes les familles</SelectItem>
              {FAMILLES.map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <Card className="border-border bg-card" data-ocid="ingredients.table">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground">
            Catalogue des Ingrédients
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Modifiez directement les cellules — les changements sont sauvegardés
            automatiquement.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {showEmptyBase ? (
            <div
              className="flex flex-col items-center justify-center py-16 text-center px-6"
              data-ocid="ingredients.empty_state"
            >
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <PackageOpen className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">
                Aucun ingrédient enregistré
              </p>
              <p className="mt-1 text-sm text-muted-foreground max-w-xs">
                Commencez par ajouter vos matières premières pour pouvoir
                composer des fiches techniques.
              </p>
              <Button
                onClick={handleAdd}
                size="sm"
                className="mt-4 gap-2"
                data-ocid="ingredients.empty.add_button"
              >
                <Plus className="h-4 w-4" />
                Ajouter un Ingrédient
              </Button>
            </div>
          ) : showEmptyFilter ? (
            <div
              className="flex flex-col items-center justify-center py-12 text-center px-6"
              data-ocid="ingredients.filter.empty_state"
            >
              <Search className="h-8 w-8 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-foreground">
                Aucun résultat
              </p>
              <p className="mt-1 text-sm text-muted-foreground max-w-xs">
                Essayez de modifier votre recherche ou de changer de filtre.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="pl-6 font-semibold text-foreground">
                      Nom
                    </TableHead>
                    <TableHead className="font-semibold text-foreground">
                      Famille
                    </TableHead>
                    <TableHead className="font-semibold text-foreground">
                      Unité
                    </TableHead>
                    <TableHead className="font-semibold text-foreground">
                      Prix Achat HT
                    </TableHead>
                    <TableHead className="font-semibold text-foreground">
                      Perte Matière
                    </TableHead>
                    <TableHead className="text-right font-semibold text-foreground">
                      Prix référence
                    </TableHead>
                    <TableHead className="pr-4 text-right font-semibold text-foreground">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredIngredients.map((ing, idx) => (
                    <IngredientRow
                      key={ing.id}
                      ingredient={ing}
                      index={idx}
                      onUpdate={updateIngredient}
                      onDelete={deleteIngredient}
                    />
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Famille legend ───────────────────────────────────────────────── */}
      {!showEmptyBase && (
        <div
          className="flex flex-wrap gap-2"
          data-ocid="ingredients.famille_legend.panel"
          aria-label="Légende des familles"
        >
          {FAMILLES.map((f) => (
            <FamilleBadge key={f} famille={f} />
          ))}
        </div>
      )}
    </div>
  );
}
