
import { db } from "../db";
import { stages, projects, notifications, users } from "../db/schema";
import { eq } from "drizzle-orm";

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

            // 2. Update the stage
            const [updatedStage] = await tx
                .update(stages)
                .set(data)
                .where(eq(stages.id, stageId))
                .returning();

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
                            .set({ status: 'active' }) // Set to active or 'draft' if we want them to manually start? Let's say active.
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
    }
};
