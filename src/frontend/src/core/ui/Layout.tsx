import type { Page } from "@/App";
import { Button } from "@/components/ui/button";
import Sidebar from "@/core/ui/Sidebar";
import { Menu, X } from "lucide-react";
import { useState } from "react";

interface LayoutProps {
  currentPage: Page;
  onNavigate: (page: Page) => void;
  children: React.ReactNode;
}

const PAGE_TITLES: Record<Page, string> = {
  quotidien: "Quotidien",
  "business-plan": "Business Plan Stratégique",
  "business-plan-reel": "Business Plan Réel (Bottom-Up)",
  "simulateur-carte": "Laboratoire Recettes",
  parametres: "Paramètres",
  salaries: "Salariés",
  "frais-fixes": "Charges Fixes",
  "cloture-journee": "Clôture Journée",
  ingredients: "Ingrédients",
  recettes: "Fiches Techniques",
};

export default function Layout({
  currentPage,
  onNavigate,
  children,
}: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar
        currentPage={currentPage}
        onNavigate={onNavigate}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

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
            {PAGE_TITLES[currentPage]}
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
