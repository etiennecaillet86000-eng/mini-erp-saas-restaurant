/**
 * SimulateurCartePage — Laboratoire Recettes (Sprint 8)
 *
 * RÈGLE : Aucun calcul inline. Toute la logique mathématique passe par les
 * fonctions pures de calculations.ts.
 *
 * Sections :
 *  A — Tableau comparatif Mix Cible vs Mix Réel (catégories dynamiques)
 *  B — Grille de saisie des volumes par recette
 *  C — Bilan KPI hebdomadaire + projection annuelle
 */

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableFooter,
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
  calculerCAReelAnnuel,
  calculerFoodCostRecette,
  calculerFoodCostReel,
  calculerMargeRecette,
  calculerMixReelCategorie,
} from "../utils/calculations";

// ─── Formatters ───────────────────────────────────────────────────────────────

function formatEur(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    style: "currency",
    currency: "EUR",
  }).format(value);
}

function formatPct(value: number, decimals = 1): string {
  return `${value.toFixed(decimals).replace(".", ",")} %`;
}

// ─── Mix Réel colour helpers ──────────────────────────────────────────────────

function mixReelCn(reel: number, cible: number): string {
  if (reel === 0 && cible === 0) return "text-muted-foreground";
  if (reel > cible)
    return "text-emerald-600 dark:text-emerald-400 font-semibold";
  if (reel < cible) return "text-destructive font-semibold";
  return "text-foreground font-semibold";
}

function mixReelDiff(reel: number, cible: number): string | null {
  const diff = reel - cible;
  if (diff === 0 || (reel === 0 && cible === 0)) return null;
  const sign = diff > 0 ? "+" : "";
  return `${sign}${diff.toFixed(1).replace(".", ",")} %`;
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

function EmptyRecettes() {
  const handleNavigate = () => {
    window.dispatchEvent(
      new CustomEvent("app-navigate", { detail: "recettes" }),
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
  const categoriesCarte = useAppStore((s) => s.categoriesCarte);
  const hypothesesBP = useAppStore((s) => s.hypothesesBP);

  // Volumes keyed by recette.id, initialised at 0 for recettes at mount time.
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

  // ── Lookup: categorieId → nom ─────────────────────────────────────────────

  const categorieNomById = useMemo<Record<string, string>>(
    () => Object.fromEntries(categoriesCarte.map((c) => [c.id, c.nom])),
    [categoriesCarte],
  );

  // ── Section A — Mix data (one row per CategorieCarte) ─────────────────────

  const mixRows = useMemo(
    () =>
      categoriesCarte.map((cat) => ({
        id: cat.id,
        nom: cat.nom,
        cible: cat.mixCiblePct,
        reel: calculerMixReelCategorie(recettes, volumes, cat.id),
      })),
    [categoriesCarte, recettes, volumes],
  );

  const totalMixCible = useMemo(
    () => categoriesCarte.reduce((sum, c) => sum + c.mixCiblePct, 0),
    [categoriesCarte],
  );

  const totalMixReel = useMemo(
    () => mixRows.reduce((sum, row) => sum + row.reel, 0),
    [mixRows],
  );

  // ── Section B — Per-recette costs & marge ─────────────────────────────────

  const coutById = useMemo<Record<string, number>>(
    () =>
      Object.fromEntries(
        recettes.map((r) => [
          r.id,
          calculerFoodCostRecette(r, ingredients).coutMatiereTotalHT,
        ]),
      ),
    [recettes, ingredients],
  );

  const totalVolumeHebdo = useMemo(
    () => recettes.reduce((sum, r) => sum + (volumes[r.id] ?? 0), 0),
    [recettes, volumes],
  );

  const caHebdo = useMemo(
    () =>
      calculerCAReel(
        recettes.map((r) => volumes[r.id] ?? 0),
        recettes.map((r) => r.prixVenteHT),
      ),
    [recettes, volumes],
  );

  const totalCoutMatiereHebdo = useMemo(
    () =>
      recettes.reduce(
        (sum, r) => sum + (volumes[r.id] ?? 0) * (coutById[r.id] ?? 0),
        0,
      ),
    [recettes, volumes, coutById],
  );

  const foodCostGlobal = useMemo(
    () => calculerFoodCostReel(totalCoutMatiereHebdo, caHebdo),
    [totalCoutMatiereHebdo, caHebdo],
  );

  const margeBruteGlobale = useMemo(() => {
    if (caHebdo === 0) return 0;
    return ((caHebdo - totalCoutMatiereHebdo) / caHebdo) * 100;
  }, [caHebdo, totalCoutMatiereHebdo]);

  // ── Section C — Annual projection ────────────────────────────────────────

  const caAnnuel = useMemo(
    () =>
      calculerCAReelAnnuel(recettes, volumes, hypothesesBP.semainesOuverture),
    [recettes, volumes, hypothesesBP.semainesOuverture],
  );

  const margeAlert = margeBruteGlobale < 70 && caHebdo > 0;
  const foodCostAlert = foodCostGlobal > 35 && caHebdo > 0;

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6" data-ocid="labo-recettes.page">
      {/* ── SECTION A — Mix Cible vs Mix Réel ──────────────────────────── */}
      <Card
        className="border-border bg-card"
        data-ocid="labo-recettes.mix.section"
      >
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground">
            Section A — Comparateur Mix Cible vs Mix Réel
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Comparez votre mix de vente réel (volumes Section B) avec vos
            objectifs stratégiques.
            <span className="ml-1 text-emerald-600 dark:text-emerald-400 font-medium">
              Vert
            </span>{" "}
            = au‑dessus de la cible,{" "}
            <span className="text-destructive font-medium">Rouge</span> = en
            dessous.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="pl-6 font-semibold text-foreground">
                    Catégorie
                  </TableHead>
                  <TableHead className="text-right font-semibold text-foreground">
                    Mix Cible (%)
                  </TableHead>
                  <TableHead className="text-right pr-6 font-semibold text-foreground">
                    Mix Réel (%)
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {categoriesCarte.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="text-center py-10 text-muted-foreground text-sm"
                    >
                      Aucune catégorie de carte configurée.
                    </TableCell>
                  </TableRow>
                ) : (
                  mixRows.map((row, idx) => (
                    <TableRow
                      key={row.id}
                      className="border-border hover:bg-muted/40 transition-colors"
                      data-ocid={`labo-recettes.mix.item.${idx + 1}`}
                    >
                      <TableCell className="pl-6 font-medium text-foreground">
                        {row.nom}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-muted-foreground">
                        {formatPct(row.cible)}
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <div className="flex items-center justify-end gap-2">
                          <span
                            className={`tabular-nums ${mixReelCn(row.reel, row.cible)}`}
                          >
                            {formatPct(row.reel)}
                          </span>
                          {mixReelDiff(row.reel, row.cible) && (
                            <span
                              className={`text-[11px] tabular-nums ${
                                row.reel > row.cible
                                  ? "text-emerald-600 dark:text-emerald-400"
                                  : "text-destructive"
                              }`}
                            >
                              {mixReelDiff(row.reel, row.cible)}
                            </span>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
              {categoriesCarte.length > 0 && (
                <TableFooter>
                  <TableRow className="border-border bg-muted/30 hover:bg-muted/40">
                    <TableCell className="pl-6 font-semibold text-foreground">
                      Total
                    </TableCell>
                    <TableCell className="text-right tabular-nums font-semibold text-foreground">
                      {formatPct(totalMixCible)}
                    </TableCell>
                    <TableCell className="text-right pr-6 tabular-nums font-semibold text-foreground">
                      {formatPct(totalMixReel)}
                    </TableCell>
                  </TableRow>
                </TableFooter>
              )}
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── SECTION B — Volumes par Recette ───────────────────────────── */}
      <Card
        className="border-border bg-card"
        data-ocid="labo-recettes.grille.section"
      >
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold text-foreground">
            Section B — Volumes par Recette
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Renseignez le volume estimé par semaine pour chaque recette. Le Mix
            Réel (Section A) se met à jour en temps réel.
          </p>
        </CardHeader>
        <CardContent className="p-0">
          {recettes.length === 0 ? (
            <EmptyRecettes />
          ) : (
            <>
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

                      // Resolve category name: prefer categorieId → CategorieCarte, fallback to legacy categorie
                      const categorieNom =
                        (recette.categorieId &&
                          categorieNomById[recette.categorieId]) ||
                        recette.categorie ||
                        "—";

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
                            <span className="inline-block rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground">
                              {categorieNom}
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
                  <TableFooter>
                    <TableRow className="border-border bg-muted/30 hover:bg-muted/40">
                      <TableCell
                        className="pl-6 font-semibold text-foreground"
                        colSpan={4}
                      >
                        Totaux semaine
                      </TableCell>
                      <TableCell className="text-right tabular-nums font-semibold text-foreground">
                        {totalVolumeHebdo.toLocaleString("fr-FR")} couverts
                      </TableCell>
                      <TableCell className="text-right pr-6 tabular-nums font-semibold text-foreground">
                        {formatEur(caHebdo - totalCoutMatiereHebdo)}
                      </TableCell>
                    </TableRow>
                  </TableFooter>
                </Table>
              </div>

              {/* Totals summary cards below table */}
              <div className="grid grid-cols-2 gap-3 px-6 py-4 border-t border-border bg-muted/20 sm:grid-cols-2">
                <div className="rounded-md bg-card border border-border px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
                    CA Hebdo estimé
                  </p>
                  <p className="text-xl font-bold tabular-nums text-foreground font-display">
                    {formatEur(caHebdo)}
                  </p>
                </div>
                <div className="rounded-md bg-card border border-border px-4 py-3">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-1">
                    Couverts / semaine
                  </p>
                  <p className="text-xl font-bold tabular-nums text-foreground font-display">
                    {totalVolumeHebdo.toLocaleString("fr-FR")}
                  </p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* ── SECTION C — Bilan KPI ─────────────────────────────────────── */}
      <div data-ocid="labo-recettes.bilan.section">
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground px-0.5">
          Section C — Bilan de la Carte
        </p>
        <div className="flex flex-col gap-4 sm:flex-row">
          <KpiCard
            label="CA Hebdomadaire"
            value={formatEur(caHebdo)}
            positive={caHebdo > 0}
            data-ocid="labo-recettes.kpi-ca.card"
          />
          <KpiCard
            label="Food Cost Global"
            value={formatPct(foodCostGlobal)}
            alert={foodCostAlert}
            positive={foodCostGlobal > 0 && !foodCostAlert}
            data-ocid="labo-recettes.kpi-foodcost.card"
          />
          <KpiCard
            label="Marge Brute Globale"
            value={formatPct(margeBruteGlobale)}
            alert={margeAlert}
            positive={!margeAlert && caHebdo > 0}
            data-ocid="labo-recettes.kpi-marge.card"
          />
          <KpiCard
            label={`Projection Annuelle (${hypothesesBP.semainesOuverture} sem.)`}
            value={formatEur(caAnnuel)}
            positive={caAnnuel > 0}
            data-ocid="labo-recettes.kpi-annuel.card"
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
        {foodCostAlert && (
          <div
            className="mt-2 flex items-center gap-2 rounded-md border border-amber-400/30 bg-amber-400/10 px-4 py-2.5 text-sm text-amber-700 dark:text-amber-400"
            data-ocid="labo-recettes.foodcost-alert.error_state"
          >
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>
              <strong>Food Cost élevé :</strong> Le food cost dépasse 35 %.
              Vérifiez vos fiches techniques ou réévaluez vos prix de vente.
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
