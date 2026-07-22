import { Player } from './data/player/PlayerState.js';
import { Zone } from './data/zone/ZoneName.js';
import { EffectEngine } from './effects/EffectEngine.js';
import { EffectContext, EffectResult } from './effects/Effect.js';

export interface GamePhase {
  name: string;
  order: number;
}

export class GameEngine {
  private players: Map<string, Player>;
  private zones: Map<string, Zone>;
  private effectEngine: EffectEngine;
  private currentPhase: GamePhase | null;
  private currentPlayerIndex: number;
  private isGameActive: boolean;

  constructor() {
    this.players = new Map();
    this.zones = new Map();
    this.effectEngine = new EffectEngine();
    this.currentPhase = null;
    this.currentPlayerIndex = 0;
    this.isGameActive = false;
  }

  addPlayer(player: Player): void {
    this.players.set(player.id, player);
  }

  removePlayer(playerId: string): boolean {
    return this.players.delete(playerId);
  }

  getPlayer(playerId: string): Player | undefined {
    return this.players.get(playerId);
  }

  getAllPlayers(): Player[] {
    return Array.from(this.players.values());
  }

  getCurrentPlayer(): Player | undefined {
    const players = this.getAllPlayers();
    if (players.length === 0) return undefined;
    return players[this.currentPlayerIndex % players.length];
  }

  nextPlayer(): void {
    const players = this.getAllPlayers();
    if (players.length > 0) {
      this.currentPlayerIndex = (this.currentPlayerIndex + 1) % players.length;
    }
  }

  addZone(zone: Zone): void {
    this.zones.set(zone.id, zone);
  }

  removeZone(zoneId: string): boolean {
    return this.zones.delete(zoneId);
  }

  getZone(zoneId: string): Zone | undefined {
    return this.zones.get(zoneId);
  }

  getAllZones(): Zone[] {
    return Array.from(this.zones.values());
  }

  getEffectEngine(): EffectEngine {
    return this.effectEngine;
  }

  async executeEffect(effectId: string, context: EffectContext): Promise<EffectResult> {
    return this.effectEngine.executeEffect(effectId, context);
  }

  setCurrentPhase(phase: GamePhase): void {
    this.currentPhase = phase;
  }

  getCurrentPhase(): GamePhase | null {
    return this.currentPhase;
  }

  startGame(): void {
    this.isGameActive = true;
  }

  endGame(): void {
    this.isGameActive = false;
  }

  isRunning(): boolean {
    return this.isGameActive;
  }

  getGameState(): {
    players: Player[];
    zones: Zone[];
    currentPhase: GamePhase | null;
    currentPlayer: Player | undefined;
    isActive: boolean;
  } {
    return {
      players: this.getAllPlayers(),
      zones: this.getAllZones(),
      currentPhase: this.currentPhase,
      currentPlayer: this.getCurrentPlayer(),
      isActive: this.isGameActive,
    };
  }

  reset(): void {
    this.players.clear();
    this.zones.clear();
    this.currentPhase = null;
    this.currentPlayerIndex = 0;
    this.isGameActive = false;
    this.effectEngine.clearEffectStack();
  }
}
