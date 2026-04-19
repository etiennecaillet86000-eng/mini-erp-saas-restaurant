/**
 * Restaurant domain hooks — connects to the backend restaurant data layer.
 * Sprint 1: empty shells — implementations wired in future sprints when backend is ready.
 */

import type {
  Ingredient,
  MenuItem,
  Recipe,
} from "@/modules/restaurant/types/models";

// TODO: replace with real React Query hooks once backend is connected

export function useIngredients(): { data: Ingredient[]; isLoading: boolean } {
  return { data: [], isLoading: false };
}

export function useRecipes(): { data: Recipe[]; isLoading: boolean } {
  return { data: [], isLoading: false };
}

export function useMenuItems(): { data: MenuItem[]; isLoading: boolean } {
  return { data: [], isLoading: false };
}
