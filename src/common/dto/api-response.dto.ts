import { ApiProperty } from '@nestjs/swagger';

/**
 * 페이지네이션 메타데이터
 */
export class PaginationMetadata {
  @ApiProperty({
    description: '현재 페이지',
    example: 1,
  })
  page: number;

  @ApiProperty({
    description: '페이지당 항목 수',
    example: 20,
  })
  limit: number;

  @ApiProperty({
    description: '전체 항목 수',
    example: 100,
  })
  total: number;

  @ApiProperty({
    description: '전체 페이지 수',
    example: 5,
  })
  totalPages: number;

  @ApiProperty({
    description: '다음 페이지 존재 여부',
    example: true,
  })
  hasNext: boolean;

  @ApiProperty({
    description: '이전 페이지 존재 여부',
    example: false,
  })
  hasPrev: boolean;

  constructor(page: number, limit: number, total: number) {
    this.page = page;
    this.limit = limit;
    this.total = total;
    this.totalPages = Math.ceil(total / limit);
    this.hasNext = page < this.totalPages;
    this.hasPrev = page > 1;
  }
}

/**
 * 데이터 소스 정보
 */
export class DataSourceInfo {
  @ApiProperty({
    description: '데이터 버전',
    example: '15.19',
  })
  version?: string;

  @ApiProperty({
    description: '데이터 업데이트 시각',
    example: '2025-10-01T00:00:00.000Z',
  })
  lastUpdated?: string;

  @ApiProperty({
    description: '데이터 샘플 크기',
    example: 1000000,
  })
  sampleSize?: number;
}

/**
 * 캐시 정보
 */
export class CacheInfo {
  @ApiProperty({
    description: '캐시 히트 여부',
    example: true,
  })
  hit: boolean;

  @ApiProperty({
    description: '캐시 만료 시간(초)',
    example: 120,
  })
  ttl?: number;
}

/**
 * 응답 메타데이터
 */
export class ResponseMetadata {
  @ApiProperty({
    description: '페이지네이션 정보',
    required: false,
  })
  pagination?: PaginationMetadata;

  @ApiProperty({
    description: '데이터 소스 정보',
    required: false,
  })
  dataSource?: DataSourceInfo;

  @ApiProperty({
    description: '캐시 정보',
    required: false,
  })
  cache?: CacheInfo;
}

/**
 * 공통 API 응답 래퍼
 * 모든 API 응답에 일관된 구조를 제공합니다.
 */
export class ApiResponseDto<T> {
  @ApiProperty({
    description: '응답 성공 여부',
    example: true,
  })
  success: boolean;

  @ApiProperty({
    description: '응답 데이터',
  })
  data: T;

  @ApiProperty({
    description: '응답 메타데이터',
    required: false,
  })
  meta?: ResponseMetadata;

  @ApiProperty({
    description: '응답 타임스탬프 (ISO 8601)',
    example: '2025-10-01T12:00:00.000Z',
  })
  timestamp: string;

  constructor(data: T, meta?: ResponseMetadata) {
    this.success = true;
    this.data = data;
    this.meta = meta;
    this.timestamp = new Date().toISOString();
  }
}

/**
 * 에러 응답 DTO
 */
export class ErrorResponseDto {
  @ApiProperty({
    description: '응답 성공 여부',
    example: false,
  })
  success: boolean;

  @ApiProperty({
    description: '에러 메시지',
    example: 'Invalid patch format',
  })
  message: string;

  @ApiProperty({
    description: '에러 코드',
    example: 'INVALID_PATCH_FORMAT',
  })
  errorCode: string;

  @ApiProperty({
    description: '에러 상세 정보',
    required: false,
  })
  details?: any;

  @ApiProperty({
    description: '응답 타임스탬프 (ISO 8601)',
    example: '2025-10-01T12:00:00.000Z',
  })
  timestamp: string;

  constructor(message: string, errorCode: string, details?: any) {
    this.success = false;
    this.message = message;
    this.errorCode = errorCode;
    this.details = details;
    this.timestamp = new Date().toISOString();
  }
}
