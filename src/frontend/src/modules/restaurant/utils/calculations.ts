/**
 * calculations.ts — Utilitaires mathématiques du module Restauration.
 * RÈGLE D'OR : Aucun code React (ni hook, ni JSX, ni import React) dans ce fichier.
 * Uniquement des fonctions TypeScript pures.
 */

import type {
  IngredientFB,
  RecetteFB,
} from "@/modules/restaurant/types/models";

/**
 * Calcule la marge brute absolue par unité vendue.
 * Marge = Prix de vente HT − Coût matière HT
 *
 * @param prixVente  - Prix de vente unitaire HT (€)
 * @param coutMatiere - Coût matière unitaire HT (€)
 * @returns Marge brute par unité (€)
 */
export function calculerMargeRecette(
  prixVente: number,
  coutMatiere: number,
): number {
  return prixVente - coutMatiere;
}

/**
 * Calcule le Chiffre d'Affaires réel à partir des volumes et des prix.
 * CA = Σ (volume[i] × prix[i])
 *
 * @param volumes - Tableau des volumes vendus par article
 * @param prix    - Tableau des prix de vente HT correspondants
 * @returns CA total HT (€)
 */
export function calculerCAReel(volumes: number[], prix: number[]): number {
  return volumes.reduce((sum, vol, i) => sum + vol * (prix[i] ?? 0), 0);
}

/**
 * Calcule le Food Cost global réel en pourcentage.
 * Food Cost % = (Coût matière total / CA total) × 100
 *
 * @param totalCoutMatiere - Somme des coûts matière (€)
 * @param totalCA          - Chiffre d'Affaires total HT (€)
 * @returns Food cost en % (0 si totalCA = 0)
 */
export function calculerFoodCostReel(
  totalCoutMatiere: number,
  totalCA: number,
): number {
  if (totalCA === 0) return 0;
  return (totalCoutMatiere / totalCA) * 100;
}

/**
 * Calcule le coût réel d'un ingrédient en tenant compte des pertes matière.
 * Coût = (Prix Achat HT / (1 − Perte%/100)) × Quantité nette
 *
 * @param ingredient   - L'ingrédient F&B avec son prix et son taux de perte
 * @param quantiteNette - Quantité nette utilisée (en unité de référence)
 * @returns Coût réel de l'ingrédient après prise en compte des pertes (€)
 */
export function calculerCoutIngredient(
  ingredient: IngredientFB,
  quantiteNette: number,
): number {
  const facteurPerte = 1 - ingredient.perteMatierePct / 100;
  if (facteurPerte <= 0) return 0;
  return (ingredient.prixAchatHT / facteurPerte) * quantiteNette;
}

/**
 * Calcule le Food Cost complet d'une fiche technique.
 * Somme le coût de chaque ingrédient et exprime en % du prix de vente.
 *
 * @param recette           - La fiche technique à analyser
 * @param listeIngredients  - Catalogue global des ingrédients F&B
 * @returns { coutMatiereTotalHT, foodCostPct }
 */
export function calculerFoodCostRecette(
  recette: RecetteFB,
  listeIngredients: IngredientFB[],
): { coutMatiereTotalHT: number; foodCostPct: number } {
  const coutMatiereTotalHT = recette.ingredients.reduce((sum, ligne) => {
    const ingredient = listeIngredients.find(
      (i) => i.id === ligne.ingredientId,
    );
    if (!ingredient) return sum;
    return sum + calculerCoutIngredient(ingredient, ligne.quantiteNette);
  }, 0);

  const foodCostPct =
    recette.prixVenteHT > 0
      ? (coutMatiereTotalHT / recette.prixVenteHT) * 100
      : 0;

  return { coutMatiereTotalHT, foodCostPct };
}

// ─────────────────────────────────────────────────────────────────────────────
// Moteur Bottom-Up (Sprint 8)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcule le Mix Réel (%) d'une catégorie par rapport au volume total.
 * Mix Réel = (Volume de la catégorie / Volume total) × 100
 *
 * @param recettes    - Liste des fiches techniques
 * @param volumes     - Map { recetteId → volume hebdo estimé }
 * @param categorieId - Identifiant de la catégorie à analyser
 * @returns Pourcentage entre 0 et 100 (0 si volume total = 0)
 */
export function calculerMixReelCategorie(
  recettes: RecetteFB[],
  volumes: Record<string, number>,
  categorieId: string,
): number {
  const volumeTotal = Object.values(volumes).reduce(
    (sum, v) => sum + (v ?? 0),
    0,
  );
  if (volumeTotal === 0) return 0;

  const volumeCategorie = recettes
    .filter((r) => r.categorieId === categorieId)
    .reduce((sum, r) => sum + (volumes[r.id] ?? 0), 0);

  return (volumeCategorie / volumeTotal) * 100;
}

/**
 * Calcule le Mix Réel (%) d'une catégorie à partir d'un volume total pré-calculé.
 * Accepte le volumeTotalGlobal déjà calculé pour garantir que Section A et
 * Section C utilisent strictement la même source de vérité.
 *
 * Formule : (Σ volumeHebdo des recettes de la catégorie / volumeTotalGlobal) × 100
 *
 * @param recettes           - Liste complète des fiches techniques (depuis le store)
 * @param volumeTotalGlobal  - Somme totale des volumeHebdo de TOUTES les recettes
 * @param categorieId        - Identifiant de la catégorie à analyser
 * @returns Pourcentage entre 0 et 100 (0 si volumeTotalGlobal = 0)
 */
export function getMixReel(
  recettes: RecetteFB[],
  volumeTotalGlobal: number,
  categorieId: string,
): number {
  if (volumeTotalGlobal === 0) return 0;
  const volumeCategorie = recettes
    .filter((r) => r.categorieId === categorieId)
    .reduce((sum, r) => sum + (r.volumeHebdo ?? 0), 0);
  return (volumeCategorie / volumeTotalGlobal) * 100;
}

/**
 * Calcule le Chiffre d'Affaires réel annuel (approche Bottom-Up).
 * CA Annuel = (Σ volume[r] × prixVenteHT[r]) × semainesOuverture
 *
 * @param recettes          - Liste des fiches techniques
 * @param volumes           - Map { recetteId → volume hebdo estimé }
 * @param semainesOuverture - Nombre de semaines d'ouverture par an
 * @returns CA annuel HT (€)
 */
export function calculerCAReelAnnuel(
  recettes: RecetteFB[],
  volumes: Record<string, number>,
  semainesOuverture: number,
): number {
  const weeklyCA = recettes.reduce(
    (sum, r) => sum + (volumes[r.id] ?? 0) * (r.prixVenteHT ?? 0),
    0,
  );
  return weeklyCA * (semainesOuverture ?? 0);
}

/**
 * Calcule le Coût Matière réel annuel (approche Bottom-Up).
 * Pour chaque recette : coût semaine = volume × coût matière unitaire
 * Coût Annuel = Σ coutSemaine × semainesOuverture
 *
 * @param recettes          - Liste des fiches techniques
 * @param volumes           - Map { recetteId → volume hebdo estimé }
 * @param ingredients       - Catalogue global des ingrédients
 * @param semainesOuverture - Nombre de semaines d'ouverture par an
 * @returns Coût matière annuel HT (€)
 */
export function calculerCoutMatiereReelAnnuel(
  recettes: RecetteFB[],
  volumes: Record<string, number>,
  ingredients: IngredientFB[],
  semainesOuverture: number,
): number {
  const weeklyCout = recettes.reduce((sum, r) => {
    const { coutMatiereTotalHT } = calculerFoodCostRecette(r, ingredients);
    return sum + (volumes[r.id] ?? 0) * coutMatiereTotalHT;
  }, 0);
  return weeklyCout * (semainesOuverture ?? 0);
}

/**
 * Calcule le Food Cost réel en pourcentage.
 * Food Cost % = (Coût Matière Annuel / CA Annuel) × 100
 *
 * @param coutMatiereAnnuel - Coût matière annuel HT (€)
 * @param caAnnuel          - CA annuel HT (€)
 * @returns Food Cost en % (0 si caAnnuel = 0)
 */
export function calculerFoodCostReelPct(
  coutMatiereAnnuel: number,
  caAnnuel: number,
): number {
  if (caAnnuel === 0) return 0;
  return (coutMatiereAnnuel / caAnnuel) * 100;
}

/**
 * Calcule la Marge Brute réelle en pourcentage.
 * Marge % = ((CA - Coût Matière) / CA) × 100
 *
 * @param coutMatiereAnnuel - Coût matière annuel HT (€)
 * @param caAnnuel          - CA annuel HT (€)
 * @returns Marge brute en % (0 si caAnnuel = 0)
 */
export function calculerMargeReellePct(
  coutMatiereAnnuel: number,
  caAnnuel: number,
): number {
  if (caAnnuel === 0) return 0;
  return ((caAnnuel - coutMatiereAnnuel) / caAnnuel) * 100;
}

// ─────────────────────────────────────────────────────────────────────────────
// Comparatif Stratégique vs Réel (Sprint 8.3)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calcule le Chiffre d'Affaires cible annuel (approche Top-Down).
 * CA Cible = Couverts/jour × Jours d'ouverture/an × Ticket moyen cible
 *
 * @param couvertsParJour   - Nombre de couverts quotidiens cibles
 * @param joursOuvertureAn  - Nombre de jours d'ouverture par an
 * @param ticketMoyenCible  - Ticket moyen cible HT (€) — défaut 25 €
 * @returns CA cible annuel HT (€)
 */
export function calculerCACibleAnnuel(
  couvertsParJour: number,
  joursOuvertureAn: number,
  ticketMoyenCible = 25,
): number {
  return couvertsParJour * joursOuvertureAn * ticketMoyenCible;
}

/**
 * Calcule la Marge Brute cible annuelle.
 * Marge Cible = CA Cible × (1 − Food Cost Cible % / 100)
 *
 * @param caCible          - CA cible annuel HT (€)
 * @param foodCostCiblePct - Food Cost cible en % (ex: 30 pour 30 %)
 * @returns Marge brute cible annuelle (€)
 */
export function calculerMargeBruteCibleAnnuelle(
  caCible: number,
  foodCostCiblePct: number,
): number {
  return caCible * (1 - foodCostCiblePct / 100);
}

/**
 * Calcule la Marge Brute réelle annuelle.
 * Marge Réelle = CA Réel − Coût Matière Réel
 *
 * @param caReel          - CA réel annuel HT (€)
 * @param coutMatiereReel - Coût matière réel annuel HT (€)
 * @returns Marge brute réelle annuelle (€)
 */
export function calculerMargeBruteReelleAnnuelle(
  caReel: number,
  coutMatiereReel: number,
): number {
  return caReel - coutMatiereReel;
}

/**
 * Calcule le Point Mort journalier (CA journalier nécessaire pour couvrir
 * les charges fixes et la masse salariale).
 *
 * Point Mort/j = (Frais Fixes Annuels + Masse Salariale Annuelle)
 *                / Jours d'ouverture / (Taux Marge Contribution / 100)
 *
 * @param fraisFixesAnnuels        - Total frais fixes annuels (€)
 * @param masseSalarialeAnnuelle   - Total masse salariale annuelle (€)
 * @param joursOuvertureAn         - Jours d'ouverture par an
 * @param tauxMargeContribution    - Taux de marge sur coût variable (%) ex: 70
 * @returns Point mort journalier (€) — 0 si taux marge contribution = 0
 */
export function calculerPointMortJournalier(
  fraisFixesAnnuels: number,
  masseSalarialeAnnuelle: number,
  joursOuvertureAn: number,
  tauxMargeContribution: number,
): number {
  if (tauxMargeContribution === 0 || joursOuvertureAn === 0) return 0;
  return (
    (fraisFixesAnnuels + masseSalarialeAnnuelle) /
    joursOuvertureAn /
    (tauxMargeContribution / 100)
  );
}

/**
 * Calcule l'écart (delta) entre une valeur cible et une valeur réelle.
 * Delta Valeur = Réel − Cible
 * Delta % = ((Réel − Cible) / Cible) × 100
 *
 * @param cible - Valeur cible de référence
 * @param reel  - Valeur réelle observée
 * @returns { deltaValeur, deltaPct } — deltaPct = 0 si cible = 0
 */
export function calculerDelta(
  cible: number,
  reel: number,
): { deltaValeur: number; deltaPct: number } {
  const deltaValeur = reel - cible;
  const deltaPct = cible !== 0 ? ((reel - cible) / cible) * 100 : 0;
  return { deltaValeur, deltaPct };
}
