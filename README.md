# Seeres Reports API

League of Legends 게임 데이터 분석 및 통계 제공 REST API 서비스

## 📋 개요

Seeres Reports API는 League of Legends 경쟁전 데이터를 분석하여 패치별, 지역별, 티어별 챔피언 통계를 제공하는 백엔드 서비스입니다.

### 주요 기능

- **패치 임팩트 분석**: 패치 업데이트에 따른 챔피언 메타 변화 추적
- **챔피언 트렌드**: 시계열 챔피언 성능 분석
- **밴/픽률 분석**: 지역, 티어, 라인별 세분화된 통계
- **다국어 지원**: 챔피언 정보 로컬라이제이션

---

## 🛠 기술 스택

### Backend
- **Framework**: NestJS 11.x
- **Language**: TypeScript 5.7.x
- **Runtime**: Node.js 18+ LTS

### Database
- **DBMS**: PostgreSQL
- **ORM**: TypeORM 0.3.x

### Infrastructure
- **Cache**: Redis (선택사항)
- **Logging**: Pino
- **Documentation**: Swagger/OpenAPI 3.0

---

## 📚 문서

상세한 문서는 `docs/` 디렉토리를 참조하세요.

- [아키텍처 문서](./docs/ARCHITECTURE.md) - 시스템 구조 및 설계
- [API 문서](./docs/API.md) - 엔드포인트 상세 설명
- [데이터베이스 문서](./docs/DATABASE.md) - 스키마 및 최적화

---

## 🚀 시작하기

### 요구사항

- Node.js 18 이상 (LTS 권장)
- PostgreSQL 데이터베이스
- Redis 서버 (선택사항)

### 설치

```bash
npm install
```

### 환경 설정

환경변수 파일을 생성하고 필요한 값을 설정하세요.

```bash
# .env 파일 생성
cp .env.example .env
```

필요한 환경변수:
- `PORT`: 서버 포트
- `NODE_ENV`: 실행 환경 (development, production)
- 데이터베이스 연결 정보
- 캐시 서버 정보 (선택사항)

### 데이터베이스 설정

1. 기본 스키마 적용:
```bash
psql -U <username> -d <database> -f schema.sql
```

2. 마이그레이션 적용:
```bash
psql -U <username> -d <database> -f schema-migrations/001-add-tier-region-filters.sql
```

### 실행

```bash
# 개발 모드
npm run start:dev

# 프로덕션 빌드 및 실행
npm run build
npm run start:prod
```

---

## 📡 API 엔드포인트

### 헬스체크
```
GET /api/health
```

### 패치 임팩트 분석
```
GET /api/reports/patch-champ-impact?patch={version}&queue={queueId}
```

### 챔피언 트렌드
```
GET /api/champion-trend?championId={id}&queue={queueId}&upto={patch}
```

### 밴/픽률 분석
```
GET /api/reports/ban-pick?patch={version}&queue={queueId}&region={region}&tier={tier}&role={role}
```

### 챔피언 목록
```
GET /api/champions?lang={languageCode}
```

### API 문서 (Swagger)
```
http://localhost:4000/api/docs
```

상세한 파라미터 및 응답 형식은 [API 문서](./docs/API.md)를 참조하세요.

---

## 🔧 개발

### 코드 품질

```bash
# 린트
npm run lint

# 포맷팅
npm run format
```

### 테스트

```bash
# 단위 테스트
npm run test

# E2E 테스트
npm run test:e2e

# 커버리지
npm run test:cov
```

---

## 📦 프로젝트 구조

```
seeres-reports-api/
├── src/
│   ├── common/           # 공통 모듈
│   ├── config/           # 설정
│   ├── database/         # 데이터베이스 연결
│   ├── security/         # 보안 (인증/인가)
│   ├── champions/        # 챔피언 모듈
│   └── reports/          # 리포트 모듈 (핵심)
├── docs/                 # 문서
├── schema.sql            # 기본 스키마
└── schema-migrations/    # 스키마 마이그레이션
```

---

## 🔐 보안

- 모든 API 엔드포인트는 `SignedRequestGuard`를 통과해야 합니다.
- 요청 검증 및 서명 확인을 통한 보안 강화
- SQL Injection 방지를 위한 파라미터화된 쿼리 사용

---

## 🚀 성능 최적화

- **Materialized Views**: 복잡한 집계 쿼리 사전 계산
- **캐싱**: 자주 조회되는 데이터 메모리 캐싱
- **인덱싱**: 최적화된 데이터베이스 인덱스 전략
- **Connection Pooling**: 데이터베이스 연결 풀 관리

---

## 📊 모니터링

- **로그**: 구조화된 JSON 로그 (Pino)
- **헬스체크**: `/api/health` 엔드포인트
- **메트릭**: 응답 시간, 에러율 추적 권장

---

## 🤝 기여

내부 프로젝트로 외부 기여는 제한됩니다.

---

## 📄 라이선스

비공개 프로젝트 - 모든 권리 보유

---

## 🆘 지원

문제 발생 시 프로젝트 관리자에게 문의하세요.

### 자주 묻는 질문

**Q: 특정 패치 데이터가 조회되지 않습니다.**
A: Materialized View 리프레시가 필요할 수 있습니다. 관리자에게 문의하세요.

**Q: 응답이 느립니다.**
A: 필터 파라미터를 추가하여 데이터 범위를 축소하거나, 캐시 설정을 확인하세요.

**Q: API 인증은 어떻게 하나요?**
A: 현재 `SignedRequestGuard` 구현이 필요합니다. 보안 담당자에게 문의하세요.

---

## 🔄 버전 정보

- **Current Version**: 1.0.0
- **API Version**: v1
- **Last Updated**: 2025-10-01

---

## 📮 연락처

프로젝트 관리팀에 문의하세요.
