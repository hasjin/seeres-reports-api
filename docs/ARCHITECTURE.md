# Seeres Reports API - 아키텍처 문서

## 📋 목차
1. [프로젝트 개요](#프로젝트-개요)
2. [기술 스택](#기술-스택)
3. [디렉토리 구조](#디렉토리-구조)
4. [데이터베이스 스키마](#데이터베이스-스키마)
5. [API 엔드포인트](#api-엔드포인트)
6. [서비스 로직](#서비스-로직)
7. [캐싱 전략](#캐싱-전략)
8. [보안](#보안)

---

## 프로젝트 개요

Seeres Reports API는 League of Legends 게임 데이터를 분석하여 패치별, 지역별, 티어별 챔피언 통계를 제공하는 RESTful API입니다.

### 주요 기능
- **패치 임팩트 분석**: 패치 간 챔피언 승률/픽률/밴률 변화 추적
- **챔피언 트렌드**: 시계열 챔피언 통계 분석
- **밴/픽률 분석**: 지역/티어/라인별 세분화된 통계
- **챔피언 정보**: 다국어 지원 챔피언 데이터

---

## 기술 스택

### Backend
- **Framework**: NestJS 11.x
- **Language**: TypeScript 5.7.x
- **Runtime**: Node.js 18+ LTS

### Database
- **DBMS**: PostgreSQL
- **ORM**: TypeORM 0.3.x
- **View**: Materialized Views (성능 최적화)

### Cache
- **In-Memory**: NestJS Cache Manager
- **Distributed**: Redis (선택사항)

### Documentation
- **API Docs**: Swagger/OpenAPI 3.0
- **Logging**: Pino + nestjs-pino

---

## 디렉토리 구조

```
seeres-reports-api/
├── src/
│   ├── app.module.ts              # 루트 모듈
│   ├── main.ts                    # 애플리케이션 진입점
│   ├── common/                    # 공통 모듈
│   │   ├── dto/                   # 공통 DTO
│   │   │   └── api-response.dto.ts
│   │   ├── filters/               # 예외 필터
│   │   │   └── http-exception.filter.ts
│   │   ├── interceptors/          # 인터셉터
│   │   ├── pipes/                 # 파이프
│   │   └── utils/                 # 유틸리티
│   │       └── patch.util.ts
│   ├── config/                    # 설정 모듈
│   │   ├── app.config.ts
│   │   └── db.config.ts
│   ├── database/                  # 데이터베이스 모듈
│   │   ├── entities/              # TypeORM 엔티티
│   │   └── database.module.ts
│   ├── cache/                     # 캐시 모듈
│   │   └── cache.module.ts
│   ├── security/                  # 보안 모듈
│   │   └── signed-request.guard.ts
│   ├── champions/                 # 챔피언 모듈
│   │   ├── champions.controller.ts
│   │   ├── champions.service.ts
│   │   └── champions.module.ts
│   └── reports/                   # 리포트 모듈 (핵심)
│       ├── controllers/           # 컨트롤러
│       │   ├── champion-trend.controller.ts
│       │   ├── champions.controller.ts
│       │   └── ban-pick-analysis.controller.ts
│       ├── services/              # 비즈니스 로직
│       │   ├── patch-champ-impact.service.ts
│       │   ├── champion-trend.service.ts
│       │   └── ban-pick-analysis.service.ts
│       ├── dto/                   # Data Transfer Objects
│       │   ├── patch-champ-impact.query.ts
│       │   ├── champion-trend.query.ts
│       │   ├── ban-pick-analysis.query.ts
│       │   └── responses/         # 응답 DTO (향후 확장용)
│       ├── models/                # 도메인 모델
│       │   ├── patch-champ-impact.model.ts
│       │   └── ban-pick-analysis.model.ts
│       ├── mappers/               # 데이터 변환 (향후 확장용)
│       │   ├── patch-impact.mapper.ts
│       │   └── champion-trend.mapper.ts
│       ├── types/                 # 타입 정의
│       │   └── db.types.ts
│       └── reports.module.ts
├── schema.sql                     # 기본 데이터베이스 스키마
├── schema-migrations/             # 스키마 마이그레이션
│   └── 001-add-tier-region-filters.sql
└── docs/                          # 문서
    ├── ARCHITECTURE.md            # 이 문서
    ├── API.md                     # API 상세 문서
    └── DATABASE.md                # 데이터베이스 문서
```

---

## 데이터베이스 스키마

### 핵심 테이블

#### 1. matches
매치 기본 정보
```sql
- match_id (PK)
- platform, region, queue
- game_creation_ms, game_duration_s
- patch
```

#### 2. participants
참가자 정보
```sql
- match_id, participant_id (PK)
- champion_id, role, lane
- tier, rank_division (추가됨)
- win, kills, deaths, assists
- items (item0-6)
```

#### 3. bans
밴 정보
```sql
- match_id, team_id, pick_turn (PK)
- champion_id
```

#### 4. champions
챔피언 마스터 데이터
```sql
- champion_id (PK)
- key, name, version
- data (jsonb)
```

### Materialized Views

#### 1. patch_totals_q
패치별 큐별 전체 게임 통계
```sql
SELECT patch, queue,
       COUNT(*) AS total_games,
       SUM(CASE WHEN win THEN 1 ELSE 0 END) AS total_wins
FROM participants p JOIN matches m
GROUP BY patch, queue
```

#### 2. champion_patch_stats_q
패치별 큐별 챔피언 통계
```sql
SELECT patch, queue, champion_id,
       COUNT(*) AS games,
       SUM(CASE WHEN win THEN 1 ELSE 0 END) AS wins
FROM participants p JOIN matches m
GROUP BY patch, queue, champion_id
```

#### 3. ban_patch_stats_q
패치별 큐별 밴 통계
```sql
SELECT patch, queue, champion_id,
       COUNT(*) AS bans
FROM bans b JOIN matches m
GROUP BY patch, queue, champion_id
```

#### 4. champion_stats_region_tier_role (신규)
지역/티어/라인별 챔피언 통계
```sql
SELECT patch, queue, region, tier, role, lane, champion_id,
       COUNT(*) AS games,
       SUM(CASE WHEN win THEN 1 ELSE 0 END) AS wins
FROM participants p JOIN matches m
WHERE tier IS NOT NULL AND role IS NOT NULL
GROUP BY patch, queue, region, tier, role, lane, champion_id
```

#### 5. ban_stats_region_tier_role (신규)
지역/티어별 밴 통계
```sql
SELECT patch, queue, region, tier, champion_id,
       COUNT(*) AS bans
FROM bans b JOIN matches m
GROUP BY patch, queue, region, tier, champion_id
```

#### 6. patch_totals_region_tier (신규)
지역/티어별 전체 게임 통계
```sql
SELECT patch, queue, region, tier,
       COUNT(DISTINCT match_id) AS total_games
FROM participants p JOIN matches m
WHERE tier IS NOT NULL
GROUP BY patch, queue, region, tier
```

### 인덱스 전략
- **복합 인덱스**: (patch, queue), (champion_id), (tier, role)
- **UNIQUE 인덱스**: Materialized View별 고유 키
- **성능**: B-Tree 인덱스 활용

---

## API 엔드포인트

### 1. 패치 챔피언 임팩트
**Endpoint**: `GET /api/reports/patch-champ-impact`

**Query Parameters**:
- `patch` (required): 패치 버전 (예: "15.19")
- `queue` (required): 큐 타입 (420: 솔로랭크)
- `baseline` (optional): 비교 기준 ("prev", "major-minor-prev")
- `limit`, `offset` (optional): 페이지네이션

**Response**:
```typescript
Array<{
  championId: number;
  games: number;
  wins: number;
  winRate: number;
  pickRate: number;
  banRate: number;
  dWinRate: number;    // 델타 승률
  dPickRate: number;   // 델타 픽률
  dBanRate: number;    // 델타 밴률
}>
```

### 2. 챔피언 트렌드
**Endpoint**: `GET /api/champion-trend`

**Query Parameters**:
- `championId` (required): 챔피언 ID
- `queue` (required): 큐 타입
- `upto` (required): 기준 패치
- `limit` (optional): 조회 패치 수 (기본: 10)

**Response**:
```typescript
Array<{
  patch: string;
  games: number;
  wins: number;
  winRate: number;
  pickRate: number;
}>
```

### 3. 밴/픽률 분석 (신규)
**Endpoint**: `GET /api/reports/ban-pick`

**Query Parameters**:
- `patch` (required): 패치 버전
- `queue` (required): 큐 타입
- `region` (optional): 지역 코드 (kr, na, euw, etc.)
- `tier` (optional): 티어 (IRON~CHALLENGER)
- `role` (optional): 라인 (TOP, JUNGLE, MIDDLE, BOTTOM, UTILITY)
- `sortBy` (optional): 정렬 기준 (pickRate, banRate, winRate, games)
- `sortOrder` (optional): 정렬 순서 (desc, asc)
- `limit`, `offset` (optional): 페이지네이션
- `minGames` (optional): 최소 게임 수 필터 (기본: 30)

**Response**:
```typescript
Array<{
  championId: number;
  games: number;
  wins: number;
  bans: number;
  winRate: number;
  pickRate: number;
  banRate: number;
  region?: string;
  tier?: string;
  role?: string;
}>
```

### 4. 챔피언 목록
**Endpoint**: `GET /api/champions`

**Query Parameters**:
- `lang` (optional): 언어 코드 (ko, en, etc.)

**Response**:
```typescript
Array<{
  id: number;
  key: string;
  name: string;
}>
```

---

## 서비스 로직

### 1. PatchChampImpactService
**위치**: `src/reports/services/patch-champ-impact.service.ts`

**주요 메서드**:
- `run(query)`: 패치 임팩트 분석 실행
- `getBasePatch(patch, queue, baseline)`: 비교 기준 패치 조회

**로직 흐름**:
1. 기준 패치 결정 (이전 패치 또는 major-minor 이전 패치)
2. 큐별 데이터 존재 확인
3. 현재/기준 패치 통계 조인 쿼리 실행
4. 델타 값 계산 (현재 - 기준)
5. 게임 수 기준 정렬 및 반환

### 2. ChampionTrendService
**위치**: `src/reports/services/champion-trend.service.ts`

**주요 메서드**:
- `run(query)`: 챔피언 트렌드 조회

**로직 흐름**:
1. 기준 패치까지의 모든 패치 조회
2. released_at 또는 버전 번호로 정렬
3. 패치별 챔피언 통계 조회
4. 최신순 N개 패치 반환

### 3. BanPickAnalysisService (신규)
**위치**: `src/reports/services/ban-pick-analysis.service.ts`

**주요 메서드**:
- `run(query)`: 밴/픽률 분석 실행
- `buildFilteredQuery()`: 필터 적용 쿼리 생성
- `buildDefaultQuery()`: 기본 쿼리 생성

**로직 흐름**:
1. 필터 파라미터 검증 및 정규화
2. 필터 조건에 따라 쿼리 선택
   - 필터 있음: `champion_stats_region_tier_role` 사용
   - 필터 없음: `champion_patch_stats_q` 사용
3. CTE를 활용한 복잡한 집계 쿼리 실행
4. 정렬 및 페이지네이션 적용
5. 결과 파싱 및 반환

### 공통 패턴
- **타입 안전성**: TypeScript strict mode
- **Unknown 처리**: DB 결과를 unknown으로 받아 타입 가드 사용
- **에러 핸들링**: BadRequestException 활용
- **SQL 파라미터화**: SQL Injection 방지

---

## 캐싱 전략

### 캐시 레이어
1. **Global Interceptor**: `CacheInterceptor` (app.module.ts)
2. **Endpoint별 TTL**: `@CacheTTL(seconds)` 데코레이터

### TTL 설정
- **patch-champ-impact**: 180초 (3분)
- **champion-trend**: 300초 (5분)
- **ban-pick**: 300초 (5분)

### 캐시 키 전략
- 요청 URL + Query Parameters
- 예: `GET:/api/reports/patch-champ-impact?patch=15.19&queue=420`

### Cache Invalidation
- TTL 만료 시 자동 갱신
- Materialized View 리프레시 후 캐시 수동 삭제 권장

---

## 보안

### 1. SignedRequestGuard
**위치**: `src/security/signed-request.guard.ts`

**기능**: 요청 서명 검증 (구현 필요)

**적용 범위**:
- 모든 Reports 엔드포인트
- 모든 Champions 엔드포인트

### 2. Validation
- **class-validator**: DTO 자동 검증
- **whitelist**: 알려지지 않은 프로퍼티 제거
- **forbidNonWhitelisted**: 알려지지 않은 프로퍼티 시 에러

### 3. SQL Injection 방지
- **파라미터화된 쿼리**: `$1, $2` 플레이스홀더 사용
- **ORM 사용**: TypeORM 쿼리 빌더

### 4. Rate Limiting (향후 구현 권장)
- API Gateway 레벨 적용
- 또는 NestJS Throttler 모듈

---

## 에러 처리

### Global Exception Filter
**위치**: `src/common/filters/http-exception.filter.ts`

**응답 형식**:
```typescript
{
  success: false,
  message: string,
  errorCode: string,
  details?: any,
  timestamp: string (ISO 8601)
}
```

### 에러 코드 매핑
- `INVALID_PATCH_FORMAT`: 잘못된 패치 형식
- `INVALID_QUEUE`: 잘못된 큐 타입
- `INVALID_CHAMPION_ID`: 잘못된 챔피언 ID
- `VALIDATION_ERROR`: DTO 검증 실패
- `BAD_REQUEST`: 일반적인 잘못된 요청
- `INTERNAL_SERVER_ERROR`: 서버 내부 오류

---

## 성능 최적화

### 1. Materialized Views
- 복잡한 집계 쿼리를 미리 계산
- CONCURRENTLY 옵션으로 무중단 리프레시
- UNIQUE INDEX로 빠른 조회

### 2. 인덱스 활용
- 복합 인덱스로 WHERE 절 최적화
- COVERING INDEX 가능 시 적용

### 3. 쿼리 최적화
- CTE (Common Table Expressions) 활용
- LATERAL JOIN으로 효율적인 서브쿼리
- COALESCE로 NULL 처리 최소화

### 4. 캐싱
- 자주 조회되는 데이터 메모리 캐싱
- Redis 분산 캐시 (스케일 아웃 시)

---

## 배포 및 운영

### 환경 변수
```bash
PORT=4000
NODE_ENV=production
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=lol_app
DB_PASSWORD=***
DB_DATABASE=lol_stats
CACHE_HOST=localhost
CACHE_PORT=6379
```

### Materialized View 관리
```sql
-- 주기적 리프레시 (Cron Job 또는 Scheduler)
REFRESH MATERIALIZED VIEW CONCURRENTLY champion_stats_region_tier_role;
REFRESH MATERIALIZED VIEW CONCURRENTLY ban_stats_region_tier_role;
REFRESH MATERIALIZED VIEW CONCURRENTLY patch_totals_region_tier;

-- 또는 함수 사용
SELECT refresh_ban_pick_stats();
```

### 모니터링 권장사항
- **로그**: Pino JSON 로그 수집
- **메트릭**: Response Time, Error Rate, Cache Hit Rate
- **알림**: 에러 급증 시 알림

---

## 향후 확장 방향

### 1. 그래프 응답 최적화
- Mapper를 활용한 프론트엔드 친화적 데이터 구조
- 메타데이터 포함 (차트 설정, 색상, 범례)

### 2. 실시간 분석
- WebSocket 또는 Server-Sent Events
- 패치 적용 직후 실시간 통계

### 3. ML/AI 통합
- 승률 예측 모델
- 메타 변화 감지 알고리즘

### 4. 다중 지역 지원 강화
- 지역별 비교 분석
- 지역 간 메타 차이 시각화

---

## 참고 문서
- [API 상세 문서](./API.md)
- [데이터베이스 문서](./DATABASE.md)
- [NestJS 공식 문서](https://docs.nestjs.com/)
- [TypeORM 문서](https://typeorm.io/)
