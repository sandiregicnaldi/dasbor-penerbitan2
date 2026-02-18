
import { Router } from "express";
import { ProjectController } from "./controllers/projectController";
import { StageController } from "./controllers/stageController";
import { NipController } from "./controllers/nipController";
import { NotificationController } from "./controllers/notificationController";
import { auth } from "./auth";
import { toNodeHandler } from "better-auth/node";

const router = Router();

// Auth Routes (handled by Better Auth)
router.all("/auth/*", toNodeHandler(auth));

// Projects
router.get("/projects", ProjectController.getAll);
router.post("/projects", ProjectController.create);
router.get("/projects/:id", ProjectController.getOne);
router.patch("/projects/:id", ProjectController.update);
router.delete("/projects/:id", ProjectController.delete);

// Stages
router.patch("/stages/:id", StageController.update);
router.post("/stages/:id/notes", StageController.addNote);

// NIP
router.get("/nip/history", NipController.getHistory);
router.post("/nip/generate", NipController.generate);

// Notifications
router.get("/notifications", NotificationController.getForUser);
router.patch("/notifications/:id/read", NotificationController.markRead);
router.patch("/notifications/read-all", NotificationController.markAllRead);

export default router;
