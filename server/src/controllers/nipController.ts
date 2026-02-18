
import { Request, Response } from "express";
import { NipService } from "../services/nipService";
import { z } from "zod";

export const NipController = {
    async getHistory(req: Request, res: Response) {
        try {
            const history = await NipService.getNipHistory();
            res.json(history);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch NIP history" });
        }
    },

    async generate(req: Request, res: Response) {
        try {
            const schema = z.object({
                ddcCode: z.string().length(3),
                date: z.string(),
                sourceCode: z.string(),
                formatCode: z.string(),
            });

            const data = schema.parse(req.body);
            const nip = await NipService.generateNip(data);
            res.status(201).json(nip);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            res.status(500).json({ error: "Failed to generate NIP" });
        }
    }
};
