
import { pgTable, text, timestamp, boolean, uuid, integer, jsonb, date, varchar, serial } from "drizzle-orm/pg-core";

// Users (Managed by Better Auth with extensions)
export const users = pgTable("user", {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull(),
    image: text("image"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),

    // Custom fields
    role: text("role").default("personil"), // 'admin' | 'personil'
    avatarInitials: varchar("avatar_initials", { length: 2 }),
    skills: jsonb("skills").$type<string[]>(), // Array of skills
});

export const sessions = pgTable("session", {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id").notNull().references(() => users.id),
});

export const accounts = pgTable("account", {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id").notNull().references(() => users.id),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull(),
    updatedAt: timestamp("updated_at").notNull(),
});

export const verifications = pgTable("verification", {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at"),
    updatedAt: timestamp("updated_at"),
});

// Projects
export const projects = pgTable("projects", {
    id: text("id").primaryKey(), // PRJ-YYYY-XXXX
    title: text("title").notNull(),
    category: text("category").notNull(), // 'terbitan', 'medsos', etc.
    type: text("type"), // 'reguler', etc.
    workflowType: text("workflow_type").default("sequential"), // 'sequential', 'parallel'
    gdriveLink: text("gdrive_link"),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
});

// Stages
export const stages = pgTable("stages", {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: text("project_id").references(() => projects.id, { onDelete: 'cascade' }).notNull(),
    label: text("label").notNull(),
    order: integer("order").notNull(),
    status: text("status").default("draft"), // 'draft', 'active', 'review', 'revision', 'done', 'archived'
    pjId: text("pj_id").references(() => users.id), // Nullable
    deadline: timestamp("deadline"),
    progress: integer("progress").default(0),
    resultLink: text("result_link"),
    notes: jsonb("notes").$type<{ from: string, text: string, time: string }[]>(), // Array of chat notes
});

// Notifications
export const notifications = pgTable("notifications", {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: text("user_id").references(() => users.id), // Nullable (if null, system-wide/admin)
    type: text("type").notNull(), // 'project_created', 'assigned', etc.
    title: text("title").notNull(),
    message: text("message").notNull(),
    isRead: boolean("is_read").default(false),
    projectId: text("project_id").references(() => projects.id, { onDelete: 'cascade' }),
    createdAt: timestamp("created_at").defaultNow(),
});

// Documents
export const documents = pgTable("documents", {
    id: uuid("id").defaultRandom().primaryKey(),
    name: text("name").notNull(),
    url: text("url").notNull(),
    type: text("type").default("pdf"),
    uploadedBy: text("uploaded_by").references(() => users.id),
    createdAt: timestamp("created_at").defaultNow(),
});

// NIP History
export const nipRecords = pgTable("nip_records", {
    id: uuid("id").defaultRandom().primaryKey(),
    barcode: text("barcode").notNull().unique(), // 14 digit
    visualFormat: text("visual_format").notNull(), // Readable
    ddcCode: text("ddc_code").notNull(),
    ddcLabel: text("ddc_label"),
    yearMonth: text("year_month").notNull(), // YYYYMM
    formattedDate: text("formatted_date"), // DD/MM/YYYY
    sourceCode: text("source_code").notNull(),
    serialNumber: integer("serial_number").notNull(),
    formatCode: text("format_code").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
});
