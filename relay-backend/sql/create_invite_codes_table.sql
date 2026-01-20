-- Create invite codes table for organization invitations
CREATE TABLE IF NOT EXISTS public.invite_codes (
  id uuid not null default gen_random_uuid(),
  code varchar(10) not null,
  org_id uuid not null,
  invited_by uuid not null,
  email varchar(255) null, -- optional: specific email invitation
  max_uses integer not null default 1,
  current_uses integer not null default 0,
  expires_at timestamp without time zone not null,
  created_at timestamp without time zone not null default now(),
  is_active boolean not null default true,
  
  constraint invite_codes_pkey primary key (id),
  constraint invite_codes_code_key unique (code),
  constraint invite_codes_org_id_fkey foreign key (org_id) references orgs (id) on delete cascade,
  constraint invite_codes_invited_by_fkey foreign key (invited_by) references auth.users (id),
  constraint invite_codes_max_uses_check check (max_uses > 0),
  constraint invite_codes_current_uses_check check (current_uses >= 0),
  constraint invite_codes_current_uses_max_check check (current_uses <= max_uses)
) TABLESPACE pg_default;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON public.invite_codes(code);
CREATE INDEX IF NOT EXISTS idx_invite_codes_org_id ON public.invite_codes(org_id);
CREATE INDEX IF NOT EXISTS idx_invite_codes_expires_at ON public.invite_codes(expires_at);

-- Create table to track email domains to organizations
CREATE TABLE IF NOT EXISTS public.org_email_domains (
  id uuid not null default gen_random_uuid(),
  org_id uuid not null,
  domain varchar(255) not null,
  created_at timestamp without time zone not null default now(),
  
  constraint org_email_domains_pkey primary key (id),
  constraint org_email_domains_org_id_domain_key unique (org_id, domain),
  constraint org_email_domains_org_id_fkey foreign key (org_id) references orgs (id) on delete cascade
) TABLESPACE pg_default;

-- Create index for faster domain lookups
CREATE INDEX IF NOT EXISTS idx_org_email_domains_domain ON public.org_email_domains(domain);
CREATE INDEX IF NOT EXISTS idx_org_email_domains_org_id ON public.org_email_domains(org_id); 