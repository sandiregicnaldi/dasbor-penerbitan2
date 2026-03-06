import { db } from "./src/db";
import { writeFileSync } from "fs";

async function audit() {
    const lines: string[] = [];
    const log = (msg: string) => lines.push(msg);

    log("=== USERS ===");
    const allUsers = await db.query.users.findMany();
    for (const u of allUsers) {
        log(`  id=${u.id} name=${u.name} email=${u.email} role=${u.role} status=${u.status} skills=${JSON.stringify((u as any).skills)}`);
    }

    log("");
    log("=== PROJECTS WITH STAGES ===");
    const allProjects = await db.query.projects.findMany({
        with: {
            stages: {
                orderBy: (stages: any, { asc }: any) => [asc(stages.order)],
                with: { pj: true },
            },
        },
        orderBy: (projects: any, { desc }: any) => [desc(projects.createdAt)],
    });

    for (const p of allProjects) {
        log(`PROJECT: id=${p.id} title="${p.title}" cat=${p.category} gdrive=${p.gdriveLink || 'NULL'}`);
        for (const s of (p as any).stages) {
            log(`  STAGE: ord=${s.order} label="${s.label}" status=${s.status} pjId=${s.pjId || 'NULL'} pjName=${s.pj?.name || 'NONE'} deadline=${s.deadline || 'NULL'} result=${s.resultLink || 'NULL'}`);
        }
        log("");
    }

    log("=== AUDIT COMPLETE ===");
    writeFileSync("audit_result.txt", lines.join("\n"), "utf-8");
    console.log("Audit written to audit_result.txt");
    process.exit(0);
}

audit().catch(e => { console.error(e); process.exit(1); });
