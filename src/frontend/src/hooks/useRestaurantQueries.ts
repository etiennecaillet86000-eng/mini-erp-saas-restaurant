/**
 * Restaurant domain hooks — connects to the backend restaurant data layer.
 * Sprint 1: empty shells — implementations wired in future sprints when backend is ready.
 */

import type {
  IngredientFB,
  RecetteFB,
} from "@/modules/restaurant/types/models";

// TODO: replace with real React Query hooks once backend is connected

export function useIngredients(): { data: IngredientFB[]; isLoading: boolean } {
  return { data: [], isLoading: false };
}

export function useRecettes(): { data: RecetteFB[]; isLoading: boolean } {
  return { data: [], isLoading: false };
}
