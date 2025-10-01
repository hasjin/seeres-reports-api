import { ApiProperty } from '@nestjs/swagger';

/**
 * 그래프 메타데이터
 * 차트 렌더링에 필요한 설정 및 메타 정보
 */
export class GraphMetadataDto {
  @ApiProperty({
    description: '그래프 제목',
    example: 'Champion Win Rate Trend',
  })
  title?: string;

  @ApiProperty({
    description: '그래프 타입',
    example: 'line',
    enum: ['line', 'bar', 'scatter', 'area', 'mixed'],
  })
  chartType?: ChartType;

  @ApiProperty({
    description: 'X축 설정',
  })
  xAxis?: AxisConfig;

  @ApiProperty({
    description: 'Y축 설정',
  })
  yAxis?: AxisConfig;

  @ApiProperty({
    description: '색상 팔레트',
    example: ['#FF6384', '#36A2EB', '#FFCE56'],
  })
  colors?: string[];

  @ApiProperty({
    description: '툴팁 설정',
  })
  tooltip?: TooltipConfig;

  @ApiProperty({
    description: '범례 설정',
  })
  legend?: LegendConfig;
}

/**
 * 차트 타입
 */
export type ChartType = 'line' | 'bar' | 'scatter' | 'area' | 'mixed';

/**
 * 축 설정
 */
export class AxisConfig {
  @ApiProperty({
    description: '축 레이블',
    example: 'Patch Version',
  })
  label?: string;

  @ApiProperty({
    description: '데이터 타입',
    example: 'category',
    enum: ['category', 'numeric', 'time'],
  })
  type?: 'category' | 'numeric' | 'time';

  @ApiProperty({
    description: '최소값',
    required: false,
  })
  min?: number;

  @ApiProperty({
    description: '최대값',
    required: false,
  })
  max?: number;

  @ApiProperty({
    description: '단위',
    example: '%',
    required: false,
  })
  unit?: string;

  @ApiProperty({
    description: '포맷',
    example: '0.00%',
    required: false,
  })
  format?: string;
}

/**
 * 툴팁 설정
 */
export class TooltipConfig {
  @ApiProperty({
    description: '툴팁 활성화 여부',
    example: true,
  })
  enabled?: boolean;

  @ApiProperty({
    description: '툴팁 포맷',
    example: '{series}: {value}%',
  })
  format?: string;

  @ApiProperty({
    description: '추가 정보 필드',
    example: ['games', 'wins'],
  })
  additionalFields?: string[];
}

/**
 * 범례 설정
 */
export class LegendConfig {
  @ApiProperty({
    description: '범례 표시 여부',
    example: true,
  })
  show?: boolean;

  @ApiProperty({
    description: '범례 위치',
    example: 'top',
    enum: ['top', 'bottom', 'left', 'right'],
  })
  position?: 'top' | 'bottom' | 'left' | 'right';

  @ApiProperty({
    description: '범례 항목',
  })
  items?: LegendItem[];
}

/**
 * 범례 항목
 */
export class LegendItem {
  @ApiProperty({
    description: '항목 이름',
    example: 'Win Rate',
  })
  name: string;

  @ApiProperty({
    description: '항목 색상',
    example: '#FF6384',
  })
  color: string;

  @ApiProperty({
    description: '항목 설명',
    example: 'Champion win rate over time',
  })
  description?: string;
}
