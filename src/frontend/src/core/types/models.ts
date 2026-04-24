// ─── Expense (kept for backward compatibility) ──────────────────────────────
export interface Expense {
  id: string;
  name: string;
  amount: number;
  frequency: "monthly" | "annual" | "one-time";
  category: string;
  notes?: string;
}

// ─── Salary (kept for backward compatibility) ────────────────────────────────
export interface Salary {
  id: string;
  employeeName: string;
  grossAmount: number;
  socialChargesRate: number;
  netAmount?: number;
  effectiveDate: string; // ISO date string
}

// ─── Loan ────────────────────────────────────────────────────────────────────
export interface Loan {
  id: string;
  name: string;
  principal: number;
  interestRate: number; // annual rate as a decimal, e.g. 0.045 = 4.5%
  termMonths: number;
  monthlyPayment: number;
}

// ─── Union types ─────────────────────────────────────────────────────────────
export type TypeContrat = "CDI" | "CDD" | "Apprenti" | "Stagiaire" | "Extra";

export type CategoriesFrais =
  | "Loyer"
  | "Énergie"
  | "Assurance"
  | "Abonnement SaaS"
  | "Marketing"
  | "Honoraires"
  | "Autre";

export type FrequenceFrais = "Mensuel" | "Annuel";

// ─── Salarie (Sprint 2 — enriched employee model) ────────────────────────────
export interface Salarie {
  id: string;
  nom: string;
  prenom: string;
  poste: string;
  typeContrat: TypeContrat;
  heuresHebdo: number;
  salaireNet: number;
  salaireBrut?: number;
  chargesPatronales: number;
  coutTotalEmployeur: number;
}

// ─── FraisFixe (Sprint 2 — enriched fixed cost model) ───────────────────────
export interface FraisFixe {
  id: string;
  libelle: string;
  montant: number;
  categorie: CategoriesFrais;
  frequence: FrequenceFrais;
}
