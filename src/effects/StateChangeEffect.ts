import { Effect, EffectContext, EffectResult } from './Effect.js';
import { Card } from '../data/card/CardName.js';
import { Player } from '../data/player/PlayerState.js';
import { GameObject } from '../data/game/GameObject.js';
import { Zone } from '../data/zone/ZoneName.js';

export type StateChangeTarget = Card | Player | GameObject | Zone;

export class StateChangeEffect extends Effect {
  constructor(id: string = 'state-change', name: string = 'State Change') {
    super(id, name);
  }

  async execute(context: EffectContext): Promise<EffectResult> {
    const { target, additionalData } = context;

    if (!target || !(target instanceof Card || target instanceof Player || target instanceof GameObject || target instanceof Zone)) {
      return {
        success: false,
        message: 'Target must be a Card, Player, GameObject, or Zone',
      };
    }

    const stateKey = additionalData?.key as string | undefined;
    const stateValue = additionalData?.value;

    if (!stateKey) {
      return {
        success: false,
        message: 'Missing key in additionalData',
      };
    }

    const oldValue = (target as any).getState(stateKey);
    (target as any).setState(stateKey, stateValue);
    const newValue = (target as any).getState(stateKey);

    return {
      success: true,
      message: `Changed state ${stateKey} from ${oldValue} to ${newValue}`,
      data: {
        target,
        key: stateKey,
        oldValue,
        newValue,
      },
    };
  }
}
