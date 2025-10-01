# API 상세 문서

## 📋 목차
1. [인증](#인증)
2. [엔드포인트 목록](#엔드포인트-목록)
3. [패치 임팩트 분석](#패치-임팩트-분석)
4. [챔피언 트렌드](#챔피언-트렌드)
5. [밴픽률 분석](#밴픽률-분석)
6. [챔피언 목록](#챔피언-목록)
7. [에러 코드](#에러-코드)

---

## 인증

모든 API 요청은 `SignedRequestGuard`를 통과해야 합니다.

**헤더** (구현 필요):
```
Authorization: Bearer <token>
X-Signature: <request_signature>
```

---

## 엔드포인트 목록

| Method | Endpoint | Description | Cache TTL |
|--------|----------|-------------|-----------|
| GET | `/api/reports/patch-champ-impact` | 패치 챔피언 임팩트 분석 | 180s |
| GET | `/api/champion-trend` | 챔피언 트렌드 조회 | 300s |
| GET | `/api/reports/ban-pick` | 밴/픽률 분석 (지역/티어/라인) | 300s |
| GET | `/api/champions` | 챔피언 목록 조회 | - |

---

## 패치 임팩트 분석

### Endpoint
```
GET /api/reports/patch-champ-impact
```

### 설명
특정 패치에서 챔피언들의 승률, 픽률, 밴률 변화를 기준 패치와 비교하여 분석합니다.

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `patch` | string | Yes | - | 패치 버전 (예: "15.19") |
| `queue` | number | Yes | - | 큐 타입 (420: 솔로랭크, 440: 자유랭크, 450: 칼바람) |
| `baseline` | string | No | "prev" | 비교 기준 ("prev": 이전 패치, "major-minor-prev": 같은 메이저.마이너 내 이전 패치) |
| `limit` | number | No | 9999 | 결과 개수 제한 (1-9999) |
| `offset` | number | No | 0 | 페이지네이션 오프셋 |

### Request Example
```http
GET /api/reports/patch-champ-impact?patch=15.19&queue=420&baseline=prev&limit=50
```

### Response
```json
[
  {
    "championId": 266,
    "games": 15234,
    "wins": 7892,
    "winRate": 0.5179,
    "pickRate": 0.1234,
    "banRate": 0.0567,
    "dWinRate": 0.0234,
    "dPickRate": 0.0123,
    "dBanRate": -0.0012
  },
  ...
]
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `championId` | number | 챔피언 ID |
| `games` | number | 현재 패치 게임 수 |
| `wins` | number | 현재 패치 승리 수 |
| `winRate` | number | 현재 패치 승률 (0-1) |
| `pickRate` | number | 현재 패치 픽률 (0-1) |
| `banRate` | number | 현재 패치 밴률 (0-1) |
| `dWinRate` | number | 승률 변화량 (현재 - 기준) |
| `dPickRate` | number | 픽률 변화량 (현재 - 기준) |
| `dBanRate` | number | 밴률 변화량 (현재 - 기준) |

### Business Logic

1. **기준 패치 결정**:
   - `baseline=prev`: 가장 최근 이전 패치
   - `baseline=major-minor-prev`: 같은 메이저.마이너 버전 내 이전 패치

2. **큐별 데이터 확인**:
   - 기준 패치에 해당 큐 데이터가 없으면 대체 패치 탐색

3. **델타 계산**:
   - dWinRate = 현재 승률 - 기준 승률
   - dPickRate = 현재 픽률 - 기준 픽률
   - dBanRate = 현재 밴률 - 기준 밴률

4. **정렬**:
   - 게임 수 내림차순 → 챔피언 ID 오름차순

---

## 챔피언 트렌드

### Endpoint
```
GET /api/champion-trend
```

### 설명
특정 챔피언의 패치별 승률, 픽률 변화 추이를 시계열로 조회합니다.

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `championId` | number | Yes | - | 챔피언 ID (1~) |
| `queue` | number | Yes | - | 큐 타입 (0-9999) |
| `upto` | string | Yes | - | 기준 패치 (이 패치까지의 데이터 조회) |
| `limit` | number | No | 10 | 조회할 패치 개수 (1-100) |

### Request Example
```http
GET /api/champion-trend?championId=266&queue=420&upto=15.19&limit=12
```

### Response
```json
[
  {
    "patch": "15.19",
    "games": 1234,
    "wins": 640,
    "winRate": 0.5186,
    "pickRate": 0.1123
  },
  {
    "patch": "15.18",
    "games": 1156,
    "wins": 578,
    "winRate": 0.5000,
    "pickRate": 0.1056
  },
  ...
]
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `patch` | string | 패치 버전 |
| `games` | number | 게임 수 |
| `wins` | number | 승리 수 |
| `winRate` | number | 승률 (0-1) |
| `pickRate` | number | 픽률 (0-1) |

### Business Logic

1. **패치 목록 조회**:
   - `upto` 패치까지의 모든 패치 조회
   - `released_at` 기준 정렬 (최신순)

2. **통계 조회**:
   - 각 패치별 챔피언 통계 LEFT JOIN
   - 데이터 없는 패치는 0으로 표시

3. **제한**:
   - 최신 N개 패치만 반환 (`limit`)

---

## 밴/픽률 분석

### Endpoint
```
GET /api/reports/ban-pick
```

### 설명
지역, 티어, 라인별로 세분화된 챔피언 밴/픽 통계를 제공합니다.

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `patch` | string | Yes | - | 패치 버전 (예: "15.19") |
| `queue` | number | Yes | - | 큐 타입 (0-9999) |
| `region` | string | No | "all" | 지역 코드 (kr, na, euw, eune, br, jp, lan, las, oce, ru, tr, all) |
| `tier` | string | No | "all" | 티어 (IRON, BRONZE, SILVER, GOLD, PLATINUM, EMERALD, DIAMOND, MASTER, GRANDMASTER, CHALLENGER, all) |
| `role` | string | No | "all" | 라인 (TOP, JUNGLE, MIDDLE, BOTTOM, UTILITY, all) |
| `sortBy` | string | No | "pickRate" | 정렬 기준 (pickRate, banRate, winRate, games) |
| `sortOrder` | string | No | "desc" | 정렬 순서 (desc, asc) |
| `limit` | number | No | 100 | 결과 개수 제한 (1-500) |
| `offset` | number | No | 0 | 페이지네이션 오프셋 |
| `minGames` | number | No | 30 | 최소 게임 수 필터 |

### Request Examples

#### 한국 플래티넘 미드 라인 통계
```http
GET /api/reports/ban-pick?patch=15.19&queue=420&region=kr&tier=PLATINUM&role=MIDDLE&sortBy=pickRate&limit=20
```

#### 전체 지역 마스터+ 통계
```http
GET /api/reports/ban-pick?patch=15.19&queue=420&tier=MASTER&sortBy=winRate&limit=50
```

#### 정글 챔피언 밴률 순위
```http
GET /api/reports/ban-pick?patch=15.19&queue=420&role=JUNGLE&sortBy=banRate&limit=30
```

### Response
```json
[
  {
    "championId": 266,
    "games": 3456,
    "wins": 1789,
    "bans": 567,
    "winRate": 0.5177,
    "pickRate": 0.1234,
    "banRate": 0.0678,
    "region": "kr",
    "tier": "PLATINUM",
    "role": "MIDDLE"
  },
  ...
]
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `championId` | number | 챔피언 ID |
| `games` | number | 게임 수 |
| `wins` | number | 승리 수 |
| `bans` | number | 밴 횟수 |
| `winRate` | number | 승률 (0-1) |
| `pickRate` | number | 픽률 (0-1) |
| `banRate` | number | 밴률 (0-1) |
| `region` | string? | 필터 적용 시 지역 |
| `tier` | string? | 필터 적용 시 티어 |
| `role` | string? | 필터 적용 시 라인 |

### Business Logic

1. **필터 정규화**:
   - `"all"` 값은 NULL로 변환 (필터 미적용)

2. **쿼리 선택**:
   - 필터 있음: `champion_stats_region_tier_role` 뷰 사용
   - 필터 없음: `champion_patch_stats_q` 뷰 사용 (성능 최적화)

3. **집계 로직**:
   - 픽 통계와 밴 통계 별도 집계 후 FULL OUTER JOIN
   - 전체 게임 수 대비 비율 계산

4. **필터링**:
   - `minGames` 이상인 챔피언만 포함

5. **정렬**:
   - `sortBy` 기준 정렬
   - 동일 값일 경우 챔피언 ID 오름차순

---

## 챔피언 목록

### Endpoint
```
GET /api/champions
```

### 설명
전체 챔피언 목록을 조회합니다. 다국어 지원.

### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `lang` | string | No | - | 언어 코드 (ko, en, ja, etc.) |

### Request Example
```http
GET /api/champions?lang=ko
```

### Response
```json
[
  {
    "id": 1,
    "key": "Annie",
    "name": "애니"
  },
  {
    "id": 2,
    "key": "Olaf",
    "name": "올라프"
  },
  ...
]
```

### Response Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | number | 챔피언 ID |
| `key` | string | 챔피언 영문 키 |
| `name` | string | 챔피언 이름 (로컬라이즈됨) |

---

## 에러 코드

### 공통 에러 응답 형식
```json
{
  "success": false,
  "message": "Error message",
  "errorCode": "ERROR_CODE",
  "details": {},
  "timestamp": "2025-10-01T12:00:00.000Z"
}
```

### 에러 코드 목록

| HTTP Status | Error Code | Description |
|-------------|------------|-------------|
| 400 | `BAD_REQUEST` | 일반적인 잘못된 요청 |
| 400 | `INVALID_PATCH_FORMAT` | 잘못된 패치 형식 (형식: X.Y 또는 X.Y.Z) |
| 400 | `INVALID_PATCH` | 존재하지 않는 패치 |
| 400 | `INVALID_QUEUE` | 잘못된 큐 타입 (범위: 0-9999) |
| 400 | `INVALID_CHAMPION_ID` | 잘못된 챔피언 ID |
| 400 | `VALIDATION_ERROR` | DTO 검증 실패 |
| 401 | `UNAUTHORIZED` | 인증 실패 |
| 403 | `FORBIDDEN` | 권한 없음 |
| 404 | `NOT_FOUND` | 리소스를 찾을 수 없음 |
| 429 | `TOO_MANY_REQUESTS` | 요청 제한 초과 |
| 500 | `INTERNAL_SERVER_ERROR` | 서버 내부 오류 |
| 503 | `SERVICE_UNAVAILABLE` | 서비스 일시 중단 |

### 에러 예시

#### 잘못된 패치 형식
```json
{
  "success": false,
  "message": "Patch must be in format X.Y or X.Y.Z (e.g., 15.19 or 15.19.1)",
  "errorCode": "INVALID_PATCH_FORMAT",
  "details": {
    "message": [
      "Patch must be in format X.Y or X.Y.Z (e.g., 15.19 or 15.19.1)"
    ],
    "error": "Bad Request",
    "statusCode": 400
  },
  "timestamp": "2025-10-01T12:34:56.789Z"
}
```

#### 필수 파라미터 누락
```json
{
  "success": false,
  "message": "queue is required",
  "errorCode": "BAD_REQUEST",
  "details": {
    "message": "queue is required",
    "error": "Bad Request",
    "statusCode": 400
  },
  "timestamp": "2025-10-01T12:34:56.789Z"
}
```

---

## Rate Limiting (향후 구현)

### 제한 정책 (예시)
- **Anonymous**: 100 requests / 15 minutes
- **Authenticated**: 1000 requests / 15 minutes
- **Premium**: 10000 requests / 15 minutes

### 응답 헤더
```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1633024800
```

---

## 캐싱

### Cache-Control 헤더
```
Cache-Control: public, max-age=180
```

### 캐시 무효화
- TTL 만료 시 자동 갱신
- Materialized View 리프레시 후 수동 캐시 클리어 권장

---

## Pagination

### Query Parameters
- `limit`: 페이지당 항목 수
- `offset`: 건너뛸 항목 수

### 응답 메타데이터 (향후 구현)
```json
{
  "data": [...],
  "meta": {
    "total": 165,
    "limit": 50,
    "offset": 0,
    "hasNext": true,
    "hasPrev": false
  }
}
```

---

## Swagger/OpenAPI

### 접근
```
http://localhost:4000/api/docs
```

### 기능
- 대화형 API 테스트
- 스키마 정의 확인
- 예시 요청/응답 확인

---

## 베스트 프랙티스

### 1. 적절한 필터 사용
- 지역/티어/라인 필터를 조합하여 정확한 메타 분석
- `minGames` 파라미터로 신뢰도 높은 데이터만 조회

### 2. 캐시 활용
- 동일 요청 반복 시 캐시 활용 (TTL 고려)
- 실시간성이 중요하지 않은 경우 캐시 의존

### 3. 페이지네이션
- 대량 데이터 조회 시 `limit`/`offset` 활용
- 초기 로딩 시 작은 `limit` 사용

### 4. 정렬 최적화
- 필요한 정렬 기준만 사용
- 인덱싱된 컬럼 우선 활용

---

## 문제 해결

### Q: 특정 패치 데이터가 없다고 나옵니다.
**A**: 해당 패치의 Materialized View가 리프레시되지 않았을 수 있습니다. 관리자에게 문의하세요.

### Q: 응답이 느립니다.
**A**:
1. 필터를 추가하여 데이터 범위 축소
2. `limit` 값 조정
3. 캐시 TTL 확인

### Q: 특정 챔피언 데이터가 0입니다.
**A**: `minGames` 필터로 인해 제외되었거나, 실제로 해당 조건에서 플레이되지 않았을 수 있습니다.

---

## 추가 리소스
- [아키텍처 문서](./ARCHITECTURE.md)
- [데이터베이스 문서](./DATABASE.md)
- [Swagger UI](http://localhost:4000/api/docs)
