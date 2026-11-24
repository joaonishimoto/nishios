import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppShell } from "@/components/shell/AppShell";
import { ToastProvider } from "@/components/ui/Toast";
import { CalendarioPage } from "@/modules/calendario/CalendarioPage";
import { CalendarProvider } from "@/modules/calendario/store";
import { CompromissosPage } from "@/modules/compromissos/CompromissosPage";
import { CommitmentsProvider } from "@/modules/compromissos/store";
import { BensPage } from "@/modules/bens/BensPage";
import { BensProvider } from "@/modules/bens/store";
import { CasaProvider } from "@/modules/casa/store";
import { ImoveisPage } from "@/modules/imoveis/ImoveisPage";
import { ImovelPage } from "@/modules/imoveis/ImovelPage";
import { MAIN_ID } from "@/modules/imoveis/seed";
import { ImoveisProvider } from "@/modules/imoveis/store";
import { VeiculosPage } from "@/modules/veiculos/VeiculosPage";
import { VeiculosProvider } from "@/modules/veiculos/store";
import { PessoasPage } from "@/modules/pessoas/PessoasPage";
import { PeopleProvider } from "@/modules/pessoas/store";
import { PetsPage } from "@/modules/pets/PetsPage";
import { PetsProvider } from "@/modules/pets/store";
import { RotinaPage } from "@/modules/rotina/RotinaPage";
import { RoutineProvider } from "@/modules/rotina/store";
import { SkillsPage } from "@/modules/skills/SkillsPage";
import { SkillsProvider } from "@/modules/skills/store";
import { TasksProvider } from "@/modules/tarefas/store";
import { TarefasPage } from "@/modules/tarefas/TarefasPage";
import { CulinariaPage } from "@/modules/culinaria/CulinariaPage";
import { CulinariaProvider } from "@/modules/culinaria/store";
import { DanceProvider } from "@/modules/treinos/danca/store";
import { TreinosProvider } from "@/modules/treinos/store";
import { TreinosPage } from "@/modules/treinos/TreinosPage";
import { CorpoPage } from "@/modules/corpo/CorpoPage";
import { CorpoProvider } from "@/modules/corpo/store";
import { FinancasPage } from "@/modules/financas/FinancasPage";
import { FinancasProvider } from "@/modules/financas/store";
import { DadosPage } from "@/pages/DadosPage";
import { DesignSystemPage } from "@/pages/DesignSystemPage";
import { HomePage } from "@/pages/HomePage";

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <CalendarProvider>
        <CommitmentsProvider>
          <TasksProvider>
          <TreinosProvider>
          <DanceProvider>
          <CorpoProvider>
          <SkillsProvider>
          <CulinariaProvider>
          <FinancasProvider>
          <RoutineProvider>
          <BensProvider>
          <CasaProvider>
          <ImoveisProvider>
          <VeiculosProvider>
          <PeopleProvider>
          <PetsProvider>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<HomePage />} />
              <Route path="calendario" element={<CalendarioPage />} />
              <Route path="tarefas" element={<TarefasPage />} />
              <Route path="rotina" element={<RotinaPage />} />
              <Route path="compromissos" element={<CompromissosPage />} />
              <Route path="treinos" element={<TreinosPage />} />
              <Route path="corpo" element={<CorpoPage />} />
              <Route path="bens" element={<BensPage />} />
              <Route path="imoveis" element={<ImoveisPage />} />
              <Route path="imoveis/:id" element={<ImovelPage />} />
              <Route path="veiculos" element={<VeiculosPage />} />
              <Route path="casa" element={<CasaRedirect />} />
              <Route path="pessoas" element={<PessoasPage />} />
              <Route path="pets" element={<PetsPage />} />
              <Route path="skills" element={<SkillsPage />} />
              <Route path="culinaria" element={<CulinariaPage />} />
              <Route path="financas" element={<FinancasPage />} />
              <Route path="dados" element={<DadosPage />} />
              <Route path="design-system" element={<DesignSystemPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
          </PetsProvider>
          </PeopleProvider>
          </VeiculosProvider>
          </ImoveisProvider>
          </CasaProvider>
          </BensProvider>
          </RoutineProvider>
          </FinancasProvider>
          </CulinariaProvider>
          </SkillsProvider>
          </CorpoProvider>
          </DanceProvider>
          </TreinosProvider>
          </TasksProvider>
        </CommitmentsProvider>
        </CalendarProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}

/** A antiga página Casa virou a planta do apartamento, dentro de Imóveis. Links antigos continuam valendo. */
function CasaRedirect() {
  const { search } = useLocation();
  const params = new URLSearchParams(search);
  params.set("aba", "planta");
  return <Navigate to={`/imoveis/${MAIN_ID}?${params}`} replace />;
}
