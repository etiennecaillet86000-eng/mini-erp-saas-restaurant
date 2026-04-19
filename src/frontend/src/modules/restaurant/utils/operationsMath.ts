/**
 * operationsMath.ts — Pure TypeScript functions for daily operations calculations.
 * NO React code, NO side effects — only deterministic pure functions.
 */

/**
 * Calcule le Point Mort journalier (coût fixe de la journée).
 * = (Frais Fixes Annuels + Salaires Annuels) / Jours d'ouverture par an
 */
export function calculerPointMortJour(
  fraisFixesAnnuels: number,
  salairesAnnuels: number,
  joursOuvertureAn: number,
): number {
  if (joursOuvertureAn <= 0) return 0;
  return (fraisFixesAnnuels + salairesAnnuels) / joursOuvertureAn;
}

/**
 * Calcule le Résultat Net de la journée.
 * = CA HT - (CA HT × Food Cost %) - Pertes HT - Point Mort
 */
export function calculerResultatJour(
  caJour: number,
  foodCostPct: number,
  pertesJour: number,
  pointMortJour: number,
): number {
  const coutMatiere = caJour * (foodCostPct / 100);
  return caJour - coutMatiere - pertesJour - pointMortJour;
}
