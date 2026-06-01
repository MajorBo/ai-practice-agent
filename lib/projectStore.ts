import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ProjectInput, ProjectRecord, TopicCandidate } from "@/lib/types";

const storeDir = path.join(process.cwd(), "work");
const storePath = path.join(storeDir, "projects-store.json");

function shouldUsePrisma() {
  return Boolean(process.env.DATABASE_URL);
}

async function getPrismaClient() {
  const { prisma } = await import("@/lib/prisma");
  return prisma;
}

type LocalDb = {
  projects: ProjectRecord[];
};

async function readLocalDb(): Promise<LocalDb> {
  await mkdir(storeDir, { recursive: true });
  if (!existsSync(storePath)) {
    await writeFile(storePath, JSON.stringify({ projects: [] }, null, 2), "utf8");
  }
  return JSON.parse(await readFile(storePath, "utf8")) as LocalDb;
}

async function writeLocalDb(db: LocalDb) {
  await mkdir(storeDir, { recursive: true });
  await writeFile(storePath, JSON.stringify(db, null, 2), "utf8");
}

function toProjectRecord(project: any): ProjectRecord {
  return {
    id: project.id,
    name: project.name,
    practiceType: project.practiceType,
    theme: project.theme,
    location: project.location,
    startDate: new Date(project.startDate).toISOString(),
    endDate: new Date(project.endDate).toISOString(),
    teamSize: project.teamSize,
    expectedOutcome: project.expectedOutcome,
    requirements: project.requirements || "",
    stage: project.stage,
    topics: (project.topics as TopicCandidate[] | null) || null,
    selectedTopic: (project.selectedTopic as TopicCandidate | null) || null,
    researchPlan: project.researchPlan || null,
    createdAt: new Date(project.createdAt).toISOString(),
    updatedAt: new Date(project.updatedAt).toISOString()
  };
}

export async function listProjects() {
  if (shouldUsePrisma()) {
    const prisma = await getPrismaClient();
    return prisma.project.findMany({
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        name: true,
        practiceType: true,
        location: true,
        stage: true,
        updatedAt: true
      }
    });
  }

  const db = await readLocalDb();
  return db.projects
    .slice()
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .map((project) => ({
      id: project.id,
      name: project.name,
      practiceType: project.practiceType,
      location: project.location,
      stage: project.stage,
      updatedAt: project.updatedAt
    }));
}

export async function createProject(input: ProjectInput) {
  if (shouldUsePrisma()) {
    const prisma = await getPrismaClient();
    return prisma.project.create({
      data: {
        ...input,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate)
      }
    });
  }

  const db = await readLocalDb();
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
  db.projects.unshift(project);
  await writeLocalDb(db);
  return project;
}

export async function getProject(id: string) {
  if (shouldUsePrisma()) {
    const prisma = await getPrismaClient();
    const project = await prisma.project.findUnique({ where: { id } });
    return project ? toProjectRecord(project) : null;
  }

  const db = await readLocalDb();
  return db.projects.find((project) => project.id === id) || null;
}

export async function updateProject(id: string, data: Partial<ProjectRecord>) {
  if (shouldUsePrisma()) {
    const [{ Prisma }, prisma] = await Promise.all([import("@prisma/client"), getPrismaClient()]);
    const prismaData: Record<string, unknown> = { ...data };
    if ("topics" in data) prismaData.topics = data.topics as any;
    if ("selectedTopic" in data) prismaData.selectedTopic = data.selectedTopic === null ? Prisma.JsonNull : (data.selectedTopic as any);
    return prisma.project.update({ where: { id }, data: prismaData });
  }

  const db = await readLocalDb();
  const index = db.projects.findIndex((project) => project.id === id);
  if (index === -1) return null;

  db.projects[index] = {
    ...db.projects[index],
    ...data,
    updatedAt: new Date().toISOString()
  };
  await writeLocalDb(db);
  return db.projects[index];
}
