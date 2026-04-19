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
export interface IngredientFB {
  id: string;
  nom: string;
  unite: "Kg" | "Litre" | "Pièce";
  prixAchatHT: number; // prix d'achat hors taxe pour 1 unité de référence
  perteMatierePct: number; // % de perte ex: 10 pour 10 %
}

// ─── RecetteIngredient — ligne d'une fiche technique ─────────────────────────
export interface RecetteIngredient {
  ingredientId: string;
  quantiteNette: number; // quantité nette utilisée (en unité de référence)
}

// ─── RecetteFB — Fiche Technique ─────────────────────────────────────────────
export interface RecetteFB {
  id: string;
  nom: string;
  categorie: string;
  prixVenteHT: number;
  ingredients: RecetteIngredient[];
  tva: number; // % ex: 10 pour 10 %
}
