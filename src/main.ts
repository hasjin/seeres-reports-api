import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from 'nestjs-pino';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import * as express from 'express';
import type { Request, Response } from 'express';

type RawBodyRequest = Request & { rawBody?: Buffer };

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    bufferLogs: true,
  });
  app.useLogger(app.get(Logger));
  app.setGlobalPrefix('api');

  app.use(
    express.json({
      verify: (req: RawBodyRequest, _res: Response, buf: Buffer) => {
        req.rawBody = buf;
      },
    }),
  );
  app.use(
    express.urlencoded({
      extended: true,
      verify: (req: RawBodyRequest, _res: Response, buf: Buffer) => {
        req.rawBody = buf;
      },
    }),
  );

  // 글로벌 예외 필터 적용
  app.useGlobalFilters(new HttpExceptionFilter());

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
      exceptionFactory: (errors) => {
        const messages = errors.map((error) => ({
          field: error.property,
          constraints: error.constraints,
        }));
        return {
          statusCode: 400,
          message: 'Validation failed',
          errors: messages,
        };
      },
    }),
  );

  const docConfig = new DocumentBuilder()
    .setTitle('Seeres Reports API')
    .setDescription(
      '# League of Legends 통계 분석 API\n\n' +
        '패치별, 지역별, 티어별 챔피언 통계를 제공하는 RESTful API입니다.\n\n' +
        '## 📊 주요 기능\n\n' +
        '### 1. 패치 임팩트 분석\n' +
        '- 패치 업데이트에 따른 챔피언 메타 변화 추적\n' +
        '- 승률/픽률/밴률의 델타 값 제공\n' +
        '- 이전 패치 또는 동일 메이저.마이너 버전 비교 지원\n\n' +
        '### 2. 챔피언 트렌드\n' +
        '- 시계열 챔피언 성능 분석\n' +
        '- 최근 N개 패치의 통계 조회\n' +
        '- 그래프 시각화에 최적화된 데이터 구조\n\n' +
        '### 3. 밴/픽률 분석 (신규)\n' +
        '- **지역별** 메타 분석 (KR, NA, EUW 등)\n' +
        '- **티어별** 통계 (IRON ~ CHALLENGER)\n' +
        '- **라인별** 챔피언 성능 (TOP, JUNGLE, MIDDLE, BOTTOM, UTILITY)\n' +
        '- 필터 조합으로 세분화된 메타 분석 가능\n\n' +
        '### 4. 챔피언 정보\n' +
        '- 전체 챔피언 목록 조회\n' +
        '- 다국어 지원 (한국어, 영어 등)\n\n' +
        '## 🔐 인증\n\n' +
        '모든 API 요청은 SignedRequestGuard를 통과해야 합니다.\n\n' +
        '## 📖 추가 문서\n\n' +
        '- [아키텍처 문서](https://github.com/your-repo/docs/ARCHITECTURE.md)\n' +
        '- [API 상세 문서](https://github.com/your-repo/docs/API.md)\n' +
        '- [데이터베이스 문서](https://github.com/your-repo/docs/DATABASE.md)\n\n' +
        '## 💡 사용 예시\n\n' +
        '```bash\n' +
        '# 한국 플래티넘 미드라이너 통계\n' +
        'GET /api/reports/ban-pick?patch=15.19&queue=420&region=kr&tier=PLATINUM&role=MIDDLE\n\n' +
        '# 패치 임팩트 분석\n' +
        'GET /api/reports/patch-champ-impact?patch=15.19&queue=420\n\n' +
        '# 챔피언 트렌드\n' +
        'GET /api/champion-trend?championId=266&queue=420&upto=15.19&limit=12\n' +
        '```',
    )
    .setVersion('1.0.0')
    .setContact(
      'Seeres Team',
      'https://github.com/your-repo',
      'support@example.com',
    )
    .setLicense('Proprietary', 'https://example.com/license')
    .addServer('http://localhost:4000', 'Development Server')
    .addServer('https://api.example.com', 'Production Server')
    .addTag('reports', '📊 리포트 - 패치 및 챔피언 통계 분석')
    .addTag('champions', '🏆 챔피언 - 챔피언 정보 조회')
    .addTag('health', '💚 헬스체크 - 서버 상태 확인')
    .build();

  const document = SwaggerModule.createDocument(app, docConfig, {
    operationIdFactory: (controllerKey: string, methodKey: string) =>
      methodKey,
  });

  SwaggerModule.setup('/api/docs', app, document, {
    customSiteTitle: 'Seeres Reports API - Interactive Documentation',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { font-size: 2.5rem; }
      .swagger-ui .info .description { font-size: 1rem; line-height: 1.6; }
      .swagger-ui .scheme-container { background: #fafafa; padding: 15px; border-radius: 4px; }
      .swagger-ui .opblock-tag { font-size: 1.3rem; }
      .swagger-ui .opblock { margin: 15px 0; border-radius: 4px; }
      .swagger-ui .opblock.opblock-get .opblock-summary-method { background: #61affe; }
      .swagger-ui .opblock.opblock-post .opblock-summary-method { background: #49cc90; }
      .swagger-ui .opblock-description-wrapper { padding: 15px; }
      .swagger-ui .parameter__name { font-weight: 600; }
      .swagger-ui .response-col_status { font-weight: 600; }
    `,
    customfavIcon: '/favicon.ico',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true,
      docExpansion: 'list',
      defaultModelsExpandDepth: 3,
      defaultModelExpandDepth: 3,
      tryItOutEnabled: true,
    },
  });

  await app.listen(process.env.PORT || 4000);
}
bootstrap().catch((err) => {
  console.error('Nest bootstrap failed', err);
  process.exit(1);
});
