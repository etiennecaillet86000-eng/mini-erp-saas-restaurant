import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarDays, ShoppingBag, TrendingUp, Users } from "lucide-react";

const STAT_CARDS = [
  {
    id: "revenue",
    label: "Chiffre d'affaires du jour",
    value: "—",
    icon: <TrendingUp className="h-4 w-4" />,
    badge: "Aujourd'hui",
  },
  {
    id: "covers",
    label: "Couverts servis",
    value: "—",
    icon: <Users className="h-4 w-4" />,
    badge: "Service",
  },
  {
    id: "orders",
    label: "Commandes en cours",
    value: "—",
    icon: <ShoppingBag className="h-4 w-4" />,
    badge: "Actif",
  },
];

export default function Quotidien() {
  return (
    <div className="space-y-6" data-ocid="quotidien.page">
      {/* Header */}
      <div className="flex items-center gap-3">
        <CalendarDays className="h-5 w-5 text-primary" />
        <div>
          <h2 className="font-display text-xl font-semibold text-foreground">
            Tableau de bord quotidien
          </h2>
          <p className="text-sm text-muted-foreground">
            Suivi en temps réel de l'activité du restaurant
          </p>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {STAT_CARDS.map((card) => (
          <Card
            key={card.id}
            className="border-border bg-card"
            data-ocid={`quotidien.${card.id}.card`}
          >
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.label}
              </CardTitle>
              <span className="text-muted-foreground">{card.icon}</span>
            </CardHeader>
            <CardContent>
              <div className="flex items-end justify-between">
                <span className="font-display text-2xl font-bold text-foreground">
                  {card.value}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {card.badge}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Placeholder notice */}
      <Card
        className="border-dashed border-border bg-muted/30"
        data-ocid="quotidien.empty_state"
      >
        <CardContent className="flex flex-col items-center justify-center py-12 text-center gap-3">
          <CalendarDays className="h-10 w-10 text-muted-foreground/50" />
          <p className="font-medium text-foreground">Module en construction</p>
          <p className="text-sm text-muted-foreground max-w-sm">
            Les données quotidiennes seront disponibles dès la connexion au
            backend (Sprint 2).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
