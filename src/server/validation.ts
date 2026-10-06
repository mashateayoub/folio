import { z } from "zod";
import { projectSchema } from "@/features/projects/model";
import { HttpError } from "@/server/http";

export function identifier(value: string) {
  if (!z.string().uuid().safeParse(value).success)
    throw new HttpError(400, "Invalid resource identifier.");

  return value;
}

export const createProjectInput = z
  .object({
    organizationId: z.string().uuid(),
    template: z.enum(["article", "blank", "report"]),
  })
  .strict();

export const saveProjectInput = z
  .object({
    project: projectSchema.strict(),
    expectedRevision: z.number().int().positive(),
  })
  .strict();

export const attributesInput = z
  .object({
    visibility: z.enum(["private", "workspace"]).optional(),
    state: z.enum(["active", "archived"]).optional(),
  })
  .strict()
  .refine(
    (input) => input.visibility || input.state,
    "Supply a project setting.",
  );

export const grantInput = z
  .object({
    email: z
      .string()
      .email()
      .transform((value) => value.toLowerCase()),
    role: z.enum(["editor", "viewer"]).nullable(),
  })
  .strict();

export const organizationInput = z
  .object({ name: z.string().trim().min(1).max(80) })
  .strict();

export const invitationInput = z
  .object({
    email: z
      .string()
      .email()
      .transform((value) => value.toLowerCase()),
    role: z.enum(["admin", "member", "viewer"]),
    expiresInDays: z.number().int().min(1).max(365).optional(),
  })
  .strict();

export const memberInput = z
  .object({
    role: z.enum(["admin", "member", "viewer"]),
    state: z.enum(["active", "revoked"]),
  })
  .strict();

export const buildInput = z
  .object({
    projectId: z.string().uuid(),
    revision: z.number().int().positive(),
  })
  .strict();
