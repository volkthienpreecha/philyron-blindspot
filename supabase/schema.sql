create schema if not exists philyron_private;
revoke all on schema philyron_private from public, anon, authenticated;
create extension if not exists pgcrypto with schema extensions;
create table if not exists philyron_private.settings (name text primary key, value text not null);
create table if not exists philyron_private.workspaces (
 id uuid primary key, version integer not null, data jsonb not null,
 updated_at timestamptz not null default now()
);
alter table philyron_private.settings enable row level security;
alter table philyron_private.workspaces enable row level security;
revoke all on all tables in schema philyron_private from public, anon, authenticated;
create or replace function public.philyron_load(p_id uuid, p_key text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare expected text;
begin
 select value into expected from philyron_private.settings where name='backend_key_hash';
 if expected is null or p_key is null or encode(extensions.digest(p_key,'sha256'),'hex') <> expected then
  raise exception 'Backend authorization required' using errcode='28000';
 end if;
 return (select data from philyron_private.workspaces where id=p_id);
end; $$;
create or replace function public.philyron_commit(p_id uuid, p_key text, p_expected integer, p_data jsonb)
returns boolean language plpgsql security definer set search_path = '' as $$
declare expected text; current_version integer;
begin
 select value into expected from philyron_private.settings where name='backend_key_hash';
 if expected is null or p_key is null or encode(extensions.digest(p_key,'sha256'),'hex') <> expected then
  raise exception 'Backend authorization required' using errcode='28000';
 end if;
 if octet_length(p_data::text)>2000000 or p_data->>'id' <> p_id::text
  or (p_data->>'version')::integer <> p_expected+1
  or jsonb_array_length(p_data->'notes')>60 then raise exception 'Invalid workspace'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_id::text,0));
 select version into current_version from philyron_private.workspaces where id=p_id;
 if coalesce(current_version,0) <> p_expected then return false; end if;
 insert into philyron_private.workspaces(id,version,data) values(p_id,p_expected+1,p_data)
 on conflict(id) do update set version=excluded.version,data=excluded.data,updated_at=now();
 return true;
end; $$;
revoke all on function public.philyron_load(uuid,text) from public,anon,authenticated;
revoke all on function public.philyron_commit(uuid,text,integer,jsonb) from public,anon,authenticated;
grant execute on function public.philyron_load(uuid,text) to anon;
grant execute on function public.philyron_commit(uuid,text,integer,jsonb) to anon;
