import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { db } from "./db";
import router from "./routes";
import { auth } from "./auth";
import { toNodeHandler } from "better-auth/node";
import { authMiddleware } from "./middlewares/auth";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// CORS - allow frontend origin with credentials
app.use(cors({
    origin: "http://localhost:5173",
    credentials: true,
}));

// Auth Routes MUST be before express.json() to avoid body consumption issues
app.all("/api/auth/*", toNodeHandler(auth));

// Parse JSON for all other routes
app.use(express.json());

// Auth middleware — extract user from session cookie for API routes
app.use("/api", authMiddleware);

// Request logger (for debugging)
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} ${req.user ? `(user: ${req.user.email})` : '(anonymous)'}`);
    next();
});

// Basic health check
app.get("/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API Routes
app.use("/api", router);

// Auto-migration: add status column if missing
async function runMigrations() {
    try {
        await db.execute(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active'`);
        await db.execute(`ALTER TABLE projects ADD COLUMN IF NOT EXISTS created_by TEXT`);
        console.log("[migration] projects.status and created_by columns ensured");
    } catch (e) {
        console.warn("[migration] skipped:", (e as Error).message);
    }
}

runMigrations().then(() => {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
});
