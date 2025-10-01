// src/reports/controllers/champion-trend.controller.ts
import {
  Controller,
  Get,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ChampionTrendService } from '../services/champion-trend.service';
import { ChampionTrendQuery } from '../dto/champion-trend.query';
import { SignedRequestGuard } from '../../security/signed-request.guard';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';

@Controller('champion-trend')
@UseGuards(SignedRequestGuard)
@UseInterceptors(CacheInterceptor)
@ApiTags('reports')
export class ChampionTrendController {
  constructor(private readonly svc: ChampionTrendService) {}

  @CacheTTL(300) // 5분 캐시
  @Get()
  @ApiOperation({
    summary: '챔피언 시계열 트렌드 분석 (지역/티어/라인 필터링 지원)',
    description:
      '특정 챔피언의 패치별 승률, 픽률 변화 추이를 조회합니다.\n\n' +
      '**사용 시나리오:**\n' +
      '- 챔피언의 장기적인 성능 변화 추적\n' +
      '- 패치 히스토리에 따른 메타 변화 분석\n' +
      '- 시계열 그래프 데이터 생성\n' +
      '- 특정 지역/티어/라인에서의 챔피언 성능 트렌드 분석\n\n' +
      '**필터 조합 예시:**\n' +
      '- `championId=266&queue=420&upto=15.19&limit=12` - 전체 데이터 (기본)\n' +
      '- `championId=266&queue=420&upto=15.19&limit=12&region=kr` - 한국 서버만\n' +
      '- `championId=266&queue=420&upto=15.19&limit=12&tier=PLATINUM` - 플래티넘 티어만\n' +
      '- `championId=266&queue=420&upto=15.19&limit=12&role=MIDDLE` - 미드 라인만\n' +
      '- `championId=266&queue=420&upto=15.19&limit=12&region=kr&tier=PLATINUM&role=MIDDLE` - 한국 플래티넘 미드\n\n' +
      '**응답 정렬:**\n' +
      '- 최신 패치부터 과거 패치 순 (내림차순)\n' +
      '- released_at 기준 정렬',
  })
  @ApiResponse({
    status: 200,
    description: '챔피언 트렌드 데이터 조회 성공',
    schema: {
      example: [
        {
          patch: '15.19',
          games: 1234,
          wins: 640,
          winRate: 0.5186,
          pickRate: 0.1123,
        },
        {
          patch: '15.18',
          games: 1156,
          wins: 578,
          winRate: 0.5000,
          pickRate: 0.1056,
        },
        {
          patch: '15.17',
          games: 1089,
          wins: 534,
          winRate: 0.4903,
          pickRate: 0.0989,
        },
      ],
    },
  })
  @ApiBadRequestResponse({
    description: '잘못된 요청 파라미터 (챔피언 ID, 패치 형식 오류 등)',
    schema: {
      example: {
        success: false,
        message: 'Champion ID must be at least 1',
        errorCode: 'INVALID_CHAMPION_ID',
        timestamp: '2025-10-01T12:00:00.000Z',
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: '서버 내부 오류',
  })
  async get(@Query() q: ChampionTrendQuery) {
    // 기존 응답 형식 유지 (연동 중인 시스템 호환성 유지)
    return this.svc.run({
      championId: q.championId,
      queue: q.queue,
      upto: q.upto,
      n: q.n,
    });
  }
}
