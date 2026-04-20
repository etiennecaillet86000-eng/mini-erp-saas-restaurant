import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { AlertTriangle, CheckCircle2, Save, TrendingUp } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LocalHypotheses {
  couvertsParJour: number;
  joursOuvertureAn: number;
  semainesOuverture: number;
  tauxCroissanceCA: number;
  tauxInflationCharges: number;
}

// Local BP row — extends CategorieCarte with BP-specific fields
interface BpCatRow {
  id: string; // matches CategorieCarte.id
  ticketMoyen: number;
  foodCost: number;
}

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
  // ── Store access ─────────────────────────────────────────────────────────────
  const hypothesesBP = useAppStore((s) => s.hypothesesBP);
  const setHypothesesBP = useAppStore((s) => s.setHypothesesBP);
  const salaries = useAppStore((s) => s.salaries);
  const fraisFixes = useAppStore((s) => s.fraisFixes);
  const categoriesCarte = useAppStore((s) => s.categoriesCarte);
  const updateCategorieCarte = useAppStore((s) => s.updateCategorieCarte);

  // ── Local form state — initialised from store, saved on button click ─────────
  const [localHyp, setLocalHyp] = useState<LocalHypotheses>(() => ({
    couvertsParJour: hypothesesBP.couvertsParJour,
    joursOuvertureAn: hypothesesBP.joursOuvertureAn,
    semainesOuverture: hypothesesBP.semainesOuverture,
    tauxCroissanceCA: hypothesesBP.tauxCroissanceAnnuel,
    tauxInflationCharges: hypothesesBP.tauxInflationAnnuel,
  }));

  const setLocalHypField = (key: keyof LocalHypotheses, value: number) =>
    setLocalHyp((h) => ({ ...h, [key]: value }));

  const handleSaveHypotheses = () => {
    setHypothesesBP({
      couvertsParJour: localHyp.couvertsParJour,
      joursOuvertureAn: localHyp.joursOuvertureAn,
      semainesOuverture: localHyp.semainesOuverture,
      tauxCroissanceAnnuel: localHyp.tauxCroissanceCA,
      tauxInflationAnnuel: localHyp.tauxInflationCharges,
    });
    toast.success("Hypothèses enregistrées dans le store global.");
  };

  // Derive weekly traffic from daily covers × opening days / 52
  const traficHebdo = Math.round(
    (localHyp.couvertsParJour * localHyp.joursOuvertureAn) /
      Math.max(localHyp.semainesOuverture, 1),
  );

  const totalMasseSalarialeAn = selectTotalMasseSalarialeAnnuelle(salaries);
  const totalFraisFixesAn = selectTotalFraisFixesAnnuels(fraisFixes);

  // ── Local BP rows for ticket moyen & food cost (BP-specific data) ─────────
  // Initialised once from categoriesCarte ids; keyed by id for O(1) access.
  const [bpRows, setBpRows] = useState<BpCatRow[]>(() =>
    categoriesCarte.map((c) => ({
      id: c.id,
      ticketMoyen: 5.0,
      foodCost: 30,
    })),
  );

  // Keep bpRows in sync when new categories are added to the store
  const syncedBpRows: BpCatRow[] = categoriesCarte.map((c) => {
    const existing = bpRows.find((r) => r.id === c.id);
    return existing ?? { id: c.id, ticketMoyen: 5.0, foodCost: 30 };
  });

  const setBpRowField = (
    id: string,
    key: keyof Omit<BpCatRow, "id">,
    value: number,
  ) =>
    setBpRows((prev) => {
      const exists = prev.find((r) => r.id === id);
      if (exists) {
        return prev.map((r) => (r.id === id ? { ...r, [key]: value } : r));
      }
      return [...prev, { id, ticketMoyen: 5.0, foodCost: 30, [key]: value }];
    });

  // ── Build a combined view for calculations (matching old CategorieRow shape) ─
  const categories = useMemo(
    () =>
      categoriesCarte.map((cat, i) => {
        const bp = syncedBpRows[i] ?? { ticketMoyen: 5.0, foodCost: 30 };
        return {
          id: i + 1, // numeric id used by calculerCA/calculerMargeBrute
          categorie: cat.nom,
          mix: cat.mixCiblePct,
          ticketMoyen: bp.ticketMoyen,
          foodCost: bp.foodCost,
        };
      }),
    [categoriesCarte, syncedBpRows],
  );

  const totalMix = categoriesCarte.reduce((s, c) => s + c.mixCiblePct, 0);
  const mixValide = Math.round(totalMix) === 100;

  // ── Calcul du CR 5 ans ───────────────────────────────────────────────────────
  const compteResultat = useMemo(() => {
    const tauxCA = localHyp.tauxCroissanceCA / 100;
    const tauxInflation = localHyp.tauxInflationCharges / 100;

    const caAn1 = calculerCA(
      traficHebdo,
      localHyp.semainesOuverture,
      categories,
    );
    const casProjectes = projeterSur5Ans(caAn1, tauxCA);
    const chargesProjectees = projeterSur5Ans(totalFraisFixesAn, tauxInflation);
    const salairesProjectes = projeterSur5Ans(
      totalMasseSalarialeAn,
      tauxInflation,
    );

    return Array.from({ length: 5 }, (_, i) => {
      const ca = casProjectes[i];
      const { margeBrute, coutMatiere } = calculerMargeBrute(ca, categories);
      const charges = chargesProjectees[i];
      const salaires = salairesProjectes[i];
      const ebe = calculerEBE(margeBrute, charges, salaires);
      const pctEbe = ca > 0 ? (ebe / ca) * 100 : 0;
      return { ca, coutMatiere, margeBrute, charges, salaires, ebe, pctEbe };
    });
  }, [
    localHyp,
    traficHebdo,
    categories,
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
        <CardContent className="space-y-5">
          <div className="grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3 lg:grid-cols-5">
            <NumericInput
              id="couvertsParJour"
              label="Couverts/jour"
              value={localHyp.couvertsParJour}
              onChange={(v) => setLocalHypField("couvertsParJour", v)}
              min={1}
              ocid="business-plan.couvertsparjour.input"
            />
            <NumericInput
              id="joursOuvertureAn"
              label="Jours/an"
              value={localHyp.joursOuvertureAn}
              onChange={(v) => setLocalHypField("joursOuvertureAn", v)}
              min={1}
              ocid="business-plan.joursouverturean.input"
            />
            <NumericInput
              id="semaines"
              label="Semaines/an"
              value={localHyp.semainesOuverture}
              onChange={(v) => setLocalHypField("semainesOuverture", v)}
              min={1}
              ocid="business-plan.semaines.input"
            />
            <NumericInput
              id="croissance"
              label="Croissance CA/an"
              value={localHyp.tauxCroissanceCA}
              onChange={(v) => setLocalHypField("tauxCroissanceCA", v)}
              min={-50}
              step={0.5}
              suffix="%"
              ocid="business-plan.croissance.input"
            />
            <NumericInput
              id="inflation"
              label="Inflation charges/an"
              value={localHyp.tauxInflationCharges}
              onChange={(v) => setLocalHypField("tauxInflationCharges", v)}
              min={-20}
              step={0.5}
              suffix="%"
              ocid="business-plan.inflation.input"
            />
          </div>
          <div className="flex items-center gap-3 pt-1 border-t border-border">
            <Button
              onClick={handleSaveHypotheses}
              size="sm"
              className="gap-2"
              data-ocid="business-plan.save_hypotheses.button"
            >
              <Save className="h-4 w-4" />
              Enregistrer les Hypothèses
            </Button>
            <p className="text-xs text-muted-foreground">
              Trafic hebdomadaire calculé :{" "}
              <strong className="text-foreground tabular-nums">
                {traficHebdo} clients/semaine
              </strong>
            </p>
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
                {categoriesCarte.map((cat, i) => {
                  const bp = syncedBpRows.find((r) => r.id === cat.id) ?? {
                    ticketMoyen: 5.0,
                    foodCost: 30,
                  };
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
                            updateCategorieCarte(cat.id, {
                              mixCiblePct: Number(e.target.value),
                            })
                          }
                          className="h-8 w-20 text-right tabular-nums ml-auto"
                          data-ocid={`business-plan.mix.input.${i + 1}`}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min={0}
                          step={0.1}
                          value={bp.ticketMoyen}
                          onChange={(e) =>
                            setBpRowField(
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
                          value={bp.foodCost}
                          onChange={(e) =>
                            setBpRowField(
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
                            100 - bp.foodCost >= 65
                              ? "font-semibold text-emerald-600"
                              : 100 - bp.foodCost >= 70
                                ? "text-foreground"
                                : "text-amber-600"
                          }
                        >
                          {(100 - bp.foodCost).toFixed(0)} %
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
                      {totalMix} %
                    </span>
                  </TableCell>
                  <TableCell colSpan={3} />
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

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
