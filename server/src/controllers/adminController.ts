import { Request, Response } from "express";
import { db } from "../db";
import { users } from "../db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

export class AdminController {
    static async getUsers(req: Request, res: Response) {
        try {
            const allUsers = await db
                .select({
                    id: users.id,
                    name: users.name,
                    email: users.email,
                    role: users.role,
                    status: users.status,
                    skills: users.skills,
                    createdAt: users.createdAt,
                })
                .from(users)
                .orderBy(users.createdAt);

            res.json(allUsers);
        } catch (e: any) {
            console.error("AdminController.getUsers error:", e);
            res.status(500).json({ error: e.message });
        }
    }

    static async updateUser(req: Request, res: Response) {
        try {
            const { id } = req.params;

            const schema = z.object({
                role: z.enum(["admin", "personil"]).optional(),
                status: z.enum(["pending", "active", "disabled"]).optional(),
                skills: z.array(z.string()).optional(),
            });

            const data = schema.parse(req.body);

            // Build update object — only include fields that were provided
            const updateObj: Record<string, any> = {};
            if (data.role !== undefined) updateObj.role = data.role;
            if (data.status !== undefined) updateObj.status = data.status;
            if (data.skills !== undefined) updateObj.skills = data.skills;

            if (Object.keys(updateObj).length === 0) {
                return res.status(400).json({ error: "No fields to update" });
            }

            updateObj.updatedAt = new Date();

            const [updated] = await db
                .update(users)
                .set(updateObj)
                .where(eq(users.id, String(id)))
                .returning({
                    id: users.id,
                    name: users.name,
                    email: users.email,
                    role: users.role,
                    status: users.status,
                    skills: users.skills,
                });

            if (!updated) {
                return res.status(404).json({ error: "User not found" });
            }

            res.json(updated);
        } catch (e: any) {
            if (e.name === "ZodError") {
                return res.status(400).json({ error: "Invalid input", details: e.errors });
            }
            console.error("AdminController.updateUser error:", e);
            res.status(500).json({ error: e.message });
        }
    }
}
