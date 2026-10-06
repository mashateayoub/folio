import {
  pgTable,
  text,
  timestamp,
  integer,
  uuid,
  jsonb,
  primaryKey,
  customType,
} from "drizzle-orm/pg-core";
import { user } from "@/server/database/schema/auth";
import { type Project } from "@/features/projects/model";

const bytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType: () => "bytea",
});

export const organizations = pgTable("organizations", {
  id: uuid().primaryKey(),
  name: text().notNull(),
  owner_id: text()
    .notNull()
    .references(() => user.id),
  personal_owner_id: text()
    .unique()
    .references(() => user.id),
  status: text({ enum: ["active", "suspended"] })
    .notNull()
    .default("active"),
  plan: text({ enum: ["free", "team"] })
    .notNull()
    .default("free"),
  plan_valid_until: timestamp({ withTimezone: true }),
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const organizationMembers = pgTable(
  "organization_members",
  {
    organization_id: uuid()
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    user_id: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text({ enum: ["owner", "admin", "member", "viewer"] }).notNull(),
    state: text({ enum: ["active", "revoked"] })
      .notNull()
      .default("active"),
    valid_until: timestamp({ withTimezone: true }),
    created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.organization_id, table.user_id] })],
);

export const projects = pgTable("projects", {
  id: uuid().primaryKey(),
  organization_id: uuid()
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  owner_id: text()
    .notNull()
    .references(() => user.id),
  data: jsonb().$type<Project>().notNull(),
  revision: integer().notNull().default(1),
  visibility: text({ enum: ["private", "workspace"] })
    .notNull()
    .default("private"),
  state: text({ enum: ["active", "archived"] })
    .notNull()
    .default("active"),
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const projectMembers = pgTable(
  "project_members",
  {
    project_id: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: "cascade" }),
    user_id: text()
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text({ enum: ["editor", "viewer"] }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.project_id, table.user_id] })],
);

export const invitations = pgTable("invitations", {
  id: uuid().primaryKey(),
  organization_id: uuid()
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  email: text().notNull(),
  role: text({ enum: ["admin", "member", "viewer"] }).notNull(),
  token_hash: text().notNull().unique(),
  state: text({ enum: ["pending", "accepted", "revoked"] })
    .notNull()
    .default("pending"),
  expires_at: timestamp({ withTimezone: true }).notNull(),
  membership_valid_until: timestamp({ withTimezone: true }),
  created_by: text()
    .notNull()
    .references(() => user.id),
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const builds = pgTable("builds", {
  id: uuid().primaryKey(),
  organization_id: uuid()
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  project_id: uuid()
    .notNull()
    .references(() => projects.id, { onDelete: "cascade" }),
  actor_id: text().references(() => user.id, { onDelete: "set null" }),
  revision: integer().notNull(),
  snapshot: jsonb().$type<Project>(),
  status: text({ enum: ["running", "succeeded", "failed"] }).notNull(),
  pdf: bytea(),
  log: text(),
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
  finished_at: timestamp({ withTimezone: true }),
});

export const usageCounters = pgTable("usage_counters", {
  key: text().primaryKey(),
  count: integer().notNull(),
  expires_at: timestamp({ withTimezone: true }).notNull(),
});

export const auditEvents = pgTable("audit_events", {
  id: uuid().primaryKey(),
  organization_id: uuid()
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  actor_id: text().references(() => user.id, { onDelete: "set null" }),
  action: text().notNull(),
  resource_id: text(),
  metadata: jsonb()
    .$type<Record<string, string | number | boolean | null>>()
    .notNull()
    .default({}),
  created_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const schemaMigrations = pgTable("schema_migrations", {
  name: text().primaryKey(),
  applied_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
