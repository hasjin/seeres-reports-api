import { Controller, Get, Query } from '@nestjs/common';
import { ChampionsService } from './champions.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';

@Controller('champions')
@ApiTags('champions')
export class ChampionsController {
  constructor(private readonly svc: ChampionsService) {}

  @Get()
  @ApiOperation({
    summary: '전체 챔피언 목록 조회',
    description:
      '모든 챔피언의 ID, 키, 이름을 조회합니다.\n\n' +
      '**다국어 지원:**\n' +
      '- `ko`: 한국어\n' +
      '- `en`: 영어 (기본값)\n' +
      '- `ja`: 일본어\n' +
      '- 기타 지원 언어는 데이터베이스에 따라 다름\n\n' +
      '**사용 시나리오:**\n' +
      '- 챔피언 ID와 이름 매핑\n' +
      '- 드롭다운 선택 옵션 생성\n' +
      '- 챔피언 검색 기능 구현',
  })
  @ApiQuery({
    name: 'lang',
    required: false,
    description: '언어 코드 (ko, en, ja 등)',
    example: 'ko',
  })
  @ApiResponse({
    status: 200,
    description: '챔피언 목록 조회 성공',
    schema: {
      example: [
        {
          id: 1,
          key: 'Annie',
          name: '애니',
        },
        {
          id: 2,
          key: 'Olaf',
          name: '올라프',
        },
        {
          id: 3,
          key: 'Galio',
          name: '갈리오',
        },
        {
          id: 266,
          key: 'Aatrox',
          name: '아트록스',
        },
      ],
    },
  })
  async list(@Query('lang') lang = 'en') {
    return this.svc.list(lang);
  }
}
