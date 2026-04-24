import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  selectTotalFraisFixesAnnuels,
  selectTotalMasseSalarialeAnnuelle,
  useAppStore,
} from "@/core/store/useAppStore";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardList,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import {
  calculerPointMortJour,
  calculerResultatJour,
} from "../utils/operationsMath";

function formatEur(value: number): string {
  return `${value.toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} €`;
}

export default function OperationsPage() {
  const [caJour, setCaJour] = useState<number>(0);
  const [pertesJour, setPertesJour] = useState<number>(0);

  // ── Data from global store ───────────────────────────────────────────────────
  const salaries = useAppStore((s) => s.salaries);
  const fraisFixes = useAppStore((s) => s.fraisFixes);
  const hypothesesBP = useAppStore((s) => s.hypothesesBP);
  const joursOuvertureAn = hypothesesBP.joursOuvertureAn;
  const foodCostPct = 100 - (hypothesesBP.margeCibleGlobale ?? 70);

  const totalFraisFixesAn = selectTotalFraisFixesAnnuels(fraisFixes);
  const totalMasseSalarialeAn = selectTotalMasseSalarialeAnnuelle(salaries);

  const pointMortJour = calculerPointMortJour(
    totalFraisFixesAn,
    totalMasseSalarialeAn,
    joursOuvertureAn,
  );

  const resultatJour = calculerResultatJour(
    caJour,
    foodCostPct,
    pertesJour,
    pointMortJour,
  );

  const isPositif = resultatJour > 0;

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Page intro */}
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
          <ClipboardList className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground">
            Tableau de bord de fin de service
          </h2>
          <p className="text-sm text-muted-foreground">
            Saisissez les chiffres du jour pour calculer votre rentabilité
            réelle.
          </p>
        </div>
      </div>

      {/* ── Section A : Le Point Mort ─────────────────────────────────────── */}
      <section data-ocid="operations.point_mort.section">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Section A — Le Point Mort
        </h3>
        <Card className="border-border bg-card shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base font-semibold text-foreground">
              <TrendingDown className="h-4 w-4 text-muted-foreground" />
              Coût fixe de la journée
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-4">
              <div>
                <p
                  className="text-3xl font-bold font-display text-foreground tabular-nums"
                  data-ocid="operations.point_mort.value"
                >
                  {formatEur(pointMortJour)}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Même sans vendre un seul couvert, votre restaurant coûte ce
                  montant aujourd'hui.
                </p>
              </div>
            </div>
            <Separator className="my-4" />
            <div className="grid grid-cols-3 gap-4 text-center text-sm">
              <div>
                <p className="text-muted-foreground text-xs">
                  Charges fixes / an
                </p>
                <p className="font-semibold text-foreground">
                  {formatEur(totalFraisFixesAn)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">
                  Masse salariale / an
                </p>
                <p className="font-semibold text-foreground">
                  {formatEur(totalMasseSalarialeAn)}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground text-xs">
                  Jours d'ouverture / an
                </p>
                <p className="font-semibold text-foreground">
                  {joursOuvertureAn} j
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ── Section B : La Caisse du Jour ────────────────────────────────── */}
      <section data-ocid="operations.caisse.section">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Section B — La Caisse du Jour
        </h3>
        <Card className="border-border bg-card shadow-sm">
          <CardContent className="pt-5 space-y-5">
            {/* CA du jour */}
            <div className="space-y-1.5">
              <Label
                htmlFor="ca-jour"
                className="text-sm font-medium text-foreground"
              >
                Chiffre d'Affaires HT réalisé aujourd'hui
              </Label>
              <div className="relative">
                <Input
                  id="ca-jour"
                  type="number"
                  min={0}
                  step={0.01}
                  value={caJour === 0 ? "" : caJour}
                  placeholder="0,00"
                  onChange={(e) =>
                    setCaJour(Number.parseFloat(e.target.value) || 0)
                  }
                  className="pr-8 text-foreground"
                  data-ocid="operations.ca_jour.input"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  €
                </span>
              </div>
            </div>

            {/* Pertes alimentaires */}
            <div className="space-y-1.5">
              <Label
                htmlFor="pertes-jour"
                className="text-sm font-medium text-foreground"
              >
                Pertes alimentaires (Valeur HT des invendus)
              </Label>
              <div className="relative">
                <Input
                  id="pertes-jour"
                  type="number"
                  min={0}
                  step={0.01}
                  value={pertesJour === 0 ? "" : pertesJour}
                  placeholder="0,00"
                  onChange={(e) =>
                    setPertesJour(Number.parseFloat(e.target.value) || 0)
                  }
                  className="pr-8 text-foreground"
                  data-ocid="operations.pertes_jour.input"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                  €
                </span>
              </div>
            </div>

            {/* Food Cost (non éditable) */}
            <div className="flex items-center justify-between rounded-md border border-border bg-muted/40 px-4 py-3">
              <span className="text-sm font-medium text-foreground">
                Food Cost théorique
              </span>
              <span
                className="text-sm font-bold text-foreground tabular-nums"
                data-ocid="operations.food_cost.display"
              >
                {foodCostPct} %
              </span>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* ── Section C : Le Verdict du Jour ───────────────────────────────── */}
      <section data-ocid="operations.verdict.section">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
          Section C — Le Verdict du Jour
        </h3>
        <div
          className={`rounded-xl border-2 p-6 transition-colors duration-300 ${
            isPositif
              ? "bg-green-50 border-green-200"
              : "bg-red-50 border-red-200"
          }`}
          data-ocid="operations.verdict.card"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p
                className={`text-sm font-medium mb-1 ${
                  isPositif ? "text-green-700" : "text-red-700"
                }`}
              >
                Résultat Net de la journée
              </p>
              <p
                className={`text-4xl font-bold font-display tabular-nums ${
                  isPositif ? "text-green-700" : "text-red-700"
                }`}
                data-ocid="operations.resultat_net.value"
              >
                {formatEur(resultatJour)}
              </p>
            </div>
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-full flex-shrink-0 ${
                isPositif ? "bg-green-100" : "bg-red-100"
              }`}
            >
              {isPositif ? (
                <TrendingUp className="h-6 w-6 text-green-600" />
              ) : (
                <AlertTriangle className="h-6 w-6 text-red-600" />
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2">
            {isPositif ? (
              <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
            )}
            <span
              className={`text-sm font-semibold ${
                isPositif ? "text-green-700" : "text-red-700"
              }`}
              data-ocid="operations.verdict.label"
            >
              {isPositif ? "Journée bénéficiaire ✓" : "Journée déficitaire ✗"}
            </span>
          </div>

          {/* Détail du calcul */}
          <Separator
            className={`my-4 ${isPositif ? "bg-green-200" : "bg-red-200"}`}
          />
          <div
            className={`grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs ${isPositif ? "text-green-700" : "text-red-700"}`}
          >
            <span>CA HT du jour</span>
            <span className="text-right font-medium tabular-nums">
              + {formatEur(caJour)}
            </span>
            <span>Coût matière ({foodCostPct}%)</span>
            <span className="text-right font-medium tabular-nums">
              − {formatEur((caJour * foodCostPct) / 100)}
            </span>
            <span>Pertes alimentaires</span>
            <span className="text-right font-medium tabular-nums">
              − {formatEur(pertesJour)}
            </span>
            <span>Point mort journalier</span>
            <span className="text-right font-medium tabular-nums">
              − {formatEur(pointMortJour)}
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}
