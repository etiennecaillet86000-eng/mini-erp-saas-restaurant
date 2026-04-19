/**
 * finance.ts — Moteur de calcul financier pour le Business Plan 5 ans.
 * RÈGLE D'OR : Aucun code React (ni hook, ni JSX, ni import React) dans ce fichier.
 * Uniquement des fonctions TypeScript pures.
 */

export interface CategorieMarge {
  mix: number; // pourcentage du mix (ex: 25 pour 25%)
  ticketMoyen: number; // ticket moyen HT en euros
  foodCost: number; // taux de food cost en % (ex: 15 pour 15%)
}

/**
 * Calcule le Chiffre d'Affaires annuel HT.
 * CA = traficHebdo × semainesOuverture × ticket moyen pondéré
 *
 * @param traficHebdo - Nombre de clients par semaine
 * @param semainesOuverture - Nombre de semaines d'ouverture par an
 * @param categories - Tableau des catégories avec mix et ticketMoyen
 */
export function calculerCA(
  traficHebdo: number,
  semainesOuverture: number,
  categories: Array<{ mix: number; ticketMoyen: number }>,
): number {
  const ticketMoyenPondere = categories.reduce(
    (sum, cat) => sum + (cat.mix / 100) * cat.ticketMoyen,
    0,
  );
  return traficHebdo * semainesOuverture * ticketMoyenPondere;
}

/**
 * Calcule la Marge Brute et le Coût Matière.
 * Coût matière = CA × taux de food cost pondéré
 * Marge brute = CA - Coût matière
 *
 * @param ca - Chiffre d'Affaires HT
 * @param categories - Tableau des catégories avec mix et foodCost
 */
export function calculerMargeBrute(
  ca: number,
  categories: Array<{ mix: number; foodCost: number }>,
): { margeBrute: number; coutMatiere: number } {
  const tauxFoodCostPondere = categories.reduce(
    (sum, cat) => sum + (cat.mix / 100) * (cat.foodCost / 100),
    0,
  );
  const coutMatiere = ca * tauxFoodCostPondere;
  const margeBrute = ca - coutMatiere;
  return { margeBrute, coutMatiere };
}

/**
 * Projette une valeur sur 5 années avec un taux de croissance annuel composé.
 * Retourne un tableau de 5 valeurs (année N = valeurInitiale × (1 + taux)^N).
 *
 * @param valeurInitiale - Valeur de l'année 0 (base de calcul)
 * @param tauxCroissance - Taux en décimal (ex: 0.05 pour 5%)
 */
export function projeterSur5Ans(
  valeurInitiale: number,
  tauxCroissance: number,
): number[] {
  return Array.from(
    { length: 5 },
    (_, i) => valeurInitiale * (1 + tauxCroissance) ** (i + 1),
  );
}

/**
 * Calcule l'EBE (Excédent Brut d'Exploitation).
 * EBE = Marge Brute − Charges Fixes − Masse Salariale
 *
 * @param margeBrute - Marge brute en euros
 * @param totalFrais - Total des charges fixes annuelles en euros
 * @param totalSalaires - Masse salariale annuelle en euros
 */
export function calculerEBE(
  margeBrute: number,
  totalFrais: number,
  totalSalaires: number,
): number {
  return margeBrute - totalFrais - totalSalaires;
}
