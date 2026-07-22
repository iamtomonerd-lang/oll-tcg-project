import { Effect, EffectContext, EffectResult } from './Effect.js';
import { Card, CardName } from '../data/card/CardName.js';
import { GameObject, GameObjectType } from '../data/game/GameObject.js';

export class SpawnEffect extends Effect {
  constructor(id: string = 'spawn', name: string = 'Spawn') {
    super(id, name);
  }

  async execute(context: EffectContext): Promise<EffectResult> {
    const { additionalData } = context;

    const spawnType = additionalData?.type as 'card' | 'gameobject' | undefined;

    if (spawnType === 'card') {
      const cardId = additionalData?.cardId as string | undefined;
      const cardName = additionalData?.cardName as CardName | undefined;

      if (!cardId || !cardName) {
        return {
          success: false,
          message: 'Missing cardId or cardName for card spawn',
        };
      }

      const newCard = new Card(cardId, cardName);
      return {
        success: true,
        message: `Created card ${cardId}`,
        data: {
          spawned: newCard,
          type: 'card',
        },
      };
    }

    if (spawnType === 'gameobject') {
      const objectId = additionalData?.objectId as string | undefined;
      const objectType = additionalData?.objectType as GameObjectType | undefined;

      if (!objectId || !objectType) {
        return {
          success: false,
          message: 'Missing objectId or objectType for gameobject spawn',
        };
      }

      const newObject = new GameObject(objectId, objectType);
      return {
        success: true,
        message: `Created gameobject ${objectId}`,
        data: {
          spawned: newObject,
          type: 'gameobject',
        },
      };
    }

    return {
      success: false,
      message: 'Unknown spawn type',
    };
  }
}
