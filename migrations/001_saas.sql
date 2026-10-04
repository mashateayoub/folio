CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  owner_id text NOT NULL REFERENCES "user"(id),
  personal_owner_id text UNIQUE REFERENCES "user"(id),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  plan text NOT NULL DEFAULT 'free' CHECK (plan IN ('free', 'team')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS organization_members (
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('owner', 'admin', 'member', 'viewer')),
  state text NOT NULL DEFAULT 'active' CHECK (state IN ('active', 'revoked')),
  valid_until timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (organization_id, user_id)
);
CREATE INDEX IF NOT EXISTS organization_members_user ON organization_members(user_id);
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  owner_id text NOT NULL REFERENCES "user"(id),
  data jsonb NOT NULL,
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  visibility text NOT NULL DEFAULT 'private' CHECK (visibility IN ('private', 'workspace')),
  state text NOT NULL DEFAULT 'active' CHECK (state IN ('active', 'archived')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS projects_org ON projects(organization_id);
CREATE TABLE IF NOT EXISTS project_members (
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  role text NOT NULL CHECK (role IN ('editor', 'viewer')),
  PRIMARY KEY (project_id, user_id)
);
CREATE TABLE IF NOT EXISTS invitations (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  email text NOT NULL,
  role text NOT NULL CHECK (role IN ('admin', 'member', 'viewer')),
  token_hash text NOT NULL UNIQUE,
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending', 'accepted', 'revoked')),
  expires_at timestamptz NOT NULL,
  membership_valid_until timestamptz,
  created_by text NOT NULL REFERENCES "user"(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS invitations_org ON invitations(organization_id, state);
CREATE TABLE IF NOT EXISTS builds (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  actor_id text REFERENCES "user"(id) ON DELETE SET NULL,
  revision integer NOT NULL,
  snapshot jsonb,
  status text NOT NULL CHECK (status IN ('running', 'succeeded', 'failed')),
  pdf bytea CHECK (octet_length(pdf) <= 16000000),
  log text,
  created_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz
);
CREATE INDEX IF NOT EXISTS builds_project ON builds(project_id, created_at DESC);
CREATE TABLE IF NOT EXISTS usage_counters (
  key text PRIMARY KEY,
  count integer NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS audit_events (
  id uuid PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  actor_id text REFERENCES "user"(id) ON DELETE SET NULL,
  action text NOT NULL,
  resource_id text,
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS audit_events_org ON audit_events(organization_id, created_at DESC);
