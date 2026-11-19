-- Per-request API transfer log (proxy for Vercel Fast Origin Transfer tuning).
-- Apply once on the Neon primary branch, then instrument routes via lib/neon/transferLog.ts.

create table if not exists public.api_transfer_events (
  id bigserial primary key,
  created_at timestamptz not null default now(),
  route text not null,
  method text not null,
  status int not null,
  in_bytes int not null default 0,
  out_bytes int not null default 0,
  duration_ms int not null default 0
);

create index if not exists api_transfer_events_created_at_idx
  on public.api_transfer_events (created_at desc);

create index if not exists api_transfer_events_route_created_at_idx
  on public.api_transfer_events (route, created_at desc);
