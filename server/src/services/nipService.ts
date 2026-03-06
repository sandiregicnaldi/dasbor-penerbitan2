
import { db } from "../db";
import { nipRecords } from "../db/schema";
import { eq, desc } from "drizzle-orm";
import { DDC_CODES, SOURCE_KEGIATAN, FORMAT_BUKU } from "../data/constants";

export const NipService = {
    // Get generated NIP history
    async getNipHistory(limit = 50) {
        return await db.query.nipRecords.findMany({
            orderBy: (records, { desc }) => [desc(records.createdAt)],
            limit: limit,
        });
    },

    // Generate new NIP
    async generateNip(data: {
        ddcCode: string;
        date: string; // ISO Date or YYYY-MM-DD
        sourceCode: string;
        formatCode: string;
        title: string; // Judul Buku
    }) {
        // Parse date
        const dateObj = new Date(data.date);
        const year = dateObj.getFullYear().toString();
        const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
        const day = dateObj.getDate().toString().padStart(2, '0');

        // YYYYMM for NIP code
        const yearMonth = `${year}${month}`;

        // Formatted date for display (DD/MM/YYYY)
        const formattedDate = `${day}/${month}/${year}`;

        // Get DDC label (optional lookup)
        const ddcLabel = DDC_CODES.find(d => d.code === data.ddcCode)?.label || '';

        // Determine serial number (nomor urut)
        // We need to count how many records exist for this YEAR
        // Actually simpler: find the latest record for this year and increment

        // Note: This needs to be robust. For now, doing a simple count logic in transaction.
        return await db.transaction(async (tx) => {
            // Find latest serial number for this year
            // We can check records where yearMonth starts with YYYY
            // Or simplified: just count total records for this year to be safe?
            // Better: look for max serial number in current year.
            // Since yearMonth stored as string 'YYYYMM', we can filter by prefix.

            // However, standard says "nomor urut di tahun itu".

            const existingRecs = await tx.query.nipRecords.findMany({
                where: (t, { like }) => like(t.yearMonth, `${year}%`),
                orderBy: (t, { desc }) => [desc(t.serialNumber)],
                limit: 1,
            });

            const lastSerial = existingRecs.length > 0 ? existingRecs[0].serialNumber : 0;
            const newSerial = lastSerial + 1;
            const nomorUrut = newSerial.toString().padStart(3, '0'); // 3 digits

            // Construct NIP
            // Format: DDC - YYYYMM - Source - Serial - Format
            const visualFormat = `${data.ddcCode} - ${yearMonth} - ${data.sourceCode} - ${nomorUrut} - ${data.formatCode}`;
            const barcode = `${data.ddcCode}${yearMonth}${data.sourceCode}${nomorUrut}${data.formatCode}`;

            // Save
            const [record] = await tx.insert(nipRecords).values({
                barcode,
                visualFormat,
                title: data.title,
                ddcCode: data.ddcCode,
                ddcLabel,
                yearMonth,
                formattedDate,
                sourceCode: data.sourceCode,
                serialNumber: newSerial,
                formatCode: data.formatCode,
            }).returning();

            return record;
        });
    }
};
