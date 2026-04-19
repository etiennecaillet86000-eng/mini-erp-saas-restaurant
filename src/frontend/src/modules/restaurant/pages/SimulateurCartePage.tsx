import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAppStore } from "@/core/store/useAppStore";
import {
  AlertTriangle,
  BookOpen,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useMemo, useRef, useState } from "react";
import {
  calculerCAReel,
  calculerFoodCostRecette,
  calculerFoodCostReel,
  calculerMargeRecette,
} from "../utils/calculations";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MixCible {
  categorie: string;
  pourcentage: number;
}

// ─── Static configuration ─────────────────────────────────────────────────────

const MIX_CIBLE: MixCible[] = [
  { categorie: "Boissons", pourcentage: 10 },
  { categorie: "Sandwichs", pourcentage: 15 },
  { categorie: "Menus", pourcentage: 40 },
  { categorie: "Desserts", pourcentage: 10 },
];

// Colour tokens per category — extensible for dynamic categories
const CATEGORIE_COLORS: Record<string, string> = {
  Boissons: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  Sandwichs:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  Menus:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  Desserts: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
  // Fallback for unknown categories — uses muted token via className fallback
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getCategorieCn(categorie: string): string {
  return CATEGORIE_COLORS[categorie] ?? "bg-muted text-muted-foreground";
}

function formatEur(value: number): string {
  return `${new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)} €`;
}

function formatPct(value: number, decimals = 1): string {
  return `${value.toFixed(decimals).replace(".", ",")} %`;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MixBar({ value, max = 50 }: { value: number; max?: number }) {
  const width = Math.min((value / max) * 100, 100);
  return (
    <div className="h-2 w-full rounded-full bg-muted overflow-hidden mt-1">
      <div
        className="h-full rounded-full bg-primary transition-all duration-500"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}

interface KpiCardProps {
  label: string;
  value: string;
  alert?: boolean;
  positive?: boolean;
  "data-ocid"?: string;
}

function KpiCard({
  label,
  value,
  alert,
  positive,
  "data-ocid": ocid,
}: KpiCardProps) {
  return (
    <Card className="flex-1 border-border bg-card" data-ocid={ocid}>
      <CardContent className="pt-5 pb-4 px-5">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
          {label}
        </p>
        <div className="flex items-center gap-2">
          {alert && (
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
          )}
          {!alert && positive && (
            <TrendingUp className="h-5 w-5 text-emerald-500 flex-shrink-0" />
          )}
          {!alert && !positive && (
            <TrendingDown className="h-5 w-5 text-muted-foreground flex-shrink-0" />
          )}
          <span
            className={`text-2xl font-bold font-display tabular-nums ${
              alert
                ? "text-destructive"
                : positive
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-foreground"
            }`}
          >
            {value}
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function SectionBEmpty() {
  const handleNavigate = () => {
    // Dispatches a custom event picked up by App.tsx to switch page.
    // App.tsx should listen: window.addEventListener('app-navigate', ...)
    window.dispatchEvent(
      new CustomEvent("app-navigate", { detail: "fiches-techniques" }),
    );
  };

  return (
    <div
      className="flex flex-col items-center justify-center gap-4 py-16 px-6 text-center"
      data-ocid="labo-recettes.recettes.empty_state"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
        <BookOpen className="h-7 w-7 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">
          Aucune recette créée
        </p>
        <p className="text-sm text-muted-foreground max-w-xs">
          Créez vos fiches techniques pour simuler votre carte et calculer la
          marge globale.
        </p>
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleNavigate}
        data-ocid="labo-recettes.goto-fiches.button"
      >
        Accéder à Fiches Techniques
      </Button>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function SimulateurCartePage() {
  const recettes = useAppStore((s) => s.recettes);
  const ingredients = useAppStore((s) => s.ingredients);

  // Initialise volumes at 0 for all recettes present at mount time.
  // Volumes are user-controlled after that — new recettes get volume 0 on demand.
  const initialVolumesRef = useRef<Record<string, number>>(
    Object.fromEntries(recettes.map((r) => [r.id, 0])),
  );

  const [volumes, setVolumes] = useState<Record<string, number>>(
    initialVolumesRef.current,
  );

  const updateVolume = (id: string, raw: string) => {
    const val = Math.max(0, Number.parseInt(raw, 10) || 0);
    setVolumes((prev) => ({ ...prev, [id]: val }));
  };

  // ── Derived computations ──────────────────────────────────────────────────

  const totalVolume = useMemo(
    () => recettes.reduce((sum, r) => sum + (volumes[r.id] ?? 0), 0),
    [recettes, volumes],
  );

  // Mix Réel aligned to MIX_CIBLE categories (known strategy buckets)
  const mixReel = useMemo(() => {
    const byCategorie: Record<string, number> = {};
    for (const r of recettes) {
      byCategorie[r.categorie] =
        (byCategorie[r.categorie] ?? 0) + (volumes[r.id] ?? 0);
    }
    return MIX_CIBLE.map(({ categorie }) => ({
      categorie,
      pourcentage:
        totalVolume > 0
          ? ((byCategorie[categorie] ?? 0) / totalVolume) * 100
          : 0,
    }));
  }, [recettes, volumes, totalVolume]);

  // Per-recette food cost — calculated from real ingredients
  const recetteCouts = useMemo(
    () =>
      recettes.map((r) => {
        const { coutMatiereTotalHT } = calculerFoodCostRecette(r, ingredients);
        return { id: r.id, coutMatiereTotalHT };
      }),
    [recettes, ingredients],
  );

  const coutById = useMemo(
    () =>
      Object.fromEntries(recetteCouts.map((c) => [c.id, c.coutMatiereTotalHT])),
    [recetteCouts],
  );

  const totalCA = useMemo(
    () =>
      calculerCAReel(
        recettes.map((r) => volumes[r.id] ?? 0),
        recettes.map((r) => r.prixVenteHT),
      ),
    [recettes, volumes],
  );

  const totalCoutMatiere = useMemo(
    () =>
      recettes.reduce(
        (sum, r) => sum + (volumes[r.id] ?? 0) * (coutById[r.id] ?? 0),
        0,
      ),
    [recettes, volumes, coutById],
  );

  const foodCostGlobal = useMemo(
    () => calculerFoodCostReel(totalCoutMatiere, totalCA),
    [totalCoutMatiere, totalCA],
  );

  const margeBruteGlobale = useMemo(
    () => (totalCA > 0 ? ((totalCA - totalCoutMatiere) / totalCA) * 100 : 0),
    [totalCA, totalCoutMatiere],
  );

  const margeAlert = margeBruteGlobale < 70 && totalCA > 0;

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6" data-ocid="labo-recettes.page">
      {/* ── SECTION A — Comparateur Mix Produit ───────────────────────── */}
      <Card
        className="border-border bg-card"
        data-ocid="labo-recettes.mix.section"
      >
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground">
            Section A — Comparateur Mix Produit
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Comparez votre mix de vente réel avec vos objectifs stratégiques.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            {/* Mix Cible */}
            <div data-ocid="labo-recettes.mix-cible.panel">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Mix Cible (stratégie)
              </p>
              <div className="space-y-3">
                {MIX_CIBLE.map(({ categorie, pourcentage }) => (
                  <div
                    key={categorie}
                    data-ocid={`labo-recettes.mix-cible.${categorie.toLowerCase()}.item`}
                  >
                    <div className="flex items-center justify-between mb-0.5">
                      <span
                        className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${getCategorieCn(categorie)}`}
                      >
                        {categorie}
                      </span>
                      <span className="text-sm font-semibold text-foreground tabular-nums">
                        {pourcentage} %
                      </span>
                    </div>
                    <MixBar value={pourcentage} />
                  </div>
                ))}
              </div>
            </div>

            {/* Mix Réel */}
            <div data-ocid="labo-recettes.mix-reel.panel">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Mix Réel (volumes actuels)
              </p>
              <div className="space-y-3">
                {mixReel.map(({ categorie, pourcentage }) => {
                  const cible =
                    MIX_CIBLE.find((m) => m.categorie === categorie)
                      ?.pourcentage ?? 0;
                  const diff = pourcentage - cible;
                  return (
                    <div
                      key={categorie}
                      data-ocid={`labo-recettes.mix-reel.${categorie.toLowerCase()}.item`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span
                          className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${getCategorieCn(categorie)}`}
                        >
                          {categorie}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground tabular-nums">
                            {pourcentage.toFixed(1).replace(".", ",")} %
                          </span>
                          {diff !== 0 && (
                            <span
                              className={`text-[11px] font-medium tabular-nums ${diff > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}
                            >
                              {diff > 0 ? "+" : ""}
                              {diff.toFixed(1).replace(".", ",")}
                            </span>
                          )}
                        </div>
                      </div>
                      <MixBar value={pourcentage} />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── SECTION B — Grille de Saisie ──────────────────────────────── */}
      <Card
        className="border-border bg-card"
        data-ocid="labo-recettes.grille.section"
      >
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground">
            Section B — Grille de Saisie des Volumes
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Renseignez les volumes estimés par semaine. La marge se calcule
            automatiquement.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {recettes.length === 0 ? (
            <SectionBEmpty />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-border hover:bg-transparent">
                    <TableHead className="pl-6 font-semibold text-foreground">
                      Recette
                    </TableHead>
                    <TableHead className="font-semibold text-foreground">
                      Catégorie
                    </TableHead>
                    <TableHead className="text-right font-semibold text-foreground">
                      Prix Vente HT
                    </TableHead>
                    <TableHead className="text-right font-semibold text-foreground">
                      Food Cost HT
                    </TableHead>
                    <TableHead className="text-right font-semibold text-foreground w-36">
                      Vol. / semaine
                    </TableHead>
                    <TableHead className="text-right pr-6 font-semibold text-foreground">
                      Marge Brute
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recettes.map((recette, idx) => {
                    const vol = volumes[recette.id] ?? 0;
                    const coutMatiere = coutById[recette.id] ?? 0;
                    const margeUnit = calculerMargeRecette(
                      recette.prixVenteHT,
                      coutMatiere,
                    );
                    const margeLigne = vol * margeUnit;
                    return (
                      <TableRow
                        key={recette.id}
                        className="border-border hover:bg-muted/40 transition-colors"
                        data-ocid={`labo-recettes.recette.item.${idx + 1}`}
                      >
                        <TableCell className="pl-6 font-medium text-foreground">
                          {recette.nom}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${getCategorieCn(recette.categorie)}`}
                          >
                            {recette.categorie}
                          </span>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {recette.prixVenteHT.toFixed(2).replace(".", ",")} €
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {coutMatiere.toFixed(2).replace(".", ",")} €
                        </TableCell>
                        <TableCell className="text-right">
                          <input
                            type="number"
                            min={0}
                            value={vol}
                            onChange={(e) =>
                              updateVolume(recette.id, e.target.value)
                            }
                            className="w-24 rounded-md border border-input bg-background px-2 py-1 text-right text-sm font-medium text-foreground tabular-nums focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
                            data-ocid={`labo-recettes.volume.input.${idx + 1}`}
                            aria-label={`Volume semaine — ${recette.nom}`}
                          />
                        </TableCell>
                        <TableCell className="text-right pr-6 tabular-nums font-semibold text-foreground">
                          {formatEur(margeLigne)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── SECTION C — Bilan de la Carte ─────────────────────────────── */}
      <div data-ocid="labo-recettes.bilan.section">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground px-0.5">
          Section C — Bilan de la Carte (semaine)
        </p>
        <div className="flex flex-col gap-4 sm:flex-row">
          <KpiCard
            label="CA Hebdomadaire"
            value={formatEur(totalCA)}
            positive={totalCA > 0}
            data-ocid="labo-recettes.kpi-ca.card"
          />
          <KpiCard
            label="Food Cost Global"
            value={formatPct(foodCostGlobal)}
            alert={foodCostGlobal > 35 && totalCA > 0}
            positive={foodCostGlobal > 0 && foodCostGlobal <= 35}
            data-ocid="labo-recettes.kpi-foodcost.card"
          />
          <KpiCard
            label="Marge Brute Globale"
            value={formatPct(margeBruteGlobale)}
            alert={margeAlert}
            positive={!margeAlert && totalCA > 0}
            data-ocid="labo-recettes.kpi-marge.card"
          />
        </div>
        {margeAlert && (
          <div
            className="mt-3 flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive"
            data-ocid="labo-recettes.marge-alert.error_state"
          >
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>
              <strong>Attention :</strong> La marge brute globale est inférieure
              à 70 %. Révisez vos volumes ou vos prix de vente.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
