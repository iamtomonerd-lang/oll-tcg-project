export interface GameObjectType {
  id: string;
  displayName: string;
}

export class GameObject {
  readonly id: string;
  readonly type: GameObjectType;
  state: Map<string, any>;
  values: Map<string, number>;

  constructor(id: string, type: GameObjectType) {
    this.id = id;
    this.type = type;
    this.state = new Map();
    this.values = new Map();
  }

  setState(key: string, value: any): void {
    this.state.set(key, value);
  }

  getState(key: string): any {
    return this.state.get(key);
  }

  hasState(key: string): boolean {
    return this.state.has(key);
  }

  clearState(key: string): void {
    this.state.delete(key);
  }

  setValue(key: string, value: number): void {
    this.values.set(key, value);
  }

  getValue(key: string): number {
    return this.values.get(key) ?? 0;
  }

  addValue(key: string, amount: number): number {
    const current = this.getValue(key);
    const newValue = current + amount;
    this.setValue(key, newValue);
    return newValue;
  }

  getStateSnapshot(): Record<string, any> {
    const snapshot: Record<string, any> = {};
    for (const [key, value] of this.state.entries()) {
      snapshot[key] = value;
    }
    return snapshot;
  }

  getValuesSnapshot(): Record<string, number> {
    const snapshot: Record<string, number> = {};
    for (const [key, value] of this.values.entries()) {
      snapshot[key] = value;
    }
    return snapshot;
  }
}
