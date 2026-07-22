import { Effect, EffectContext, EffectResult } from './Effect.js';
import { ReplacementEffect } from './ReplacementEffect.js';

export class EffectEngine {
  private effects: Map<string, Effect>;
  private replacementEffects: ReplacementEffect[];
  private effectStack: EffectContext[];

  constructor() {
    this.effects = new Map();
    this.replacementEffects = [];
    this.effectStack = [];
  }

  registerEffect(effect: Effect): void {
    this.effects.set(effect.id, effect);

    if (effect instanceof ReplacementEffect) {
      this.replacementEffects.push(effect);
    }
  }

  unregisterEffect(effectId: string): boolean {
    const effect = this.effects.get(effectId);
    if (!effect) {
      return false;
    }

    if (effect instanceof ReplacementEffect) {
      const index = this.replacementEffects.indexOf(effect);
      if (index >= 0) {
        this.replacementEffects.splice(index, 1);
      }
    }

    return this.effects.delete(effectId);
  }

  async executeEffect(effectId: string, context: EffectContext): Promise<EffectResult> {
    const effect = this.effects.get(effectId);
    if (!effect) {
      return {
        success: false,
        message: `Effect ${effectId} not found`,
      };
    }

    if (!(await effect.canExecute(context))) {
      return {
        success: false,
        message: `Effect ${effectId} cannot be executed`,
      };
    }

    this.effectStack.push(context);

    const replacements = this.getApplicableReplacements(context);
    for (const replacement of replacements) {
      const result = await replacement.execute(context);
      if (result.success) {
        this.effectStack.pop();
        return result;
      }
    }

    const result = await effect.execute(context);
    this.effectStack.pop();

    return result;
  }

  private getApplicableReplacements(context: EffectContext): ReplacementEffect[] {
    return this.replacementEffects.filter(effect => effect.canReplace(context));
  }

  getEffectStack(): EffectContext[] {
    return [...this.effectStack];
  }

  getEffectStackSize(): number {
    return this.effectStack.length;
  }

  clearEffectStack(): void {
    this.effectStack = [];
  }

  getEffect(effectId: string): Effect | undefined {
    return this.effects.get(effectId);
  }

  getAllEffects(): Effect[] {
    return Array.from(this.effects.values());
  }
}
