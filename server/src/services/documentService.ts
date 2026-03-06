import { db } from "../db";
import { documents } from "../db/schema";
import { eq, desc } from "drizzle-orm";

export const DocumentService = {
    async getAll() {
        return await db.query.documents.findMany({
            orderBy: (documents, { desc }) => [desc(documents.createdAt)],
        });
    },

    async create(data: { name: string; url: string; type?: string; uploadedBy?: string }) {
        const [doc] = await db
            .insert(documents)
            .values({
                name: data.name,
                url: data.url,
                type: data.type || "pdf",
                uploadedBy: data.uploadedBy || null,
            })
            .returning();
        return doc;
    },

    async delete(id: string) {
        return await db.delete(documents).where(eq(documents.id, id));
    },
};
