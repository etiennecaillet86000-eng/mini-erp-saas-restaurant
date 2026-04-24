import { Button } from "@/components/ui/button";
import Sidebar from "@/core/ui/Sidebar";
import { Menu, X } from "lucide-react";
import { useState } from "react";
import { useLocation } from "react-router-dom";

const PATH_TITLES: Record<string, string> = {
  "/quotidien": "Quotidien",
  "/business-plan": "Business Plan",
  "/business-plan-reel": "Business Plan Réel",
  "/laboratoire": "Laboratoire Recettes",
  "/parametres": "Paramètres",
  "/salaries": "Salariés",
  "/frais-fixes": "Charges Fixes",
  "/cloture-journee": "Clôture Journée",
  "/ingredients": "Ingrédients",
  "/recettes": "Fiches Techniques",
  "/associes": "Associés",
  "/emprunts": "Emprunts Bancaires",
  "/amortissements": "Amortissements",
  "/comptabilite": "Comptabilité",
};

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const title = PATH_TITLES[location.pathname] ?? "Mini-ERP";

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content column */}
      <div className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Top header bar */}
        <header className="flex h-16 items-center gap-4 border-b border-border bg-card px-4 md:px-6 shadow-sm flex-shrink-0">
          {/* Hamburger — mobile only */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden text-foreground"
            onClick={() => setSidebarOpen(true)}
            aria-label="Ouvrir le menu"
            data-ocid="header.menu_toggle.button"
          >
            {sidebarOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </Button>

          <h1 className="font-display text-lg font-semibold text-foreground truncate">
            {title}
          </h1>
        </header>

        {/* Scrollable page content */}
        <main
          className="flex-1 overflow-y-auto bg-background p-4 md:p-6"
          id="main-content"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
