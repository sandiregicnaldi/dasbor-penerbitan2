
import { db } from "../db";
import { notifications } from "../db/schema";
import { eq, desc, and } from "drizzle-orm";

export const NotificationService = {
    // Get notifications for a user (or global ones)
    async getUserNotifications(userId: string) {
        return await db.query.notifications.findMany({
            where: (notifications, { or, eq, isNull }) => or(
                eq(notifications.userId, userId),
                isNull(notifications.userId) // System-wide
            ),
            orderBy: (notifications, { desc }) => [desc(notifications.createdAt)],
            limit: 50,
        });
    },

    // Mark specific notification as read
    async markAsRead(id: string) {
        return await db
            .update(notifications)
            .set({ isRead: true })
            .where(eq(notifications.id, id))
            .returning();
    },

    // Mark all as read for a user
    async markAllAsRead(userId: string) {
        return await db
            .update(notifications)
            .set({ isRead: true })
            .where(
                and(
                    eq(notifications.userId, userId),
                    eq(notifications.isRead, false)
                )
            )
            .returning();
    },

    // Create notification (internal use mostly, but good to have)
    async createNotification(data: typeof notifications.$inferInsert) {
        return await db.insert(notifications).values(data).returning();
    }
};
