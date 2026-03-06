
import { db } from "../db";
import { stages, projects, notifications, users } from "../db/schema";
import { eq, sql } from "drizzle-orm";
import { getRequiredSkills } from "../data/skillMapping";

export const StageService = {
    // Update stage status and handle workflow logic
    async updateStage(stageId: string, data: Partial<typeof stages.$inferInsert>) {
        return await db.transaction(async (tx) => {
            // 1. Get current stage and project info
            const currentStage = await tx.query.stages.findFirst({
                where: eq(stages.id, stageId),
                with: {
                    project: true,
                },
            });

            if (!currentStage) throw new Error("Stage not found");

            console.log(`[updateStage] stageId=${stageId}, data=`, JSON.stringify(data));

            // 2. Update the stage
            const [updatedStage] = await tx
                .update(stages)
                .set(data)
                .where(eq(stages.id, stageId))
                .returning();

            console.log(`[updateStage] saved pjId=${updatedStage.pjId}, resultLink=${updatedStage.resultLink}`);

            // 2b. Single-PJ logic: If assigning PJ to medsos/keuangan project,
            // auto-assign same PJ to ALL stages in that project
            if (data.pjId && (currentStage.project.category === 'medsos' || currentStage.project.category === 'keuangan')) {
                // Get all other stages in this project
                const allProjectStages = await tx.query.stages.findMany({
                    where: eq(stages.projectId, currentStage.projectId),
                });

                for (const otherStage of allProjectStages) {
                    if (otherStage.id !== stageId) {
                        await tx.update(stages)
                            .set({ pjId: data.pjId as string })
                            .where(eq(stages.id, otherStage.id));
                    }
                }
            }

            // 3. Workflow Logic: Status Transitions

            // If status changed to 'review', notify admins
            if (data.status === 'review' && currentStage.status !== 'review') {
                const admins = await tx.query.users.findMany({
                    where: eq(users.role, 'admin'),
                });

                for (const admin of admins) {
                    await tx.insert(notifications).values({
                        userId: admin.id,
                        type: 'review',
                        title: 'Review Diperlukan',
                        message: `Tahap "${currentStage.label}" pada proyek "${currentStage.project.title}" menunggu review.`,
                        projectId: currentStage.projectId,
                    });
                }
            }

            // If status changed to 'revision', notify PJ
            if (data.status === 'revision' && currentStage.status !== 'revision' && currentStage.pjId) {
                await tx.insert(notifications).values({
                    userId: currentStage.pjId,
                    type: 'revision',
                    title: 'Revisi Diperlukan',
                    message: `Tahap "${currentStage.label}" perlu direvisi. Cek catatan untuk detailnya.`,
                    projectId: currentStage.projectId,
                });
            }

            // If status changed to 'done' (Approved), activate next stage
            if (data.status === 'done' && currentStage.status !== 'done') {
                // Notify current PJ it's approved
                if (currentStage.pjId) {
                    await tx.insert(notifications).values({
                        userId: currentStage.pjId,
                        type: 'approved',
                        title: 'Tahap Disetujui',
                        message: `Pekerjaan Anda di tahap "${currentStage.label}" telah disetujui.`,
                        projectId: currentStage.projectId,
                    });
                }

                // Activate next stage if sequential
                if (currentStage.project.workflowType === 'sequential') {
                    const nextStage = await tx.query.stages.findFirst({
                        where: (stages, { and, eq, gt }) => and(
                            eq(stages.projectId, currentStage.projectId),
                            eq(stages.order, currentStage.order + 1)
                        ),
                    });

                    if (nextStage) {
                        await tx.update(stages)
                            .set({ status: 'active' })
                            .where(eq(stages.id, nextStage.id));

                        // If next stage has PJ assigned (e.g. Medsos single PJ), notify them
                        if (nextStage.pjId) {
                            await tx.insert(notifications).values({
                                userId: nextStage.pjId,
                                type: 'assigned',
                                title: 'Tugas Baru',
                                message: `Tahap "${nextStage.label}" kini aktif dan ditugaskan kepada Anda.`,
                                projectId: currentStage.projectId,
                            });
                        }
                    }
                }
            }

            return updatedStage;
        });
    },

    // Add a note/chat to a stage
    async addNote(stageId: string, note: { from: string; text: string; time: string }) {
        const stage = await db.query.stages.findFirst({
            where: eq(stages.id, stageId),
        });

        if (!stage) throw new Error("Stage not found");

        const currentNotes = (stage.notes as any[]) || [];
        const newNotes = [...currentNotes, note];

        return await db
            .update(stages)
            .set({ notes: newNotes })
            .where(eq(stages.id, stageId))
            .returning();
    },

    // Get PJ candidates for a stage based on skill matching
    async getCandidates(stageId: string) {
        const stage = await db.query.stages.findFirst({
            where: eq(stages.id, stageId),
            with: { project: true },
        });

        if (!stage) throw new Error("Stage not found");

        const requiredSkills = getRequiredSkills(stage.label);

        // Fetch ALL active users, then filter in JS for skill matching.
        // This avoids issues with Drizzle + PostgreSQL jsonb ?| operator parameterization.
        const allActiveUsers = await db.query.users.findMany({
            where: (u, { eq: eqOp }) => eqOp(u.status, 'active'),
        });

        let candidates: any[];
        if (requiredSkills.length === 0) {
            // No skill mapping = any active user is eligible
            candidates = allActiveUsers;
        } else {
            // Filter users whose skills array contains at least one of the required skills
            candidates = allActiveUsers.filter((user: any) => {
                const userSkills: string[] = user.skills || [];
                return requiredSkills.some(skill => userSkills.includes(skill));
            });
        }

        console.log(`[getCandidates] stageLabel=${stage.label}, requiredSkills=${JSON.stringify(requiredSkills)}, totalActive=${allActiveUsers.length}, matched=${candidates.length}`);

        // Enrich each candidate with conflict info
        const enriched = await Promise.all(
            candidates.map(async (user: any) => {
                const conflict = await this.checkConflict(user.id, stage.projectId);
                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    skills: user.skills || [],
                    avatarInitials: user.avatarInitials || user.avatar_initials,
                    conflict: conflict.conflict,
                    conflictStages: conflict.stages,
                };
            })
        );

        return {
            stageId: stage.id,
            stageLabel: stage.label,
            requiredSkills,
            candidates: enriched,
        };
    },

    // Check if a user has active stages in other projects
    async checkConflict(userId: string, currentProjectId: string) {
        const conflicting = await db.query.stages.findMany({
            where: (s, { and, eq: eqOp, ne, inArray }) => and(
                eqOp(s.pjId, userId),
                inArray(s.status, ['draft', 'active']),
                ne(s.projectId, currentProjectId),
            ),
            with: { project: true },
        });

        return {
            conflict: conflicting.length > 0,
            stages: conflicting.map(s => ({
                stageId: s.id,
                stageLabel: s.label,
                projectId: s.projectId,
                projectTitle: (s as any).project?.title || s.projectId,
                status: s.status,
            })),
        };
    },

    // Get PJ candidates by stage label (for pre-creation filtering)
    async getCandidatesByLabel(stageLabel: string) {
        const requiredSkills = getRequiredSkills(stageLabel);

        console.log(`[getCandidatesByLabel] stageLabel=${stageLabel}, requiredSkills=${JSON.stringify(requiredSkills)}`);

        // Fetch ALL active users, then filter in JS for skill matching.
        const allActiveUsers = await db.query.users.findMany({
            where: (u, { eq: eqOp }) => eqOp(u.status, 'active'),
        });

        let candidates: any[];
        if (requiredSkills.length === 0) {
            candidates = allActiveUsers;
        } else {
            candidates = allActiveUsers.filter((user: any) => {
                const userSkills: string[] = user.skills || [];
                return requiredSkills.some(skill => userSkills.includes(skill));
            });
        }

        console.log(`[getCandidatesByLabel] totalActive=${allActiveUsers.length}, matched=${candidates.length}`);
        // Log each candidate for debugging
        candidates.forEach((u: any) => {
            console.log(`  -> candidate: ${u.name} (role=${u.role}, skills=${JSON.stringify(u.skills)})`);
        });

        const enriched = await Promise.all(
            candidates.map(async (user: any) => {
                const conflictCount = await db.query.stages.findMany({
                    where: (s, { and, eq: eqOp, inArray }) => and(
                        eqOp(s.pjId, user.id),
                        inArray(s.status, ['draft', 'active']),
                    ),
                });

                return {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    role: user.role,
                    skills: user.skills || [],
                    avatarInitials: user.avatarInitials || user.avatar_initials,
                    conflict: conflictCount.length > 0,
                    conflictStages: conflictCount.map(s => ({
                        stageLabel: s.label,
                        projectId: s.projectId,
                        status: s.status,
                    })),
                };
            })
        );

        return {
            stageLabel,
            requiredSkills,
            candidates: enriched,
        };
    },
};
