import { useAppStore } from "@/core/store/useAppStore";
import type { CategorieCarte } from "@/modules/restaurant/types/models";
import { useMemo } from "react";

export interface StatCategorie extends CategorieCarte {
  volumeReel: number;
  mixReelPct: number;
}

export interface StatsSimulateur {
  volumeTotalGlobal: number;
  caHebdoGlobal: number;
  statsParCategorie: StatCategorie[];
}

export default function useStatsSimulateur(): StatsSimulateur {
  const recettes = useAppStore((s) => s.recettes);
  const categoriesCarte = useAppStore((s) => s.categoriesCarte);
  const hypothesesBP = useAppStore((s) => s.hypothesesBP);

  const stats = useMemo(() => {
    // hypothesesBP included in deps so stats recompute if BP context changes
    void hypothesesBP;

    const volumeTotalGlobal = recettes.reduce(
      (acc, r) => acc + (Number(r.volumeHebdo) || 0),
      0,
    );

    const caHebdoGlobal = recettes.reduce(
      (acc, r) =>
        acc + (Number(r.volumeHebdo) || 0) * (Number(r.prixVenteHT) || 0),
      0,
    );

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

    return { volumeTotalGlobal, caHebdoGlobal, statsParCategorie };
  }, [recettes, categoriesCarte, hypothesesBP]);

  return stats;
}
