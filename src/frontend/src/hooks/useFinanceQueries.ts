/**
 * Finance domain hooks — connects to the backend finance data layer.
 * Sprint 1: empty shells — implementations wired in future sprints when backend is ready.
 */

import type { Expense, Loan, Salary } from "@/core/types/models";

// TODO: replace with real React Query hooks once backend is connected

export function useExpenses(): { data: Expense[]; isLoading: boolean } {
  return { data: [], isLoading: false };
}

export function useSalaries(): { data: Salary[]; isLoading: boolean } {
  return { data: [], isLoading: false };
}

export function useLoans(): { data: Loan[]; isLoading: boolean } {
  return { data: [], isLoading: false };
}
