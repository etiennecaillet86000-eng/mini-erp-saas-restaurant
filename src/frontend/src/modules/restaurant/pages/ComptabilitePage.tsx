import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  selectReelSectionA,
  selectReelSectionB,
  useAppStore,
} from "@/core/store/useAppStore";
import {
  Calculator,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { useMemo } from "react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return `${n.toLocaleString("fr-FR", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} €`;
}

function fmtVal(n: number | null): string {
  if (n === null) return "—";
  return fmt(n);
}

function valueClass(n: number): string {
  if (n > 0) return "text-green-600";
  if (n < 0) return "text-red-600";
  return "";
}

/** Calculate annual interest paid for a given loan year (1-indexed) */
function calcAnnualInterest(
  capitalInitial: number,
  tauxAnnuel: number,
  dureeMois: number,
  year: number,
): number {
  const monthlyRate = tauxAnnuel / 100 / 12;
  if (monthlyRate === 0 || dureeMois === 0) return 0;
  const mensualite =
    capitalInitial * (monthlyRate / (1 - (1 + monthlyRate) ** -dureeMois));

  let capital = capitalInitial;
  let totalInterest = 0;
  const startMonth = (year - 1) * 12 + 1;
  const endMonth = Math.min(year * 12, dureeMois);

  for (let m = 1; m <= endMonth; m++) {
    const interest = capital * monthlyRate;
    const principal = mensualite - interest;
    if (m >= startMonth) {
      totalInterest += interest;
    }
    capital -= principal;
    if (capital <= 0) break;
  }
  return Math.max(0, totalInterest);
}

/** Calculate annual capital repayment for a given loan year (1-indexed) */
function calcAnnualCapitalRepayment(
  capitalInitial: number,
  tauxAnnuel: number,
  dureeMois: number,
  year: number,
): number {
  const monthlyRate = tauxAnnuel / 100 / 12;
  if (dureeMois === 0) return 0;
  if (monthlyRate === 0) {
    const monthlyPrincipal = capitalInitial / dureeMois;
    const startMonth = (year - 1) * 12 + 1;
    const endMonth = Math.min(year * 12, dureeMois);
    if (startMonth > dureeMois) return 0;
    return monthlyPrincipal * (endMonth - startMonth + 1);
  }

  const mensualite =
    capitalInitial * (monthlyRate / (1 - (1 + monthlyRate) ** -dureeMois));

  let capital = capitalInitial;
  let totalPrincipal = 0;
  const startMonth = (year - 1) * 12 + 1;
  const endMonth = Math.min(year * 12, dureeMois);

  for (let m = 1; m <= endMonth; m++) {
    const interest = capital * monthlyRate;
    const principal = Math.min(mensualite - interest, capital);
    if (m >= startMonth) {
      totalPrincipal += principal;
    }
    capital -= principal;
    if (capital <= 0) break;
  }
  return Math.max(0, totalPrincipal);
}

/** Calculate annual amortization dotation for year N (1-indexed) */
function calcDotationAnnuelle(
  valeurAchatHT: number,
  dureeAmortissementAns: number,
  type: "linéaire" | "dérogatoire",
  year: number,
): number {
  if (dureeAmortissementAns <= 0) return 0;
  if (year > dureeAmortissementAns) return 0;

  if (type === "linéaire") {
    return valeurAchatHT / dureeAmortissementAns;
  }

  // Dérogatoire — apply fiscal coefficient
  const coeff =
    dureeAmortissementAns <= 4
      ? 1.25
      : dureeAmortissementAns <= 6
        ? 1.75
        : 2.25;
  const tauxDerog = (1 / dureeAmortissementAns) * coeff;

  let vnc = valeurAchatHT;
  let dotation = 0;
  for (let y = 1; y <= year; y++) {
    const remainingYears = dureeAmortissementAns - y + 1;
    const linearDot = vnc / remainingYears;
    const derogDot = vnc * tauxDerog;
    dotation = linearDot > derogDot ? linearDot : derogDot;
    if (y < year) vnc -= dotation;
  }
  return dotation;
}

/** Calculate IS using bracket rules */
function calcIS(rai: number, bas: number, haut: number, seuil: number): number {
  if (rai <= 0) return 0;
  if (rai <= seuil) return rai * (bas / 100);
  return seuil * (bas / 100) + (rai - seuil) * (haut / 100);
}

// ─── P&L Row types ────────────────────────────────────────────────────────────

interface PnLRow {
  label: string;
  values: (number | null)[]; // 5 values
  isBold?: boolean;
  isHighlight?: boolean;
  indent?: boolean;
  isDeduction?: boolean; // red muted style for deduction lines
}

// ─── Main component ────────────────────────────────────────────────────────────

export default function ComptabilitePage() {
  const hypothesesBP = useAppStore((s) => s.hypothesesBP);
  const updateHypotheses = useAppStore((s) => s.updateHypotheses);
  const immobilisations = useAppStore((s) => s.immobilisations);
  const emprunts = useAppStore((s) => s.emprunts);
  const associes = useAppStore((s) => s.associes);

  // ── Use global selectors for Section A & B (Année 1 base) ────────────────
  const sectionA = useAppStore(selectReelSectionA);
  const sectionB = useAppStore(selectReelSectionB);

  const pacteSocialActif = hypothesesBP.pacteSocialActif ?? false;
  const statutJuridique = hypothesesBP.statutJuridique ?? "SASU";

  // ── Compute Impact Pacte Social from associes list ────────────────────────
  const impactPacteSocial = useMemo(() => {
    if (!pacteSocialActif) return 0;
    const tauxCharges = statutJuridique === "SASU" ? 0.8 : 0.45;
    return (associes ?? []).reduce(
      (sum, a) => sum + (a.remunerationMensuelle ?? 0) * 12 * tauxCharges,
      0,
    );
  }, [pacteSocialActif, associes, statutJuridique]);

  // ── CAF: Total rémunération annuelle associés from associes list ──────────
  const totalRemunerationAssociesAnnuelle = useMemo(
    () =>
      (associes ?? []).reduce(
        (sum, a) => sum + (a.remunerationMensuelle ?? 0) * 12,
        0,
      ),
    [associes],
  );

  // ── BP tab data ───────────────────────────────────────────────────────────────
  const bpRows = useMemo((): PnLRow[] => {
    const {
      objectifCAannuel,
      margeCibleGlobale,
      tauxIS_bas = 15,
      tauxIS_haut = 25,
      seuilIS = 42500,
      croissanceCA_BP = 3,
      inflationCharges_BP = 2,
    } = hypothesesBP;

    // Personnel base from sectionB selector (Année 1)
    const personnelBase = sectionB.masseSalarialeAnnuelle;
    const autresBase = sectionB.fraisFixesAnnuels;

    const years = [1, 2, 3, 4, 5];
    const ca = years.map(
      (y) => objectifCAannuel * (1 + croissanceCA_BP / 100) ** (y - 1),
    );
    const matieres = ca.map(
      (c) => c * ((100 - (margeCibleGlobale ?? 70)) / 100),
    );
    const margeBrute = ca.map((c, i) => c - matieres[i]);

    // Personnel: compound inflation from BP rate
    const personnel = years.map(
      (y) => personnelBase * (1 + inflationCharges_BP / 100) ** (y - 1),
    );
    const autres = years.map(
      (y) => autresBase * (1 + inflationCharges_BP / 100) ** (y - 1),
    );

    // Impact Pacte Social: same value for all years (annual cotisations)
    const pacteSocial = years.map(() => impactPacteSocial);

    const ebe = margeBrute.map(
      (mb, i) => mb - personnel[i] - autres[i] - pacteSocial[i],
    );

    const amortissements = years.map((y) =>
      (immobilisations ?? []).reduce(
        (sum, immo) =>
          sum +
          calcDotationAnnuelle(
            immo.valeurAchatHT,
            immo.dureeAmortissementAns,
            immo.type,
            y,
          ),
        0,
      ),
    );

    const resultatExploitation = ebe.map((e, i) => e - amortissements[i]);

    const interets = years.map((y) =>
      (emprunts ?? []).reduce(
        (sum, emp) =>
          sum +
          calcAnnualInterest(
            emp.capitalInitial,
            emp.tauxAnnuel,
            emp.dureeMois,
            y,
          ),
        0,
      ),
    );

    const rai = resultatExploitation.map((re, i) => re - interets[i]);

    // IS conditionnel: 0 si SARL, calculé si SASU
    const is = rai.map((r) =>
      statutJuridique === "SARL"
        ? 0
        : calcIS(r, tauxIS_bas, tauxIS_haut, seuilIS),
    );
    const resultatNet = rai.map((r, i) => r - is[i]);

    const rows: PnLRow[] = [
      { label: "CA HT", values: ca },
      {
        label: "Matières premières (Food Cost)",
        values: matieres.map((v) => -v),
        indent: true,
      },
      { label: "MARGE BRUTE", values: margeBrute, isBold: true },
      {
        label: "Charges de personnel",
        values: personnel.map((v) => -v),
        indent: true,
      },
      {
        label: "Autres charges fixes",
        values: autres.map((v) => -v),
        indent: true,
      },
      {
        label: "Impact Pacte Social",
        values: pacteSocial.map((v) => -v),
        indent: true,
        isDeduction: pacteSocialActif,
      },
      { label: "EBE", values: ebe, isBold: true },
      {
        label: "Amortissements",
        values: amortissements.map((v) => -v),
        indent: true,
      },
      {
        label: "RÉSULTAT D'EXPLOITATION",
        values: resultatExploitation,
        isBold: true,
      },
      {
        label: "Intérêts financiers",
        values: interets.map((v) => -v),
        indent: true,
      },
      { label: "RÉSULTAT AVANT IMPÔT", values: rai, isBold: true },
      {
        label:
          statutJuridique === "SARL"
            ? "Impôt sur les Sociétés (IS) — N/A (SARL)"
            : "Impôt sur les Sociétés (IS)",
        values: is.map((v) => -v),
        indent: true,
      },
      {
        label: "RÉSULTAT NET",
        values: resultatNet,
        isBold: true,
        isHighlight: true,
      },
    ];

    return rows;
  }, [
    hypothesesBP,
    sectionB,
    immobilisations,
    emprunts,
    pacteSocialActif,
    impactPacteSocial,
    statutJuridique,
  ]);

  // ── RÉEL tab data (5-year dynamic projection) ─────────────────────────────────
  const reelData = useMemo(() => {
    const {
      tauxIS_bas = 15,
      tauxIS_haut = 25,
      seuilIS = 42500,
      tauxCroissanceCA = 3,
      tauxInflationCharges = 2,
    } = hypothesesBP;

    // Année 1 base values from centralised selectors
    const ca1 = sectionA.caAnnuel;
    const matieres1 = sectionA.coutMatiereAnnuel;
    const personnel1 = sectionB.masseSalarialeAnnuelle;
    const autres1 = sectionB.fraisFixesAnnuels;

    const amort = [1, 2, 3, 4, 5].map((y) =>
      (immobilisations ?? []).reduce(
        (sum, immo) =>
          sum +
          calcDotationAnnuelle(
            immo.valeurAchatHT,
            immo.dureeAmortissementAns,
            immo.type,
            y,
          ),
        0,
      ),
    );

    const int = [1, 2, 3, 4, 5].map((y) =>
      (emprunts ?? []).reduce(
        (sum, emp) =>
          sum +
          calcAnnualInterest(
            emp.capitalInitial,
            emp.tauxAnnuel,
            emp.dureeMois,
            y,
          ),
        0,
      ),
    );

    // Build 5-year projection
    const ca: number[] = [];
    const matieres: number[] = [];
    const margeBrute: number[] = [];
    const personnel: number[] = [];
    const autres: number[] = [];
    const pacteSocial: number[] = [];
    const ebe: number[] = [];
    const resultatExploitation: number[] = [];
    const rai: number[] = [];
    const is: number[] = [];
    const resultatNet: number[] = [];

    for (let i = 0; i < 5; i++) {
      const year = i + 1;
      const growthFactor = (1 + tauxCroissanceCA / 100) ** (year - 1);
      const chargeFactor = (1 + tauxInflationCharges / 100) ** (year - 1);

      const caY = ca1 * growthFactor;
      // Matières scale proportionally to CA
      const matieresY = ca1 > 0 ? matieres1 * growthFactor : caY * 0.3;
      const margeBruteY = caY - matieresY;

      const personnelY = personnel1 * chargeFactor;
      const autresY = autres1 * chargeFactor;

      // Impact Pacte Social: same value for all years
      const pacteSocialY = impactPacteSocial;

      const ebeY = margeBruteY - personnelY - autresY - pacteSocialY;
      const rexY = ebeY - amort[i];
      const raiY = rexY - int[i];

      // IS conditionnel
      const isY =
        statutJuridique === "SARL"
          ? 0
          : calcIS(raiY, tauxIS_bas, tauxIS_haut, seuilIS);

      const netY = raiY - isY;

      ca.push(caY);
      matieres.push(matieresY);
      margeBrute.push(margeBruteY);
      personnel.push(personnelY);
      autres.push(autresY);
      pacteSocial.push(pacteSocialY);
      ebe.push(ebeY);
      resultatExploitation.push(rexY);
      rai.push(raiY);
      is.push(isY);
      resultatNet.push(netY);
    }

    return {
      ca,
      matieres,
      margeBrute,
      personnel,
      autres,
      pacteSocial,
      ebe,
      amort,
      int,
      resultatExploitation,
      rai,
      is,
      resultatNet,
    };
  }, [
    hypothesesBP,
    sectionA,
    sectionB,
    immobilisations,
    emprunts,
    impactPacteSocial,
    statutJuridique,
  ]);

  const reelRows = useMemo((): PnLRow[] => {
    const {
      ca,
      matieres,
      margeBrute,
      personnel,
      autres,
      pacteSocial,
      ebe,
      amort,
      int: interets,
      resultatExploitation,
      rai,
      is,
      resultatNet,
    } = reelData;
    return [
      { label: "CA HT", values: ca },
      {
        label: "Matières premières (Food Cost)",
        values: matieres.map((v) => -v),
        indent: true,
      },
      { label: "MARGE BRUTE", values: margeBrute, isBold: true },
      {
        label: "Charges de personnel",
        values: personnel.map((v) => -v),
        indent: true,
      },
      {
        label: "Autres charges fixes",
        values: autres.map((v) => -v),
        indent: true,
      },
      {
        label: "Impact Pacte Social",
        values: pacteSocial.map((v) => -v),
        indent: true,
        isDeduction: pacteSocialActif,
      },
      { label: "EBE", values: ebe, isBold: true },
      {
        label: "Amortissements",
        values: amort.map((v) => -v),
        indent: true,
      },
      {
        label: "RÉSULTAT D'EXPLOITATION",
        values: resultatExploitation,
        isBold: true,
      },
      {
        label: "Intérêts financiers",
        values: interets.map((v) => -v),
        indent: true,
      },
      { label: "RÉSULTAT AVANT IMPÔT", values: rai, isBold: true },
      {
        label:
          statutJuridique === "SARL"
            ? "Impôt sur les Sociétés (IS) — N/A (SARL)"
            : "Impôt sur les Sociétés (IS)",
        values: is.map((v) => -v),
        indent: true,
      },
      {
        label: "RÉSULTAT NET",
        values: resultatNet,
        isBold: true,
        isHighlight: true,
      },
    ];
  }, [reelData, statutJuridique, pacteSocialActif]);

  // ── CAF tab data ──────────────────────────────────────────────────────────────
  const cafRows = useMemo((): PnLRow[] => {
    const { resultatNet, amort } = reelData;

    // CAF Brute = Résultat Net + Dotations aux Amortissements
    const cafBrute = resultatNet.map((rn, i) => rn + amort[i]);

    // Déduction rémunération associés calculée depuis la liste des associés
    const remunerationDeduction = [1, 2, 3, 4, 5].map(
      () => totalRemunerationAssociesAnnuelle,
    );

    // CAF Nette = CAF Brute - Rémunération des associés
    const cafNette = cafBrute.map((cb, i) => cb - remunerationDeduction[i]);

    // Remboursement du capital par année depuis les emprunts
    const remboursementCapital = [1, 2, 3, 4, 5].map((y) =>
      (emprunts ?? []).reduce(
        (sum, emp) =>
          sum +
          calcAnnualCapitalRepayment(
            emp.capitalInitial,
            emp.tauxAnnuel,
            emp.dureeMois,
            y,
          ),
        0,
      ),
    );

    // Flux Net de Trésorerie = CAF Nette - Remboursement du Capital
    const fluxNet = cafNette.map((cn, i) => cn - remboursementCapital[i]);

    return [
      {
        label: "Résultat Net",
        values: resultatNet,
        indent: true,
      },
      {
        label: "+ Dotations aux amortissements",
        values: amort,
        indent: true,
      },
      {
        label: "CAF BRUTE",
        values: cafBrute,
        isBold: true,
      },
      {
        label: "− Rémunération des associés",
        values: remunerationDeduction.map((v) => -v),
        indent: true,
        isDeduction: totalRemunerationAssociesAnnuelle > 0,
      },
      {
        label: "CAF NETTE",
        values: cafNette,
        isBold: true,
        isHighlight: true,
      },
      {
        label: "− Remboursement du Capital",
        values: remboursementCapital.map((v) => -v),
        indent: true,
      },
      {
        label: "FLUX NET DE TRÉSORERIE",
        values: fluxNet,
        isBold: true,
        isHighlight: true,
      },
    ];
  }, [reelData, emprunts, totalRemunerationAssociesAnnuelle]);

  // ── KPI helpers ───────────────────────────────────────────────────────────────
  // BP rows: 0=CA, 1=matieres, 2=MARGE, 3=personnel, 4=autres, 5=pacte, 6=EBE
  //          7=amort, 8=REX, 9=intérêts, 10=RAI, 11=IS, 12=NET
  const bpCA1 = (bpRows[0].values[0] ?? 0) as number;
  const bpNet1 = (bpRows[12].values[0] ?? 0) as number;
  const bpIS1 = Math.abs((bpRows[11].values[0] ?? 0) as number);

  const reelCA1 = (reelRows[0].values[0] ?? 0) as number;
  const reelNet1 = (reelRows[12].values[0] ?? 0) as number;
  const reelIS1 = Math.abs((reelRows[11].values[0] ?? 0) as number);

  // CAF KPI indexes: cafBrute=2, cafNette=4, fluxNet=6
  const cafBrute1 = (cafRows[2].values[0] ?? 0) as number;
  const cafNette1 = (cafRows[4].values[0] ?? 0) as number;
  const fluxVal1 = (cafRows[6].values[0] ?? 0) as number;

  return (
    <div className="space-y-6" data-ocid="comptabilite.page">
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Calculator className="h-5 w-5 text-primary" />
          <div>
            <h2 className="font-display text-xl font-semibold text-foreground">
              Compte de Résultat
            </h2>
            <p className="text-sm text-muted-foreground">
              Projection financière 5 ans — Prévisionnel, Réel &amp; CAF
            </p>
          </div>
        </div>

        {/* Pacte Social Toggle */}
        <div
          className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5 shadow-sm"
          data-ocid="comptabilite.pacte_social.card"
        >
          <Users className="h-4 w-4 text-primary shrink-0" />
          <div className="flex flex-col gap-0.5">
            <Label
              htmlFor="pacte-social-toggle"
              className="text-sm font-semibold text-foreground cursor-pointer"
            >
              Pacte Social
            </Label>
            {pacteSocialActif && (
              <Badge
                variant="secondary"
                className="w-fit text-[10px] bg-orange-100 text-orange-700 border-orange-200"
                data-ocid="comptabilite.pacte_social.badge"
              >
                Cotisations associés (
                {statutJuridique === "SASU" ? "80%" : "45%"})
              </Badge>
            )}
          </div>
          <Switch
            id="pacte-social-toggle"
            checked={pacteSocialActif}
            onCheckedChange={(checked) =>
              updateHypotheses({ pacteSocialActif: checked })
            }
            data-ocid="comptabilite.pacte_social.toggle"
          />
        </div>
      </div>

      {/* IS mode indicator */}
      {statutJuridique === "SARL" && (
        <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
          <Calculator className="h-4 w-4 shrink-0" />
          <span>
            Statut juridique SARL détecté — l'Impôt sur les Sociétés (IS) est
            désactivé et affiché à 0 € pour toutes les années.
          </span>
        </div>
      )}

      <Tabs defaultValue="bp" data-ocid="comptabilite.tabs">
        <TabsList className="mb-4">
          <TabsTrigger value="bp" data-ocid="comptabilite.bp.tab">
            Compte de Résultat BP
          </TabsTrigger>
          <TabsTrigger value="reel" data-ocid="comptabilite.reel.tab">
            Compte de Résultat RÉEL
          </TabsTrigger>
          <TabsTrigger value="caf" data-ocid="comptabilite.caf.tab">
            Capacité d'Autofinancement
          </TabsTrigger>
        </TabsList>

        {/* ── BP tab ─────────────────────────────────────────────────────────── */}
        <TabsContent value="bp" className="space-y-4">
          <KpiBar
            ca={bpCA1}
            net={bpNet1}
            is={bpIS1}
            label="Business Plan — Année 1"
          />
          <PnLTable rows={bpRows} />
        </TabsContent>

        {/* ── RÉEL tab ───────────────────────────────────────────────────────── */}
        <TabsContent value="reel" className="space-y-4">
          {reelCA1 === 0 && (
            <Card
              className="border-dashed border-border bg-muted/30"
              data-ocid="comptabilite.reel.empty_state"
            >
              <CardContent className="flex items-center gap-3 py-4">
                <TrendingUp className="h-5 w-5 text-muted-foreground/60 shrink-0" />
                <p className="text-sm text-muted-foreground">
                  Aucune recette avec volume simulé. Saisissez des volumes dans
                  le Laboratoire Recettes pour alimenter cette vue. Les Années 2
                  à 5 sont projetées dynamiquement depuis les Paramètres.
                </p>
              </CardContent>
            </Card>
          )}
          <KpiBar
            ca={reelCA1}
            net={reelNet1}
            is={reelIS1}
            label="Données simulateur — Année 1 (projection 5 ans)"
          />
          <PnLTable rows={reelRows} />
        </TabsContent>

        {/* ── CAF tab ────────────────────────────────────────────────────────── */}
        <TabsContent value="caf" className="space-y-4">
          <CafKpiBar caf={cafBrute1} cafNette={cafNette1} flux={fluxVal1} />
          <PnLTable rows={cafRows} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── KPI Bar ──────────────────────────────────────────────────────────────────

interface KpiBarProps {
  ca: number;
  net: number;
  is: number;
  label: string;
}

function KpiBar({ ca, net, is, label }: KpiBarProps) {
  return (
    <Card
      className="bg-card border-border"
      data-ocid="comptabilite.kpi_bar.card"
    >
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-4 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
            <Wallet className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">CA Total</p>
            <p className="text-base font-bold text-foreground">{fmt(ca)}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-lg ${net >= 0 ? "bg-green-500/10" : "bg-red-500/10"}`}
          >
            {net >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Résultat Net</p>
            <p
              className={`text-base font-bold ${net >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {fmt(net)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-500/10">
            <Calculator className="h-4 w-4 text-orange-500" />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">IS Année 1</p>
            <Badge variant="secondary" className="mt-0.5 text-xs font-semibold">
              {fmt(is)}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── CAF KPI Bar ──────────────────────────────────────────────────────────────

interface CafKpiBarProps {
  caf: number;
  cafNette: number;
  flux: number;
}

function CafKpiBar({ caf, cafNette, flux }: CafKpiBarProps) {
  return (
    <Card
      className="bg-card border-border"
      data-ocid="comptabilite.caf_kpi_bar.card"
    >
      <CardHeader className="pb-2 pt-4">
        <CardTitle className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Capacité d'Autofinancement — Année 1
        </CardTitle>
      </CardHeader>
      <CardContent className="grid grid-cols-3 gap-4 pb-4">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-lg ${caf >= 0 ? "bg-green-500/10" : "bg-red-500/10"}`}
          >
            <TrendingUp
              className={`h-4 w-4 ${caf >= 0 ? "text-green-600" : "text-red-600"}`}
            />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">CAF Brute</p>
            <p
              className={`text-base font-bold ${caf >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {fmt(caf)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-lg ${cafNette >= 0 ? "bg-green-500/10" : "bg-red-500/10"}`}
          >
            <Users
              className={`h-4 w-4 ${cafNette >= 0 ? "text-green-600" : "text-red-600"}`}
            />
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">CAF Nette</p>
            <p
              className={`text-base font-bold ${cafNette >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {fmt(cafNette)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div
            className={`flex h-9 w-9 items-center justify-center rounded-lg ${flux >= 0 ? "bg-green-500/10" : "bg-red-500/10"}`}
          >
            {flux >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">
              Flux Net de Trésorerie
            </p>
            <p
              className={`text-base font-bold ${flux >= 0 ? "text-green-600" : "text-red-600"}`}
            >
              {fmt(flux)}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── P&L Table ────────────────────────────────────────────────────────────────

interface PnLTableProps {
  rows: PnLRow[];
}

function PnLTable({ rows }: PnLTableProps) {
  return (
    <Card
      className="border-border bg-card overflow-hidden"
      data-ocid="comptabilite.pnl_table.card"
    >
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-[280px] font-semibold text-foreground">
                Poste
              </TableHead>
              {[1, 2, 3, 4, 5].map((y) => (
                <TableHead
                  key={y}
                  className="text-right font-semibold text-foreground min-w-[110px]"
                >
                  Année {y}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <PnLRowComponent key={row.label} row={row} />
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

function PnLRowComponent({ row }: { row: PnLRow }) {
  const { label, values, isBold, isHighlight, indent, isDeduction } = row;

  const rowClass = isHighlight
    ? "bg-primary/10"
    : isDeduction
      ? "bg-red-50/50 dark:bg-red-950/20"
      : isBold
        ? "bg-muted/60"
        : "";

  return (
    <TableRow className={rowClass} data-ocid="comptabilite.pnl.row">
      <TableCell
        className={`${isBold ? "font-bold text-foreground" : isDeduction ? "text-red-600/80" : "text-muted-foreground"} ${indent ? "pl-8" : ""}`}
      >
        {label}
      </TableCell>
      {values.map((v, yi) => {
        const cellKey = `cell-${yi}`;
        if (v === null) {
          return (
            <TableCell
              key={cellKey}
              className="text-right text-muted-foreground/50"
            >
              —
            </TableCell>
          );
        }
        const cellClass = isDeduction
          ? "text-right text-red-600/80"
          : `text-right font-${isBold ? "bold" : "normal"} ${isHighlight || isBold ? valueClass(v) : ""}`;
        return (
          <TableCell key={cellKey} className={cellClass}>
            {fmtVal(v)}
          </TableCell>
        );
      })}
    </TableRow>
  );
}
