import { type Project } from "@/features/projects/model";
import { type Action, type OrgRole } from "@/features/access-control/policy";

export type Organization = {
  id: string;
  name: string;
  role: OrgRole;
  status: "active" | "suspended";
  plan: "free" | "team";
};

export type CloudProject = Project & {
  revision: number;
  organizationId: string;
  ownerId: string;
  visibility: "private" | "workspace";
  state: "active" | "archived";
  permissions: Record<Action, boolean>;
};
