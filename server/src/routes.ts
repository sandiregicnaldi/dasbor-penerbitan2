
import { Router } from "express";
import { ProjectController } from "./controllers/projectController";
import { StageController } from "./controllers/stageController";
import { NipController } from "./controllers/nipController";
import { NotificationController } from "./controllers/notificationController";
import { AdminController } from "./controllers/adminController";
import { DocumentController } from "./controllers/documentController";
import { requireAdmin, requirePJOrAdmin } from "./middlewares/auth";
import { auth } from "./auth";
import { toNodeHandler } from "better-auth/node";

const router = Router();

// Auth Routes are now handled in index.ts directly

// Projects
router.get("/projects", ProjectController.getAll);
router.post("/projects", ProjectController.create);
router.get("/projects/archived", ProjectController.getArchived);
router.get("/projects/:id", ProjectController.getOne);
router.patch("/projects/:id", ProjectController.update);
router.delete("/projects/:id", requireAdmin, ProjectController.delete);

// Stages
router.post("/stages", requireAdmin, StageController.create);
router.patch("/stages/:id", StageController.update);
router.patch("/stages/:id/notes", requirePJOrAdmin, StageController.addNote);
router.get("/stages/candidates-by-label", StageController.getCandidatesByLabel);
router.get("/stages/:id/candidates", requireAdmin, StageController.getCandidates);

// NIP
router.get("/nip/history", NipController.getHistory);
router.post("/nip/generate", NipController.generate);

// Notifications
router.get("/notifications", NotificationController.getForUser);
router.patch("/notifications/:id/read", NotificationController.markRead);
router.patch("/notifications/read-all", NotificationController.markAllRead);

// Admin - User Management
router.get("/admin/users", requireAdmin, AdminController.getUsers);
router.patch("/admin/users/:id", requireAdmin, AdminController.updateUser);

// Documents
router.get("/documents", DocumentController.getAll);
router.post("/documents", requireAdmin, DocumentController.create);
router.delete("/documents/:id", requireAdmin, DocumentController.delete);

export default router;

