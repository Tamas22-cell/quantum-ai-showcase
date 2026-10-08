-- Execute manually in your own Supabase SQL editor.
-- Only backend/database permissions grant admin rights; never the keyboard shortcut.
create table if not exists public.site_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.site_admins enable row level security;
revoke all on public.site_admins from anon, authenticated;

create or replace function public.is_site_admin()
returns boolean language sql stable security definer
set search_path = '' as $$
  select exists(select 1 from public.site_admins where user_id = auth.uid());
$$;
revoke all on function public.is_site_admin() from public;
grant execute on function public.is_site_admin() to authenticated;

create or replace function public.site_user_count()
returns bigint language plpgsql stable security definer
set search_path = '' as $$
begin
  if not public.is_site_admin() then
    raise exception 'Access denied';
  end if;
  return (select count(*) from auth.users);
end;
$$;
revoke all on function public.site_user_count() from public;
grant execute on function public.site_user_count() to authenticated;

-- After YOU register, manually grant access to your own account:
-- insert into public.site_admins(user_id) select id from auth.users where email = 'YOUR_OWN_EMAIL';
-- CAPTCHA enforcement: configure Supabase Auth CAPTCHA / Turnstile in Supabase Dashboard.
-- 30-day session restriction: configure a server-enforced session policy; checkbox alone cannot enforce TTL.
