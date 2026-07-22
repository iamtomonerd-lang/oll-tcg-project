import { Effect, EffectContext, EffectResult } from './Effect.js';
import { Card } from '../data/card/CardName.js';
import { Player } from '../data/player/PlayerState.js';
import { GameObject } from '../data/game/GameObject.js';

export type ValueChangeTarget = Card | Player | GameObject;

export class ValueChangeEffect extends Effect {
  constructor(id: string = 'value-change', name: string = 'Value Change') {
    super(id, name);
  }

  async execute(context: EffectContext): Promise<EffectResult> {
    const { target, additionalData } = context;

    if (!target || !(target instanceof Card || target instanceof Player || target instanceof GameObject)) {
      return {
        success: false,
        message: 'Target must be a Card, Player, or GameObject',
      };
    }

    const valueKey = additionalData?.key as string | undefined;
    const amount = additionalData?.amount as number | undefined;

    if (!valueKey || amount === undefined) {
      return {
        success: false,
        message: 'Missing key or amount in additionalData',
      };
    }

    const oldValue = (target as any).getValue(valueKey);
    const newValue = (target as any).addValue(valueKey, amount);

    return {
      success: true,
      message: `Changed ${valueKey} from ${oldValue} to ${newValue}`,
      data: {
        target,
        key: valueKey,
        oldValue,
        newValue,
        amount,
      },
    };
  }
}
