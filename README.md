# Seeres Reports API

패치 전/후 기준으로 LoL 메타 리포트를 제공하는 NestJS API 서비스.

## Tech Stack
- Node.js + NestJS
- Cache: Nest CacheInterceptor (in-memory, optional Redis)
- DB: Postgres/TypeORM 등
- Swagger(OpenAPI): `/api/docs`

## Requirements
- Node.js 18+ (권장 LTS)
- npm/pnpm 중 하나
- Redis 서버

## 설치
```bash
npm ci
# 또는
pnpm i --frozen-lockfile
```

## 환경변수
- .env.sample을 복사하여 .env 생성
```
PORT=3000
NODE_ENV=development

# Cache (옵션: Redis를 쓸 경우)
CACHE_HOST=localhost
CACHE_PORT=6379
CACHE_PASSWORD=
```

## 실행
``` bash
# 개발
npm run start:dev

# 프로덕션 빌드 & 실행
npm run build
npm run start:prod
```

## 엔드포인트
- GET /api/health : 헬스체크
- GET /api/reports/patch-champ-impact?patch=15.19&queue=420
- 쿼리 파라미터 예)
  - patch : 문자열 (예: 15.19)
  - queue : 숫자 (예: 420)

## 캐싱 동작
- @UseInterceptors(CacheInterceptor) + @CacheTTL(120) 로 120초 캐시.
- 기본 캐시 키 = 요청 URL(경로+쿼리).
- Redis를 사용할 경우 CacheModule.registerAsync로 Redis store 연결 추천.

## 테스트
``` bash
npm run test
npm run test:e2e
npm run test:cov
```

## 코드품질
``` bash
npm run lint
npm run format
npx prettier --write .
```