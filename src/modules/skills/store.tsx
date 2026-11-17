import { createContext, useContext, useMemo, type ReactNode } from "react";
import { usePersistentState } from "@/lib/storage";
import { seedSkills } from "./seed";
import type { Skill, SkillStatus, SkillType } from "./types";

const KEY = "nishios:skills:v1";

interface Store {
  skills: Skill[];
  create: (name: string, status: SkillStatus, type: SkillType) => Skill;
  update: (id: string, patch: Partial<Omit<Skill, "id">>) => void;
  remove: (id: string) => void;
  restore: (skill: Skill) => void;
  resetToExample: () => void;
}

const Ctx = createContext<Store | null>(null);

export const newId = () => crypto.randomUUID();

export function SkillsProvider({ children }: { children: ReactNode }) {
  const [skills, setSkills] = usePersistentState<Skill[]>(KEY, seedSkills);

  const store = useMemo<Store>(
    () => ({
      skills,
      create(name, status, type) {
        const skill: Skill = {
          id: newId(),
          name,
          type,
          category: type === "hard" ? "Tecnologia" : "Comunicação",
          status,
          level: status === "learned" ? 3 : status === "learning" ? 1 : 0,
          notes: "",
          resources: [],
          log: [],
          createdAt: new Date().toISOString(),
        };
        setSkills((list) => [...list, skill]);
        return skill;
      },
      update(id, patch) {
        setSkills((list) => list.map((s) => (s.id === id ? { ...s, ...patch } : s)));
      },
      remove(id) {
        setSkills((list) => list.filter((s) => s.id !== id));
      },
      restore(skill) {
        setSkills((list) => (list.some((s) => s.id === skill.id) ? list : [...list, skill]));
      },
      resetToExample() {
        setSkills(seedSkills());
      },
    }),
    [skills, setSkills],
  );

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useSkills(): Store {
  const store = useContext(Ctx);
  if (!store) throw new Error("useSkills precisa estar dentro de SkillsProvider");
  return store;
}
