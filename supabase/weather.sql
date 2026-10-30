-- 기상청 초단기실황 저장 테이블
-- Supabase > SQL Editor 에 통째로 붙여 넣고 Run. 여러 번 실행해도 괜찮아요.
--
-- 저장하는 값 (초단기실황 카테고리)
--   T1H 기온(℃) / REH 습도(%) / RN1 1시간 강수량(mm) / WSD 풍속(m/s)
--   VEC 풍향(deg) / PTY 강수형태(0 없음,1 비,2 비/눈,3 눈,5 빗방울,6 빗방울눈날림,7 눈날림)
--   UUU 동서바람(m/s) / VVV 남북바람(m/s)

create table if not exists public.weather_observations (
  id           uuid primary key default gen_random_uuid(),
  nx           integer not null,
  ny           integer not null,
  observed_at  timestamptz not null,           -- base_date + base_time (한국시간 기준)
  t1h          numeric(4,1),
  reh          numeric(4,1) check (reh between 0 and 100),
  rn1          numeric(5,1) check (rn1 >= 0),
  wsd          numeric(4,1) check (wsd >= 0),
  vec          numeric(5,1) check (vec between 0 and 360),
  pty          smallint check (pty between 0 and 7),
  uuu          numeric(4,1),
  vvv          numeric(4,1),
  created_at   timestamptz not null default now(),
  unique (nx, ny, observed_at)                 -- 같은 지점·같은 시각은 한 번만 저장
);

alter table public.weather_observations enable row level security;

-- 누구나 조회, 누구나 저장(과제용). 수정·삭제는 막아 둬요.
grant select, insert on public.weather_observations to anon, authenticated;

drop policy if exists "weather_select_all" on public.weather_observations;
drop policy if exists "weather_insert_all" on public.weather_observations;
create policy "weather_select_all" on public.weather_observations for select using (true);
create policy "weather_insert_all" on public.weather_observations for insert with check (true);
