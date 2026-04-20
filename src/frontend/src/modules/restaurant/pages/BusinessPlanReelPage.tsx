/**
 * BusinessPlanReelPage.tsx — Moteur Bottom-Up / Compte de Résultat Réel
 * RÈGLE D'OR : Aucune arithmétique inline — toutes les valeurs dérivées
 * proviennent des fonctions pures de calculations.ts et finance.ts.
 */

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  selectTotalFraisFixesAnnuels,
  selectTotalMasseSalarialeAnnuelle,
  useAppStore,
} from "@/core/store/useAppStore";
import {
  calculerCACibleAnnuel,
  calculerCAReelAnnuel,
  calculerCoutMatiereReelAnnuel,
  calculerDelta,
  calculerFoodCostReelPct,
  calculerMargeBruteCibleAnnuelle,
  calculerMargeBruteReelleAnnuelle,
  calculerMargeReellePct,
  calculerPointMortJournalier,
} from "@/modules/restaurant/utils/calculations";
import { calculerEBE } from "@/utils/math/finance";
import { Minus, TrendingDown, TrendingUp } from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatEuro(value: number): string {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPct(value: number): string {
  return `${value.toFixed(1)} %`;
}

function formatPctOfCA(value: number, ca: number): string {
  if (ca === 0) return "—";
  return formatPct((value / ca) * 100);
}

// ─── Delta Indicator ─────────────────────────────────────────────────────────

interface DeltaIndicatorProps {
  delta: number;
  label?: string;
  invertLogic?: boolean; // for Point Mort: lower is better
}

function DeltaIndicator({
  delta,
  label,
  invertLogic = false,
}: DeltaIndicatorProps) {
  const isPositive = invertLogic ? delta < 0 : delta > 0;
  const isNeutral = delta === 0;

  if (isNeutral) {
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground text-sm font-medium">
        <Minus className="h-3.5 w-3.5" />
        {label ?? "—"}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1 text-sm font-semibold ${
        isPositive
          ? "text-emerald-600 dark:text-emerald-400"
          : "text-red-600 dark:text-red-400"
      }`}
    >
      {isPositive ? (
        <TrendingUp className="h-3.5 w-3.5" />
      ) : (
        <TrendingDown className="h-3.5 w-3.5" />
      )}
      {label}
    </span>
  );
}

// ─── Comparison Card ─────────────────────────────────────────────────────────

interface MetricComparaisonCardProps {
  title: string;
  subtitle?: string;
  cibleLabel: string;
  reelLabel: string;
  cibleValue: string;
  reelValue: string;
  deltaValeur: number;
  deltaPct?: number | null;
  deltaValeurFormatted: string;
  invertLogic?: boolean;
  ocid: string;
}

function MetricComparaisonCard({
  title,
  subtitle,
  cibleLabel,
  reelLabel,
  cibleValue,
  reelValue,
  deltaValeur,
  deltaPct,
  deltaValeurFormatted,
  invertLogic = false,
  ocid,
}: MetricComparaisonCardProps) {
  const isPositive = invertLogic ? deltaValeur < 0 : deltaValeur > 0;
  const isNeutral = deltaValeur === 0;
  const reelColorClass = isNeutral
    ? "text-foreground"
    : isPositive
      ? "text-emerald-600 dark:text-emerald-400"
      : "text-red-600 dark:text-red-400";

  return (
    <Card className="border-border" data-ocid={ocid}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            {title}
          </CardTitle>
          {!isNeutral && (
            <span
              className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${
                isPositive
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                  : "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
              }`}
            >
              {isPositive ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {deltaValeurFormatted}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Values row */}
        <div className="grid grid-cols-2 divide-x divide-border">
          <div className="pr-4">
            <p className="text-xs text-muted-foreground mb-1">{cibleLabel}</p>
            <p className="text-xl font-bold text-foreground tabular-nums">
              {cibleValue}
            </p>
          </div>
          <div className="pl-4">
            <p className="text-xs text-muted-foreground mb-1">{reelLabel}</p>
            <p className={`text-xl font-bold tabular-nums ${reelColorClass}`}>
              {reelValue}
            </p>
          </div>
        </div>
        {/* Delta row */}
        <div className="pt-2 border-t border-border flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Écart</span>
          <div className="flex items-center gap-3">
            <DeltaIndicator
              delta={deltaValeur}
              label={deltaValeurFormatted}
              invertLogic={invertLogic}
            />
            {deltaPct !== null && deltaPct !== undefined && (
              <span
                className={`text-xs font-medium tabular-nums ${
                  isNeutral
                    ? "text-muted-foreground"
                    : isPositive
                      ? "text-emerald-600 dark:text-emerald-400"
                      : "text-red-600 dark:text-red-400"
                }`}
              >
                ({deltaPct >= 0 ? "+" : ""}
                {deltaPct.toFixed(1)} %)
              </span>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function BusinessPlanReelPage() {
  // ── Store reads ────────────────────────────────────────────────────────────
  const recettes = useAppStore((s) => s.recettes);
  const ingredients = useAppStore((s) => s.ingredients);
  const categoriesCarte = useAppStore((s) => s.categoriesCarte);
  const hypothesesBP = useAppStore((s) => s.hypothesesBP);
  const salaries = useAppStore((s) => s.salaries);
  const fraisFixes = useAppStore((s) => s.fraisFixes);
  const updateRecette = useAppStore((s) => s.updateRecette);

  // ── Volumes: build the map from store (recette.volumeHebdo) ───────────────
  const volumes = Object.fromEntries(
    recettes.map((r) => [r.id, r.volumeHebdo ?? 0]),
  );

  // ── Derived: selectors ─────────────────────────────────────────────────────
  const masseSalarialeAnnuelle = selectTotalMasseSalarialeAnnuelle(salaries);
  const chargesFixesAnnuelles = selectTotalFraisFixesAnnuels(fraisFixes);
  const { semainesOuverture, joursOuvertureAn } = hypothesesBP;

  // ── Food Cost cible — défaut 30 % si non configuré ─────────────────────────
  const foodCostCiblePct = 30;

  // ── Derived: CA ────────────────────────────────────────────────────────────
  const caCibleAnnuel = calculerCACibleAnnuel(
    hypothesesBP.couvertsParJour,
    hypothesesBP.joursOuvertureAn,
    hypothesesBP.ticketMoyenCible ?? 25,
  );
  const caReelAnnuel = calculerCAReelAnnuel(
    recettes,
    volumes,
    semainesOuverture,
  );
  const deltaCa = calculerDelta(caCibleAnnuel, caReelAnnuel);

  // ── Derived: Marge Brute ────────────────────────────────────────────────────
  const margeBruteCibleAnnuelle = calculerMargeBruteCibleAnnuelle(
    caCibleAnnuel,
    foodCostCiblePct,
  );
  const coutMatiereReelAnnuel = calculerCoutMatiereReelAnnuel(
    recettes,
    volumes,
    ingredients,
    semainesOuverture,
  );
  const margeBruteReelleAnnuelle = calculerMargeBruteReelleAnnuelle(
    caReelAnnuel,
    coutMatiereReelAnnuel,
  );
  const deltaMarge = calculerDelta(
    margeBruteCibleAnnuelle,
    margeBruteReelleAnnuelle,
  );

  // ── Derived: Point Mort ────────────────────────────────────────────────────
  const tauxMargeContribution = 100 - foodCostCiblePct; // 70%
  const pointMortJournalier = calculerPointMortJournalier(
    chargesFixesAnnuelles,
    masseSalarialeAnnuelle,
    joursOuvertureAn,
    tauxMargeContribution,
  );
  const caJournalierReel =
    joursOuvertureAn > 0 ? caReelAnnuel / joursOuvertureAn : 0;
  const deltaPointMort = calculerDelta(pointMortJournalier, caJournalierReel);
  // For Point Mort: CA Réel > Point Mort = profitable (invertLogic)

  // ── Derived: P&L ──────────────────────────────────────────────────────────
  const foodCostReelPct = calculerFoodCostReelPct(
    coutMatiereReelAnnuel,
    caReelAnnuel,
  );
  const margeBruteReellePct = calculerMargeReellePct(
    coutMatiereReelAnnuel,
    caReelAnnuel,
  );
  const ebeReel = calculerEBE(
    margeBruteReelleAnnuelle,
    chargesFixesAnnuelles,
    masseSalarialeAnnuelle,
  );

  // ── Color helpers ──────────────────────────────────────────────────────────
  const ebeColor =
    ebeReel > 0
      ? "text-emerald-600 dark:text-emerald-400"
      : ebeReel < 0
        ? "text-red-600 dark:text-red-400"
        : "text-muted-foreground";

  // ── Compte de résultat rows ────────────────────────────────────────────────
  const compteResultatRows = [
    {
      label: "Chiffre d'Affaires Réel",
      valeur: caReelAnnuel,
      pctCA: formatPctOfCA(caReelAnnuel, caReelAnnuel),
      bold: false,
      separator: false,
    },
    {
      label: "(−) Coût Matières Réel",
      valeur: -coutMatiereReelAnnuel,
      pctCA: formatPctOfCA(coutMatiereReelAnnuel, caReelAnnuel),
      bold: false,
      separator: false,
    },
    {
      label: "(=) Marge Brute Réelle",
      valeur: margeBruteReelleAnnuelle,
      pctCA: formatPct(margeBruteReellePct),
      bold: true,
      separator: true,
    },
    {
      label: "(−) Masse Salariale",
      valeur: -masseSalarialeAnnuelle,
      pctCA: formatPctOfCA(masseSalarialeAnnuelle, caReelAnnuel),
      bold: false,
      separator: false,
    },
    {
      label: "(−) Charges Fixes",
      valeur: -chargesFixesAnnuelles,
      pctCA: formatPctOfCA(chargesFixesAnnuelles, caReelAnnuel),
      bold: false,
      separator: false,
    },
    {
      label: "(=) EBE — Résultat Brut d'Exploitation",
      valeur: ebeReel,
      pctCA: formatPctOfCA(Math.abs(ebeReel), caReelAnnuel),
      bold: true,
      separator: true,
      colorClass: ebeColor,
    },
  ];

  // ── Lookup: catégorie nom ──────────────────────────────────────────────────
  const getCategorieNom = (r: {
    categorie: string;
    categorieId?: string;
  }): string => {
    if (r.categorieId) {
      const cat = categoriesCarte.find((c) => c.id === r.categorieId);
      if (cat) return cat.nom;
    }
    return r.categorie ?? "—";
  };

  // ── Empty state ────────────────────────────────────────────────────────────
  if (recettes.length === 0) {
    return (
      <div
        className="flex flex-col items-center justify-center py-24 gap-4 text-center"
        data-ocid="bp-reel.empty_state"
      >
        <TrendingDown className="h-12 w-12 text-muted-foreground" />
        <h2 className="font-display text-xl font-semibold text-foreground">
          Aucune fiche technique disponible
        </h2>
        <p className="text-muted-foreground max-w-sm">
          Créez des recettes dans la section{" "}
          <span className="font-medium text-foreground">Fiches Techniques</span>{" "}
          pour alimenter le moteur Bottom-Up et générer votre compte de résultat
          réel.
        </p>
      </div>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-8" data-ocid="bp-reel.page">
      {/* ── Section 1 : Comparatif Stratégique vs Réel ──────────────────────── */}
      <section data-ocid="bp-reel.comparatif.section">
        <div className="mb-4">
          <h2 className="font-display text-lg font-semibold text-foreground">
            Comparatif Stratégique vs Réel
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Confrontez vos objectifs BP Stratégique (Top-Down) avec les
            résultats calculés depuis les volumes réels (Bottom-Up). Mise à jour
            automatique.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {/* Métrique 1 — Chiffre d'Affaires */}
          <MetricComparaisonCard
            title="Chiffre d'Affaires"
            subtitle={`Base : ${hypothesesBP.couvertsParJour} cvts/j × ${hypothesesBP.joursOuvertureAn} j × ${formatEuro(hypothesesBP.ticketMoyenCible ?? 25)} ticket`}
            cibleLabel="CA Stratégique"
            reelLabel="CA Réel"
            cibleValue={formatEuro(caCibleAnnuel)}
            reelValue={formatEuro(caReelAnnuel)}
            deltaValeur={deltaCa.deltaValeur}
            deltaPct={deltaCa.deltaPct}
            deltaValeurFormatted={`${deltaCa.deltaValeur >= 0 ? "+" : ""}${formatEuro(deltaCa.deltaValeur)}`}
            ocid="bp-reel.comparatif.ca.card"
          />

          {/* Métrique 2 — Marge Brute */}
          <MetricComparaisonCard
            title="Marge Brute"
            subtitle={`Food Cost cible appliqué : ${foodCostCiblePct} %`}
            cibleLabel="Marge Cible"
            reelLabel="Marge Réelle"
            cibleValue={formatEuro(margeBruteCibleAnnuelle)}
            reelValue={formatEuro(margeBruteReelleAnnuelle)}
            deltaValeur={deltaMarge.deltaValeur}
            deltaPct={deltaMarge.deltaPct}
            deltaValeurFormatted={`${deltaMarge.deltaValeur >= 0 ? "+" : ""}${formatEuro(deltaMarge.deltaValeur)}`}
            ocid="bp-reel.comparatif.marge.card"
          />

          {/* Métrique 3 — Point Mort Journalier */}
          <MetricComparaisonCard
            title="Point Mort Journalier"
            subtitle="CA/jour nécessaire pour couvrir charges + salaires"
            cibleLabel="Point Mort Cible"
            reelLabel="CA/jour Réel"
            cibleValue={formatEuro(pointMortJournalier)}
            reelValue={formatEuro(caJournalierReel)}
            deltaValeur={deltaPointMort.deltaValeur}
            deltaPct={null}
            deltaValeurFormatted={`${deltaPointMort.deltaValeur >= 0 ? "+" : ""}${formatEuro(deltaPointMort.deltaValeur)}`}
            invertLogic={false}
            ocid="bp-reel.comparatif.pointmort.card"
          />
        </div>

        {/* Summary status banner */}
        <div
          className={`mt-4 flex items-center gap-3 rounded-lg border px-4 py-3 text-sm ${
            caJournalierReel >= pointMortJournalier && caReelAnnuel > 0
              ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30"
              : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
          }`}
          data-ocid="bp-reel.comparatif.status_banner"
        >
          {caJournalierReel >= pointMortJournalier && caReelAnnuel > 0 ? (
            <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-600 dark:text-red-400 shrink-0" />
          )}
          <span
            className={`font-medium ${
              caJournalierReel >= pointMortJournalier && caReelAnnuel > 0
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-red-700 dark:text-red-400"
            }`}
          >
            {caJournalierReel >= pointMortJournalier && caReelAnnuel > 0
              ? `Rentable — Le CA journalier réel (${formatEuro(caJournalierReel)}/j) dépasse le point mort (${formatEuro(pointMortJournalier)}/j).`
              : `Non rentable — Le CA journalier réel (${formatEuro(caJournalierReel)}/j) est inférieur au point mort (${formatEuro(pointMortJournalier)}/j). Augmentez les volumes ou réduisez les charges.`}
          </span>
        </div>
      </section>

      {/* ── Section 2 : Saisie des Volumes ──────────────────────────────────── */}
      <section data-ocid="bp-reel.volumes.section">
        <h2 className="font-display text-lg font-semibold text-foreground mb-1">
          Volume estimé / semaine par recette
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Renseignez le volume hebdomadaire estimé pour chaque recette. Toutes
          les métriques ci-dessus se mettent à jour en temps réel.
        </p>
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recette</TableHead>
                <TableHead>Catégorie</TableHead>
                <TableHead className="text-right">Prix HT</TableHead>
                <TableHead className="text-right w-44">
                  Volume estimé / semaine
                </TableHead>
                <TableHead className="text-right">CA semaine</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recettes.map((recette, idx) => {
                const vol = volumes[recette.id] ?? 0;
                const caSemaine = vol * recette.prixVenteHT;
                return (
                  <TableRow
                    key={recette.id}
                    data-ocid={`bp-reel.volumes.item.${idx + 1}`}
                  >
                    <TableCell className="font-medium">{recette.nom}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-xs font-normal">
                        {getCategorieNom(recette)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatEuro(recette.prixVenteHT)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Input
                        type="number"
                        min={0}
                        value={vol === 0 ? "" : vol}
                        placeholder="0"
                        className="w-28 text-right ml-auto"
                        data-ocid={`bp-reel.volumes.input.${idx + 1}`}
                        onChange={(e) => {
                          const parsed = Number.parseFloat(e.target.value);
                          updateRecette(recette.id, {
                            volumeHebdo: Number.isNaN(parsed) ? 0 : parsed,
                          });
                        }}
                      />
                    </TableCell>
                    <TableCell className="text-right tabular-nums text-muted-foreground">
                      {caSemaine > 0 ? formatEuro(caSemaine) : "—"}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      </section>

      {/* ── Section 3 : Compte de Résultat Bottom-Up ────────────────────────── */}
      <section data-ocid="bp-reel.compte-resultat.section">
        <h2 className="font-display text-lg font-semibold text-foreground mb-1">
          Compte de Résultat Bottom-Up
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Structure P&amp;L annuelle calculée à partir des volumes saisis, des
          coûts matières réels et des charges du store.
        </p>

        {/* KPI mini-bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          {[
            { label: "CA Annuel Réel", value: formatEuro(caReelAnnuel) },
            {
              label: "Food Cost Réel",
              value: formatPct(foodCostReelPct),
              alert: foodCostReelPct > 35,
            },
            {
              label: "Marge Brute Réelle",
              value: formatPct(margeBruteReellePct),
              positive: margeBruteReellePct >= 65,
            },
            {
              label: "EBE Annuel",
              value: formatEuro(ebeReel),
              colored: true,
              positive: ebeReel >= 0,
            },
          ].map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-lg border border-border bg-card px-4 py-3"
            >
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <p
                className={`text-lg font-bold tabular-nums mt-0.5 ${
                  kpi.alert
                    ? "text-red-600 dark:text-red-400"
                    : kpi.colored
                      ? kpi.positive
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                      : kpi.positive !== undefined
                        ? kpi.positive
                          ? "text-emerald-600 dark:text-emerald-400"
                          : "text-foreground"
                        : "text-foreground"
                }`}
              >
                {kpi.value}
              </p>
            </div>
          ))}
        </div>

        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-full">Ligne</TableHead>
                <TableHead className="text-right whitespace-nowrap">
                  Montant (€/an)
                </TableHead>
                <TableHead className="text-right whitespace-nowrap">
                  % CA
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {compteResultatRows.map((row) => (
                <TableRow
                  key={row.label}
                  className={row.separator ? "border-t-2 border-border" : ""}
                  data-ocid={`bp-reel.compte-resultat.${row.label.replace(/[^a-z0-9]/gi, "-").toLowerCase()}`}
                >
                  <TableCell
                    className={
                      row.bold ? "font-semibold" : "text-muted-foreground"
                    }
                  >
                    {row.label}
                  </TableCell>
                  <TableCell
                    className={`text-right tabular-nums font-mono ${
                      row.colorClass ??
                      (row.valeur < 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-foreground")
                    } ${row.bold ? "font-semibold text-base" : ""}`}
                  >
                    {row.valeur < 0
                      ? `(${formatEuro(Math.abs(row.valeur))})`
                      : formatEuro(row.valeur)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground text-sm">
                    {row.pctCA}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>

        {/* EBE highlight */}
        {caReelAnnuel > 0 && (
          <div
            className={`mt-4 flex items-center gap-3 rounded-lg border p-4 ${
              ebeReel >= 0
                ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30"
                : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30"
            }`}
            data-ocid="bp-reel.ebe.highlight"
          >
            {ebeReel >= 0 ? (
              <TrendingUp className="h-5 w-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0" />
            )}
            <div>
              <p className={`font-semibold ${ebeColor}`}>
                EBE Annuel Réel : {formatEuro(ebeReel)}
              </p>
              <p className="text-xs text-muted-foreground">
                {ebeReel >= 0
                  ? "L'activité dégage un excédent — les charges sont couvertes par le CA réel."
                  : "Attention : les charges dépassent le CA réel — le modèle économique est déficitaire à ces volumes."}
              </p>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
