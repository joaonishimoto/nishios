import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/shell/AppShell";
import { ToastProvider } from "@/components/ui/Toast";
import { CompromissosPage } from "@/modules/compromissos/CompromissosPage";
import { CommitmentsProvider } from "@/modules/compromissos/store";
import { BensPage } from "@/modules/bens/BensPage";
import { BensProvider } from "@/modules/bens/store";
import { PessoasPage } from "@/modules/pessoas/PessoasPage";
import { PeopleProvider } from "@/modules/pessoas/store";
import { RotinaPage } from "@/modules/rotina/RotinaPage";
import { RoutineProvider } from "@/modules/rotina/store";
import { TasksProvider } from "@/modules/tarefas/store";
import { TarefasPage } from "@/modules/tarefas/TarefasPage";
import { TreinosProvider } from "@/modules/treinos/store";
import { TreinosPage } from "@/modules/treinos/TreinosPage";
import { DesignSystemPage } from "@/pages/DesignSystemPage";
import { HomePage } from "@/pages/HomePage";

export function App() {
  return (
    <BrowserRouter>
      <ToastProvider>
        <CommitmentsProvider>
          <TasksProvider>
          <RoutineProvider>
          <BensProvider>
          <PeopleProvider>
          <TreinosProvider>
          <Routes>
            <Route element={<AppShell />}>
              <Route index element={<HomePage />} />
              <Route path="tarefas" element={<TarefasPage />} />
              <Route path="rotina" element={<RotinaPage />} />
              <Route path="compromissos" element={<CompromissosPage />} />
              <Route path="treinos" element={<TreinosPage />} />
              <Route path="bens" element={<BensPage />} />
              <Route path="pessoas" element={<PessoasPage />} />
              <Route path="design-system" element={<DesignSystemPage />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          </Routes>
          </TreinosProvider>
          </PeopleProvider>
          </BensProvider>
          </RoutineProvider>
          </TasksProvider>
        </CommitmentsProvider>
      </ToastProvider>
    </BrowserRouter>
  );
}
