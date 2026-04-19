import FraisFixesPage from "@/core/finance/FraisFixesPage";
import SalariesPage from "@/core/hr/SalariesPage";
import Layout from "@/core/ui/Layout";
import IngredientsPage from "@/modules/restaurant/pages/IngredientsPage";
import RecettesPage from "@/modules/restaurant/pages/RecettesPage";
import BusinessPlan from "@/pages/BusinessPlan";
import ClotureJournee from "@/pages/ClotureJournee";
import Parametres from "@/pages/Parametres";
import Quotidien from "@/pages/Quotidien";
import SimulateurCarte from "@/pages/SimulateurCarte";
import { useState } from "react";

export type Page =
  | "parametres"
  | "business-plan"
  | "simulateur-carte"
  | "quotidien"
  | "salaries"
  | "frais-fixes"
  | "cloture-journee"
  | "ingredients"
  | "recettes";

export default function App() {
  const [currentPage, setCurrentPage] = useState<Page>("quotidien");

  const renderPage = () => {
    switch (currentPage) {
      case "parametres":
        return <Parametres />;
      case "business-plan":
        return <BusinessPlan />;
      case "simulateur-carte":
        return <SimulateurCarte />;
      case "salaries":
        return <SalariesPage />;
      case "frais-fixes":
        return <FraisFixesPage />;
      case "cloture-journee":
        return <ClotureJournee />;
      case "ingredients":
        return <IngredientsPage />;
      case "recettes":
        return <RecettesPage />;
      default:
        return <Quotidien />;
    }
  };

  return (
    <Layout currentPage={currentPage} onNavigate={setCurrentPage}>
      {renderPage()}
    </Layout>
  );
}
