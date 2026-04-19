import type { FraisFixe, Salarie } from "@/core/types/models";
import type {
  IngredientFB,
  RecetteFB,
} from "@/modules/restaurant/types/models";
import { create } from "zustand";
import { persist } from "zustand/middleware";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface HypothesesBP {
  couvertsParJour: number;
  semainesOuverture: number;
  tauxCroissanceAnnuel: number;
  tauxInflationAnnuel: number;
  joursOuvertureAn: number;
}

interface AppStore {
  // ── State ──────────────────────────────────────────────────────────────────
  salaries: Salarie[];
  fraisFixes: FraisFixe[];
  hypothesesBP: HypothesesBP;
  ingredients: IngredientFB[];
  recettes: RecetteFB[];

  // ── Actions ────────────────────────────────────────────────────────────────
  setSalaries: (salaries: Salarie[]) => void;
  setFraisFixes: (fraisFixes: FraisFixe[]) => void;
  setHypothesesBP: (hypotheses: Partial<HypothesesBP>) => void;

  // Ingrédients F&B
  addIngredient: (ing: IngredientFB) => void;
  updateIngredient: (id: string, updates: Partial<IngredientFB>) => void;
  deleteIngredient: (id: string) => void;

  // Fiches Techniques (Recettes)
  addRecette: (r: RecetteFB) => void;
  updateRecette: (id: string, updates: Partial<RecetteFB>) => void;
  deleteRecette: (id: string) => void;
}

// ─── Default data (mirrors Sprint 2 mock values) ─────────────────────────────

const DEFAULT_SALARIES: Salarie[] = [
  {
    id: "1",
    prenom: "Marie",
    nom: "Dupont",
    poste: "Cuisinière",
    typeContrat: "CDI",
    heuresHebdo: 39,
    salaireNet: 1800,
    chargesPatronales: 720,
    coutTotalEmployeur: 2520,
  },
  {
    id: "2",
    prenom: "Jean",
    nom: "Martin",
    poste: "Serveur",
    typeContrat: "CDD",
    heuresHebdo: 35,
    salaireNet: 1450,
    chargesPatronales: 580,
    coutTotalEmployeur: 2030,
  },
  {
    id: "3",
    prenom: "Léa",
    nom: "Petit",
    poste: "Aide-cuisine",
    typeContrat: "Apprenti",
    heuresHebdo: 35,
    salaireNet: 760,
    chargesPatronales: 0,
    coutTotalEmployeur: 760,
  },
];

const DEFAULT_FRAIS_FIXES: FraisFixe[] = [
  {
    id: "1",
    libelle: "Loyer du local commercial",
    montant: 2800,
    categorie: "Loyer",
    frequence: "Mensuel",
  },
  {
    id: "2",
    libelle: "Assurance multirisque pro",
    montant: 1200,
    categorie: "Assurance",
    frequence: "Annuel",
  },
  {
    id: "3",
    libelle: "Logiciel de caisse (Abonnement)",
    montant: 89,
    categorie: "Abonnement SaaS",
    frequence: "Mensuel",
  },
  {
    id: "4",
    libelle: "EDF — électricité",
    montant: 420,
    categorie: "Énergie",
    frequence: "Mensuel",
  },
];

const DEFAULT_HYPOTHESES_BP: HypothesesBP = {
  couvertsParJour: 50,
  semainesOuverture: 48,
  tauxCroissanceAnnuel: 5,
  tauxInflationAnnuel: 2,
  joursOuvertureAn: 300,
};

// ─── Selectors (pure helpers — use outside the store) ────────────────────────

/** Somme annuelle des coûts employeur (mensuel × 12) */
export function selectTotalMasseSalarialeAnnuelle(salaries: Salarie[]): number {
  return salaries.reduce((sum, s) => sum + s.coutTotalEmployeur * 12, 0);
}

/** Somme annuelle des frais fixes (Mensuel × 12 ou Annuel × 1) */
export function selectTotalFraisFixesAnnuels(fraisFixes: FraisFixe[]): number {
  return fraisFixes.reduce(
    (sum, f) => sum + (f.frequence === "Mensuel" ? f.montant * 12 : f.montant),
    0,
  );
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      salaries: DEFAULT_SALARIES,
      fraisFixes: DEFAULT_FRAIS_FIXES,
      hypothesesBP: DEFAULT_HYPOTHESES_BP,
      ingredients: [],
      recettes: [],

      setSalaries: (salaries) => set({ salaries }),
      setFraisFixes: (fraisFixes) => set({ fraisFixes }),
      setHypothesesBP: (hypotheses) =>
        set((state) => ({
          hypothesesBP: { ...state.hypothesesBP, ...hypotheses },
        })),

      addIngredient: (ing) =>
        set((state) => ({ ingredients: [...state.ingredients, ing] })),
      updateIngredient: (id, updates) =>
        set((state) => ({
          ingredients: state.ingredients.map((i) =>
            i.id === id ? { ...i, ...updates } : i,
          ),
        })),
      deleteIngredient: (id) =>
        set((state) => ({
          ingredients: state.ingredients.filter((i) => i.id !== id),
        })),

      addRecette: (r) => set((state) => ({ recettes: [...state.recettes, r] })),
      updateRecette: (id, updates) =>
        set((state) => ({
          recettes: state.recettes.map((r) =>
            r.id === id ? { ...r, ...updates } : r,
          ),
        })),
      deleteRecette: (id) =>
        set((state) => ({
          recettes: state.recettes.filter((r) => r.id !== id),
        })),
    }),
    { name: "mini-erp-store" },
  ),
);
