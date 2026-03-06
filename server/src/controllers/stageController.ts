
import { Request, Response } from "express";
import { StageService } from "../services/stageService";
import { db } from "../db";
import { stages } from "../db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

const updateStageSchema = z.object({
    status: z.enum(['draft', 'active', 'review', 'revision', 'done', 'archived']).optional(),
    progress: z.number().min(0).max(100).optional(),
    deadline: z.string().optional(), // Date string
    pjId: z.string().optional(), // User ID
    resultLink: z.string().optional(),
    notes: z.array(z.object({ from: z.string(), text: z.string(), time: z.string() })).optional(),
});

const addNoteSchema = z.object({
    from: z.string(),
    text: z.string(),
    time: z.string(),
});

export const StageController = {
    async update(req: Request, res: Response) {
        try {
            const data = updateStageSchema.parse(req.body);
            const stageId = String(req.params.id);
            const isAdmin = req.user?.role === 'admin';
            const userId = req.user?.id;

            console.log(`[StageController.update] stageId=${stageId}, isAdmin=${isAdmin}, userId=${userId}, body=`, JSON.stringify(req.body));

            // Authorization check: only PJ or admin can update
            if (!isAdmin) {
                const stage = await db.query.stages.findFirst({
                    where: eq(stages.id, stageId),
                });

                if (!stage) {
                    return res.status(404).json({ error: "Stage not found" });
                }

                // User is not PJ of this stage
                if (stage.pjId !== userId) {
                    return res.status(403).json({ error: "Forbidden: Anda bukan penanggung jawab tahap ini" });
                }

                // Non-admin can only update: progress, resultLink, status (to 'review' only)
                if (data.status && data.status !== 'review' && data.status !== 'active') {
                    return res.status(403).json({ error: "Forbidden: Anda hanya bisa mengajukan review" });
                }

                // Non-admin cannot assign PJ or change deadline
                if (data.pjId || data.deadline) {
                    return res.status(403).json({ error: "Forbidden: Hanya admin yang bisa assign PJ dan deadline" });
                }
            }

            // Build updateData explicitly — strip empty strings that would break PostgreSQL types
            const updateData: any = {};
            if (data.status) updateData.status = data.status;
            if (data.pjId) updateData.pjId = data.pjId;
            if (data.resultLink) updateData.resultLink = data.resultLink;
            if (data.progress !== undefined) updateData.progress = data.progress;
            if (data.deadline) updateData.deadline = new Date(data.deadline);
            if (data.notes) updateData.notes = data.notes;

            console.log(`[StageController.update] updateData=`, JSON.stringify(updateData));

            const stage = await StageService.updateStage(stageId, updateData);
            res.json(stage);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            console.error("[StageController.update] error:", error);
            res.status(500).json({ error: "Failed to update stage" });
        }
    },

    async addNote(req: Request, res: Response) {
        try {
            const note = addNoteSchema.parse(req.body);
            const stage = await StageService.addNote(String(req.params.id), note);
            res.json(stage);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            res.status(500).json({ error: "Failed to add note" });
        }
    },

    async getCandidates(req: Request, res: Response) {
        try {
            const result = await StageService.getCandidates(String(req.params.id));
            res.json(result);
        } catch (error: any) {
            if (error.message === "Stage not found") {
                return res.status(404).json({ error: "Stage not found" });
            }
            console.error(error);
            res.status(500).json({ error: "Failed to get candidates" });
        }
    },

    async getCandidatesByLabel(req: Request, res: Response) {
        try {
            const label = req.query.label;
            if (!label) {
                return res.status(400).json({ error: "Label is required" });
            }
            const result = await StageService.getCandidatesByLabel(String(label));
            res.json(result);
        } catch (error: any) {
            console.error(error);
            res.status(500).json({ error: "Failed to get candidates" });
        }
    },
};
