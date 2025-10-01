import {
  Controller,
  Get,
  Query,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { BanPickAnalysisService } from '../services/ban-pick-analysis.service';
import { BanPickAnalysisQuery } from '../dto/ban-pick-analysis.query';
import { SignedRequestGuard } from '../../security/signed-request.guard';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';

/**
 * 밴/픽률 분석 컨트롤러
 * 지역, 티어, 라인별 세분화된 챔피언 통계 제공
 */
@Controller('reports/ban-pick')
@UseGuards(SignedRequestGuard)
@UseInterceptors(CacheInterceptor)
@ApiTags('reports')
export class BanPickAnalysisController {
  constructor(private readonly svc: BanPickAnalysisService) {}

  @CacheTTL(300) // 5분 캐시
  @Get()
  @ApiOperation({
    summary: '밴/픽률 세분화 분석 (지역/티어/라인)',
    description:
      '지역, 티어, 라인별로 세분화된 챔피언 밴/픽 통계를 제공합니다.\n\n' +
      '**사용 시나리오:**\n' +
      '- 특정 지역의 메타 분석 (예: 한국 vs 북미 메타 비교)\n' +
      '- 티어별 챔피언 선호도 조사 (예: 챌린저 vs 브론즈)\n' +
      '- 라인별 최적 챔피언 분석\n' +
      '- 다중 필터 조합으로 정밀한 메타 분석\n\n' +
      '**필터 조합 예시:**\n' +
      '- `region=kr&tier=PLATINUM&role=MIDDLE` - 한국 플래티넘 미드\n' +
      '- `tier=CHALLENGER&role=JUNGLE` - 전체 지역 챌린저 정글\n' +
      '- `region=na&tier=all&role=all` - 북미 전체 통계\n\n' +
      '**정렬 옵션:**\n' +
      '- `sortBy=pickRate` - 픽률 순\n' +
      '- `sortBy=banRate` - 밴률 순\n' +
      '- `sortBy=winRate` - 승률 순\n' +
      '- `sortBy=games` - 게임 수 순',
  })
  @ApiResponse({
    status: 200,
    description: '밴/픽률 분석 데이터 조회 성공',
    schema: {
      example: [
        {
          championId: 266,
          games: 3456,
          wins: 1789,
          bans: 567,
          winRate: 0.5177,
          pickRate: 0.1234,
          banRate: 0.0678,
          region: 'kr',
          tier: 'PLATINUM',
          role: 'MIDDLE',
        },
        {
          championId: 157,
          games: 3123,
          wins: 1523,
          bans: 1890,
          winRate: 0.4876,
          pickRate: 0.1145,
          banRate: 0.2345,
          region: 'kr',
          tier: 'PLATINUM',
          role: 'MIDDLE',
        },
        {
          championId: 777,
          games: 2987,
          wins: 1567,
          bans: 234,
          winRate: 0.5245,
          pickRate: 0.1098,
          banRate: 0.0289,
          region: 'kr',
          tier: 'PLATINUM',
          role: 'MIDDLE',
        },
      ],
    },
  })
  @ApiBadRequestResponse({
    description: '잘못된 요청 파라미터 (패치 형식 오류, 큐 타입 오류 등)',
    schema: {
      example: {
        success: false,
        message: 'Queue must be a non-negative integer',
        errorCode: 'INVALID_QUEUE',
        timestamp: '2025-10-01T12:00:00.000Z',
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: '서버 내부 오류',
  })
  async analyze(@Query() q: BanPickAnalysisQuery) {
    return this.svc.run(q);
  }
}
