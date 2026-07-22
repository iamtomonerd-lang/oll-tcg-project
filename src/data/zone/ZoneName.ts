import { Card } from '../card/CardName.js';

export interface ZoneName {
  id: string;
  displayName: string;
  description?: string;
}

export interface ZoneConstraint {
  maxCards?: number;
  allowedCardTypes?: string[];
}

export class Zone {
  readonly id: string;
  readonly name: ZoneName;
  state: Map<string, any>;
  cards: Card[];
  constraint: ZoneConstraint;
  effectTargets: Set<string>;

  constructor(id: string, name: ZoneName, constraint: ZoneConstraint = {}) {
    this.id = id;
    this.name = name;
    this.state = new Map();
    this.cards = [];
    this.constraint = constraint;
    this.effectTargets = new Set();
  }

  setState(key: string, value: any): void {
    this.state.set(key, value);
  }

  getState(key: string): any {
    return this.state.get(key);
  }

  addCard(card: Card): boolean {
    if (this.constraint.maxCards && this.cards.length >= this.constraint.maxCards) {
      return false;
    }

    if (
      this.constraint.allowedCardTypes &&
      this.constraint.allowedCardTypes.length > 0
    ) {
      const cardType = card.getState('type');
      if (!this.constraint.allowedCardTypes.includes(cardType)) {
        return false;
      }
    }

    this.cards.push(card);
    return true;
  }

  removeCard(cardId: string): Card | null {
    const index = this.cards.findIndex(c => c.id === cardId);
    if (index >= 0) {
      return this.cards.splice(index, 1)[0];
    }
    return null;
  }

  getCards(): Card[] {
    return [...this.cards];
  }

  getCard(cardId: string): Card | undefined {
    return this.cards.find(c => c.id === cardId);
  }

  getCardCount(): number {
    return this.cards.length;
  }

  canAddCard(): boolean {
    if (this.constraint.maxCards) {
      return this.cards.length < this.constraint.maxCards;
    }
    return true;
  }

  addEffectTarget(targetId: string): void {
    this.effectTargets.add(targetId);
  }

  removeEffectTarget(targetId: string): void {
    this.effectTargets.delete(targetId);
  }

  getEffectTargets(): string[] {
    return Array.from(this.effectTargets);
  }

  clear(): void {
    this.cards = [];
    this.state.clear();
    this.effectTargets.clear();
  }
}
