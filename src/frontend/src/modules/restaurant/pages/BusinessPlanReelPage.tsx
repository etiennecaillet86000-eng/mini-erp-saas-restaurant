import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import useStatsSimulateur from "@/core/hooks/useStatsSimulateur";
import {
  selectTotalFraisFixesAnnuels,
  selectTotalMasseSalarialeAnnuelle,
  useAppStore,
} from "@/core/store/useAppStore";
import {
  ArrowDown,
  ArrowUp,
  BarChart3,
  Minus,
  TrendingUp,
  Wallet,
} from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);

const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)} %`;

// ─── Delta color: GREEN if delta >= 0, RED if delta < 0 ───────────────────────

function getDeltaColor(delta: number): string {
  if (Math.abs(delta) < 0.001) return "text-muted-foreground";
  return delta >= 0 ? "text-green-600" : "text-red-600";
}

// ─── Inline delta badge (for mix/margin % columns) ────────────────────────────

function DeltaPctBadge({ delta }: { delta: number }) {
  const colorCn = getDeltaColor(delta);
  const sign = delta > 0 ? "+" : "";
  return (
    <span className={`tabular-nums font-semibold text-sm ${colorCn}`}>
      {sign}
      {delta.toFixed(1)} %
    </span>
  );
}

// ─── KPI Delta badge (currency + pct) ─────────────────────────────────────────

function DeltaBadge({ delta, pct }: { delta: number; pct: number }) {
  if (Math.abs(delta) < 0.01) {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-border bg-muted text-muted-foreground"
      >
        <Minus className="h-3 w-3" />À l'objectif
      </Badge>
    );
  }
  if (delta >= 0) {
    return (
      <Badge
        variant="outline"
        className="gap-1 border-emerald-300 bg-emerald-50 text-emerald-700"
      >
        <ArrowUp className="h-3 w-3" />
        {fmt(delta)} ({fmtPct(pct)})
      </Badge>
    );
  }
  return (
    <Badge
      variant="outline"
      className="gap-1 border-destructive/40 bg-destructive/10 text-destructive"
    >
      <ArrowDown className="h-3 w-3" />
      {fmt(delta)} ({fmtPct(pct)})
    </Badge>
  );
}

// ─── Generic KPI Card ─────────────────────────────────────────────────────────

function KpiCard({
  title,
  cibleLabel,
  reelLabel,
  deltaNode,
  ocid,
}: {
  title: string;
  cibleLabel: string;
  reelLabel: string;
  deltaNode: React.ReactNode;
  ocid: string;
}) {
  return (
    <Card data-ocid={ocid}>
      <CardContent className="pt-5 space-y-3">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {title}
        </p>
        <div className="flex items-end justify-between gap-2">
          <div>
            <p className="text-2xl font-bold font-display tabular-nums text-foreground">
              {reelLabel}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Cible : {cibleLabel}
            </p>
          </div>
          {deltaNode}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Component principal ──────────────────────────────────────────────────────

export default function BusinessPlanReelPage() {
  // ── Hook de calcul centralisé ──────────────────────────────────────────────
  const stats = useStatsSimulateur();

  // ── Sélecteurs Zustand individuels ────────────────────────────────────────
  const hypothesesBP = useAppStore((s) => s.hypothesesBP);
  const salaries = useAppStore((s) => s.salaries);
  const fraisFixes = useAppStore((s) => s.fraisFixes);

  // ── Calculs cibles depuis le store (ACTION 1) ─────────────────────────────
  const semainesOuverture = hypothesesBP.semainesOuverture || 48;
  const caHebdoCible =
    (hypothesesBP.objectifCAannuel || 0) / (semainesOuverture || 1);
  const volumeCible = caHebdoCible / (hypothesesBP.ticketMoyenCible || 1);
  const margeCible = hypothesesBP.margeCibleGlobale ?? 70;

  // ── Valeurs réelles depuis le hook ────────────────────────────────────────
  const caHebdoReel = stats.caHebdoGlobal;
  const volumeReel = stats.volumeTotalGlobal;
  const margeReelle = stats.margeReelleGlobale;

  // ── Deltas KPI (Réel − Cible) ─────────────────────────────────────────────
  const deltaCA = caHebdoReel - caHebdoCible;
  const deltaVolume = volumeReel - volumeCible;
  const deltaVolumePct =
    volumeCible > 0 ? (deltaVolume / volumeCible) * 100 : 0;
  const deltaMarge = margeReelle - margeCible;

  // ── Calculs annuels pour Section A (Compte de résultat) ───────────────────
  const caAnnuelReel = caHebdoReel * semainesOuverture;
  const caAnnuelCible = hypothesesBP.objectifCAannuel || 0;

  const totalMasseSalarialeAn = selectTotalMasseSalarialeAnnuelle(salaries);
  const totalFraisFixesAn = selectTotalFraisFixesAnnuels(fraisFixes);
  const totalChargesAn = totalMasseSalarialeAn + totalFraisFixesAn;

  const ebeReel = caAnnuelReel - totalChargesAn;
  const ebeCible = caAnnuelCible - totalChargesAn;
  const pctEbeReel = caAnnuelReel > 0 ? (ebeReel / caAnnuelReel) * 100 : 0;
  const pctEbeCible = caAnnuelCible > 0 ? (ebeCible / caAnnuelCible) * 100 : 0;

  const deltaEBE = ebeReel - ebeCible;
  const deltaEBEPct =
    Math.abs(ebeCible) > 0 ? (deltaEBE / Math.abs(ebeCible)) * 100 : 0;

  // Seuil de rentabilité hebdo
  const seuilRentabiliteHebdo =
    semainesOuverture > 0 ? totalChargesAn / semainesOuverture : 0;
  const deltaSeuilReel = caHebdoReel - seuilRentabiliteHebdo;
  const deltaSeuilPct =
    seuilRentabiliteHebdo > 0
      ? (deltaSeuilReel / seuilRentabiliteHebdo) * 100
      : 0;

  return (
    <div className="space-y-6" data-ocid="bp-reel.page">
      {/* ── En-tête ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <BarChart3 className="h-5 w-5 text-primary" />
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">
            Business Plan Réel
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Comparatif Stratégique vs Réel — basé sur les volumes du Laboratoire
          </p>
        </div>
      </div>

      {/* ── KPI Cards (ACTION 1) ────────────────────────────────────────────── */}
      <div
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4"
        data-ocid="bp-reel.kpi.section"
      >
        {/* CA Hebdomadaire */}
        <KpiCard
          title="CA Hebdo"
          cibleLabel={fmt(caHebdoCible)}
          reelLabel={fmt(caHebdoReel)}
          deltaNode={
            <Badge
              variant="outline"
              className={`gap-1 tabular-nums ${
                deltaCA >= 0
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                  : "border-destructive/40 bg-destructive/10 text-destructive"
              }`}
            >
              {deltaCA >= 0 ? (
                <ArrowUp className="h-3 w-3" />
              ) : (
                <ArrowDown className="h-3 w-3" />
              )}
              {fmt(deltaCA)}
            </Badge>
          }
          ocid="bp-reel.ca-hebdo.card"
        />

        {/* Volume Clients / semaine */}
        <KpiCard
          title="Volume Clients / semaine"
          cibleLabel={`${volumeCible.toFixed(0)} clients`}
          reelLabel={`${volumeReel} clients`}
          deltaNode={
            <span
              className={`text-sm font-semibold tabular-nums ${getDeltaColor(deltaVolume)}`}
            >
              {deltaVolume >= 0 ? "+" : ""}
              {deltaVolume.toFixed(0)}
              {deltaVolumePct !== 0 && (
                <span className="text-xs ml-1">
                  ({deltaVolumePct >= 0 ? "+" : ""}
                  {deltaVolumePct.toFixed(1)} %)
                </span>
              )}
            </span>
          }
          ocid="bp-reel.volume.card"
        />

        {/* Marge Globale */}
        <KpiCard
          title="Marge Globale (%)"
          cibleLabel={`${margeCible.toFixed(1)} %`}
          reelLabel={`${margeReelle.toFixed(1)} %`}
          deltaNode={
            <span
              className={`text-sm font-semibold tabular-nums ${getDeltaColor(deltaMarge)}`}
            >
              {deltaMarge >= 0 ? "+" : ""}
              {deltaMarge.toFixed(1)} %
            </span>
          }
          ocid="bp-reel.marge.card"
        />

        {/* Seuil de Rentabilité */}
        <KpiCard
          title="Seuil Rentabilité / semaine"
          cibleLabel={fmt(seuilRentabiliteHebdo)}
          reelLabel={fmt(caHebdoReel)}
          deltaNode={
            <Badge
              variant="outline"
              className={`gap-1 tabular-nums ${
                deltaSeuilReel >= 0
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                  : "border-destructive/40 bg-destructive/10 text-destructive"
              }`}
            >
              {deltaSeuilReel >= 0 ? (
                <ArrowUp className="h-3 w-3" />
              ) : (
                <ArrowDown className="h-3 w-3" />
              )}
              {fmt(deltaSeuilReel)} ({deltaSeuilPct >= 0 ? "+" : ""}
              {deltaSeuilPct.toFixed(1)} %)
            </Badge>
          }
          ocid="bp-reel.seuil.card"
        />
      </div>

      {/* ── Compte de Résultat Hebdo Réel ──────────────────────────────────── */}
      <Card data-ocid="bp-reel.cr-hebdo.card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
              A
            </span>
            Compte de Résultat Hebdomadaire Réel
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="pl-6">Indicateur</TableHead>
                  <TableHead className="text-right">Hebdo</TableHead>
                  <TableHead className="text-right pr-6">
                    Annuel ({semainesOuverture} sem.)
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow data-ocid="bp-reel.ca.row">
                  <TableCell className="pl-6 font-semibold">
                    Chiffre d'Affaires HT
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    {fmt(caHebdoReel)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-semibold pr-6">
                    {fmt(caAnnuelReel)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-6 text-muted-foreground">
                    Charges fixes
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {fmt(totalFraisFixesAn / semainesOuverture)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground pr-6">
                    {fmt(totalFraisFixesAn)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="pl-6 text-muted-foreground">
                    Masse salariale
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">
                    {fmt(totalMasseSalarialeAn / semainesOuverture)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground pr-6">
                    {fmt(totalMasseSalarialeAn)}
                  </TableCell>
                </TableRow>
                <TableRow className="border-t-2 border-border bg-muted/20">
                  <TableCell className="pl-6 font-bold text-foreground">
                    EBE
                  </TableCell>
                  <TableCell
                    className={`text-right tabular-nums font-bold ${
                      ebeReel / semainesOuverture >= 0
                        ? "text-emerald-600"
                        : "text-destructive"
                    }`}
                  >
                    {fmt(ebeReel / semainesOuverture)}
                  </TableCell>
                  <TableCell
                    className={`text-right tabular-nums font-bold pr-6 ${
                      ebeReel >= 0 ? "text-emerald-600" : "text-destructive"
                    }`}
                    data-ocid="bp-reel.ebe-annuel.cell"
                  >
                    {fmt(ebeReel)}
                  </TableCell>
                </TableRow>
                <TableRow className="bg-muted/10">
                  <TableCell className="pl-6 text-sm text-muted-foreground italic">
                    % EBE / CA
                  </TableCell>
                  <TableCell
                    colSpan={2}
                    className="text-right tabular-nums text-sm italic pr-6"
                  >
                    <span
                      className={
                        pctEbeReel >= 0
                          ? "text-emerald-600"
                          : "text-destructive"
                      }
                    >
                      {fmtPct(pctEbeReel)}
                    </span>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── Comparatif Stratégique vs Réel ─────────────────────────────────── */}
      <Card data-ocid="bp-reel.comparatif.card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
              B
            </span>
            Comparatif Stratégique vs Réel
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="pl-6">Indicateur</TableHead>
                  <TableHead className="text-right">
                    Cible (Stratégique)
                  </TableHead>
                  <TableHead className="text-right">
                    Réel (Laboratoire)
                  </TableHead>
                  <TableHead className="text-right pr-6">Delta</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* ── KPIs financiers ── */}
                <TableRow data-ocid="bp-reel.comparatif.ca-annuel.row">
                  <TableCell className="pl-6 font-medium">
                    CA Annuel HT
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmt(caAnnuelCible)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmt(caAnnuelReel)}
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <DeltaBadge
                      delta={caAnnuelReel - caAnnuelCible}
                      pct={
                        caAnnuelCible > 0
                          ? ((caAnnuelReel - caAnnuelCible) / caAnnuelCible) *
                            100
                          : 0
                      }
                    />
                  </TableCell>
                </TableRow>
                <TableRow data-ocid="bp-reel.comparatif.ebe.row">
                  <TableCell className="pl-6 font-medium">EBE Annuel</TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmt(ebeCible)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {fmt(ebeReel)}
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <DeltaBadge delta={deltaEBE} pct={deltaEBEPct} />
                  </TableCell>
                </TableRow>
                <TableRow data-ocid="bp-reel.comparatif.pct-ebe.row">
                  <TableCell className="pl-6 text-sm text-muted-foreground italic">
                    % EBE / CA
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm italic">
                    {fmtPct(pctEbeCible)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm italic">
                    {fmtPct(pctEbeReel)}
                  </TableCell>
                  <TableCell className="pr-6" />
                </TableRow>

                {/* ── Marge Globale ── */}
                <TableRow data-ocid="bp-reel.comparatif.marge.row">
                  <TableCell className="pl-6 font-medium">
                    Marge Brute Globale (%)
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {margeCible.toFixed(1)} %
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    <span
                      className={`font-semibold ${margeReelle >= margeCible ? "text-green-600" : "text-red-600"}`}
                    >
                      {margeReelle.toFixed(1)} %
                    </span>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <DeltaPctBadge delta={deltaMarge} />
                  </TableCell>
                </TableRow>

                {/* ── Séparateur Mix Produit ── */}
                <TableRow className="bg-muted/30">
                  <TableCell
                    colSpan={4}
                    className="pl-6 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                  >
                    Mix et Marges par Catégorie
                  </TableCell>
                </TableRow>

                {/* ── Sous-entête catégorie ── */}
                <TableRow className="bg-muted/10 hover:bg-muted/10">
                  <TableCell className="pl-6 text-xs text-muted-foreground font-medium">
                    Catégorie
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground font-medium">
                    Mix Cible / Marge Cible
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground font-medium">
                    Mix Réel / Marge Réelle
                  </TableCell>
                  <TableCell className="text-right pr-6 text-xs text-muted-foreground font-medium">
                    Delta Mix
                  </TableCell>
                </TableRow>

                {/* ── Lignes par catégorie (ACTION 2 + ACTION 3) ── */}
                {stats.statsParCategorie.map((cat, i) => {
                  const mixDelta = cat.mixReelPct - cat.mixCiblePct;
                  // Marge Cible = 100 - foodCostCible (from store via statsParCategorie)
                  const margeCibleCat =
                    cat.foodCostCible !== undefined
                      ? 100 - cat.foodCostCible
                      : null;
                  return (
                    <TableRow
                      key={cat.id}
                      data-ocid={`bp-reel.comparatif.mix.item.${i + 1}`}
                    >
                      <TableCell className="pl-6 font-medium">
                        {cat.nom}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <span className="text-muted-foreground">
                          {cat.mixCiblePct.toFixed(1)} %
                        </span>
                        {margeCibleCat !== null && (
                          <span className="block text-xs text-muted-foreground">
                            Marge : {margeCibleCat.toFixed(1)} %
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        <span
                          className={`font-semibold ${getDeltaColor(mixDelta)}`}
                        >
                          {cat.mixReelPct.toFixed(1)} %
                        </span>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <DeltaPctBadge delta={mixDelta} />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── Mix Réel par Catégorie (Section C) ─────────────────────────────── */}
      <Card data-ocid="bp-reel.mix.card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
              C
            </span>
            Mix Réel par Catégorie
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {stats.volumeTotalGlobal === 0 ? (
            <div
              className="flex flex-col items-center justify-center py-12 gap-3 text-center"
              data-ocid="bp-reel.mix.empty_state"
            >
              <TrendingUp className="h-10 w-10 text-muted-foreground/40" />
              <p className="font-medium text-foreground">Aucun volume saisi</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                Saisissez des volumes dans le Laboratoire Recettes pour voir le
                mix réel de chaque catégorie.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/40 hover:bg-muted/40">
                    <TableHead className="pl-6">Catégorie</TableHead>
                    <TableHead className="text-right">Mix Cible (%)</TableHead>
                    <TableHead className="text-right">
                      Marge Cible (%)
                    </TableHead>
                    <TableHead className="text-right">Mix Réel (%)</TableHead>
                    <TableHead className="text-right pr-6">Delta Mix</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.statsParCategorie.map((cat, i) => {
                    const mixDelta = cat.mixReelPct - cat.mixCiblePct;
                    // ACTION 2: Marge Cible = 100 - cat.foodCostCible from store
                    const margeCibleCat =
                      cat.foodCostCible !== undefined
                        ? 100 - cat.foodCostCible
                        : 0;
                    return (
                      <TableRow
                        key={cat.id}
                        data-ocid={`bp-reel.mix.item.${i + 1}`}
                      >
                        <TableCell className="pl-6 font-medium">
                          {cat.nom}
                        </TableCell>
                        {/* Mix Cible — from store via statsParCategorie */}
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {cat.mixCiblePct.toFixed(1)} %
                        </TableCell>
                        {/* Marge Cible — from store: 100 - foodCostCible */}
                        <TableCell className="text-right tabular-nums text-muted-foreground">
                          {margeCibleCat.toFixed(1)} %
                        </TableCell>
                        {/* Mix Réel */}
                        <TableCell className="text-right tabular-nums">
                          <span
                            className={`font-semibold ${getDeltaColor(mixDelta)}`}
                          >
                            {cat.mixReelPct.toFixed(1)} %
                          </span>
                        </TableCell>
                        {/* Delta — ACTION 3: GREEN >= 0, RED < 0 */}
                        <TableCell className="text-right pr-6">
                          <DeltaPctBadge delta={mixDelta} />
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

      {/* ── Détail des Charges ─────────────────────────────────────────────── */}
      <Card data-ocid="bp-reel.charges.card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Wallet className="h-4 w-4 text-muted-foreground" />
            Détail des Charges Annuelles
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Frais Fixes
              </p>
              <p className="text-xl font-bold tabular-nums text-foreground">
                {fmt(totalFraisFixesAn)}
              </p>
              <p className="text-xs text-muted-foreground">par an</p>
            </div>
            <div className="rounded-lg border border-border bg-muted/20 p-4 space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Masse Salariale
              </p>
              <p className="text-xl font-bold tabular-nums text-foreground">
                {fmt(totalMasseSalarialeAn)}
              </p>
              <p className="text-xs text-muted-foreground">par an</p>
            </div>
            <div className="rounded-lg border border-border bg-primary/10 p-4 space-y-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Total Charges
              </p>
              <p className="text-xl font-bold tabular-nums text-foreground">
                {fmt(totalChargesAn)}
              </p>
              <p className="text-xs text-muted-foreground">par an</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
