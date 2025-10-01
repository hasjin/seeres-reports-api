import { Controller, Get } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiInternalServerErrorResponse,
} from '@nestjs/swagger';

@Controller('health')
@ApiTags('health')
export class HealthController {
  @Get()
  @ApiOperation({
    summary: '서버 헬스체크',
    description:
      '서버의 기본 상태를 확인합니다.\n\n' +
      '**사용 시나리오:**\n' +
      '- 서버 가용성 모니터링\n' +
      '- 로드 밸런서 헬스체크\n' +
      '- 배포 후 서버 상태 확인\n' +
      '- CI/CD 파이프라인 검증\n\n' +
      '**특징:**\n' +
      '- 인증 불필요 (SignedRequestGuard 미적용)\n' +
      '- 빠른 응답 (<10ms)\n' +
      '- 최소한의 리소스 사용',
  })
  @ApiResponse({
    status: 200,
    description: '서버가 정상적으로 동작 중',
    schema: {
      example: {
        ok: true,
      },
    },
  })
  @ApiInternalServerErrorResponse({
    description: '서버 내부 오류 (매우 드묾)',
  })
  ok() {
    return { ok: true };
  }
}
