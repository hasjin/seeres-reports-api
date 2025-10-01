import { Injectable } from '@nestjs/common';
import {
  ChampionTrendResponseDto,
  ChampionTrendPointDto,
  TrendSummaryDto,
} from '../dto/responses/champion-trend-response.dto';
import { GraphMetadataDto } from '../dto/responses/graph-metadata.dto';
import { ChampionTrendPoint } from '../services/champion-trend.service';

/**
 * 챔피언 트렌드 데이터 매퍼
 * 서비스 레이어의 데이터를 프론트엔드 친화적인 응답 DTO로 변환
 */
@Injectable()
export class ChampionTrendMapper {
  /**
   * 트렌드 데이터를 응답 DTO로 변환
   */
  toResponseDto(
    championId: number,
    queue: number,
    trends: ChampionTrendPoint[],
  ): ChampionTrendResponseDto {
    const trendDtos = trends.map((point) => this.toTrendPointDto(point));
    const summary = this.calculateSummary(trendDtos);
    const graphMetadata = this.createGraphMetadata(championId);

    return {
      championId,
      queue,
      trends: trendDtos,
      graphMetadata,
      summary,
    };
  }

  /**
   * 개별 트렌드 포인트를 DTO로 변환
   */
  private toTrendPointDto(point: ChampionTrendPoint): ChampionTrendPointDto {
    return {
      patch: point.patch,
      games: point.games,
      wins: point.wins,
      winRate: point.winRate,
      pickRate: point.pickRate,
      winRatePercent: this.toPercent(point.winRate),
      pickRatePercent: this.toPercent(point.pickRate),
    };
  }

  /**
   * 트렌드 통계 요약 계산
   */
  private calculateSummary(trends: ChampionTrendPointDto[]): TrendSummaryDto {
    if (trends.length === 0) {
      return {
        avgWinRate: 0,
        avgPickRate: 0,
        maxWinRate: 0,
        minWinRate: 0,
        winRateVolatility: 0,
        recentTrend: 'stable',
        totalGames: 0,
      };
    }

    const winRates = trends.map((t) => t.winRate);
    const pickRates = trends.map((t) => t.pickRate);
    const games = trends.map((t) => t.games);

    const avgWinRate = this.average(winRates);
    const avgPickRate = this.average(pickRates);
    const maxWinRate = Math.max(...winRates);
    const minWinRate = Math.min(...winRates);
    const winRateVolatility = maxWinRate - minWinRate;
    const totalGames = games.reduce((sum, g) => sum + g, 0);

    const recentTrend = this.calculateRecentTrend(trends);

    return {
      avgWinRate: this.round(avgWinRate, 4),
      avgPickRate: this.round(avgPickRate, 4),
      maxWinRate: this.round(maxWinRate, 4),
      minWinRate: this.round(minWinRate, 4),
      winRateVolatility: this.round(winRateVolatility, 4),
      recentTrend,
      totalGames,
    };
  }

  /**
   * 최근 트렌드 방향 계산
   * 최근 3개 데이터 포인트의 승률 변화를 기반으로 판단
   */
  private calculateRecentTrend(
    trends: ChampionTrendPointDto[],
  ): 'up' | 'down' | 'stable' {
    if (trends.length < 2) {
      return 'stable';
    }

    // 최근 3개 포인트 사용 (역순 정렬이므로 앞의 3개)
    const recentPoints = trends.slice(0, Math.min(3, trends.length));
    const firstWinRate = recentPoints[recentPoints.length - 1].winRate;
    const lastWinRate = recentPoints[0].winRate;
    const change = lastWinRate - firstWinRate;

    const threshold = 0.01; // 1% 변화를 의미있는 변화로 간주

    if (change > threshold) {
      return 'up';
    } else if (change < -threshold) {
      return 'down';
    } else {
      return 'stable';
    }
  }

  /**
   * 그래프 메타데이터 생성
   */
  private createGraphMetadata(championId: number): GraphMetadataDto {
    return {
      title: `Champion ${championId} Trend Analysis`,
      chartType: 'line',
      xAxis: {
        label: 'Patch Version',
        type: 'category',
      },
      yAxis: {
        label: 'Rate',
        type: 'numeric',
        min: 0,
        max: 1,
        unit: '%',
        format: '0.0%',
      },
      colors: [
        '#4BC0C0', // 승률 - Teal
        '#FF6384', // 픽률 - Pink
      ],
      tooltip: {
        enabled: true,
        format: '{series}: {value}%',
        additionalFields: ['games', 'wins'],
      },
      legend: {
        show: true,
        position: 'top',
        items: [
          {
            name: 'Win Rate',
            color: '#4BC0C0',
            description: 'Champion win rate over patches',
          },
          {
            name: 'Pick Rate',
            color: '#FF6384',
            description: 'Champion pick rate over patches',
          },
        ],
      },
    };
  }

  /**
   * 평균 계산
   */
  private average(numbers: number[]): number {
    if (numbers.length === 0) return 0;
    const sum = numbers.reduce((acc, n) => acc + n, 0);
    return sum / numbers.length;
  }

  /**
   * 소수점 반올림
   */
  private round(value: number, decimals: number): number {
    const multiplier = Math.pow(10, decimals);
    return Math.round(value * multiplier) / multiplier;
  }

  /**
   * 비율을 백분율로 변환
   */
  private toPercent(rate: number): number {
    return this.round(rate * 100, 2);
  }
}
