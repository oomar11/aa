import {
  sampleDesignItems,
  type DesignItem,
} from "@/lib/design-items";
import type { ProjectMaterialDefaults } from "@/lib/project-materials";

export type Project = {
  id: string;
  customerId: string;
  name: string;
  location?: string;
  createdAt: string;
  status: "open" | "done";
  itemsCount: number;
} & ProjectMaterialDefaults;

export const PROJECTS_STORAGE_KEY = "upvc-projects";

export const projects: Project[] = [
  {
    id: "p1",
    customerId: "1",
    name: "فيلا المعادي",
    location: "المعادي",
    createdAt: "2026-07-18",
    status: "open",
    itemsCount: 4,
  },
  {
    id: "p2",
    customerId: "1",
    name: "شقة الدور التالت",
    location: "المعادي",
    createdAt: "2026-05-10",
    status: "done",
    itemsCount: 6,
  },
  {
    id: "p3",
    customerId: "1",
    name: "غرفة السطح",
    location: "المعادي",
    createdAt: "2026-03-02",
    status: "done",
    itemsCount: 2,
  },
  {
    id: "p4",
    customerId: "2",
    name: "محل مدينة نصر",
    location: "مدينة نصر",
    createdAt: "2026-06-02",
    status: "open",
    itemsCount: 3,
  },
  {
    id: "p5",
    customerId: "2",
    name: "شقة الأسرة",
    location: "مدينة نصر",
    createdAt: "2026-01-20",
    status: "done",
    itemsCount: 5,
  },
  {
    id: "p6",
    customerId: "3",
    name: "فيلا الشيخ زايد",
    location: "الشيخ زايد",
    createdAt: "2026-07-22",
    status: "open",
    itemsCount: 8,
  },
  {
    id: "p7",
    customerId: "3",
    name: "غرفة المعيشة",
    createdAt: "2026-04-11",
    status: "done",
    itemsCount: 2,
  },
  {
    id: "p8",
    customerId: "3",
    name: "حمام الضيوف",
    createdAt: "2026-02-08",
    status: "done",
    itemsCount: 1,
  },
  {
    id: "p9",
    customerId: "4",
    name: "عمارة أكتوبر - الدور 1",
    location: "6 أكتوبر",
    createdAt: "2026-05-14",
    status: "open",
    itemsCount: 12,
  },
  {
    id: "p10",
    customerId: "5",
    name: "شقة مصر الجديدة",
    location: "مصر الجديدة",
    createdAt: "2026-07-01",
    status: "open",
    itemsCount: 4,
  },
  {
    id: "p11",
    customerId: "6",
    name: "بيت الجيزة",
    location: "الجيزة",
    createdAt: "2026-04-28",
    status: "open",
    itemsCount: 7,
  },
];

/** بنود تجريبية مربوطة بمشاريع */
export const projectItems: Record<string, DesignItem[]> = {
  p1: sampleDesignItems,
  p4: sampleDesignItems.slice(0, 2),
  p6: sampleDesignItems,
  p9: sampleDesignItems.slice(1),
  p10: sampleDesignItems.slice(0, 3),
  p11: sampleDesignItems,
};

export function loadLocalProjects(): Project[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(PROJECTS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Project[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function getProjectsForCustomer(customerId: string): Project[] {
  const local = loadLocalProjects().filter((p) => p.customerId === customerId);
  const localIds = new Set(local.map((p) => p.id));
  const seeded = projects.filter(
    (p) => p.customerId === customerId && !localIds.has(p.id)
  );
  return [...local, ...seeded].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function getProjectById(projectId: string): Project | undefined {
  return (
    loadLocalProjects().find((p) => p.id === projectId) ??
    projects.find((p) => p.id === projectId)
  );
}

const ITEMS_STORAGE_KEY = "upvc-project-items";

function loadLocalItems(): Record<string, DesignItem[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(ITEMS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, DesignItem[]>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function getItemsForProject(projectId: string): DesignItem[] {
  const local = loadLocalItems()[projectId];
  if (local) return local;
  return projectItems[projectId] ?? [];
}

export function saveItemsForProject(projectId: string, items: DesignItem[]) {
  if (typeof window === "undefined") return;
  const all = loadLocalItems();
  all[projectId] = items;
  localStorage.setItem(ITEMS_STORAGE_KEY, JSON.stringify(all));
}

export function upsertProjectOverride(project: Project) {
  const local = loadLocalProjects().filter((p) => p.id !== project.id);
  localStorage.setItem(
    PROJECTS_STORAGE_KEY,
    JSON.stringify([project, ...local])
  );
}
