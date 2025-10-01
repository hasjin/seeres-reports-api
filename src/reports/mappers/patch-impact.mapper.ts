import { Injectable } from '@nestjs/common';
import {
  PatchImpactResponseDto,
  ChampionImpactDto,
  PatchStatsDto,
  StatsChangeDto,
  ImpactTier,
  ImpactSummaryDto,
} from '../dto/responses/patch-impact-response.dto';
import { GraphMetadataDto } from '../dto/responses/graph-metadata.dto';
import { PatchChampImpactRow } from '../models/patch-champ-impact.model';

/**
 * 패치 임팩트 데이터 매퍼
 * 서비스 레이어의 데이터를 프론트엔드 친화적인 응답 DTO로 변환
 */
@Injectable()
export class PatchImpactMapper {
  /**
   * 임팩트 데이터를 응답 DTO로 변환
   */
  toResponseDto(
    currentPatch: string,
    basePatch: string | null,
    queue: number,
    rows: PatchChampImpactRow[],
  ): PatchImpactResponseDto {
    const champions = rows.map((row) => this.toChampionImpactDto(row));
    const summary = this.calculateSummary(champions);
    const graphMetadata = this.createGraphMetadata(currentPatch, basePatch);

    return {
      currentPatch,
      basePatch: basePatch ?? 'N/A',
      queue,
      champions,
      graphMetadata,
      summary,
    };
  }

  /**
   * 개별 챔피언 임팩트 DTO로 변환
   */
  private toChampionImpactDto(row: PatchChampImpactRow): ChampionImpactDto {
    const current = this.toPatchStatsDto(row);
    const delta = this.toStatsChangeDto(row);
    const impactScore = this.calculateImpactScore(row);
    const impactTier = this.determineImpactTier(impactScore);

    return {
      championId: row.championId,
      current,
      delta,
      impactScore,
      impactTier,
    };
  }

  /**
   * 현재 패치 통계 DTO로 변환
   */
  private toPatchStatsDto(row: PatchChampImpactRow): PatchStatsDto {
    return {
      games: row.games,
      wins: row.wins,
      winRate: row.winRate,
      pickRate: row.pickRate,
      banRate: row.banRate,
      winRatePercent: this.toPercent(row.winRate),
      pickRatePercent: this.toPercent(row.pickRate),
      banRatePercent: this.toPercent(row.banRate),
    };
  }

  /**
   * 통계 변화량 DTO로 변환
   */
  private toStatsChangeDto(row: PatchChampImpactRow): StatsChangeDto {
    return {
      winRate: row.dWinRate,
      pickRate: row.dPickRate,
      banRate: row.dBanRate,
      winRatePercent: this.toPercent(row.dWinRate),
      pickRatePercent: this.toPercent(row.dPickRate),
      banRatePercent: this.toPercent(row.dBanRate),
    };
  }

  /**
   * 임팩트 점수 계산 (0-100)
   * 승률, 픽률, 밴률 변화를 종합하여 점수화
   */
  private calculateImpactScore(row: PatchChampImpactRow): number {
    // 승률 변화: 가장 중요 (가중치 50%)
    const winRateImpact = Math.abs(row.dWinRate) * 100 * 0.5;

    // 픽률 변화: 중요 (가중치 30%)
    const pickRateImpact = Math.abs(row.dPickRate) * 100 * 0.3;

    // 밴률 변화: 보조 (가중치 20%)
    const banRateImpact = Math.abs(row.dBanRate) * 100 * 0.2;

    const score = winRateImpact + pickRateImpact + banRateImpact;

    // 0-100 범위로 정규화 (max 20% 변화를 100점으로 간주)
    return Math.min(this.round(score * 5, 2), 100);
  }

  /**
   * 임팩트 등급 결정
   */
  private determineImpactTier(score: number): ImpactTier {
    if (score >= 80) return 'very-high';
    if (score >= 60) return 'high';
    if (score >= 40) return 'medium';
    if (score >= 20) return 'low';
    return 'very-low';
  }

  /**
   * 임팩트 통계 요약 계산
   */
  private calculateSummary(
    champions: ChampionImpactDto[],
  ): ImpactSummaryDto {
    if (champions.length === 0) {
      return {
        totalChampions: 0,
        buffedChampions: 0,
        nerfedChampions: 0,
        maxWinRateIncrease: 0,
        maxWinRateDecrease: 0,
        avgWinRateChange: 0,
        maxPickRateChange: 0,
        metaShiftScore: 0,
      };
    }

    const winRateChanges = champions.map((c) => c.delta.winRate);
    const pickRateChanges = champions.map((c) => Math.abs(c.delta.pickRate));

    const buffedChampions = winRateChanges.filter((wr) => wr > 0.01).length;
    const nerfedChampions = winRateChanges.filter((wr) => wr < -0.01).length;

    const maxWinRateIncrease = Math.max(...winRateChanges, 0);
    const maxWinRateDecrease = Math.min(...winRateChanges, 0);
    const avgWinRateChange = this.average(winRateChanges);
    const maxPickRateChange = Math.max(...pickRateChanges, 0);

    // 메타 변화 점수: 평균 임팩트 점수
    const metaShiftScore = this.average(champions.map((c) => c.impactScore));

    return {
      totalChampions: champions.length,
      buffedChampions,
      nerfedChampions,
      maxWinRateIncrease: this.round(maxWinRateIncrease, 4),
      maxWinRateDecrease: this.round(maxWinRateDecrease, 4),
      avgWinRateChange: this.round(avgWinRateChange, 4),
      maxPickRateChange: this.round(maxPickRateChange, 4),
      metaShiftScore: this.round(metaShiftScore, 2),
    };
  }

  /**
   * 그래프 메타데이터 생성
   */
  private createGraphMetadata(
    currentPatch: string,
    basePatch: string | null,
  ): GraphMetadataDto {
    return {
      title: `Patch ${currentPatch} Impact Analysis`,
      chartType: 'bar',
      xAxis: {
        label: 'Champions',
        type: 'category',
      },
      yAxis: {
        label: 'Win Rate Change',
        type: 'numeric',
        unit: '%',
        format: '+0.0%',
      },
      colors: [
        '#36A2EB', // 승률
        '#FFCE56', // 픽률
        '#FF6384', // 밴률
        '#4BC0C0', // 델타 승률
        '#9966FF', // 델타 픽률
        '#FF9F40', // 델타 밴률
      ],
      tooltip: {
        enabled: true,
        format: '{series}: {value}%',
        additionalFields: ['games', 'wins', 'impactScore'],
      },
      legend: {
        show: true,
        position: 'top',
        items: [
          {
            name: 'Win Rate',
            color: '#36A2EB',
            description: 'Current patch win rate',
          },
          {
            name: 'Win Rate Change',
            color: '#4BC0C0',
            description: `Change from ${basePatch ?? 'previous'} patch`,
          },
          {
            name: 'Pick Rate',
            color: '#FFCE56',
            description: 'Current patch pick rate',
          },
          {
            name: 'Ban Rate',
            color: '#FF6384',
            description: 'Current patch ban rate',
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
