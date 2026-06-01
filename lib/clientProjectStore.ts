import type { ProjectInput, ProjectRecord } from "@/lib/types";

const projectsKey = "ai-practice-agent:projects";

function readProjects(): ProjectRecord[] {
  if (typeof window === "undefined") return [];

  try {
    const saved = window.localStorage.getItem(projectsKey);
    return saved ? (JSON.parse(saved) as ProjectRecord[]) : [];
  } catch {
    window.localStorage.removeItem(projectsKey);
    return [];
  }
}

function writeProjects(projects: ProjectRecord[]) {
  window.localStorage.setItem(projectsKey, JSON.stringify(projects));
}

export function listLocalProjects() {
  return readProjects()
    .slice()
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function getLocalProject(id: string) {
  return readProjects().find((project) => project.id === id) || null;
}

export function createLocalProject(input: ProjectInput) {
  const now = new Date().toISOString();
  const project: ProjectRecord = {
    ...input,
    id: crypto.randomUUID(),
    startDate: new Date(input.startDate).toISOString(),
    endDate: new Date(input.endDate).toISOString(),
    requirements: input.requirements || "",
    stage: "调研前准备",
    topics: null,
    selectedTopic: null,
    researchPlan: null,
    createdAt: now,
    updatedAt: now
  };

  writeProjects([project, ...readProjects()]);
  return project;
}

export function updateLocalProject(id: string, data: Partial<ProjectRecord>) {
  const projects = readProjects();
  const index = projects.findIndex((project) => project.id === id);
  if (index === -1) return null;

  const updated: ProjectRecord = {
    ...projects[index],
    ...data,
    updatedAt: new Date().toISOString()
  };

  projects[index] = updated;
  writeProjects(projects);
  return updated;
}
