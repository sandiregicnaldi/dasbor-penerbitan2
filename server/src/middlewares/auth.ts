import { Request, Response, NextFunction } from "express";
import { auth } from "../auth";
import { fromNodeHeaders } from "better-auth/node";

// Extend Express Request to include user info
declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                name: string;
                email: string;
                role?: string;
                status?: string;
            };
        }
    }
}

/**
 * Auth middleware that extracts user from Better Auth session.
 * Attaches user info to req.user for downstream handlers.
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
    try {
        const session = await auth.api.getSession({
            headers: fromNodeHeaders(req.headers),
        });

        if (session?.user) {
            req.user = {
                id: session.user.id,
                name: session.user.name,
                email: session.user.email,
                role: (session.user as any).role || "personil",
                status: (session.user as any).status || "pending",
            };
        }
    } catch (e) {
        // No valid session — that's okay for some routes
    }

    next();
}

/**
 * Middleware that requires authentication.
 * Returns 401 if no valid session.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction) {
    if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    next();
}

/**
 * Middleware that requires admin role.
 * Returns 403 if user is not admin.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction) {
    if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    if (req.user.role !== "admin") {
        return res.status(403).json({ error: "Forbidden: admin access required" });
    }
    next();
}

/**
 * Middleware that requires admin role or being a personil (PJ).
 * Returns 403 if user is not admin or personil.
 */
export function requirePJOrAdmin(req: Request, res: Response, next: NextFunction) {
    if (!req.user) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    if (req.user.role !== "admin" && req.user.role !== "personil") {
        return res.status(403).json({ error: "Forbidden: PJ or admin access required" });
    }
    next();
}
