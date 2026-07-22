import { Card } from '../data/card/CardName.js';
import { Zone } from '../data/zone/ZoneName.js';
import { Player } from '../data/player/PlayerState.js';
import { GameObject } from '../data/game/GameObject.js';

export interface EffectContext {
  source?: Card | Player | GameObject;
  target?: Card | Player | GameObject | Zone;
  game?: any;
  additionalData?: Record<string, any>;
}

export interface EffectResult {
  success: boolean;
  message?: string;
  data?: any;
}

export abstract class Effect {
  readonly id: string;
  readonly name: string;

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
  }

  abstract execute(context: EffectContext): Promise<EffectResult>;

  async canExecute(context: EffectContext): Promise<boolean> {
    return true;
  }
}
