import { Effect, EffectContext, EffectResult } from './Effect.js';

export class RandomEffect extends Effect {
  constructor(id: string = 'random', name: string = 'Random') {
    super(id, name);
  }

  async execute(context: EffectContext): Promise<EffectResult> {
    const { additionalData } = context;

    const min = additionalData?.min as number | undefined;
    const max = additionalData?.max as number | undefined;
    const count = additionalData?.count as number | undefined;

    if (min === undefined || max === undefined) {
      return {
        success: false,
        message: 'Missing min or max in additionalData',
      };
    }

    if (min > max) {
      return {
        success: false,
        message: 'min cannot be greater than max',
      };
    }

    if (count !== undefined && count > 1) {
      const results = [];
      for (let i = 0; i < count; i++) {
        results.push(this.generateRandomNumber(min, max));
      }

      return {
        success: true,
        message: `Generated ${count} random numbers`,
        data: {
          values: results,
          min,
          max,
        },
      };
    }

    const value = this.generateRandomNumber(min, max);

    return {
      success: true,
      message: `Generated random number`,
      data: {
        value,
        min,
        max,
      },
    };
  }

  private generateRandomNumber(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
}
