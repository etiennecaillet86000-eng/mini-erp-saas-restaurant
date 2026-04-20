import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  selectTotalFraisFixesAnnuels,
  selectTotalMasseSalarialeAnnuelle,
  useAppStore,
} from "@/core/store/useAppStore";
import {
  calculerCA,
  calculerEBE,
  calculerMargeBrute,
  projeterSur5Ans,
} from "@/utils/math/finance";
import { AlertTriangle, CheckCircle2, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Hypotheses {
  traficHebdo: number;
  tauxCroissanceCA: number;
  tauxInflationCharges: number;
}

// Local-only simulation params (ticket moyen & food cost) keyed by category ID
interface LocalCatParams {
  ticketMoyen: number;
  foodCost: number;
}

// ─── Données initiales ────────────────────────────────────────────────────────

const HYPOTHESES_INITIALES: Hypotheses = {
  traficHebdo: 200,
  tauxCroissanceCA: 5,
  tauxInflationCharges: 3,
};

// Default simulation params per store category ID
const DEFAULT_LOCAL_PARAMS: Record<string, LocalCatParams> = {
  cat_boissons: { ticketMoyen: 3.5, foodCost: 15 },
  cat_snacking: { ticketMoyen: 5.5, foodCost: 35 },
  cat_plats: { ticketMoyen: 12.0, foodCost: 32 },
  cat_desserts: { ticketMoyen: 4.5, foodCost: 28 },
  cat_acc: { ticketMoyen: 3.0, foodCost: 25 },
  cat_formules: { ticketMoyen: 14.0, foodCost: 30 },
};

const DEFAULT_FALLBACK: LocalCatParams = { ticketMoyen: 5.0, foodCost: 30 };

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(n);

const fmtPct = (n: number) => `${n >= 0 ? "+" : ""}${n.toFixed(1)} %`;

function NumericInput({
  id,
  label,
  value,
  onChange,
  min,
  step,
  suffix,
  ocid,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  step?: number;
  suffix?: string;
  ocid: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label
        htmlFor={id}
        className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
      >
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type="number"
          min={min ?? 0}
          step={step ?? 1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="pr-10 tabular-nums"
          data-ocid={ocid}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </div>
  );
}

// ─── Component principal ──────────────────────────────────────────────────────

export default function BusinessPlanPage() {
  const [hyp, setHyp] = useState<Hypotheses>(HYPOTHESES_INITIALES);

  // Local simulation params (ticketMoyen & foodCost) — keyed by store category ID
  const [localParams, setLocalParams] =
    useState<Record<string, LocalCatParams>>(DEFAULT_LOCAL_PARAMS);

  // ── Data from global store ───────────────────────────────────────────────────
  const salaries = useAppStore((s) => s.salaries);
  const fraisFixes = useAppStore((s) => s.fraisFixes);
  const categoriesCarte = useAppStore((s) => s.categoriesCarte);
  const updateCategorie = useAppStore((s) => s.updateCategorie);
  // Action 2: store-connected hypotheses
  const hypothesesBP = useAppStore((s) => s.hypothesesBP);
  const updateHypotheses = useAppStore((s) => s.updateHypotheses);

  // Action 3: objectifCAannuel from store
  const objectifCAannuel = hypothesesBP.objectifCAannuel || 500000;

  const totalMasseSalarialeAn = selectTotalMasseSalarialeAnnuelle(salaries);
  const totalFraisFixesAn = selectTotalFraisFixesAnnuels(fraisFixes);

  const totalMix = categoriesCarte.reduce(
    (s, c) => s + (c.mixCiblePct || 0),
    0,
  );
  const mixValide = Math.round(totalMix) === 100;

  const setHypField = (key: keyof Hypotheses, value: number) =>
    setHyp((h) => ({ ...h, [key]: value }));

  const setLocalParam = (
    catId: string,
    key: keyof LocalCatParams,
    value: number,
  ) =>
    setLocalParams((prev) => ({
      ...prev,
      [catId]: { ...(prev[catId] ?? DEFAULT_FALLBACK), [key]: value },
    }));

  // Build the categories array that finance.ts functions expect
  const categoriesForCalc = useMemo(
    () =>
      categoriesCarte.map((cat) => {
        const params = localParams[cat.id] ?? DEFAULT_FALLBACK;
        return {
          mix: cat.mixCiblePct,
          ticketMoyen: params.ticketMoyen,
          foodCost: params.foodCost,
        };
      }),
    [categoriesCarte, localParams],
  );

  // ── Calcul du CR 5 ans ───────────────────────────────────────────────────────
  const compteResultat = useMemo(() => {
    const tauxCA = hyp.tauxCroissanceCA / 100;
    const tauxInflation = hyp.tauxInflationCharges / 100;

    const caAn1 = calculerCA(
      hyp.traficHebdo,
      hypothesesBP.semainesOuverture,
      categoriesForCalc,
    );
    const casProjectes = projeterSur5Ans(caAn1, tauxCA);
    const chargesProjectees = projeterSur5Ans(totalFraisFixesAn, tauxInflation);
    const salairesProjectes = projeterSur5Ans(
      totalMasseSalarialeAn,
      tauxInflation,
    );

    return Array.from({ length: 5 }, (_, i) => {
      const ca = casProjectes[i];
      const { margeBrute, coutMatiere } = calculerMargeBrute(
        ca,
        categoriesForCalc,
      );
      const charges = chargesProjectees[i];
      const salaires = salairesProjectes[i];
      const ebe = calculerEBE(margeBrute, charges, salaires);
      const pctEbe = ca > 0 ? (ebe / ca) * 100 : 0;
      return { ca, coutMatiere, margeBrute, charges, salaires, ebe, pctEbe };
    });
  }, [
    hyp,
    hypothesesBP.semainesOuverture,
    categoriesForCalc,
    totalFraisFixesAn,
    totalMasseSalarialeAn,
  ]);

  const ANNEES = ["Année 1", "Année 2", "Année 3", "Année 4", "Année 5"];

  const CR_LIGNES = [
    {
      label: "Chiffre d'Affaires HT",
      getValue: (y: (typeof compteResultat)[0]) => fmt(y.ca),
      className: "font-semibold",
    },
    {
      label: "Coût Matière",
      getValue: (y: (typeof compteResultat)[0]) => fmt(y.coutMatiere),
      className: "text-muted-foreground",
    },
    {
      label: "Marge Brute",
      getValue: (y: (typeof compteResultat)[0]) => fmt(y.margeBrute),
      className: "font-medium",
    },
    {
      label: "Charges Fixes",
      getValue: (y: (typeof compteResultat)[0]) => fmt(y.charges),
      className: "text-muted-foreground",
    },
    {
      label: "Masse Salariale",
      getValue: (y: (typeof compteResultat)[0]) => fmt(y.salaires),
      className: "text-muted-foreground",
    },
  ];

  return (
    <div className="space-y-6" data-ocid="business-plan.page">
      {/* Header */}
      <div className="flex items-center gap-3">
        <TrendingUp className="h-5 w-5 text-primary" />
        <div>
          <h1 className="font-display text-2xl font-semibold text-foreground">
            Business Plan
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Simulateur de Compte de Résultat sur 5 ans
          </p>
        </div>
      </div>

      {/* ── Section A : Hypothèses Globales ─────────────────────────────────── */}
      <Card data-ocid="business-plan.hypotheses.card">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
              A
            </span>
            Hypothèses Globales
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-4">
            <NumericInput
              id="trafic"
              label="Trafic (clients/semaine)"
              value={hyp.traficHebdo}
              onChange={(v) => setHypField("traficHebdo", v)}
              min={1}
              ocid="business-plan.trafic.input"
            />
            {/* Action 2: Semaines d'ouverture — bound to store */}
            <div className="space-y-1.5">
              <Label
                htmlFor="semaines"
                className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
              >
                Semaines d'ouverture/an
              </Label>
              <Input
                id="semaines"
                type="number"
                min={1}
                value={hypothesesBP.semainesOuverture || ""}
                onChange={(e) =>
                  updateHypotheses({
                    semainesOuverture: Number(e.target.value),
                  })
                }
                onFocus={(e) => e.target.select()}
                className="tabular-nums"
                data-ocid="business-plan.semaines.input"
              />
            </div>
            {/* Action 2: Objectif CA Annuel — bound to store */}
            <div className="space-y-1.5">
              <Label
                htmlFor="objectif-ca"
                className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
              >
                Objectif CA Annuel (€)
              </Label>
              <Input
                id="objectif-ca"
                type="number"
                min={0}
                step={10000}
                value={hypothesesBP.objectifCAannuel || ""}
                onChange={(e) =>
                  updateHypotheses({ objectifCAannuel: Number(e.target.value) })
                }
                onFocus={(e) => e.target.select()}
                className="tabular-nums"
                data-ocid="business-plan.objectif-ca.input"
              />
            </div>
            <NumericInput
              id="croissance"
              label="Croissance CA/an"
              value={hyp.tauxCroissanceCA}
              onChange={(v) => setHypField("tauxCroissanceCA", v)}
              min={-50}
              step={0.5}
              suffix="%"
              ocid="business-plan.croissance.input"
            />
            <NumericInput
              id="inflation"
              label="Inflation charges/an"
              value={hyp.tauxInflationCharges}
              onChange={(v) => setHypField("tauxInflationCharges", v)}
              min={-20}
              step={0.5}
              suffix="%"
              ocid="business-plan.inflation.input"
            />
            {/* Phase 4.2 — Jours d'ouverture par semaine */}
            <div className="space-y-1.5">
              <Label
                htmlFor="jours-semaine"
                className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
              >
                Jours d'ouverture / semaine
              </Label>
              <Input
                id="jours-semaine"
                type="number"
                min={1}
                max={7}
                value={hypothesesBP.joursOuvertureParSemaine || ""}
                onChange={(e) =>
                  updateHypotheses({
                    joursOuvertureParSemaine: Number(e.target.value) || 0,
                  })
                }
                onFocus={(e) => e.target.select()}
                className="tabular-nums"
                data-ocid="business-plan.jours-semaine.input"
              />
            </div>
            {/* Phase 4.2 — Ticket moyen cible */}
            <div className="space-y-1.5">
              <Label
                htmlFor="ticket-moyen-cible"
                className="text-xs font-medium text-muted-foreground uppercase tracking-wide"
              >
                Ticket moyen cible (€)
              </Label>
              <Input
                id="ticket-moyen-cible"
                type="number"
                min={0}
                step={0.5}
                value={hypothesesBP.ticketMoyenCible || ""}
                onChange={(e) =>
                  updateHypotheses({
                    ticketMoyenCible: Number(e.target.value) || 0,
                  })
                }
                onFocus={(e) => e.target.select()}
                className="tabular-nums"
                data-ocid="business-plan.ticket-moyen-cible.input"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Section B : Analyse des Marges ──────────────────────────────────── */}
      <Card data-ocid="business-plan.marges.card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                B
              </span>
              Analyse des Marges par Catégorie
            </CardTitle>
            {mixValide ? (
              <Badge
                variant="outline"
                className="gap-1 border-emerald-300 bg-emerald-50 text-emerald-700"
                data-ocid="business-plan.mix.success_state"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Mix = 100 %
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className="gap-1 border-destructive bg-destructive/10 text-destructive"
                data-ocid="business-plan.mix.error_state"
              >
                <AlertTriangle className="h-3.5 w-3.5" />
                Mix = {totalMix} %
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!mixValide && (
            <div className="px-6 pb-4">
              <Alert variant="destructive" data-ocid="business-plan.mix.alert">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Le total de la colonne <strong>Mix</strong> est de{" "}
                  <strong>{totalMix} %</strong> au lieu de 100 %. Ajustez les
                  valeurs pour que la somme soit exactement 100 %.
                </AlertDescription>
              </Alert>
            </div>
          )}
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="pl-6">Catégorie</TableHead>
                  <TableHead className="text-right w-32">Mix (%)</TableHead>
                  <TableHead className="text-right w-44">
                    CA Théorique (€)
                  </TableHead>
                  <TableHead className="text-right w-40">
                    Ticket Moyen HT (€)
                  </TableHead>
                  <TableHead className="text-right w-36">
                    Food Cost (%)
                  </TableHead>
                  <TableHead className="text-right pr-6 w-32">
                    Marge (%)
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Action 3: loop over store categoriesCarte — no local hardcoded list */}
                {categoriesCarte.map((cat, i) => {
                  const params = localParams[cat.id] ?? DEFAULT_FALLBACK;
                  const margeResidue = 100 - params.foodCost;
                  // Action 3: CA théorique = objectifCAannuel * mixCiblePct / 100
                  const caTheorique =
                    (objectifCAannuel * (cat.mixCiblePct || 0)) / 100;
                  return (
                    <TableRow
                      key={cat.id}
                      data-ocid={`business-plan.categorie.item.${i + 1}`}
                    >
                      <TableCell className="pl-6 font-medium">
                        {cat.nom}
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={cat.mixCiblePct}
                          onChange={(e) =>
                            updateCategorie(cat.id, {
                              mixCiblePct: Number(e.target.value) || 0,
                            })
                          }
                          onFocus={(e) => e.target.select()}
                          className="h-8 w-20 text-right tabular-nums ml-auto"
                          data-ocid={`business-plan.mix.input.${i + 1}`}
                        />
                      </TableCell>
                      {/* Action 3: CA théorique calculé automatiquement */}
                      <TableCell className="text-right tabular-nums text-sm text-muted-foreground">
                        {caTheorique.toLocaleString("fr-FR")} €
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min={0}
                          step={0.1}
                          value={params.ticketMoyen}
                          onChange={(e) =>
                            setLocalParam(
                              cat.id,
                              "ticketMoyen",
                              Number(e.target.value),
                            )
                          }
                          className="h-8 w-24 text-right tabular-nums ml-auto"
                          data-ocid={`business-plan.ticket.input.${i + 1}`}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={params.foodCost}
                          onChange={(e) =>
                            setLocalParam(
                              cat.id,
                              "foodCost",
                              Number(e.target.value),
                            )
                          }
                          className="h-8 w-20 text-right tabular-nums ml-auto"
                          data-ocid={`business-plan.foodcost.input.${i + 1}`}
                        />
                      </TableCell>
                      <TableCell className="pr-6 text-right tabular-nums">
                        <span
                          className={
                            margeResidue >= 70
                              ? "font-semibold text-emerald-600"
                              : margeResidue >= 65
                                ? "text-foreground"
                                : "text-amber-600"
                          }
                        >
                          {margeResidue.toFixed(0)} %
                        </span>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {/* Ligne total */}
                <TableRow className="bg-muted/30 border-t-2 border-border">
                  <TableCell className="pl-6 font-semibold text-foreground">
                    Total
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-bold">
                    <span
                      className={
                        !mixValide ? "text-destructive" : "text-emerald-600"
                      }
                    >
                      {totalMix.toFixed(1)} %
                    </span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-sm font-semibold">
                    {objectifCAannuel.toLocaleString("fr-FR")} €
                  </TableCell>
                  <TableCell colSpan={3} />
                </TableRow>
              </TableBody>
            </Table>
          </div>
          {/* Action 4: indicateur de cohérence du mix */}
          {!mixValide && (
            <p
              className="px-6 py-3 text-sm font-medium text-amber-600"
              data-ocid="business-plan.mix.total_warning"
            >
              Total actuel : {totalMix.toFixed(1)}% (Le total doit être de 100%)
            </p>
          )}
          {mixValide && (
            <p
              className="px-6 py-3 text-sm font-medium text-emerald-600"
              data-ocid="business-plan.mix.total_ok"
            >
              Total : 100% ✓
            </p>
          )}
        </CardContent>
      </Card>

      {/* ── Phase 4.2 — Synthèse des Flux Clients ───────────────────────────── */}
      {(() => {
        const semaines = hypothesesBP.semainesOuverture || 0;
        const ticket = hypothesesBP.ticketMoyenCible || 0;
        const jours = hypothesesBP.joursOuvertureParSemaine || 0;
        const caHebdo = semaines > 0 ? objectifCAannuel / semaines : 0;
        const volSemaine = ticket > 0 ? caHebdo / ticket : 0;
        const volJour = jours > 0 ? volSemaine / jours : 0;
        return (
          <Card data-ocid="business-plan.synthese-flux.card">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                  ★
                </span>
                Synthèse des Flux Clients
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Objectifs de fréquentation déduits du CA annuel et du ticket
                moyen cible.
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {/* KPI 1 — CA Hebdomadaire */}
                <div
                  className="rounded-lg border border-border bg-muted/20 p-4 space-y-1"
                  data-ocid="business-plan.synthese-flux.ca-hebdo.card"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Objectif CA Hebdomadaire
                  </p>
                  <p className="text-2xl font-bold tabular-nums font-display text-foreground">
                    {caHebdo > 0
                      ? new Intl.NumberFormat("fr-FR", {
                          style: "currency",
                          currency: "EUR",
                          maximumFractionDigits: 0,
                        }).format(caHebdo)
                      : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    CA annuel / semaines d'ouverture
                  </p>
                </div>
                {/* KPI 2 — Volume clients / semaine */}
                <div
                  className="rounded-lg border border-border bg-muted/20 p-4 space-y-1"
                  data-ocid="business-plan.synthese-flux.vol-semaine.card"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Volume clients cible / semaine
                  </p>
                  <p className="text-2xl font-bold tabular-nums font-display text-foreground">
                    {ticket > 0
                      ? Math.round(volSemaine).toLocaleString("fr-FR")
                      : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    CA hebdo / ticket moyen cible
                  </p>
                </div>
                {/* KPI 3 — Volume clients / jour */}
                <div
                  className="rounded-lg border border-primary/20 bg-primary/5 p-4 space-y-1"
                  data-ocid="business-plan.synthese-flux.vol-jour.card"
                >
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    Volume clients cible / jour
                  </p>
                  <p className="text-2xl font-bold tabular-nums font-display text-foreground">
                    {ticket > 0 && jours > 0
                      ? Math.round(volJour).toLocaleString("fr-FR")
                      : "—"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Volume semaine / jours d'ouverture
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* ── Section C : Compte de Résultat 5 ans ────────────────────────────── */}
      <Card data-ocid="business-plan.cr5ans.card">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                C
              </span>
              Compte de Résultat — Projection 5 ans
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Charges fixes : {fmt(totalFraisFixesAn)}/an · Masse salariale :{" "}
              {fmt(totalMasseSalarialeAn)}/an{" "}
              <span className="italic">(données réelles)</span>
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/40 hover:bg-muted/40">
                  <TableHead className="pl-6 w-48">Indicateur</TableHead>
                  {ANNEES.map((a) => (
                    <TableHead key={a} className="text-right tabular-nums">
                      {a}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {CR_LIGNES.map((ligne) => (
                  <TableRow key={ligne.label}>
                    <TableCell className={`pl-6 ${ligne.className}`}>
                      {ligne.label}
                    </TableCell>
                    {compteResultat.map((y, i) => (
                      <TableCell
                        key={`${ligne.label}-an${i + 1}`}
                        className={`text-right tabular-nums ${ligne.className}`}
                      >
                        {ligne.getValue(y)}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

                {/* Séparateur avant EBE */}
                <TableRow className="border-t-2 border-border bg-muted/20">
                  <TableCell className="pl-6 font-bold text-foreground">
                    EBE
                  </TableCell>
                  {compteResultat.map((y, i) => (
                    <TableCell
                      key={`ebe-an${i + 1}`}
                      className={`text-right tabular-nums font-bold ${
                        y.ebe >= 0 ? "text-emerald-600" : "text-destructive"
                      }`}
                      data-ocid={`business-plan.ebe.item.${i + 1}`}
                    >
                      {fmt(y.ebe)}
                    </TableCell>
                  ))}
                </TableRow>

                {/* % EBE/CA */}
                <TableRow className="bg-muted/10">
                  <TableCell className="pl-6 text-sm text-muted-foreground italic">
                    % EBE / CA
                  </TableCell>
                  {compteResultat.map((y, i) => (
                    <TableCell
                      key={`pctebe-an${i + 1}`}
                      className={`text-right tabular-nums text-sm italic ${
                        y.pctEbe >= 0 ? "text-emerald-600" : "text-destructive"
                      }`}
                    >
                      {fmtPct(y.pctEbe)}
                    </TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
