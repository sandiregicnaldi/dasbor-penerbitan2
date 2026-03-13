
import { db } from "../db";
import { projects, stages, notifications } from "../db/schema";
import { eq, desc, and, sql } from "drizzle-orm";
import { CATEGORIES } from "../data/categories";

export const ProjectService = {
    // Get all projects (admin) — exclude archived
    async getAllProjects() {
        return await db.query.projects.findMany({
            where: sql`${projects.status} IS DISTINCT FROM 'archived'`,
            with: {
                stages: {
                    orderBy: (stages, { asc }) => [asc(stages.order)],
                    with: { pj: true },
                },
            },
            orderBy: (projects, { desc }) => [desc(projects.createdAt)],
        });
    },

    // Get projects where user is assigned as PJ OR created by the user
    async getProjectsForUser(userId: string) {
        console.log(`[getProjectsForUser] looking for stages with pjId=${userId} or createdBy=${userId}`);

        // Get distinct project IDs where this user is PJ
        const assignedStages = await db
            .select({ projectId: stages.projectId })
            .from(stages)
            .where(eq(stages.pjId, userId))
            .groupBy(stages.projectId);

        const projectIds = new Set(assignedStages.map(s => s.projectId));

        // Also get projects created by this user
        const createdProjects = await db.query.projects.findMany({
            where: sql`${projects.createdBy} = ${userId} AND (${projects.status} IS DISTINCT FROM 'archived')`,
            columns: { id: true },
        });
        createdProjects.forEach(p => projectIds.add(p.id));

        const allIds = [...projectIds];
        console.log(`[getProjectsForUser] found ${allIds.length} projects (assigned + created)`);

        if (allIds.length === 0) return [];

        return await db.query.projects.findMany({
            where: sql`${projects.id} IN (${sql.join(allIds.map(id => sql`${id}`), sql`, `)}) AND (${projects.status} IS DISTINCT FROM 'archived')`,
            with: {
                stages: {
                    orderBy: (stages, { asc }) => [asc(stages.order)],
                    with: { pj: true },
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
                    with: { pj: true },
                },
            },
        });
    },

    // Get archived projects
    async getArchivedProjects() {
        return await db.query.projects.findMany({
            where: sql`${projects.status} = 'archived'`,
            with: {
                stages: {
                    orderBy: (stages, { asc }) => [asc(stages.order)],
                    with: { pj: true },
                },
            },
            orderBy: (projects, { desc }) => [desc(projects.updatedAt)],
        });
    },

    // Create new project
    async createProject(data: {
        title: string;
        category: keyof typeof CATEGORIES;
        type: string;
        description?: string;
        gdriveLink?: string;
        createdBy?: string;
        stages?: { label: string; order: number; pjId?: string; deadline?: string }[];
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
                    gdriveLink: data.gdriveLink || null,
                    createdBy: data.createdBy || null,
                })
                .returning();

            // 2. Create Stages based on template
            // Type-specific stage overrides
            const TYPE_STAGES: Record<string, { label: string; order: number }[]> = {
                terjemahan: [
                    { label: "Terjemahkan", order: 1 },
                    { label: "Penyuntingan Naskah Terjemahan", order: 2 },
                ],
            };

            const stageTemplate = TYPE_STAGES[data.type] || categoryConfig.stages;

            // Use custom stages from request if template is empty (e.g., 'lainnya')
            const finalStages = stageTemplate.length > 0 ? stageTemplate : (data.stages || []);

            if (finalStages.length > 0) {
                // Merge PJ/deadline from request stages into template stages
                const requestStages = data.stages || [];
                const stageValues = finalStages.map((s: any, idx: number) => {
                    // Find matching request stage by order or index
                    const reqStage = requestStages.find((r: any) => r.order === s.order) || requestStages[idx] || {};
                    return {
                        projectId: id,
                        label: s.label,
                        order: s.order,
                        status: s.order === 1 ? "active" : "draft",
                        pjId: s.pjId || reqStage.pjId || null,
                        deadline: (s.deadline || reqStage.deadline) ? new Date(s.deadline || reqStage.deadline) : null,
                    };
                });

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
