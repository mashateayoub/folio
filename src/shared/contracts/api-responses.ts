import { z } from "zod";
import { projectSchema } from "@/features/projects/model";

const limits = z.object({
  projects: z.number(),
  seats: z.number(),
  compiles: z.number(),
});

const plan = limits.extend({ name: z.string() });

const organization = z.object({
  id: z.string(),
  name: z.string(),
  role: z.enum(["owner", "admin", "member", "viewer"]),
  status: z.enum(["active", "suspended"]),
  plan: z.enum(["free", "team"]),
});

const project = projectSchema.safeExtend({
  revision: z.number().int(),
  organizationId: z.string(),
  ownerId: z.string(),
  visibility: z.enum(["private", "workspace"]),
  state: z.enum(["active", "archived"]),
  permissions: z.object({
    read: z.boolean(),
    write: z.boolean(),
    compile: z.boolean(),
    manage: z.boolean(),
    delete: z.boolean(),
  }),
});

export const responses = {
  json: z.json(),
  project,
  projects: z.array(project),
  organization,
  builds: z.array(
    z.object({ id: z.string(), revision: z.number(), hasPdf: z.boolean() }),
  ),
  invitation: z.object({ name: z.string(), role: z.string() }),
  grants: z.array(
    z.object({
      userId: z.string(),
      email: z.string(),
      role: z.enum(["editor", "viewer"]),
    }),
  ),
  redirect: z.object({ url: z.url() }),
  team: z.object({
    organization: z.object({ name: z.string(), plan: z.string() }),
    members: z.array(
      z.object({
        userId: z.string(),
        name: z.string(),
        email: z.string(),
        role: z.string(),
        state: z.string(),
        validUntil: z.string().nullable(),
      }),
    ),
    invitations: z.array(
      z.object({ id: z.string(), email: z.string(), role: z.string() }),
    ),
    events: z.array(
      z.object({
        id: z.string(),
        action: z.string(),
        actor: z.string().nullable(),
        createdAt: z.string(),
      }),
    ),
    usage: z.number(),
    compileLimit: z.number(),
  }),
  billing: z.object({
    organization: z.object({
      id: z.string(),
      name: z.string(),
      plan: z.enum(["free", "team"]),
    }),
    canManage: z.boolean(),
    hasCustomer: z.boolean(),
    subscription: z.object({
      status: z.string(),
      periodEnd: z.string().nullable(),
      cancelAtPeriodEnd: z.boolean(),
      cancelAt: z.string().nullable(),
    }),
    usage: limits,
    limits,
    plans: z.object({ free: plan, team: plan }),
    price: z
      .object({
        amount: z.number(),
        currency: z.string(),
        interval: z.string(),
      })
      .nullable(),
    checkoutAvailable: z.boolean(),
    portalAvailable: z.boolean(),
  }),
};
