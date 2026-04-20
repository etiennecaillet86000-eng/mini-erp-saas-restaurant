import BusinessPlanPage from "@/core/finance/BusinessPlanPage";
import FraisFixesPage from "@/core/finance/FraisFixesPage";
import SalariesPage from "@/core/hr/SalariesPage";
import Layout from "@/core/ui/Layout";
import BusinessPlanReelPage from "@/modules/restaurant/pages/BusinessPlanReelPage";
import IngredientsPage from "@/modules/restaurant/pages/IngredientsPage";
import OperationsPage from "@/modules/restaurant/pages/OperationsPage";
import RecettesPage from "@/modules/restaurant/pages/RecettesPage";
import SimulateurCartePage from "@/modules/restaurant/pages/SimulateurCartePage";
import Parametres from "@/pages/Parametres";
import Quotidien from "@/pages/Quotidien";
import { Navigate, Route, Routes } from "react-router-dom";

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Navigate to="/quotidien" replace />} />
        <Route path="/quotidien" element={<Quotidien />} />
        <Route path="/business-plan" element={<BusinessPlanPage />} />
        <Route path="/business-plan-reel" element={<BusinessPlanReelPage />} />
        <Route path="/laboratoire" element={<SimulateurCartePage />} />
        <Route path="/ingredients" element={<IngredientsPage />} />
        <Route path="/recettes" element={<RecettesPage />} />
        <Route path="/salaries" element={<SalariesPage />} />
        <Route path="/frais-fixes" element={<FraisFixesPage />} />
        <Route path="/cloture-journee" element={<OperationsPage />} />
        <Route path="/parametres" element={<Parametres />} />
      </Routes>
    </Layout>
  );
}
