import { Effect, EffectContext, EffectResult } from './Effect.js';

export type ReplacementPredicate = (context: EffectContext) => boolean;
export type ReplacementAction = (context: EffectContext) => Promise<EffectResult>;

export class ReplacementEffect extends Effect {
  private predicate: ReplacementPredicate;
  private action: ReplacementAction;
  private isActive: boolean;

  constructor(
    id: string,
    name: string,
    predicate: ReplacementPredicate,
    action: ReplacementAction
  ) {
    super(id, name);
    this.predicate = predicate;
    this.action = action;
    this.isActive = true;
  }

  canReplace(context: EffectContext): boolean {
    if (!this.isActive) {
      return false;
    }
    return this.predicate(context);
  }

  async execute(context: EffectContext): Promise<EffectResult> {
    if (!this.canReplace(context)) {
      return {
        success: false,
        message: 'Replacement condition not met',
      };
    }

    return this.action(context);
  }

  activate(): void {
    this.isActive = true;
  }

  deactivate(): void {
    this.isActive = false;
  }

  isEnabled(): boolean {
    return this.isActive;
  }
}
