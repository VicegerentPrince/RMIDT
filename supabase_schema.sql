-- ============================================================
-- RMIDT — Real-time Market Intelligence & Decision Twin
-- Run this entire file in your Supabase SQL Editor
-- ============================================================

-- Market snapshots (stocks, forex, commodities via yfinance)
create table if not exists market_data (
  id uuid primary key default gen_random_uuid(),
  symbol text not null,
  name text,
  category text not null,
  price numeric,
  change_pct numeric,
  volume bigint,
  currency text default 'USD',
  source text default 'yfinance',
  captured_at timestamptz default now()
);

-- FRED + World Bank macro indicators
create table if not exists macro_indicators (
  id uuid primary key default gen_random_uuid(),
  series_id text not null,
  country text not null,
  indicator_name text not null,
  value numeric,
  period text,
  source text,
  captured_at timestamptz default now()
);

-- CoinGecko crypto data
create table if not exists crypto_data (
  id uuid primary key default gen_random_uuid(),
  coin_id text not null,
  name text not null,
  symbol text not null,
  current_price numeric,
  market_cap numeric,
  price_change_24h numeric,
  total_volume numeric,
  captured_at timestamptz default now()
);

-- NewsAPI headlines
create table if not exists news_headlines (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source_name text,
  url text,
  published_at timestamptz,
  sentiment_label text,
  captured_at timestamptz default now()
);

-- Regime classification per economy
create table if not exists regime_classifications (
  id uuid primary key default gen_random_uuid(),
  economy text not null,
  regime text not null,
  confidence numeric,
  feature_snapshot jsonb,
  classified_at timestamptz default now()
);

-- Permanent prediction audit log
create table if not exists predictions (
  id uuid primary key default gen_random_uuid(),
  economy text not null,
  regime text not null,
  reasoning_chain text not null,
  verdict text not null,
  confidence numeric not null,
  timeframe text,
  trigger_conditions jsonb,
  historical_analogs jsonb,
  recommendation text,
  input_snapshot jsonb,
  model_version text default 'gemini-2.5-flash',
  created_at timestamptz default now()
);

-- Stress test results
create table if not exists stress_tests (
  id uuid primary key default gen_random_uuid(),
  scenario_text text not null,
  affected_markets jsonb,
  contagion_path jsonb,
  safe_havens jsonb,
  historical_analogs jsonb,
  full_analysis text,
  confidence numeric,
  created_at timestamptz default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table market_data enable row level security;
alter table macro_indicators enable row level security;
alter table crypto_data enable row level security;
alter table news_headlines enable row level security;
alter table regime_classifications enable row level security;
alter table predictions enable row level security;
alter table stress_tests enable row level security;

-- Authenticated users can read all tables
create policy "Authenticated read market_data" on market_data for select to authenticated using (true);
create policy "Authenticated read macro_indicators" on macro_indicators for select to authenticated using (true);
create policy "Authenticated read crypto_data" on crypto_data for select to authenticated using (true);
create policy "Authenticated read news_headlines" on news_headlines for select to authenticated using (true);
create policy "Authenticated read regime_classifications" on regime_classifications for select to authenticated using (true);
create policy "Authenticated read predictions" on predictions for select to authenticated using (true);
create policy "Authenticated read stress_tests" on stress_tests for select to authenticated using (true);

-- Service role (backend) can insert into all tables
create policy "Service insert market_data" on market_data for insert to service_role with check (true);
create policy "Service insert macro_indicators" on macro_indicators for insert to service_role with check (true);
create policy "Service insert crypto_data" on crypto_data for insert to service_role with check (true);
create policy "Service insert news_headlines" on news_headlines for insert to service_role with check (true);
create policy "Service insert regime_classifications" on regime_classifications for insert to service_role with check (true);
create policy "Service insert predictions" on predictions for insert to service_role with check (true);
create policy "Service insert stress_tests" on stress_tests for insert to service_role with check (true);

-- ============================================================
-- Indexes for common query patterns
-- ============================================================

create index if not exists idx_market_data_captured_at on market_data(captured_at desc);
create index if not exists idx_market_data_symbol on market_data(symbol);
create index if not exists idx_macro_indicators_country on macro_indicators(country);
create index if not exists idx_macro_indicators_series on macro_indicators(series_id);
create index if not exists idx_regime_classifications_economy on regime_classifications(economy);
create index if not exists idx_regime_classifications_classified_at on regime_classifications(classified_at desc);
create index if not exists idx_predictions_economy on predictions(economy);
create index if not exists idx_predictions_created_at on predictions(created_at desc);
create index if not exists idx_crypto_data_captured_at on crypto_data(captured_at desc);
create index if not exists idx_news_captured_at on news_headlines(captured_at desc);

-- ============================================================
-- Enable Realtime on key tables (run this too)
-- ============================================================
-- In Supabase Dashboard → Database → Replication, enable realtime for:
-- market_data, regime_classifications, predictions, crypto_data
-- OR run:
-- alter publication supabase_realtime add table market_data;
-- alter publication supabase_realtime add table regime_classifications;
-- alter publication supabase_realtime add table predictions;
-- alter publication supabase_realtime add table crypto_data;
