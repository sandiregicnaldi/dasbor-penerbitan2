
import { Request, Response } from "express";
import { ProjectService } from "../services/projectService";
import { z } from "zod";
import { CATEGORIES } from "../data/categories";

const createProjectSchema = z.object({
    title: z.string().min(3),
    category: z.enum(Object.keys(CATEGORIES) as [string, ...string[]]),
    type: z.string().min(1),
    description: z.string().optional(),
    gdriveLink: z.string().optional(),
    stages: z.array(z.object({
        label: z.string(),
        order: z.number(),
        pjId: z.string().optional(),
        deadline: z.string().optional(),
    })).optional(),
});

export const ProjectController = {
    async getAll(req: Request, res: Response) {
        try {
            if (!req.user) {
                return res.status(401).json({ error: "Unauthorized" });
            }
            const isAdmin = req.user.role === 'admin';
            console.log(`[getAll] userId=${req.user.id}, role=${req.user.role}, isAdmin=${isAdmin}`);
            const projects = isAdmin
                ? await ProjectService.getAllProjects()
                : await ProjectService.getProjectsForUser(req.user.id);
            res.json(projects);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch projects" });
        }
    },

    async getOne(req: Request, res: Response) {
        try {
            const project = await ProjectService.getProjectById(String(req.params.id));
            if (!project) return res.status(404).json({ error: "Project not found" });
            res.json(project);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch project" });
        }
    },

    async getArchived(req: Request, res: Response) {
        try {
            const archived = await ProjectService.getArchivedProjects();
            res.json(archived);
        } catch (error) {
            res.status(500).json({ error: "Failed to fetch archived projects" });
        }
    },

    async create(req: Request, res: Response) {
        try {
            const data = createProjectSchema.parse(req.body);
            const project = await ProjectService.createProject({ ...data, createdBy: req.user?.id } as any);
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
            const project = await ProjectService.updateProject(String(req.params.id), req.body);
            res.json(project);
        } catch (error) {
            res.status(500).json({ error: "Failed to update project" });
        }
    },

    async delete(req: Request, res: Response) {
        try {
            await ProjectService.deleteProject(String(req.params.id));
            res.json({ message: "Project deleted" });
        } catch (error) {
            res.status(500).json({ error: "Failed to delete project" });
        }
    }
};
