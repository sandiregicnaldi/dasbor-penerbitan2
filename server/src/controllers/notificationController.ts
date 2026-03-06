import { Request, Response } from "express";
import { NotificationService } from "../services/notificationService";

export const NotificationController = {
    async getForUser(req: Request, res: Response) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ error: "Unauthorized" });
            }
            const notifs = await NotificationService.getUserNotifications(userId);
            res.json(notifs);
        } catch (error) {
            console.error("Notification fetch error:", error);
            res.status(500).json({ error: "Failed to fetch notifications" });
        }
    },

    async markRead(req: Request, res: Response) {
        try {
            await NotificationService.markAsRead(req.params.id);
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: "Failed to update notification" });
        }
    },

    async markAllRead(req: Request, res: Response) {
        try {
            const userId = req.user?.id;
            if (!userId) return res.status(401).json({ error: "Unauthorized" });
            await NotificationService.markAllAsRead(userId);
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: "Failed to update notifications" });
        }
    }
};
