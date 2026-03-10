/**
 * Fact Guard System (Post-AI Validator)
 * 
 * 역할을 수행하는 핵심 모듈입니다:
 * 1. AI가 추출한 데이터(프로필, 에피소드) 내의 핵심 정보(수치, 기술명 등)를 식별.
 * 2. 원본 텍스트(Raw Text) 내에 해당 정보가 실제로 존재하는지 코드로 검증.
 * 3. 원본에 없는 정보가 발견될 경우 'unverified' 플래그를 부여하여 할루시네이션 방지.
 */

export interface VerificationResult {
  isValid: boolean;
  unverifiedTerms: string[];
}

export class FactChecker {
  /**
   * 텍스트 내의 수치(Number)와 핵심 기술 스택(Tech Stack)을 추출하여 원본과 대조합니다.
   */
  public verify(extractedText: string, sourceText: string): VerificationResult {
    const unverifiedTerms: string[] = [];
    
    // 1. 수치 데이터 검증 (예: 1등, 90%, 2024년 등)
    const numberRegex = /(\d+)(%|등|위|명|건|회|점|년|월|개월|학점|차)/g;
    const extractedNumbers = extractedText.match(numberRegex) || [];
    
    for (const num of extractedNumbers) {
      if (!sourceText.includes(num)) {
        unverifiedTerms.push(num);
      }
    }

    // 2. 주요 기술 스택/고유명사 검증 (대소문자 무시)
    // (보통 AI가 임의로 최신 기술을 끼워넣는 경우가 많음)
    const techRegex = /[A-Za-z0-9+#.]{2,}/g; // React, C++, AWS 등
    const extractedTechs = Array.from(new Set(extractedText.match(techRegex) || []));
    
    const lowerSource = sourceText.toLowerCase();
    for (const tech of extractedTechs) {
      // 3글자 이상의 핵심 단어만 체크 (너무 짧으면 오탐 발생 가능)
      if (tech.length >= 3 && !lowerSource.includes(tech.toLowerCase())) {
        // 일반적인 조사나 단어 제외 필터링 필요 (현재는 단순화)
        const commonWords = ['This', 'Then', 'With', 'That', 'From', 'Each'];
        if (!commonWords.includes(tech)) {
          unverifiedTerms.push(tech);
        }
      }
    }

    return {
      isValid: unverifiedTerms.length === 0,
      unverifiedTerms
    };
  }

  /**
   * 온보딩 결과 전체를 팩트 체크합니다.
   */
  public checkOnboardingResult(result: any, sourceText: string): any {
    const checkedEpisodes = result.episodes.map((ep: any) => {
      const vResult = this.verify(ep.content, sourceText);
      if (!vResult.isValid) {
        return {
          ...ep,
          status: 'draft', // 할루시네이션 의심 시 강제 드래프트 처리
          reason: `${ep.reason} [FactGuard] 원본에서 확인되지 않는 정보 발견: ${vResult.unverifiedTerms.join(', ')}`
        };
      }
      return ep;
    });

    return {
      ...result,
      episodes: checkedEpisodes
    };
  }
}
