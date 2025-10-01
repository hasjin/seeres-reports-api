# 데이터베이스 스키마 문서

## 📋 목차
1. [스키마 개요](#스키마-개요)
2. [테이블 상세](#테이블-상세)
3. [Materialized Views](#materialized-views)
4. [인덱스 전략](#인덱스-전략)
5. [마이그레이션](#마이그레이션)
6. [성능 튜닝](#성능-튜닝)

---

## 스키마 개요

### ERD 관계도
```
patches (1) ─── (N) matches
                    │
                    ├─── (N) participants ─── (N) champions
                    │
                    ├─── (N) teams
                    │
                    ├─── (N) bans ─── (N) champions
                    │
                    └─── (N) timeline_events
```

---

## 테이블 상세

### 1. patches
패치 버전 정보를 관리하는 마스터 테이블

**컬럼**:
```sql
patch (TEXT, PK)          -- 패치 버전 (예: "15.19")
released_at (DATE)        -- 패치 릴리즈 날짜
major_minor (TEXT)        -- 메이저.마이너 버전 (예: "15.19")
```

**인덱스**:
- `PRIMARY KEY (patch)`
- `idx_patches_majorminor` on (major_minor)
- `idx_patches_released_at` on (released_at)
- `ux_patches_major_minor` UNIQUE on (major_minor)

**사용처**:
- 패치 버전 검증
- 이전 패치 조회 (시계열 분석)
- 패치 간 비교 분석

---

### 2. matches
매치 메타데이터

**컬럼**:
```sql
match_id (TEXT, PK)           -- 고유 매치 ID
platform (TEXT)               -- 플랫폼 (KR, NA1, EUW1, etc.)
region (TEXT)                 -- 지역 (kr, na, euw, etc.)
queue (INTEGER)               -- 큐 타입 (420, 440, 450, etc.)
game_creation_ms (BIGINT)     -- 게임 생성 시간 (밀리초)
game_duration_s (INTEGER)     -- 게임 길이 (초)
patch (TEXT, FK → patches)    -- 패치 버전
```

**인덱스**:
- `PRIMARY KEY (match_id)`
- `idx_matches_patch_queue` on (patch, queue)
- `idx_matches_created` on (game_creation_ms)

**외래키**:
- `patch` REFERENCES `patches(patch)`

**사용처**:
- 패치별 매치 조회
- 지역별 통계 집계
- 큐 타입별 필터링

---

### 3. participants
참가자 상세 정보

**컬럼**:
```sql
match_id (TEXT, PK)              -- 매치 ID
participant_id (SMALLINT, PK)    -- 참가자 ID (1-10)
puuid (TEXT)                     -- 플레이어 UUID
team_id (SMALLINT)               -- 팀 ID (100, 200)
champion_id (INTEGER, FK)        -- 챔피언 ID
role (TEXT)                      -- 역할 (TOP, JUNGLE, etc.)
lane (TEXT)                      -- 라인 (TOP, MIDDLE, etc.)
tier (TEXT)                      -- 티어 (신규 추가)
rank_division (TEXT)             -- 티어 세부 (신규 추가)
win (BOOLEAN)                    -- 승리 여부
kills, deaths, assists (INT)    -- KDA
champ_level (INTEGER)            -- 최종 레벨
gold_earned (INTEGER)            -- 획득 골드
item0~6 (INTEGER)                -- 아이템 슬롯
```

**인덱스**:
- `PRIMARY KEY (match_id, participant_id)`
- `idx_participants_champ` on (champion_id)
- `idx_participants_team` on (team_id)
- `idx_participants_puuid` on (puuid)
- `idx_participants_match` on (match_id)
- `idx_participants_rolelane` on (role, lane)
- `idx_participants_tier` on (tier) -- 신규
- `idx_participants_tier_role` on (tier, role) -- 신규

**외래키**:
- `match_id` REFERENCES `matches(match_id)` ON DELETE CASCADE
- `champion_id` REFERENCES `champions(champion_id)`

**사용처**:
- 챔피언 통계 집계
- 플레이어 추적
- 티어별 분석 (신규)
- 라인별 분석

---

### 4. bans
밴 정보

**컬럼**:
```sql
match_id (TEXT, PK)              -- 매치 ID
team_id (SMALLINT, PK)           -- 팀 ID
pick_turn (SMALLINT, PK)         -- 밴 순서
champion_id (INTEGER, FK)        -- 밴된 챔피언 ID
```

**인덱스**:
- `PRIMARY KEY (match_id, team_id, pick_turn)`
- `idx_bans_champion` on (champion_id)

**외래키**:
- `match_id` REFERENCES `matches(match_id)` ON DELETE CASCADE
- `champion_id` REFERENCES `champions(champion_id)`

**사용처**:
- 밴률 계산
- 메타 분석

---

### 5. champions
챔피언 마스터 데이터

**컬럼**:
```sql
champion_id (INTEGER, PK)     -- 챔피언 고유 ID
key (TEXT)                    -- 챔피언 키 (예: "Aatrox")
name (TEXT)                   -- 기본 이름
version (TEXT)                -- 데이터 버전
champ_key (TEXT)              -- API 키
data (JSONB)                  -- 추가 메타데이터
```

**인덱스**:
- `PRIMARY KEY (champion_id)`
- `idx_champions_version` on (version)
- `idx_champions_champ_key` on (champ_key)

**사용처**:
- 챔피언 ID ↔ 이름 매핑
- 챔피언 정보 조회

---

### 6. champion_l10n
챔피언 다국어 이름

**컬럼**:
```sql
champion_id (INTEGER, PK)     -- 챔피언 ID
lang (TEXT, PK)               -- 언어 코드 (ko, en, ja, etc.)
name (TEXT)                   -- 번역된 이름
```

**인덱스**:
- `PRIMARY KEY (champion_id, lang)`

**사용처**:
- 다국어 챔피언 이름 제공
- 로컬라이제이션

---

### 7. teams
팀 정보

**컬럼**:
```sql
match_id (TEXT, PK)           -- 매치 ID
team_id (SMALLINT, PK)        -- 팀 ID (100, 200)
win (BOOLEAN)                 -- 승리 여부
```

**인덱스**:
- `PRIMARY KEY (match_id, team_id)`

**외래키**:
- `match_id` REFERENCES `matches(match_id)` ON DELETE CASCADE

---

### 8. timeline_events
타임라인 이벤트 (아이템 구매, 킬 등)

**컬럼**:
```sql
id (BIGSERIAL, PK)               -- 자동 증가 ID
match_id (TEXT, FK)              -- 매치 ID
ts_ms (BIGINT)                   -- 타임스탬프 (밀리초)
type (TEXT)                      -- 이벤트 타입
participant_id (SMALLINT)        -- 참가자 ID
item_id (INTEGER)                -- 아이템 ID
details (JSONB)                  -- 추가 상세 정보
```

**인덱스**:
- `PRIMARY KEY (id)`
- `uq_timeline_event` UNIQUE on (match_id, ts_ms, type, participant_id, COALESCE(item_id, 0))
- `idx_timeline_match_ts` on (match_id, ts_ms)

**외래키**:
- `match_id` REFERENCES `matches(match_id)` ON DELETE CASCADE

**제약조건**:
- `ts_ms >= 0` (CHECK)

---

### 9. items
아이템 정보

**컬럼**:
```sql
item_id (INTEGER, PK)         -- 아이템 ID
name (TEXT)                   -- 아이템 이름
patch (TEXT)                  -- 패치 버전
gold_total (INTEGER)          -- 총 가격
version (TEXT, PK)            -- 데이터 버전
data (JSONB)                  -- 메타데이터
maps (JSONB)                  -- 맵별 사용 가능 여부
```

**인덱스**:
- `PRIMARY KEY (version, item_id)`
- `idx_items_patch` on (patch)
- `idx_items_item` on (item_id)

---

## Materialized Views

### 기존 뷰

#### 1. patch_totals_q
패치별 큐별 전체 게임 통계

**정의**:
```sql
SELECT
    m.patch,
    m.queue,
    COUNT(*)::INTEGER AS total_games,
    SUM(CASE WHEN p.win THEN 1 ELSE 0 END)::INTEGER AS total_wins
FROM participants p
JOIN matches m USING (match_id)
GROUP BY m.patch, m.queue;
```

**인덱스**:
- `ux_m_patch_totals_q` UNIQUE on (patch, queue)

**사용처**:
- 픽률/밴률 계산 시 분모
- 패치별 전체 통계

---

#### 2. champion_patch_stats_q
패치별 큐별 챔피언 통계

**정의**:
```sql
SELECT
    m.patch,
    m.queue,
    p.champion_id,
    COUNT(*)::INTEGER AS games,
    SUM(CASE WHEN p.win THEN 1 ELSE 0 END)::INTEGER AS wins
FROM participants p
JOIN matches m USING (match_id)
GROUP BY m.patch, m.queue, p.champion_id;
```

**인덱스**:
- `ix_m_champ_patch_q` UNIQUE on (patch, queue, champion_id)

**사용처**:
- 챔피언별 승률/픽률 계산
- 패치 임팩트 분석

---

#### 3. ban_patch_stats_q
패치별 큐별 밴 통계

**정의**:
```sql
SELECT
    m.patch,
    m.queue,
    b.champion_id,
    COUNT(*)::INTEGER AS bans
FROM bans b
JOIN matches m USING (match_id)
GROUP BY m.patch, m.queue, b.champion_id;
```

**인덱스**:
- `ix_m_ban_patch_q` UNIQUE on (patch, queue, champion_id)

**사용처**:
- 챔피언별 밴률 계산

---

### 신규 뷰 (밴/픽 분석용)

#### 4. champion_stats_region_tier_role
지역/티어/라인별 챔피언 통계

**정의**:
```sql
SELECT
    m.patch,
    m.queue,
    m.region,
    p.tier,
    p.role,
    p.lane,
    p.champion_id,
    COUNT(*)::INTEGER AS games,
    SUM(CASE WHEN p.win THEN 1 ELSE 0 END)::INTEGER AS wins
FROM participants p
JOIN matches m USING (match_id)
WHERE p.tier IS NOT NULL
  AND p.role IS NOT NULL
GROUP BY m.patch, m.queue, m.region, p.tier, p.role, p.lane, p.champion_id;
```

**인덱스**:
- `ux_champ_stats_region_tier_role` UNIQUE on (patch, queue, region, tier, COALESCE(role, ''), COALESCE(lane, ''), champion_id)

**사용처**:
- 지역별 메타 분석
- 티어별 챔피언 선호도
- 라인별 통계

---

#### 5. ban_stats_region_tier_role
지역/티어별 밴 통계

**정의**:
```sql
SELECT
    m.patch,
    m.queue,
    m.region,
    (SELECT tier FROM participants WHERE match_id = m.match_id LIMIT 1) AS tier,
    b.champion_id,
    COUNT(*)::INTEGER AS bans
FROM bans b
JOIN matches m USING (match_id)
GROUP BY m.patch, m.queue, m.region, tier, b.champion_id;
```

**인덱스**:
- `ux_ban_stats_region_tier_role` UNIQUE on (patch, queue, region, COALESCE(tier, ''), champion_id)

**사용처**:
- 지역/티어별 밴 선호도

---

#### 6. patch_totals_region_tier
지역/티어별 전체 게임 통계

**정의**:
```sql
SELECT
    m.patch,
    m.queue,
    m.region,
    p.tier,
    COUNT(DISTINCT m.match_id)::INTEGER AS total_games,
    SUM(CASE WHEN p.win THEN 1 ELSE 0 END)::INTEGER AS total_wins
FROM participants p
JOIN matches m USING (match_id)
WHERE p.tier IS NOT NULL
GROUP BY m.patch, m.queue, m.region, p.tier;
```

**인덱스**:
- `ux_patch_totals_region_tier` UNIQUE on (patch, queue, region, tier)

**사용처**:
- 필터링된 통계 계산 시 분모

---

#### 7. champion_role_stats
라인별 챔피언 통계

**정의**:
```sql
SELECT
    m.patch,
    m.queue,
    p.role,
    p.champion_id,
    COUNT(*)::INTEGER AS games,
    SUM(CASE WHEN p.win THEN 1 ELSE 0 END)::INTEGER AS wins
FROM participants p
JOIN matches m USING (match_id)
WHERE p.role IS NOT NULL
GROUP BY m.patch, m.queue, p.role, p.champion_id;
```

**인덱스**:
- `ux_champion_role_stats` UNIQUE on (patch, queue, COALESCE(role, ''), champion_id)

**사용처**:
- 라인별 챔피언 통계
- 메타 분석

---

## 인덱스 전략

### 1. 기본 인덱스
- **Primary Key**: 각 테이블의 자연스러운 고유 키
- **Foreign Key**: 조인 성능 향상

### 2. 복합 인덱스
- `(patch, queue)`: 가장 자주 사용되는 필터 조합
- `(tier, role)`: 세분화된 필터링
- `(match_id, ts_ms)`: 시계열 쿼리

### 3. UNIQUE 인덱스
- Materialized View의 고유성 보장
- 중복 데이터 방지
- CONCURRENTLY 리프레시 지원

### 4. 부분 인덱스 (Partial Index)
- `WHERE tier IS NOT NULL`: NULL 제외
- 저장 공간 절약 및 성능 향상

---

## 마이그레이션

### Migration 001: Tier/Region Filters
**파일**: `schema-migrations/001-add-tier-region-filters.sql`

**내용**:
1. `participants` 테이블에 `tier`, `rank_division` 컬럼 추가
2. 티어 관련 인덱스 추가
3. 4개의 신규 Materialized View 생성
4. `refresh_ban_pick_stats()` 함수 생성

**적용 방법**:
```bash
psql -U lol_app -d lol_stats -f schema-migrations/001-add-tier-region-filters.sql
```

**롤백 방법**:
마이그레이션 파일 하단의 롤백 스크립트 참조

---

## 성능 튜닝

### 1. Materialized View 리프레시 전략

#### 주기적 리프레시 (Cron)
```bash
# 매 시간 정각마다
0 * * * * psql -U lol_app -d lol_stats -c "SELECT refresh_ban_pick_stats();"
```

#### 증분 리프레시 (향후 개선)
- 변경된 데이터만 업데이트
- 더 빠른 리프레시

### 2. 쿼리 최적화

#### EXPLAIN ANALYZE 활용
```sql
EXPLAIN ANALYZE
SELECT ...;
```

#### 인덱스 힌트
PostgreSQL은 자동 최적화하지만, 필요시 강제 가능
```sql
SET enable_seqscan = OFF;  -- Sequential Scan 비활성화
```

### 3. 파티셔닝 (향후 구현 권장)

#### matches 테이블 파티셔닝
```sql
-- 패치별 파티셔닝
CREATE TABLE matches_15_19 PARTITION OF matches
FOR VALUES IN ('15.19');
```

**장점**:
- 오래된 데이터 아카이빙
- 쿼리 성능 향상
- 유지보수 용이

### 4. VACUUM 및 ANALYZE

#### 정기적 실행
```sql
-- 통계 업데이트
ANALYZE participants;
ANALYZE matches;

-- 불필요한 공간 정리
VACUUM participants;
```

#### Auto-Vacuum 설정
```sql
ALTER TABLE participants SET (autovacuum_enabled = true);
```

---

## 데이터 무결성

### 1. Foreign Key Constraints
- CASCADE DELETE: 매치 삭제 시 관련 데이터 자동 삭제
- RESTRICT: 참조되는 데이터 삭제 방지

### 2. CHECK Constraints
- `ts_ms >= 0`: 음수 타임스탬프 방지
- 티어 값 검증 (추가 가능)

### 3. NOT NULL Constraints
- 필수 컬럼 강제
- 데이터 품질 보장

---

## 백업 및 복구

### 백업
```bash
# 전체 백업
pg_dump -U lol_app lol_stats > backup.sql

# 스키마만 백업
pg_dump -U lol_app -s lol_stats > schema.sql

# 특정 테이블만 백업
pg_dump -U lol_app -t matches lol_stats > matches_backup.sql
```

### 복구
```bash
psql -U lol_app -d lol_stats < backup.sql
```

---

## 참고 사항

### 1. 데이터 타입 선택
- `BIGINT`: 큰 숫자 (타임스탬프)
- `INTEGER`: 일반 숫자
- `SMALLINT`: 작은 범위 (-32768 ~ 32767)
- `TEXT`: 가변 길이 문자열 (길이 제한 없음)
- `JSONB`: JSON 데이터 (인덱싱 가능)

### 2. NULL 처리
- `COALESCE(value, 0)`: NULL을 0으로 변환
- `NULLIF(value, 0)`: 0을 NULL로 변환 (division by zero 방지)

### 3. 트랜잭션
- 매치 데이터 삽입 시 트랜잭션 사용 권장
- 일관성 보장

---

## 문제 해결

### 1. Materialized View 리프레시 실패
```sql
-- 인덱스 없이 리프레시 시도
REFRESH MATERIALIZED VIEW champion_stats_region_tier_role;

-- 인덱스 재생성
CREATE UNIQUE INDEX ux_champ_stats_region_tier_role ...;
```

### 2. 성능 저하
- `EXPLAIN ANALYZE`로 쿼리 분석
- 인덱스 추가 검토
- Materialized View 리프레시 주기 조정

### 3. 디스크 공간 부족
- 오래된 데이터 아카이빙
- `VACUUM FULL` 실행 (주의: 테이블 잠금)
- 파티셔닝 도입

---

## 추가 개선 방향

1. **Time-Series Database 통합**
   - TimescaleDB 확장 사용
   - 시계열 데이터 최적화

2. **Read Replica**
   - 읽기 전용 복제본
   - 부하 분산

3. **Column-Oriented Storage**
   - 분석 쿼리 최적화
   - Citus 또는 Greenplum 고려
