
import { Request, Response } from "express";
import { StageService } from "../services/stageService";
import { z } from "zod";

const updateStageSchema = z.object({
    status: z.enum(['draft', 'active', 'review', 'revision', 'done', 'archived']).optional(),
    progress: z.number().min(0).max(100).optional(),
    deadline: z.string().optional(), // Date string
    pjId: z.string().optional(), // User ID
    resultLink: z.string().optional(),
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

            // Convert date string to Date object if present
            const updateData: any = { ...data };
            if (data.deadline) {
                updateData.deadline = new Date(data.deadline);
            }

            const stage = await StageService.updateStage(req.params.id, updateData);
            res.json(stage);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            console.error(error);
            res.status(500).json({ error: "Failed to update stage" });
        }
    },

    async addNote(req: Request, res: Response) {
        try {
            const note = addNoteSchema.parse(req.body);
            const stage = await StageService.addNote(req.params.id, note);
            res.json(stage);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            res.status(500).json({ error: "Failed to add note" });
        }
    }
};
