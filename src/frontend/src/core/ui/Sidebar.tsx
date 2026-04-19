import type { Page } from "@/App";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  CalendarDays,
  ChefHat,
  ClipboardList,
  CreditCard,
  FlaskConical,
  PackageOpen,
  Settings,
  TrendingDown,
  TrendingUp,
  Users,
  UtensilsCrossed,
} from "lucide-react";

interface NavItem {
  id: Page;
  label: string;
  icon: React.ReactNode;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Opérations",
    items: [
      {
        id: "quotidien",
        label: "Quotidien",
        icon: <CalendarDays className="h-4 w-4" />,
      },
      {
        id: "cloture-journee",
        label: "Clôture Journée",
        icon: <ClipboardList className="h-4 w-4" />,
      },
    ],
  },
  {
    title: "F&B",
    items: [
      {
        id: "simulateur-carte",
        label: "Laboratoire Recettes",
        icon: <UtensilsCrossed className="h-4 w-4" />,
      },
      {
        id: "ingredients",
        label: "Ingrédients",
        icon: <PackageOpen className="h-4 w-4" />,
      },
      {
        id: "recettes",
        label: "Fiches Techniques",
        icon: <FlaskConical className="h-4 w-4" />,
      },
    ],
  },
  {
    title: "Stratégie",
    items: [
      {
        id: "business-plan",
        label: "BP Stratégique",
        icon: <TrendingUp className="h-4 w-4" />,
      },
      {
        id: "business-plan-reel",
        label: "BP Réel (Bottom-Up)",
        icon: <TrendingDown className="h-4 w-4" />,
      },
    ],
  },
  {
    title: "Ressources Humaines",
    items: [
      {
        id: "salaries",
        label: "Salariés",
        icon: <Users className="h-4 w-4" />,
      },
    ],
  },
  {
    title: "Finance",
    items: [
      {
        id: "frais-fixes",
        label: "Charges Fixes",
        icon: <CreditCard className="h-4 w-4" />,
      },
    ],
  },
  {
    title: "Configuration",
    items: [
      {
        id: "parametres",
        label: "Paramètres",
        icon: <Settings className="h-4 w-4" />,
      },
    ],
  },
];

interface SidebarProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function Sidebar({
  currentPage,
  onNavigate,
  isOpen,
  onClose,
}: SidebarProps) {
  const handleNavigate = (page: Page) => {
    onNavigate(page);
    onClose();
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-foreground/20 backdrop-blur-sm md:hidden"
          onClick={onClose}
          onKeyDown={(e) => e.key === "Escape" && onClose()}
          aria-hidden="true"
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-sidebar text-sidebar-foreground transition-transform duration-300 md:static md:translate-x-0 md:z-auto",
          isOpen ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Navigation principale"
      >
        {/* Logo / Brand */}
        <div className="flex h-16 items-center gap-3 px-5 border-b border-sidebar-border">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sidebar-primary">
            <ChefHat className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="font-display text-sm font-semibold text-sidebar-foreground">
              Mini-ERP
            </span>
            <span className="text-[11px] text-sidebar-accent-foreground">
              Restaurant
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav
          className="flex-1 overflow-y-auto px-3 py-4 space-y-5"
          aria-label="Menu principal"
        >
          {NAV_SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-widest text-sidebar-accent-foreground/60">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = currentPage === item.id;
                  return (
                    <Button
                      key={item.id}
                      variant="ghost"
                      className={cn(
                        "w-full justify-start gap-3 px-3 py-2 h-10 font-medium text-sm transition-smooth rounded-md",
                        isActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground border-l-2 border-sidebar-primary pl-[10px]"
                          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                      )}
                      onClick={() => handleNavigate(item.id)}
                      data-ocid={`nav.${item.id}.link`}
                      aria-current={isActive ? "page" : undefined}
                    >
                      {item.icon}
                      {item.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <Separator className="bg-sidebar-border" />

        {/* Footer */}
        <div className="px-5 py-4 text-[11px] text-sidebar-accent-foreground">
          © {new Date().getFullYear()} Mini-ERP SaaS
        </div>
      </aside>
    </>
  );
}
