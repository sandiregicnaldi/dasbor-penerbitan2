import { db } from "./src/db";
import { stages } from "./src/db/schema";
import { eq, and } from "drizzle-orm";

async function seed() {
    // Assign "Staf Penerbitan" as PJ on the first stage of PRJ-2026-PSPB
    const targetProjectId = "PRJ-2026-PSPB";
    const targetPjId = "m2PQU4UqLSwnxAnWTJY1nGdAtkZw2Te6"; // Staf Penerbitan
    const deadline = new Date("2026-03-15T00:00:00Z");

    // Find the first stage
    const allStages = await db.query.stages.findMany({
        where: eq(stages.projectId, targetProjectId),
        orderBy: (stages, { asc }) => [asc(stages.order)],
    });

    if (allStages.length === 0) {
        console.log("No stages found for project", targetProjectId);
        process.exit(1);
    }

    const firstStage = allStages[0];
    console.log(`Assigning PJ to stage: id=${firstStage.id}, label="${firstStage.label}"`);

    const [updated] = await db.update(stages)
        .set({ pjId: targetPjId, deadline: deadline })
        .where(eq(stages.id, firstStage.id))
        .returning();

    console.log(`Updated stage: pjId=${updated.pjId}, deadline=${updated.deadline}`);

    // Verify via query with join 
    const verify = await db.query.stages.findFirst({
        where: eq(stages.id, firstStage.id),
        with: { pj: true },
    });

    console.log(`Verification: pjId=${verify?.pjId}, pjName=${(verify as any)?.pj?.name}, deadline=${verify?.deadline}`);

    process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
