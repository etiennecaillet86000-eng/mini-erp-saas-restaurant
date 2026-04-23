import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
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
import useStatsSimulateur from "@/core/hooks/useStatsSimulateur";
import { useAppStore } from "@/core/store/useAppStore";
import {
  AlertTriangle,
  BookOpen,
  RotateCcw,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  calculerCAReel,
  calculerFoodCostRecette,
  calculerFoodCostReel,
  calculerMargeRecette,
} from "../utils/calculations";

// ─── Category dot colours (ACTION 3) ─────────────────────────────────────────

const CATEGORY_DOT_COLORS: Record<string, string> = {
  cat_boissons: "bg-blue-500",
  cat_snacking: "bg-amber-400",
  cat_plats: "bg-red-500",
  cat_desserts: "bg-pink-400",
  cat_acc: "bg-green-500",
  cat_formules: "bg-indigo-500",
};

// Colour tokens per category (badge pills in Catégorie column)
const CATEGORIE_COLORS: Record<string, string> = {
  Boissons: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  Snacking:
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
  "Plats chauds":
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
  Desserts: "bg-pink-100 text-pink-700 dark:bg-pink-900/40 dark:text-pink-300",
  Accompagnements:
    "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300",
  Formules:
    "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
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
  // ── Individual Zustand selectors (never grouped destructuring) ────────────
  const recettes = useAppStore((s) => s.recettes);
  const categoriesCarte = useAppStore((s) => s.categoriesCarte);
  const ingredients = useAppStore((s) => s.ingredients);
  const updateRecette = useAppStore((s) => s.updateRecette);
  const resetVolumes = useAppStore((s) => s.resetVolumes);
  // Phase 4.2 — BP hypotheses for coherence indicator
  const hypothesesBP = useAppStore((s) => s.hypothesesBP);
  // Phase 5.1 — Marge cible globale from BP
  const margeCibleGlobale =
    useAppStore((s) => s.hypothesesBP.margeCibleGlobale) || 70;

  // ── Central stats hook (volumes, CA, Mix Réel per category) ──────────────
  const stats = useStatsSimulateur();

  // ── ACTION 1: Local filter state ──────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategorie, setFilterCategorie] = useState("all");

  // ── ACTION 2: Reset dialog state ──────────────────────────────────────────
  const [showResetDialog, setShowResetDialog] = useState(false);

  // ── Filtered recipes (live, does NOT touch the store) ─────────────────────
  const recettesFiltrees = useMemo(() => {
    return recettes.filter((r) => {
      const matchNom = r.nom.toLowerCase().includes(searchQuery.toLowerCase());
      const matchCat =
        filterCategorie === "all" || r.categorieId === filterCategorie;
      return matchNom && matchCat;
    });
  }, [recettes, searchQuery, filterCategorie]);

  // ── Derived computations ──────────────────────────────────────────────────
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
        recettes.map((r) => Number(r.volumeHebdo) || 0),
        recettes.map((r) => r.prixVenteHT),
      ),
    [recettes],
  );

  const totalCoutMatiere = useMemo(
    () =>
      recettes.reduce(
        (sum, r) => sum + (Number(r.volumeHebdo) || 0) * (coutById[r.id] ?? 0),
        0,
      ),
    [recettes, coutById],
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

  // ── Phase 4.2 — Coherence indicator (strategic volume target) ────────────
  const volumeCibleHebdo =
    hypothesesBP.semainesOuverture > 0 && hypothesesBP.ticketMoyenCible > 0
      ? Math.round(
          hypothesesBP.objectifCAannuel /
            hypothesesBP.semainesOuverture /
            hypothesesBP.ticketMoyenCible,
        )
      : 0;
  const volumeDepasse = stats.volumeTotalGlobal > volumeCibleHebdo * 1.2;

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6" data-ocid="labo-recettes.page">
      {/* ── Phase 4.2 — Indicateur de Cohérence de Volume ────────────────── */}
      <Card
        className="border-border bg-card"
        data-ocid="labo-recettes.coherence.card"
      >
        <CardContent className="py-4 px-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Cohérence de Volume
            </span>
          </div>
          <p
            className={`text-sm font-semibold tabular-nums ${
              volumeDepasse ? "text-red-600" : "text-foreground"
            }`}
            data-ocid="labo-recettes.coherence.indicator"
          >
            Volume simulé :{" "}
            <span className="font-bold">
              {stats.volumeTotalGlobal.toLocaleString("fr-FR")}
            </span>{" "}
            &nbsp;/&nbsp; Objectif stratégique :{" "}
            <span className="font-bold">
              {volumeCibleHebdo > 0
                ? volumeCibleHebdo.toLocaleString("fr-FR")
                : "—"}
            </span>
            {volumeDepasse && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                <AlertTriangle className="h-3 w-3" />
                Dépassement &gt; 20 %
              </span>
            )}
          </p>
        </CardContent>
      </Card>

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
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="pl-6">Catégorie</TableHead>
                  <TableHead className="text-right">Mix Cible</TableHead>
                  <TableHead className="text-right">Mix Réel</TableHead>
                  <TableHead className="text-right pr-6">Delta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {stats.statsParCategorie.map((cat) => {
                  const delta = cat.mixReelPct - cat.mixCiblePct;
                  const mixReelColor =
                    Math.abs(delta) > 5 ? "text-red-600 font-semibold" : "";
                  const deltaColor =
                    Math.abs(delta) <= 2
                      ? "text-green-600"
                      : Math.abs(delta) <= 5
                        ? "text-amber-600"
                        : "text-red-600";
                  return (
                    <TableRow
                      key={cat.id}
                      data-ocid={`labo-recettes.mix.${cat.id}.item`}
                    >
                      <TableCell className="pl-6">{cat.nom}</TableCell>
                      <TableCell className="text-right">
                        {cat.mixCiblePct.toFixed(1)}%
                      </TableCell>
                      <TableCell className={`text-right ${mixReelColor}`}>
                        {cat.mixReelPct.toFixed(1)}%
                      </TableCell>
                      <TableCell className={`text-right pr-6 ${deltaColor}`}>
                        {delta > 0 ? "+" : ""}
                        {delta.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
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
            <>
              {/* ── ACTION 1 & 2: Search / Filter toolbar ───────────────── */}
              <div className="flex flex-wrap items-center gap-2 px-6 py-3 border-b border-border">
                {/* Search input */}
                <Input
                  type="text"
                  placeholder="Rechercher une recette…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 w-52"
                  data-ocid="labo-recettes.search.input"
                />

                {/* Category filter */}
                <Select
                  value={filterCategorie}
                  onValueChange={setFilterCategorie}
                >
                  <SelectTrigger
                    className="h-9 w-44"
                    data-ocid="labo-recettes.filter-categorie.select"
                  >
                    <SelectValue placeholder="Toutes catégories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Tout</SelectItem>
                    {categoriesCarte.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.nom}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Reset volumes button — ACTION 2 */}
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 ml-auto text-destructive border-destructive/40 hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setShowResetDialog(true)}
                  data-ocid="labo-recettes.reset-volumes.open_modal_button"
                >
                  <RotateCcw className="h-4 w-4 mr-1.5" />
                  Réinitialiser les volumes
                </Button>
              </div>

              {/* ── Recipe table ─────────────────────────────────────────── */}
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
                        Marge brute (€)
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recettesFiltrees.length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="py-10 text-center text-sm text-muted-foreground"
                          data-ocid="labo-recettes.recettes-filtrees.empty_state"
                        >
                          Aucune recette ne correspond à votre recherche.
                        </TableCell>
                      </TableRow>
                    ) : (
                      recettesFiltrees.map((recette, idx) => {
                        const vol = Number(recette.volumeHebdo) || 0;
                        const coutMatiere = coutById[recette.id] ?? 0;
                        const margeUnit = calculerMargeRecette(
                          recette.prixVenteHT,
                          coutMatiere,
                        );
                        const margeLigne = vol * margeUnit;
                        const catNom =
                          categoriesCarte.find(
                            (c) => c.id === recette.categorieId,
                          )?.nom ??
                          recette.categorie ??
                          "—";
                        return (
                          <TableRow
                            key={recette.id}
                            className="border-border hover:bg-muted/40 transition-colors"
                            data-ocid={`labo-recettes.recette.item.${idx + 1}`}
                          >
                            {/* ACTION 3: dot + name */}
                            <TableCell className="pl-6 font-medium text-foreground">
                              <span className="flex items-center gap-0">
                                <span
                                  className={`inline-block w-3 h-3 rounded-full mr-2 flex-shrink-0 ${CATEGORY_DOT_COLORS[recette.categorieId] ?? "bg-gray-300"}`}
                                />
                                {recette.nom}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span
                                className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${getCategorieCn(catNom)}`}
                              >
                                {catNom}
                              </span>
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground">
                              {recette.prixVenteHT.toFixed(2).replace(".", ",")}{" "}
                              €
                            </TableCell>
                            <TableCell className="text-right tabular-nums text-muted-foreground">
                              {coutMatiere.toFixed(2).replace(".", ",")} €
                            </TableCell>
                            <TableCell className="text-right">
                              {/* ACTION 3: onFocus auto-select */}
                              <Input
                                type="number"
                                min={0}
                                value={recette.volumeHebdo || ""}
                                onChange={(e) =>
                                  updateRecette(recette.id, {
                                    volumeHebdo: Number(e.target.value) || 0,
                                  })
                                }
                                onFocus={(e) => e.target.select()}
                                className="w-24 text-right tabular-nums"
                                data-ocid={`labo-recettes.volume.input.${idx + 1}`}
                                aria-label={`Volume semaine — ${recette.nom}`}
                              />
                            </TableCell>
                            <TableCell className="text-right pr-6 tabular-nums font-semibold text-foreground">
                              {formatEur(margeLigne)}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
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
          {/* Phase 5.1 — Marge Simulation KPI avec alerte couleur */}
          <Card
            className="flex-1 border-border bg-card"
            data-ocid="labo-recettes.kpi-marge-simulation.card"
          >
            <CardContent className="pt-5 pb-4 px-5">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
                Marge Simulation
              </p>
              <div className="flex items-center gap-2">
                {stats.margeReelleGlobale < margeCibleGlobale - 5 ? (
                  <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0" />
                ) : stats.margeReelleGlobale < margeCibleGlobale ? (
                  <AlertTriangle className="h-5 w-5 text-orange-500 flex-shrink-0" />
                ) : (
                  <TrendingUp className="h-5 w-5 text-emerald-500 flex-shrink-0" />
                )}
                <span
                  className={`text-2xl font-bold font-display tabular-nums ${
                    stats.margeReelleGlobale < margeCibleGlobale - 5
                      ? "text-red-600"
                      : stats.margeReelleGlobale < margeCibleGlobale
                        ? "text-orange-500"
                        : "text-emerald-600"
                  }`}
                  data-ocid="labo-recettes.kpi-marge-simulation.value"
                >
                  {stats.margeReelleGlobale.toFixed(1)} %
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Cible : {margeCibleGlobale} %
              </p>
            </CardContent>
          </Card>
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

      {/* ── ACTION 2: Reset Volumes AlertDialog ───────────────────────── */}
      <AlertDialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <AlertDialogContent data-ocid="labo-recettes.reset-volumes.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmer la réinitialisation</AlertDialogTitle>
            <AlertDialogDescription>
              Êtes-vous sûr de vouloir remettre tous les volumes à zéro ? Cette
              action ne peut pas être annulée.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="labo-recettes.reset-volumes.cancel_button">
              Annuler
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                resetVolumes();
                setShowResetDialog(false);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-ocid="labo-recettes.reset-volumes.confirm_button"
            >
              Réinitialiser
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
