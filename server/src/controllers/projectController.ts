
import { Request, Response } from "express";
import { ProjectService } from "../services/projectService";
import { z } from "zod";
import { CATEGORIES } from "../data/categories";

const createProjectSchema = z.object({
    title: z.string().min(3),
    category: z.enum(Object.keys(CATEGORIES) as [string, ...string[]]), // 'terbitan', 'medsos', ...
    type: z.string().min(1),
    description: z.string().optional(),
});

export const ProjectController = {
    async getAll(req: Request, res: Response) {
        try {
            const projects = await ProjectService.getAllProjects();
            res.json(projects);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch projects" });
        }
    },

    async getOne(req: Request, res: Response) {
        try {
            const project = await ProjectService.getProjectById(req.params.id);
            if (!project) return res.status(404).json({ error: "Project not found" });
            res.json(project);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch project" });
        }
    },

    async create(req: Request, res: Response) {
        try {
            const data = createProjectSchema.parse(req.body);
            const project = await ProjectService.createProject(data);
            res.status(201).json(project);
        } catch (error) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({ error: error.errors });
            }
            res.status(500).json({ error: "Failed to create project" });
        }
    },

    async update(req: Request, res: Response) {
        try {
            const project = await ProjectService.updateProject(req.params.id, req.body);
            res.json(project);
        } catch (error) {
            res.status(500).json({ error: "Failed to update project" });
        }
    },

    async delete(req: Request, res: Response) {
        try {
            await ProjectService.deleteProject(req.params.id);
            res.json({ message: "Project deleted" });
        } catch (error) {
            res.status(500).json({ error: "Failed to delete project" });
        }
    }
};
