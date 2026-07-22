import { Effect, EffectContext, EffectResult } from './Effect.js';
import { Card } from '../data/card/CardName.js';
import { Zone } from '../data/zone/ZoneName.js';

export class ZoneMoveEffect extends Effect {
  constructor(id: string = 'zone-move', name: string = 'Zone Move') {
    super(id, name);
  }

  async execute(context: EffectContext): Promise<EffectResult> {
    const { source, target, additionalData } = context;

    if (!(source instanceof Card)) {
      return {
        success: false,
        message: 'Source must be a Card',
      };
    }

    if (!(target instanceof Zone)) {
      return {
        success: false,
        message: 'Target must be a Zone',
      };
    }

    const fromZone = additionalData?.fromZone as Zone | undefined;

    if (fromZone) {
      const removed = fromZone.removeCard(source.id);
      if (!removed) {
        return {
          success: false,
          message: 'Card not found in source zone',
        };
      }
    }

    const added = target.addCard(source);
    if (!added) {
      if (fromZone) {
        fromZone.addCard(source);
      }
      return {
        success: false,
        message: 'Cannot add card to target zone',
      };
    }

    return {
      success: true,
      message: `Moved card ${source.id} to zone ${target.id}`,
      data: {
        card: source,
        fromZone,
        toZone: target,
      },
    };
  }
}
