import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/shell/AppShell";
import { ToastProvider } from "@/components/ui/Toast";
import { CalendarioPage } from "@/modules/calendario/CalendarioPage";
import { CalendarProvider } from "@/modules/calendario/store";
import { CompromissosPage } from "@/modules/compromissos/CompromissosPage";
import { CommitmentsProvider } from "@/modules/compromissos/store";
import { BensPage } from "@/modules/bens/BensPage";
import { BensProvider } from "@/modules/bens/store";
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
import { TreinosProvider } from "@/modules/treinos/store";
import { TreinosPage } from "@/modules/treinos/TreinosPage";
import { CorpoPage } from "@/modules/corpo/CorpoPage";
import { CorpoProvider } from "@/modules/corpo/store";
import { DesignSystemPage } from "@/pages/DesignSystemPage";
import { HomePage } from "@/pages/HomePage";

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <CommitmentsProvider>
          <TasksProvider>
          <TreinosProvider>
          <CorpoProvider>
          <RoutineProvider>
          <BensProvider>
          <PeopleProvider>
          <PetsProvider>
          <SkillsProvider>
          <CalendarProvider>
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
              <Route path="pessoas" element={<PessoasPage />} />
              <Route path="pets" element={<PetsPage />} />
              <Route path="skills" element={<SkillsPage />} />
              <Route path="design-system" element={<DesignSystemPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
          </CalendarProvider>
          </SkillsProvider>
          </PetsProvider>
          </PeopleProvider>
          </BensProvider>
          </RoutineProvider>
          </CorpoProvider>
          </TreinosProvider>
          </TasksProvider>
        </CommitmentsProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
