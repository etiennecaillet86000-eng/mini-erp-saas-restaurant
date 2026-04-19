import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bell, Building2, CreditCard, Settings, Users } from "lucide-react";

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
