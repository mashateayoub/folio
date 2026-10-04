ALTER TABLE organizations ADD COLUMN plan_valid_until timestamptz;
-- Previous plans were placeholders, not verified subscriptions.
UPDATE organizations SET plan='free';
CREATE TABLE workspace_billing (
  organization_id uuid PRIMARY KEY REFERENCES organizations(id) ON DELETE CASCADE,
  customer_id text UNIQUE,
  subscription_id text UNIQUE,
  price_id text,
  status text NOT NULL DEFAULT 'none',
  period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  checkout_request uuid NOT NULL,
  checkout_session_id text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE billing_events (
  event_id text PRIMARY KEY,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  processed_at timestamptz NOT NULL DEFAULT now()
);
