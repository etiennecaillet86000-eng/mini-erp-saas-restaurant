// ─── IngredientFB — F&B ingrédient d'achat ───────────────────────────────────

export type FamilleIngredient =
  | "Viandes & Volailles"
  | "Marée"
  | "B.O.F"
  | "Fruits & Légumes"
  | "Épicerie Sèche"
  | "Surgelés"
  | "Liquides"
  | "Consommables";

export interface IngredientFB {
  id: string;
  nom: string;
  unite: "Kg" | "Litre" | "Pièce";
  prixAchatHT: number; // prix d'achat hors taxe pour 1 unité de référence
  perteMatierePct: number; // % de perte ex: 10 pour 10 %
  famille?: FamilleIngredient; // optional — legacy data may not have this field
}

// ─── RecetteIngredient — ligne d'une fiche technique ─────────────────────────
export interface RecetteIngredient {
  ingredientId: string;
  quantiteNette: number; // quantité nette utilisée (en unité de référence)
}

// ─── CategorieRecette — union legacy (conservée pour rétrocompatibilité) ─────
export type CategorieRecette =
  | "Boissons"
  | "Snacking"
  | "Plats chauds"
  | "Desserts"
  | "Accompagnements"
  | "Formules";

// ─── CategorieCarte — catégorie dynamique du Business Plan ───────────────────
export interface CategorieCarte {
  id: string;
  nom: string;
  mixCiblePct: number;
}

// ─── RecetteFB — Fiche Technique ─────────────────────────────────────────────
export interface RecetteFB {
  id: string;
  nom: string;
  categorie?: CategorieRecette; // legacy — kept for backward compatibility
  categorieId: string; // dynamic category reference
  prixVenteHT: number;
  volumeHebdo: number; // volume de vente hebdomadaire (couverts/semaine)
  ingredients: RecetteIngredient[];
  tva: number; // % ex: 10 pour 10 %
}
