import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAppStore } from "@/core/store/useAppStore";
import {
  Bell,
  Building2,
  CreditCard,
  Percent,
  Settings,
  Users,
} from "lucide-react";

const SETTING_GROUPS = [
  {
    id: "restaurant",
    label: "Informations restaurant",
    description: "Nom, adresse, type de cuisine, capacité d'accueil.",
    icon: <Building2 className="h-5 w-5 text-primary" />,
  },
  {
    id: "team",
    label: "Équipe & Accès",
    description: "Gestion des collaborateurs et des niveaux de permission.",
    icon: <Users className="h-5 w-5 text-primary" />,
  },
  {
    id: "billing",
    label: "Facturation & Abonnement",
    description: "Plan SaaS, historique de facturation, méthode de paiement.",
    icon: <CreditCard className="h-5 w-5 text-primary" />,
  },
  {
    id: "notifications",
    label: "Notifications",
    description:
      "Alertes seuils de marge, rappels de charges, bilans hebdomadaires.",
    icon: <Bell className="h-5 w-5 text-primary" />,
  },
];

export default function Parametres() {
  const hypothesesBP = useAppStore((s) => s.hypothesesBP);
  const updateHypotheses = useAppStore((s) => s.updateHypotheses);

  const tauxIS_bas = hypothesesBP.tauxIS_bas ?? 15;
  const tauxIS_haut = hypothesesBP.tauxIS_haut ?? 25;
  const seuilIS = hypothesesBP.seuilIS ?? 42500;
  const tauxCroissanceCA = hypothesesBP.tauxCroissanceCA ?? 3;
  const tauxInflationCharges = hypothesesBP.tauxInflationCharges ?? 2;
  const remunerationAssociesAnnuelle =
    hypothesesBP.remunerationAssociesAnnuelle ?? 0;
  const croissanceCA_BP = hypothesesBP.croissanceCA_BP ?? 3;
  const inflationCharges_BP = hypothesesBP.inflationCharges_BP ?? 2;

  return (
    <div className="space-y-6" data-ocid="parametres.page">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Settings className="h-5 w-5 text-primary" />
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground">
            Paramètres
          </h2>
          <p className="text-sm text-muted-foreground">
            Configuration générale et préférences de l'application
          </p>
        </div>
      </div>

      {/* Fiscalité section */}
      <Card
        className="border-border bg-card"
        data-ocid="parametres.fiscalite.card"
      >
        <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-3">
          <Percent className="h-5 w-5 text-primary" />
          <CardTitle className="text-base font-semibold text-foreground">
            Fiscalité — Impôt sur les Sociétés (IS)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="tauxIS_bas" className="text-sm">
                Taux IS réduit (%)
              </Label>
              <Input
                id="tauxIS_bas"
                type="number"
                min={0}
                max={100}
                value={tauxIS_bas}
                onChange={(e) =>
                  updateHypotheses({
                    tauxIS_bas: Number.parseFloat(e.target.value) || 0,
                  })
                }
                data-ocid="parametres.taux_is_bas.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tauxIS_haut" className="text-sm">
                Taux IS normal (%)
              </Label>
              <Input
                id="tauxIS_haut"
                type="number"
                min={0}
                max={100}
                value={tauxIS_haut}
                onChange={(e) =>
                  updateHypotheses({
                    tauxIS_haut: Number.parseFloat(e.target.value) || 0,
                  })
                }
                data-ocid="parametres.taux_is_haut.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="seuilIS" className="text-sm">
                Seuil IS (€)
              </Label>
              <Input
                id="seuilIS"
                type="number"
                min={0}
                value={seuilIS}
                onChange={(e) =>
                  updateHypotheses({
                    seuilIS: Number.parseFloat(e.target.value) || 0,
                  })
                }
                data-ocid="parametres.seuil_is.input"
              />
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            Ces paramètres sont utilisés pour calculer l'Impôt sur les Sociétés
            dans le Compte de Résultat (SASU uniquement — IS désactivé en SARL).
          </p>
        </CardContent>
      </Card>

      {/* Projection RÉEL section */}
      <Card
        className="border-border bg-card"
        data-ocid="parametres.projection.card"
      >
        <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-3">
          <Percent className="h-5 w-5 text-primary" />
          <CardTitle className="text-base font-semibold text-foreground">
            Hypothèses de Projection — Compte de Résultat RÉEL
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Ces taux pilotent la projection des Années 2 à 5 dans l'onglet
            "Compte de Résultat RÉEL", basé sur les données réelles du
            simulateur.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="tauxCroissanceCA" className="text-sm">
                Croissance annuelle CA — RÉEL (%)
              </Label>
              <Input
                id="tauxCroissanceCA"
                type="number"
                min={-100}
                max={200}
                value={tauxCroissanceCA}
                onChange={(e) =>
                  updateHypotheses({
                    tauxCroissanceCA: Number.parseFloat(e.target.value) || 0,
                  })
                }
                data-ocid="parametres.taux_croissance_ca.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tauxInflationCharges" className="text-sm">
                Augmentation annuelle charges — RÉEL (%)
              </Label>
              <Input
                id="tauxInflationCharges"
                type="number"
                min={-100}
                max={200}
                value={tauxInflationCharges}
                onChange={(e) =>
                  updateHypotheses({
                    tauxInflationCharges:
                      Number.parseFloat(e.target.value) || 0,
                  })
                }
                data-ocid="parametres.taux_inflation_charges.input"
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="remunerationAssociesAnnuelle" className="text-sm">
              Rémunération annuelle totale des associés (€) — référence manuelle
            </Label>
            <Input
              id="remunerationAssociesAnnuelle"
              type="number"
              min={0}
              value={remunerationAssociesAnnuelle}
              onChange={(e) =>
                updateHypotheses({
                  remunerationAssociesAnnuelle:
                    Number.parseFloat(e.target.value) || 0,
                })
              }
              data-ocid="parametres.remuneration_associes.input"
            />
            <p className="text-xs text-muted-foreground">
              Référence manuelle optionnelle. La CAF utilise le calcul
              automatique depuis la liste des associés (module Associés).
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Projection Business Plan section */}
      <Card
        className="border-border bg-card"
        data-ocid="parametres.projection_bp.card"
      >
        <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-3">
          <Percent className="h-5 w-5 text-primary" />
          <CardTitle className="text-base font-semibold text-foreground">
            Hypothèses de Projection — Business Plan
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-xs text-muted-foreground">
            Ces taux pilotent la projection des Années 2 à 5 dans l'onglet
            "Compte de Résultat BP", indépendamment des projections réelles.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="croissanceCA_BP" className="text-sm">
                Croissance annuelle CA — BP (%)
              </Label>
              <Input
                id="croissanceCA_BP"
                type="number"
                min={-100}
                max={200}
                value={croissanceCA_BP}
                onChange={(e) =>
                  updateHypotheses({
                    croissanceCA_BP: Number.parseFloat(e.target.value) || 0,
                  })
                }
                data-ocid="parametres.croissance_ca_bp.input"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="inflationCharges_BP" className="text-sm">
                Augmentation annuelle des charges — BP (%)
              </Label>
              <Input
                id="inflationCharges_BP"
                type="number"
                min={-100}
                max={200}
                value={inflationCharges_BP}
                onChange={(e) =>
                  updateHypotheses({
                    inflationCharges_BP: Number.parseFloat(e.target.value) || 0,
                  })
                }
                data-ocid="parametres.inflation_charges_bp.input"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Settings groups */}
      <div className="grid gap-4 sm:grid-cols-2">
        {SETTING_GROUPS.map((group) => (
          <Card
            key={group.id}
            className="border-border bg-card transition-smooth hover:shadow-md cursor-default"
            data-ocid={`parametres.${group.id}.card`}
          >
            <CardHeader className="flex flex-row items-center gap-3 space-y-0 pb-2">
              {group.icon}
              <CardTitle className="text-sm font-semibold text-foreground">
                {group.label}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {group.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Placeholder notice */}
      <Card
        className="border-dashed border-border bg-muted/30"
        data-ocid="parametres.empty_state"
      >
        <CardContent className="flex flex-col items-center justify-center py-12 text-center gap-3">
          <Settings className="h-10 w-10 text-muted-foreground/50" />
          <p className="font-medium text-foreground">
            Paramètres en construction
          </p>
          <p className="text-sm text-muted-foreground max-w-sm">
            La configuration complète sera disponible dès la connexion au
            backend (Sprint 2).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
