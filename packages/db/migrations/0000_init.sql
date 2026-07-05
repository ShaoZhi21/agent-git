CREATE TYPE membership_role AS ENUM ('owner', 'admin', 'member', 'viewer');

CREATE TABLE orgs (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE users (
  id uuid PRIMARY KEY,
  email text,
  name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE identities (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES users(id),
  provider text NOT NULL,
  provider_user_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX identities_provider_provider_user_id_unique
  ON identities (provider, provider_user_id);

CREATE TABLE memberships (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES orgs(id),
  user_id uuid NOT NULL REFERENCES users(id),
  role membership_role NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX memberships_user_id_org_id_unique
  ON memberships (user_id, org_id);

CREATE TABLE installations (
  id bigint PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES orgs(id),
  account_login text NOT NULL,
  account_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE repos (
  id uuid PRIMARY KEY,
  org_id uuid NOT NULL REFERENCES orgs(id),
  installation_id bigint REFERENCES installations(id),
  github_repo_id bigint NOT NULL,
  full_name text NOT NULL,
  default_branch text NOT NULL DEFAULT 'main',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX repos_org_id_github_repo_id_unique
  ON repos (org_id, github_repo_id);
