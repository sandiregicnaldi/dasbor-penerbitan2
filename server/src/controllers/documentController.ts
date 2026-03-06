import { Request, Response } from "express";
import { DocumentService } from "../services/documentService";
import { z } from "zod";

const createDocSchema = z.object({
    name: z.string().min(1),
    url: z.string().min(1),
    type: z.string().optional(),
});

export const DocumentController = {
    async getAll(req: Request, res: Response) {
        try {
            const docs = await DocumentService.getAll();
            res.json(docs);
        } catch (error) {
            console.error("DocumentController.getAll error:", error);
            res.status(500).json({ error: "Failed to fetch documents" });
        }
    },

    async create(req: Request, res: Response) {
        try {
            const data = createDocSchema.parse(req.body);
            const doc = await DocumentService.create({
                ...data,
                uploadedBy: req.user?.id,
            });
            res.status(201).json(doc);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            console.error("DocumentController.create error:", error);
            res.status(500).json({ error: "Failed to create document" });
        }
    },

    async delete(req: Request, res: Response) {
        try {
            await DocumentService.delete(String(req.params.id));
            res.json({ message: "Document deleted" });
        } catch (error) {
            console.error("DocumentController.delete error:", error);
            res.status(500).json({ error: "Failed to delete document" });
        }
    },
};
