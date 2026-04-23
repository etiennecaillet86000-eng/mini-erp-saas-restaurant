import { useAppStore } from "@/core/store/useAppStore";
import type { CategorieCarte } from "@/modules/restaurant/types/models";
import { calculerFoodCostRecette } from "@/modules/restaurant/utils/calculations";
import { useMemo } from "react";

export interface StatCategorie extends CategorieCarte {
  volumeReel: number;
  mixReelPct: number;
}

export interface StatsSimulateur {
  volumeTotalGlobal: number;
  caHebdoGlobal: number;
  statsParCategorie: StatCategorie[];
  margeReelleGlobale: number;
}

export default function useStatsSimulateur(): StatsSimulateur {
  const recettes = useAppStore((s) => s.recettes);
  const categoriesCarte = useAppStore((s) => s.categoriesCarte);
  const ingredients = useAppStore((s) => s.ingredients);

  const stats = useMemo(() => {
    const volumeTotalGlobal = recettes.reduce(
      (acc, r) => acc + (Number(r.volumeHebdo) || 0),
      0,
    );

    const caHebdoGlobal = recettes.reduce(
      (acc, r) =>
        acc + (Number(r.volumeHebdo) || 0) * (Number(r.prixVenteHT) || 0),
      0,
    );

    // Marge Réelle Globale = ((CA Global - Somme coûts matières totaux) / CA Global) * 100
    const totalCoutMatiere = recettes.reduce((acc, r) => {
      const { coutMatiereTotalHT } = calculerFoodCostRecette(r, ingredients);
      return acc + coutMatiereTotalHT * (Number(r.volumeHebdo) || 0);
    }, 0);

    const margeReelleGlobale =
      caHebdoGlobal > 0
        ? ((caHebdoGlobal - totalCoutMatiere) / caHebdoGlobal) * 100
        : 0;

    const normalizeStr = (s: string) => String(s).toLowerCase().trim();

    const statsParCategorie: StatCategorie[] = categoriesCarte.map((cat) => {
      const volumeReel = recettes
        .filter((r) => {
          const rCatId = normalizeStr(r.categorieId ?? "");
          return (
            rCatId === normalizeStr(cat.id) || rCatId === normalizeStr(cat.nom)
          );
        })
        .reduce((acc, r) => acc + (Number(r.volumeHebdo) || 0), 0);
      const mixReelPct =
        volumeTotalGlobal > 0 ? (volumeReel / volumeTotalGlobal) * 100 : 0;
      return { ...cat, volumeReel, mixReelPct };
    });

    return {
      volumeTotalGlobal,
      caHebdoGlobal,
      statsParCategorie,
      margeReelleGlobale,
    };
  }, [recettes, categoriesCarte, ingredients]);

  return stats;
}
