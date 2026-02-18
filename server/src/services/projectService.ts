
import { db } from "../db";
import { projects, stages, notifications } from "../db/schema";
import { eq, desc, and } from "drizzle-orm";
import { CATEGORIES } from "../data/categories";
import { v4 as uuidv4 } from "uuid";

export const ProjectService = {
    // Get all projects with optional filtering
    async getAllProjects() {
        return await db.query.projects.findMany({
            with: {
                stages: {
                    orderBy: (stages, { asc }) => [asc(stages.order)],
                },
            },
            orderBy: (projects, { desc }) => [desc(projects.createdAt)],
        });
    },

    // Get project by ID
    async getProjectById(id: string) {
        return await db.query.projects.findFirst({
            where: eq(projects.id, id),
            with: {
                stages: {
                    orderBy: (stages, { asc }) => [asc(stages.order)],
                },
            },
        });
    },

    // Create new project
    async createProject(data: {
        title: string;
        category: keyof typeof CATEGORIES;
        type: string;
        description?: string; // Optional (not in schema yet, maybe useful later)
    }) {
        // Generate ID: PRJ-YYYY-XXXX
        const year = new Date().getFullYear();
        const random = Math.random().toString(36).substr(2, 4).toUpperCase();
        const id = `PRJ-${year}-${random}`;

        // Get category config
        const categoryConfig = CATEGORIES[data.category];
        if (!categoryConfig) throw new Error("Invalid category");

        // Start transaction
        return await db.transaction(async (tx) => {
            // 1. Create Project
            const [newProject] = await tx
                .insert(projects)
                .values({
                    id,
                    title: data.title,
                    category: data.category,
                    type: data.type,
                    workflowType: categoryConfig.workflow,
                })
                .returning();

            // 2. Create Stages based on template
            if (categoryConfig.stages.length > 0) {
                const stageValues = categoryConfig.stages.map((s) => ({
                    projectId: id,
                    label: s.label,
                    order: s.order,
                    status: s.order === 1 ? "active" : "draft", // First stage active
                }));

                // For 'medsos' / 'keuangan' (singlePJ), we might assign PJ later
                // For now just create the stages
                await tx.insert(stages).values(stageValues);
            }

            // 3. Create Notification
            await tx.insert(notifications).values({
                type: "project_created",
                title: "Proyek Baru Dibuat",
                message: `Proyek "${data.title}" telah dibuat.`,
                projectId: id,
            });

            return newProject;
        });
    },

    // Update project metadata
    async updateProject(id: string, data: Partial<typeof projects.$inferInsert>) {
        return await db
            .update(projects)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(projects.id, id))
            .returning();
    },

    // Delete project
    async deleteProject(id: string) {
        return await db.delete(projects).where(eq(projects.id, id));
    },
};
