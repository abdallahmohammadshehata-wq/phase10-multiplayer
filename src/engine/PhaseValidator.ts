import { Card, CardColor, LaidPhasePart, PhaseRequirement } from '../types/game';

export const PHASE_REQUIREMENTS: PhaseRequirement[] = [
  {
    phaseNumber: 1,
    nameEn: 'Phase 1: 2 Sets of 3',
    nameAr: 'المرحلة 1: مجموعتان من 3',
    descriptionEn: 'Two sets of 3 cards with the same number',
    descriptionAr: 'مجموعتان، كل مجموعة مكونة من 3 بطاقات بنفس الرقم',
    parts: [
      { type: 'SET', count: 3 },
      { type: 'SET', count: 3 }
    ]
  },
  {
    phaseNumber: 2,
    nameEn: 'Phase 2: 1 Set of 3 + 1 Run of 4',
    nameAr: 'المرحلة 2: مجموعة من 3 + متتالية من 4',
    descriptionEn: 'One set of 3 cards + one run of 4 sequential cards',
    descriptionAr: 'مجموعة من 3 أرقام متطابقة + متتالية من 4 أرقام متتالية',
    parts: [
      { type: 'SET', count: 3 },
      { type: 'RUN', count: 4 }
    ]
  },
  {
    phaseNumber: 3,
    nameEn: 'Phase 3: 1 Set of 4 + 1 Run of 4',
    nameAr: 'المرحلة 3: مجموعة من 4 + متتالية من 4',
    descriptionEn: 'One set of 4 cards + one run of 4 sequential cards',
    descriptionAr: 'مجموعة من 4 أرقام متطابقة + متتالية من 4 أرقام متتالية',
    parts: [
      { type: 'SET', count: 4 },
      { type: 'RUN', count: 4 }
    ]
  },
  {
    phaseNumber: 4,
    nameEn: 'Phase 4: 1 Run of 7',
    nameAr: 'المرحلة 4: متتالية من 7',
    descriptionEn: 'One run of 7 sequential cards (any colors)',
    descriptionAr: 'متتالية واحدة من 7 أرقام متتابعة بأي لون',
    parts: [
      { type: 'RUN', count: 7 }
    ]
  },
  {
    phaseNumber: 5,
    nameEn: 'Phase 5: 1 Run of 8',
    nameAr: 'المرحلة 5: متتالية من 8',
    descriptionEn: 'One run of 8 sequential cards (any colors)',
    descriptionAr: 'متتالية واحدة من 8 أرقام متتابعة بأي لون',
    parts: [
      { type: 'RUN', count: 8 }
    ]
  },
  {
    phaseNumber: 6,
    nameEn: 'Phase 6: 1 Run of 9',
    nameAr: 'المرحلة 6: متتالية من 9',
    descriptionEn: 'One run of 9 sequential cards (any colors)',
    descriptionAr: 'متتالية واحدة من 9 أرقام متتابعة بأي لون',
    parts: [
      { type: 'RUN', count: 9 }
    ]
  },
  {
    phaseNumber: 7,
    nameEn: 'Phase 7: 2 Sets of 4',
    nameAr: 'المرحلة 7: مجموعتان من 4',
    descriptionEn: 'Two sets of 4 cards with the same number',
    descriptionAr: 'مجموعتان، كل مجموعة مكونة من 4 بطاقات بنفس الرقم',
    parts: [
      { type: 'SET', count: 4 },
      { type: 'SET', count: 4 }
    ]
  },
  {
    phaseNumber: 8,
    nameEn: 'Phase 8: 7 Cards of 1 Color',
    nameAr: 'المرحلة 8: 7 بطاقات من نفس اللون',
    descriptionEn: '7 cards of the exact same color',
    descriptionAr: '7 بطاقات من نفس اللون (أحمر، أزرق، أخضر، أو أصفر)',
    parts: [
      { type: 'COLOR', count: 7 }
    ]
  },
  {
    phaseNumber: 9,
    nameEn: 'Phase 9: 1 Set of 5 + 1 Set of 2',
    nameAr: 'المرحلة 9: مجموعة من 5 + مجموعة من 2',
    descriptionEn: 'One set of 5 cards + one set of 2 cards',
    descriptionAr: 'مجموعة من 5 أرقام متطابقة + مجموعة من 2 بنفس الرقم',
    parts: [
      { type: 'SET', count: 5 },
      { type: 'SET', count: 2 }
    ]
  },
  {
    phaseNumber: 10,
    nameEn: 'Phase 10: 1 Set of 5 + 1 Set of 3',
    nameAr: 'المرحلة 10: مجموعة من 5 + مجموعة من 3',
    descriptionEn: 'One set of 5 cards + one set of 3 cards',
    descriptionAr: 'مجموعة من 5 أرقام متطابقة + مجموعة من 3 بنفس الرقم',
    parts: [
      { type: 'SET', count: 5 },
      { type: 'SET', count: 3 }
    ]
  }
];

export class PhaseValidator {
  /**
   * Checks if an array of cards constitutes a valid Set (same numbers, Wilds allowed, no Skips).
   */
  public static isValidSet(cards: Card[], requiredCount?: number): { valid: boolean; targetValue?: number } {
    if (requiredCount && cards.length !== requiredCount) return { valid: false };
    if (cards.length < 2) return { valid: false };

    // Skip cards can never be part of a phase
    if (cards.some((c) => c.type === 'SKIP')) return { valid: false };

    const nonWilds = cards.filter((c) => c.type !== 'WILD');
    if (nonWilds.length === 0) {
      // All Wilds is valid
      return { valid: true, targetValue: 1 };
    }

    const target = nonWilds[0].value;
    const allMatch = nonWilds.every((c) => c.value === target);

    return { valid: allMatch, targetValue: target };
  }

  /**
   * Checks if an array of cards constitutes a valid Run (sequential numbers, any color, Wilds fill gaps).
   */
  public static isValidRun(cards: Card[], requiredCount?: number): { valid: boolean; startValue?: number } {
    if (requiredCount && cards.length !== requiredCount) return { valid: false };
    if (cards.length < 3) return { valid: false };
    if (cards.some((c) => c.type === 'SKIP')) return { valid: false };

    const nonWilds = cards.filter((c) => c.type !== 'WILD');
    if (nonWilds.length === 0) return { valid: true, startValue: 1 };

    // Sort non-wilds
    const sorted = [...nonWilds].sort((a, b) => a.value - b.value);

    // Check for duplicate numbers in non-wilds (runs cannot have duplicates)
    for (let i = 0; i < sorted.length - 1; i++) {
      if (sorted[i].value === sorted[i + 1].value) return { valid: false };
    }

    const minVal = sorted[0].value;
    const maxVal = sorted[sorted.length - 1].value;
    const span = maxVal - minVal + 1;

    // Span cannot exceed total cards in run
    if (span > cards.length) return { valid: false };

    // Calculate how many gaps are between sorted non-wilds
    let gapsNeeded = 0;
    for (let i = 0; i < sorted.length - 1; i++) {
      gapsNeeded += sorted[i + 1].value - sorted[i].value - 1;
    }

    const wildCount = cards.length - nonWilds.length;
    if (gapsNeeded > wildCount) return { valid: false };

    // The remaining wilds can extend the run at the start or end, as long as values stay within 1-12
    const remainingWilds = wildCount - gapsNeeded;
    const potentialStart = Math.max(1, minVal - remainingWilds);
    const potentialEnd = potentialStart + cards.length - 1;

    if (potentialEnd > 12) {
      // If extending beyond 12, check if we can shift start lower
      const adjustedStart = 12 - cards.length + 1;
      if (adjustedStart < 1 || adjustedStart > minVal) return { valid: false };
      return { valid: true, startValue: adjustedStart };
    }

    return { valid: true, startValue: potentialStart };
  }

  /**
   * Checks if an array of cards constitutes a valid Color Set (same color, Wilds allowed).
   */
  public static isValidColorSet(cards: Card[], requiredCount?: number): { valid: boolean; targetColor?: CardColor } {
    if (requiredCount && cards.length !== requiredCount) return { valid: false };
    if (cards.length < 2) return { valid: false };
    if (cards.some((c) => c.type === 'SKIP')) return { valid: false };

    const nonWilds = cards.filter((c) => c.type !== 'WILD');
    if (nonWilds.length === 0) return { valid: true, targetColor: 'RED' };

    const targetColor = nonWilds[0].color;
    const allMatch = nonWilds.every((c) => c.color === targetColor);

    return { valid: allMatch, targetColor };
  }

  /**
   * Validates if a proposed set of card groups matches the required phase.
   * e.g. for Phase 1: groups must be 2 arrays of 3 cards each, both being valid Sets.
   */
  public static validatePhaseSubmission(
    phaseNumber: number,
    groups: Card[][]
  ): { valid: boolean; laidParts?: LaidPhasePart[]; errorEn?: string; errorAr?: string } {
    const req = PHASE_REQUIREMENTS.find((p) => p.phaseNumber === phaseNumber);
    if (!req) return { valid: false, errorEn: 'Invalid Phase number', errorAr: 'رقم المرحلة غير صحيح' };

    if (groups.length !== req.parts.length) {
      return {
        valid: false,
        errorEn: `Phase ${phaseNumber} requires ${req.parts.length} card group(s)`,
        errorAr: `المرحلة ${phaseNumber} تتطلب ${req.parts.length} مجموعة من البطاقات`
      };
    }

    const laidParts: LaidPhasePart[] = [];

    // Try matching groups to required parts (handling order permutations)
    const matched = this.tryMatchGroups(groups, req.parts, 0, new Set<number>(), laidParts);
    if (!matched) {
      return {
        valid: false,
        errorEn: `Cards do not satisfy Phase ${phaseNumber} requirements`,
        errorAr: `البطاقات المحددة لا تطابق متطلبات المرحلة ${phaseNumber}`
      };
    }

    return { valid: true, laidParts };
  }

  /**
   * Intelligently searches an array of cards to find valid groups for the specified phase,
   * handling Wild cards and arbitrary card selection orders.
   */
  public static findPhaseInCards(cards: Card[], phaseNumber: number): Card[][] | null {
    const req = PHASE_REQUIREMENTS.find((p) => p.phaseNumber === phaseNumber);
    if (!req) return null;

    const playableCards = cards.filter((c) => c.type !== 'SKIP');
    if (playableCards.length < 3) return null;

    if (req.parts.length === 1) {
      const part = req.parts[0];
      const combinations = this.getCombinations(playableCards, part.count);

      for (const comb of combinations) {
        let valid = false;
        if (part.type === 'SET') valid = this.isValidSet(comb, part.count).valid;
        else if (part.type === 'RUN') valid = this.isValidRun(comb, part.count).valid;
        else if (part.type === 'COLOR') valid = this.isValidColorSet(comb, part.count).valid;

        if (valid) return [comb];
      }
    } else if (req.parts.length === 2) {
      const p1 = req.parts[0];
      const p2 = req.parts[1];

      const comb1List = this.getCombinations(playableCards, p1.count);

      for (const c1 of comb1List) {
        let valid1 = false;
        if (p1.type === 'SET') valid1 = this.isValidSet(c1, p1.count).valid;
        else if (p1.type === 'RUN') valid1 = this.isValidRun(c1, p1.count).valid;
        else if (p1.type === 'COLOR') valid1 = this.isValidColorSet(c1, p1.count).valid;

        if (!valid1) continue;

        const c1Ids = new Set(c1.map((c) => c.id));
        const remaining = playableCards.filter((c) => !c1Ids.has(c.id));

        const comb2List = this.getCombinations(remaining, p2.count);
        for (const c2 of comb2List) {
          let valid2 = false;
          if (p2.type === 'SET') valid2 = this.isValidSet(c2, p2.count).valid;
          else if (p2.type === 'RUN') valid2 = this.isValidRun(c2, p2.count).valid;
          else if (p2.type === 'COLOR') valid2 = this.isValidColorSet(c2, p2.count).valid;

          if (valid2) {
            // Verify Phase 1 / Phase 7 / Phase 9 / Phase 10 sets don't overlap target values
            if (p1.type === 'SET' && p2.type === 'SET') {
              const set1 = this.isValidSet(c1).targetValue;
              const set2 = this.isValidSet(c2).targetValue;
              if (set1 !== undefined && set2 !== undefined && set1 === set2) {
                continue;
              }
            }
            return [c1, c2];
          }
        }
      }
    }

    return null;
  }

  private static getCombinations<T>(array: T[], k: number): T[][] {
    if (k === 0) return [[]];
    if (array.length < k) return [];

    const head = array[0];
    const tail = array.slice(1);

    const withHead = this.getCombinations(tail, k - 1).map((comb) => [head, ...comb]);
    const withoutHead = this.getCombinations(tail, k);

    return [...withHead, ...withoutHead];
  }

  private static tryMatchGroups(
    groups: Card[][],
    parts: PhaseRequirement['parts'],
    partIndex: number,
    usedGroupIndices: Set<number>,
    result: LaidPhasePart[]
  ): boolean {
    if (partIndex >= parts.length) return true;

    const part = parts[partIndex];

    for (let gIdx = 0; gIdx < groups.length; gIdx++) {
      if (usedGroupIndices.has(gIdx)) continue;

      const cards = groups[gIdx];
      let isValidPart = false;
      let targetValue: number | undefined;
      let targetColor: CardColor | undefined;

      if (part.type === 'SET') {
        const check = this.isValidSet(cards, part.count);
        if (check.valid) {
          isValidPart = true;
          targetValue = check.targetValue;
        }
      } else if (part.type === 'RUN') {
        const check = this.isValidRun(cards, part.count);
        if (check.valid) {
          isValidPart = true;
          targetValue = check.startValue;
        }
      } else if (part.type === 'COLOR') {
        const check = this.isValidColorSet(cards, part.count);
        if (check.valid) {
          isValidPart = true;
          targetColor = check.targetColor;
        }
      }

      if (isValidPart) {
        usedGroupIndices.add(gIdx);
        const laidPart: LaidPhasePart = {
          type: part.type,
          cards: [...cards],
          targetValue,
          targetColor
        };
        result.push(laidPart);

        if (this.tryMatchGroups(groups, parts, partIndex + 1, usedGroupIndices, result)) {
          return true;
        }

        // Backtrack
        usedGroupIndices.delete(gIdx);
        result.pop();
      }
    }

    return false;
  }

  /**
   * Checks if a player can "hit" (add) a card from their hand onto an already laid phase on the table.
   */
  public static canHitOnPhase(
    card: Card,
    phasePart: LaidPhasePart
  ): { canHit: boolean; newCards?: Card[] } {
    if (!card || !phasePart || !phasePart.cards) return { canHit: false };
    if (card.type === 'SKIP') return { canHit: false };

    if (phasePart.type === 'SET') {
      // For a set, any card matching the set's number or a Wild can be added
      if (card.type === 'WILD' || (phasePart.targetValue && card.value === phasePart.targetValue)) {
        return { canHit: true, newCards: [...phasePart.cards, card] };
      }
      return { canHit: false };
    }

    if (phasePart.type === 'COLOR') {
      // For a color set, any card matching the color or a Wild can be added
      if (card.type === 'WILD' || (phasePart.targetColor && card.color === phasePart.targetColor)) {
        return { canHit: true, newCards: [...phasePart.cards, card] };
      }
      return { canHit: false };
    }

    if (phasePart.type === 'RUN') {
      // Test adding card to run (either start or end)
      const testCards = [...phasePart.cards, card];
      const check = this.isValidRun(testCards);
      if (check.valid) {
        return { canHit: true, newCards: testCards };
      }
      return { canHit: false };
    }

    return { canHit: false };
  }

  /**
   * Calculates round penalty points for remaining cards in player's hand.
   * 1-9: 5 points each
   * 10-12: 10 points each
   * Skip: 15 points
   * Wild: 25 points
   */
  public static calculateHandScore(cards: Card[]): number {
    return cards.reduce((sum, card) => {
      if (card.type === 'WILD') return sum + 25;
      if (card.type === 'SKIP') return sum + 15;
      if (card.value >= 10) return sum + 10;
      return sum + 5;
    }, 0);
  }
}
