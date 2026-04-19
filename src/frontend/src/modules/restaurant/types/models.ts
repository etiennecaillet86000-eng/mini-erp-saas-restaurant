// ─── Ingredient (generic) ────────────────────────────────────────────────────
export interface Ingredient {
  id: string;
  name: string;
  unitCost: number;
  unit: string; // e.g. "kg", "L", "unit"
  supplier?: string;
}

// ─── RecipeIngredient (generic) ──────────────────────────────────────────────
export interface RecipeIngredient {
  ingredientId: string;
  quantity: number;
  unit: string;
}

// ─── Recipe (generic) ────────────────────────────────────────────────────────
export interface Recipe {
  id: string;
  name: string;
  ingredients: RecipeIngredient[];
  preparationTime?: number; // minutes
  notes?: string;
}

// ─── MenuItem ────────────────────────────────────────────────────────────────
export interface MenuItem {
  id: string;
  name: string;
  recipeId?: string;
  price: number;
  category: string;
  isAvailable: boolean;
}

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

// ─── CategorieRecette — Mix Produit du Business Plan ─────────────────────────
export type CategorieRecette =
  | "Boissons"
  | "Snacking"
  | "Plats chauds"
  | "Desserts"
  | "Accompagnements"
  | "Formules";

// ─── CategorieCarte — Catégorie dynamique du simulateur ──────────────────────
/** Catégorie de la carte, configurable dynamiquement dans le store.
 *  mixCiblePct : part cible (%) dans le mix produit. La somme doit faire 100. */
export interface CategorieCarte {
  id: string;
  nom: string;
  mixCiblePct: number;
}

// ─── RecetteFB — Fiche Technique ─────────────────────────────────────────────
export interface RecetteFB {
  id: string;
  nom: string;
  /** @deprecated — utiliser categorieId à la place (maintenu pour compat descendante) */
  categorie: CategorieRecette;
  /** Référence vers l'id d'une CategorieCarte dynamique (optionnel pour compat) */
  categorieId?: string;
  prixVenteHT: number;
  ingredients: RecetteIngredient[];
  tva: number; // % ex: 10 pour 10 %
}
