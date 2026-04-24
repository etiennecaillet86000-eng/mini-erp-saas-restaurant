import type { FraisFixe, Salarie } from "@/core/types/models";
import type {
  CategorieCarte,
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
  objectifCAannuel: number;
  joursOuvertureParSemaine: number;
  ticketMoyenCible: number;
  margeCibleGlobale: number; // marge brute globale cible (%)
  tauxChargesSalariales: number; // taux charges salariales (%) — défaut 22
  tauxChargesPatronales: number; // taux charges patronales (%) — défaut 42
  statutJuridique: "SASU" | "SARL"; // statut juridique de la société — défaut SASU
  tauxIS_bas: number; // taux IS réduit (%) — défaut 15
  tauxIS_haut: number; // taux IS normal (%) — défaut 25
  seuilIS: number; // seuil d'application IS (€) — défaut 42500
  tauxCroissanceCA: number; // croissance annuelle du CA RÉEL (%) — défaut 3
  tauxInflationCharges: number; // augmentation annuelle des charges RÉEL (%) — défaut 2
  croissanceCA_BP: number; // croissance annuelle du CA BP (%) — défaut 3
  inflationCharges_BP: number; // augmentation annuelle des charges BP (%) — défaut 2
  pacteSocialActif: boolean; // Pacte Social — majore les charges personnel de 5% — défaut false
  remunerationAssociesAnnuelle: number; // rémunération annuelle totale des associés (€) — défaut 0
}

export interface VenteJournaliere {
  id: string;
  date: string; // ISO date string
  montant: number; // CA HT
}

export interface Associe {
  id: string;
  nom: string;
  remunerationMensuelle: number;
  apportInitial: number; // CCA
  montantRembourse: number; // CCA
}

export interface Emprunt {
  id: string;
  nom: string;
  capitalInitial: number;
  tauxAnnuel: number; // en %, ex: 3.5 pour 3.5%
  dureeMois: number;
  dateDebut: string; // ISO date string
}

export interface Immobilisation {
  id: string;
  nom: string;
  valeurAchatHT: number;
  dureeAmortissementAns: number;
  type: "linéaire" | "dérogatoire";
  dateAchat: string; // ISO date string
}

interface AppStore {
  // ── State ──────────────────────────────────────────────────────────────────
  salaries: Salarie[];
  fraisFixes: FraisFixe[];
  hypothesesBP: HypothesesBP;
  ingredients: IngredientFB[];
  recettes: RecetteFB[];
  categoriesCarte: CategorieCarte[];
  associes: Associe[];
  emprunts: Emprunt[];
  immobilisations: Immobilisation[];
  ventesJournalieres: VenteJournaliere[];

  // ── Actions ────────────────────────────────────────────────────────────────
  setSalaries: (salaries: Salarie[]) => void;
  setFraisFixes: (fraisFixes: FraisFixe[]) => void;
  setHypothesesBP: (hypotheses: Partial<HypothesesBP>) => void;
  updateHypotheses: (updates: Partial<HypothesesBP>) => void;

  // Ingrédients F&B
  addIngredient: (ing: IngredientFB) => void;
  updateIngredient: (id: string, updates: Partial<IngredientFB>) => void;
  deleteIngredient: (id: string) => void;

  // Fiches Techniques (Recettes)
  addRecette: (r: RecetteFB) => void;
  updateRecette: (id: string, updates: Partial<RecetteFB>) => void;
  deleteRecette: (id: string) => void;

  // Catégories Carte
  updateCategorie: (id: string, updates: Partial<CategorieCarte>) => void;
  addCategorie: (categorie: CategorieCarte) => void;
  deleteCategorie: (id: string) => void;

  // Bulk actions
  resetVolumes: () => void;

  // Associés
  addAssocie: (associe: Omit<Associe, "id">) => void;
  updateAssocie: (id: string, updates: Partial<Omit<Associe, "id">>) => void;
  removeAssocie: (id: string) => void;

  // Emprunts
  addEmprunt: (emprunt: Emprunt) => void;
  updateEmprunt: (id: string, updates: Partial<Emprunt>) => void;
  removeEmprunt: (id: string) => void;

  // Immobilisations
  addImmobilisation: (immobilisation: Immobilisation) => void;
  updateImmobilisation: (id: string, updates: Partial<Immobilisation>) => void;
  removeImmobilisation: (id: string) => void;

  // Ventes Journalières
  addVenteJournaliere: (vente: VenteJournaliere) => void;
  removeVenteJournaliere: (id: string) => void;
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
  objectifCAannuel: 500000,
  joursOuvertureParSemaine: 5,
  ticketMoyenCible: 20,
  margeCibleGlobale: 70,
  tauxChargesSalariales: 22,
  tauxChargesPatronales: 42,
  statutJuridique: "SASU",
  tauxIS_bas: 15,
  tauxIS_haut: 25,
  seuilIS: 42500,
  tauxCroissanceCA: 3,
  tauxInflationCharges: 2,
  croissanceCA_BP: 3,
  inflationCharges_BP: 2,
  pacteSocialActif: false,
  remunerationAssociesAnnuelle: 0,
};

const DEFAULT_CATEGORIES_CARTE: CategorieCarte[] = [
  {
    id: "cat_boissons",
    nom: "Boissons",
    mixCiblePct: 15,
    ticketMoyen: 3.5,
    foodCostCible: 15,
  },
  {
    id: "cat_snacking",
    nom: "Snacking",
    mixCiblePct: 15,
    ticketMoyen: 5.5,
    foodCostCible: 35,
  },
  {
    id: "cat_plats",
    nom: "Plats chauds",
    mixCiblePct: 30,
    ticketMoyen: 12.0,
    foodCostCible: 32,
  },
  {
    id: "cat_desserts",
    nom: "Desserts",
    mixCiblePct: 20,
    ticketMoyen: 4.5,
    foodCostCible: 28,
  },
  {
    id: "cat_acc",
    nom: "Accompagnements",
    mixCiblePct: 10,
    ticketMoyen: 3.0,
    foodCostCible: 25,
  },
  {
    id: "cat_formules",
    nom: "Formules",
    mixCiblePct: 10,
    ticketMoyen: 14.0,
    foodCostCible: 30,
  },
];

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

// ─── State shape used by global selectors ────────────────────────────────────

interface AppState {
  recettes: RecetteFB[];
  ingredients: IngredientFB[];
  categoriesCarte: CategorieCarte[];
  hypothesesBP: HypothesesBP;
  salaries: Salarie[];
  fraisFixes: FraisFixe[];
}

/**
 * Selector: Centralised CA & Marge annuels depuis les données réelles
 * (recettes + volumes simulateur — Section A du BP Réel).
 *
 * CA annuel = Σ (recette.prixVenteHT × recette.volumeHebdo × semainesOuverture)
 *
 * Coût matières annuel = Σ pour chaque recette de (coût matière calculé depuis
 * les ingrédients × volumeHebdo × semainesOuverture).
 * Si une recette n'a pas d'ingrédients, on utilise le foodCostCible moyen de
 * sa catégorie comme fallback.
 */
export function selectReelSectionA(state: AppState): {
  caAnnuel: number;
  coutMatiereAnnuel: number;
  margeBruteAnnuelle: number;
} {
  const { recettes, ingredients, categoriesCarte, hypothesesBP } = state;
  const semainesOuverture = hypothesesBP.semainesOuverture || 48;

  // Build ingredient price map for fast lookup
  const ingredientMap = new Map<string, IngredientFB>();
  for (const ing of ingredients) {
    ingredientMap.set(ing.id, ing);
  }

  // Build category foodCost map for fallback
  const categoryFoodCostMap = new Map<string, number>();
  for (const cat of categoriesCarte) {
    categoryFoodCostMap.set(cat.id, cat.foodCostCible ?? 30);
  }

  const globalFoodCostFallback =
    categoriesCarte.length > 0
      ? categoriesCarte.reduce((s, c) => s + (c.foodCostCible ?? 30), 0) /
        categoriesCarte.length
      : 100 - (hypothesesBP.margeCibleGlobale ?? 70);

  let caAnnuel = 0;
  let coutMatiereAnnuel = 0;

  for (const recette of recettes) {
    const caRecette =
      recette.prixVenteHT * recette.volumeHebdo * semainesOuverture;
    caAnnuel += caRecette;

    // Compute food cost from ingredients list if available
    let coutMatiereRecette = 0;
    if (recette.ingredients && recette.ingredients.length > 0) {
      for (const ligne of recette.ingredients) {
        const ing = ingredientMap.get(ligne.ingredientId);
        if (ing) {
          // Account for waste: net qty / (1 - perte%) = gross qty
          const perteFactor = 1 - (ing.perteMatierePct ?? 0) / 100;
          const qtyBrute =
            perteFactor > 0
              ? ligne.quantiteNette / perteFactor
              : ligne.quantiteNette;
          coutMatiereRecette += qtyBrute * ing.prixAchatHT;
        }
      }
    } else {
      // Fallback: use category foodCostCible %
      const foodCostPct =
        categoryFoodCostMap.get(recette.categorieId) ?? globalFoodCostFallback;
      coutMatiereRecette = recette.prixVenteHT * (foodCostPct / 100);
    }

    coutMatiereAnnuel +=
      coutMatiereRecette * recette.volumeHebdo * semainesOuverture;
  }

  const margeBruteAnnuelle = caAnnuel - coutMatiereAnnuel;

  return { caAnnuel, coutMatiereAnnuel, margeBruteAnnuelle };
}

/**
 * Selector: Centralised charges annuelles (Section B du BP Réel).
 *
 * fraisFixesAnnuels = Σ fraisFixes (Mensuel×12 ou Annuel×1)
 * masseSalarialeAnnuelle = Σ salaries.coutTotalEmployeur × 12
 */
export function selectReelSectionB(state: AppState): {
  fraisFixesAnnuels: number;
  masseSalarialeAnnuelle: number;
} {
  const fraisFixesAnnuels = selectTotalFraisFixesAnnuels(state.fraisFixes);
  const masseSalarialeAnnuelle = selectTotalMasseSalarialeAnnuelle(
    state.salaries,
  );
  return { fraisFixesAnnuels, masseSalarialeAnnuelle };
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
      categoriesCarte: DEFAULT_CATEGORIES_CARTE,
      associes: [],
      emprunts: [],
      immobilisations: [],
      ventesJournalieres: [],

      setSalaries: (salaries) => set({ salaries }),
      setFraisFixes: (fraisFixes) => set({ fraisFixes }),
      setHypothesesBP: (hypotheses) =>
        set((state) => ({
          hypothesesBP: { ...state.hypothesesBP, ...hypotheses },
        })),
      updateHypotheses: (updates) =>
        set((state) => ({
          hypothesesBP: { ...state.hypothesesBP, ...updates },
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

      updateCategorie: (id, updates) =>
        set((state) => ({
          categoriesCarte: state.categoriesCarte.map((c) =>
            c.id === id ? { ...c, ...updates } : c,
          ),
        })),
      addCategorie: (categorie) =>
        set((state) => ({
          categoriesCarte: [...state.categoriesCarte, categorie],
        })),
      deleteCategorie: (id) =>
        set((state) => ({
          categoriesCarte: state.categoriesCarte.filter((c) => c.id !== id),
        })),

      resetVolumes: () =>
        set((state) => ({
          recettes: state.recettes.map((r) => ({ ...r, volumeHebdo: 0 })),
        })),

      addAssocie: (associe) =>
        set((state) => ({
          associes: [
            ...state.associes,
            { ...associe, id: crypto.randomUUID() },
          ],
        })),
      updateAssocie: (id, updates) =>
        set((state) => ({
          associes: state.associes.map((a) =>
            a.id === id ? { ...a, ...updates } : a,
          ),
        })),
      removeAssocie: (id) =>
        set((state) => ({
          associes: state.associes.filter((a) => a.id !== id),
        })),

      addEmprunt: (emprunt) =>
        set((state) => ({ emprunts: [...state.emprunts, emprunt] })),
      updateEmprunt: (id, updates) =>
        set((state) => ({
          emprunts: state.emprunts.map((e) =>
            e.id === id ? { ...e, ...updates } : e,
          ),
        })),
      removeEmprunt: (id) =>
        set((state) => ({
          emprunts: state.emprunts.filter((e) => e.id !== id),
        })),

      addImmobilisation: (immobilisation) =>
        set((state) => ({
          immobilisations: [...state.immobilisations, immobilisation],
        })),
      updateImmobilisation: (id, updates) =>
        set((state) => ({
          immobilisations: state.immobilisations.map((i) =>
            i.id === id ? { ...i, ...updates } : i,
          ),
        })),
      removeImmobilisation: (id) =>
        set((state) => ({
          immobilisations: state.immobilisations.filter((i) => i.id !== id),
        })),

      addVenteJournaliere: (vente) =>
        set((state) => ({
          ventesJournalieres: [...state.ventesJournalieres, vente],
        })),
      removeVenteJournaliere: (id) =>
        set((state) => ({
          ventesJournalieres: state.ventesJournalieres.filter(
            (v) => v.id !== id,
          ),
        })),
    }),
    { name: "mini-erp-store" },
  ),
);
