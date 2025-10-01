import {
  Controller,
  Get,
  Query,
  UseInterceptors,
  UseGuards,
} from '@nestjs/common';
import { PatchChampImpactQuery } from './dto/patch-champ-impact.query';
import { PatchChampImpactService } from './services/patch-champ-impact.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBadRequestResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { SignedRequestGuard } from '../security/signed-request.guard';

@UseGuards(SignedRequestGuard)
@ApiTags('reports')
@Controller('reports')
@UseInterceptors(CacheInterceptor)
export class ReportsController {
  constructor(private readonly patchSvc: PatchChampImpactService) {}

  @CacheTTL(180) // 3분 캐시
  @Get('patch-champ-impact')
  @ApiOperation({
    summary: '패치 챔피언 임팩트 분석',
    description:
      '특정 패치에서 챔피언들의 승률, 픽률, 밴률 변화를 기준 패치와 비교하여 분석합니다.\n\n' +
      '**사용 시나리오:**\n' +
      '- 새로운 패치가 나왔을 때 메타 변화 확인\n' +
      '- 챔피언 버프/너프 영향 분석\n' +
      '- 픽/밴 우선순위 변화 추적\n\n' +
      '**응답 정렬:**\n' +
      '- 게임 수 내림차순 (많이 플레이된 챔피언 우선)\n' +
      '- 동일 게임 수일 경우 챔피언 ID 오름차순',
  })
  @ApiResponse({
    status: 200,
    description: '패치 임팩트 데이터 조회 성공',
    schema: {
      example: [
        {
          championId: 266,
          games: 15234,
          wins: 7892,
          winRate: 0.5179,
          pickRate: 0.1234,
          banRate: 0.0567,
          dWinRate: 0.0234,
          dPickRate: 0.0123,
          dBanRate: -0.0012,
        },
        {
          championId: 157,
          games: 14567,
          wins: 7123,
          winRate: 0.4890,
          pickRate: 0.1178,
          banRate: 0.3456,
          dWinRate: -0.0210,
          dPickRate: -0.0056,
          dBanRate: 0.0123,
        },
      ],
    },
  })
  @ApiBadRequestResponse({
    description: '잘못된 요청 파라미터 (패치 형식 오류, 큐 타입 오류 등)',
    schema: {
      example: {
        success: false,
        message: 'Patch must be in format X.Y or X.Y.Z (e.g., 15.19 or 15.19.1)',
        errorCode: 'INVALID_PATCH_FORMAT',
        timestamp: '2025-10-01T12:00:00.000Z',
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: '서버 내부 오류',
  })
  async patchImpact(@Query() q: PatchChampImpactQuery) {
    // 기존 응답 형식 유지 (연동 중인 시스템 호환성 유지)
    return this.patchSvc.run(q);
  }
}
