-- LearnLynk Tech Test - Task 2: RLS Policies on leads

alter table public.leads enable row level security;

-- Example helper: assume JWT has tenant_id, user_id, role.
-- You can use: current_setting('request.jwt.claims', true)::jsonb

-- TODO: write a policy so:
-- - counselors see leads where they are owner_id OR in one of their teams
-- - admins can see all leads of their tenant


-- Example skeleton for SELECT (replace with your own logic):

create policy "leads_select_policy"
on public.leads
for select
using (
  (
  -- TODO: add real RLS logic here, refer to README instructions
  -- Admin: full visibility inside their tenant
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'admin'
    and tenant_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid
  )
  or
  (
    -- Counselor: limited visibility
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'counselor'
    and tenant_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid
    and (
        -- a) lead they personally own
        owner_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'user_id')::uuid

        or

        -- b) lead owned by someone in one of their teams
        exists (
          select 1
          from public.user_teams t1
          join public.user_teams t2
            on t1.team_id = t2.team_id
          where t1.user_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'user_id')::uuid
            and t2.user_id = public.leads.owner_id
        )
    )
  )
);

-- TODO: add INSERT policy that:
-- - allows counselors/admins to insert leads for their tenant
-- - ensures tenant_id is correctly set/validated
create policy "leads_insert_policy"
on public.leads
for insert
with check (
  tenant_id = (current_setting('request.jwt.claims', true)::jsonb ->> 'tenant_id')::uuid
  and (
    (current_setting('request.jwt.claims', true)::jsonb ->> 'role') in ('admin', 'counselor')
  )
);