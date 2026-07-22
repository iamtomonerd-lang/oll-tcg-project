export class Player {
  readonly id: string;
  readonly name: string;
  state: Map<string, any>;
  values: Map<string, number>;

  constructor(id: string, name: string) {
    this.id = id;
    this.name = name;
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

  setLife(life: number): void {
    this.setValue('life', Math.max(0, life));
  }

  getLife(): number {
    return this.getValue('life');
  }

  takeDamage(damage: number): number {
    return this.addValue('life', -damage);
  }

  isAlive(): boolean {
    return this.getLife() > 0;
  }
}
