import { pgTable, uuid, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { organizations } from "@/server/database/schema/application";

export const workspaceBilling = pgTable("workspace_billing", {
  organization_id: uuid()
    .primaryKey()
    .references(() => organizations.id, { onDelete: "cascade" }),
  customer_id: text().unique(),
  subscription_id: text().unique(),
  price_id: text(),
  status: text().notNull().default("none"),
  period_end: timestamp({ withTimezone: true }),
  cancel_at_period_end: boolean().notNull().default(false),
  cancel_at: timestamp({ withTimezone: true }),
  checkout_request: uuid().notNull(),
  checkout_session_id: text(),
  updated_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
});

export const billingEvents = pgTable("billing_events", {
  event_id: text().primaryKey(),
  organization_id: uuid()
    .notNull()
    .references(() => organizations.id, { onDelete: "cascade" }),
  event_type: text().notNull(),
  processed_at: timestamp({ withTimezone: true }).notNull().defaultNow(),
});
