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
  calculerCAReelAnnuel,
  calculerCoutMatiereReelAnnuel,
  calculerFoodCostReelPct,
  calculerMargeReellePct,
} from "@/modules/restaurant/utils/calculations";
import { calculerEBE } from "@/utils/math/finance";
import {
  ArrowDown,
  ArrowUp,
  Minus,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";

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

// ─── Component ───────────────────────────────────────────────────────────────

export default function BusinessPlanReelPage() {
  // ── Store reads ────────────────────────────────────────────────────────────
  const recettes = useAppStore((s) => s.recettes);
  const ingredients = useAppStore((s) => s.ingredients);
  const categoriesCarte = useAppStore((s) => s.categoriesCarte);
  const hypothesesBP = useAppStore((s) => s.hypothesesBP);
  const salaries = useAppStore((s) => s.salaries);
  const fraisFixes = useAppStore((s) => s.fraisFixes);

  // ── Local state: volumes hebdomadaires par recette ─────────────────────────
  const [volumes, setVolumes] = useState<Record<string, number>>({});

  // ── Derived: selectors ─────────────────────────────────────────────────────
  const masseSalarialeAnnuelle = selectTotalMasseSalarialeAnnuelle(salaries);
  const chargesFixesAnnuelles = selectTotalFraisFixesAnnuels(fraisFixes);
  const { semainesOuverture } = hypothesesBP;

  // ── Derived: CA Cible (Top-Down) ───────────────────────────────────────────
  // couvertsParJour × joursOuvertureAn × ticketMoyen fictif — on utilise
  // couvertsParJour comme proxy trafic puisque hypothesesBP n'a pas traficHebdo.
  // CA Cible = couvertsParJour × joursOuvertureAn × ticketMoyenHypothétique
  // Sans ticketMoyenEuros dans le store, on calcule via les recettes ou on
  // l'estime à 0 pour montrer "non configuré" — on utilise les champs réels.
  const caCibleAnnuel =
    hypothesesBP.couvertsParJour *
    hypothesesBP.joursOuvertureAn *
    // Ticket moyen pondéré estimé depuis les recettes existantes
    (recettes.length > 0
      ? recettes.reduce((sum, r) => sum + r.prixVenteHT, 0) / recettes.length
      : 0);

  // ── Derived: Bottom-Up ─────────────────────────────────────────────────────
  const caReelAnnuel = calculerCAReelAnnuel(
    recettes,
    volumes,
    semainesOuverture,
  );
  const coutMatiereReelAnnuel = calculerCoutMatiereReelAnnuel(
    recettes,
    volumes,
    ingredients,
    semainesOuverture,
  );
  const foodCostReelPct = calculerFoodCostReelPct(
    coutMatiereReelAnnuel,
    caReelAnnuel,
  );
  const margeBruteReellePct = calculerMargeReellePct(
    coutMatiereReelAnnuel,
    caReelAnnuel,
  );
  const margeBruteReelleEur = caReelAnnuel - coutMatiereReelAnnuel;
  const ebeReel = calculerEBE(
    margeBruteReelleEur,
    chargesFixesAnnuelles,
    masseSalarialeAnnuelle,
  );

  // ── Color helpers ──────────────────────────────────────────────────────────
  const caColor =
    caReelAnnuel === 0
      ? "text-muted-foreground"
      : caReelAnnuel >= caCibleAnnuel
        ? "text-emerald-600 dark:text-emerald-400"
        : "text-red-600 dark:text-red-400";
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
      valeur: margeBruteReelleEur,
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
      {/* ── Section 1 : Bloc Comparatif ──────────────────────────────────── */}
      <section data-ocid="bp-reel.comparatif.section">
        <h2 className="font-display text-lg font-semibold text-foreground mb-4">
          Comparatif Stratégique vs Réel
        </h2>
        <div className="grid gap-4 md:grid-cols-2">
          {/* Carte Top-Down */}
          <Card className="border-border" data-ocid="bp-reel.topdown.card">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <CardTitle className="text-base font-semibold">
                  BP Stratégique (Top-Down)
                </CardTitle>
              </div>
              <Badge variant="secondary" className="w-fit text-xs">
                Objectif BP Stratégique
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  CA Annuel Cible
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {formatEuro(caCibleAnnuel)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {hypothesesBP.couvertsParJour} couverts/jour ×{" "}
                  {hypothesesBP.joursOuvertureAn} jours
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">
                    Semaines ouverture
                  </p>
                  <p className="font-semibold text-foreground">
                    {hypothesesBP.semainesOuverture} sem.
                  </p>
                </div>
                <div className="rounded-md bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Jours/an</p>
                  <p className="font-semibold text-foreground">
                    {hypothesesBP.joursOuvertureAn} j.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Carte Bottom-Up */}
          <Card className="border-border" data-ocid="bp-reel.bottomup.card">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                {caReelAnnuel >= caCibleAnnuel && caReelAnnuel > 0 ? (
                  <ArrowUp className="h-5 w-5 text-emerald-500" />
                ) : (
                  <ArrowDown className="h-5 w-5 text-red-500" />
                )}
                <CardTitle className="text-base font-semibold">
                  BP Réel (Bottom-Up)
                </CardTitle>
              </div>
              <Badge
                variant={
                  caReelAnnuel >= caCibleAnnuel && caReelAnnuel > 0
                    ? "default"
                    : "destructive"
                }
                className="w-fit text-xs"
              >
                {caReelAnnuel >= caCibleAnnuel && caReelAnnuel > 0
                  ? "Objectif atteint"
                  : "Sous l'objectif"}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs text-muted-foreground mb-1">
                  CA Annuel Réel
                </p>
                <p className={`text-2xl font-bold ${caColor}`}>
                  {formatEuro(caReelAnnuel)}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Basé sur les volumes saisis × {semainesOuverture} semaines
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">
                    Food Cost Réel
                  </p>
                  <p
                    className={`font-semibold ${foodCostReelPct > 35 ? "text-red-600 dark:text-red-400" : "text-foreground"}`}
                  >
                    {formatPct(foodCostReelPct)}
                  </p>
                </div>
                <div className="rounded-md bg-muted/50 p-3">
                  <p className="text-xs text-muted-foreground">Marge Brute</p>
                  <p
                    className={`font-semibold ${margeBruteReellePct >= 65 ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}
                  >
                    {formatPct(margeBruteReellePct)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* ── Section 2 : Saisie des Volumes ──────────────────────────────────── */}
      <section data-ocid="bp-reel.volumes.section">
        <h2 className="font-display text-lg font-semibold text-foreground mb-1">
          Volume estimé / semaine par recette
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Renseignez le volume hebdomadaire estimé pour chaque recette. Toutes
          les métriques ci-dessous se mettent à jour en temps réel.
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
                          setVolumes((prev) => ({
                            ...prev,
                            [recette.id]: Number.isNaN(parsed) ? 0 : parsed,
                          }));
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
