
import { Request, Response } from "express";
import { NotificationService } from "../services/notificationService";

export const NotificationController = {
    async getForUser(req: Request, res: Response) {
        const userId = req.headers['x-user-id'] as string; // Temporary: Assume passed from middleware
        // In real implementation with Better Auth, use req.session.user.id
        if (!userId) {
            // For now, if no user ID, return empty or all? 
            // Let's assume passed in query for testing or header
            if (req.query.userId) {
                const notifs = await NotificationService.getUserNotifications(req.query.userId as string);
                return res.json(notifs);
            }
            return res.status(401).json({ error: "Unauthorized" });
        }

        try {
            const notifs = await NotificationService.getUserNotifications(userId);
            res.json(notifs);
        } catch (error) {
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
        const userId = req.headers['x-user-id'] as string;
        if (!userId && !req.query.userId) return res.status(401).json({ error: "Unauthorized" });

        try {
            await NotificationService.markAllAsRead(userId || req.query.userId as string);
            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: "Failed to update notifications" });
        }
    }
};
