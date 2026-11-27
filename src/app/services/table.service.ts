import { Injectable, inject, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { io, Socket } from 'socket.io-client';
import { firstValueFrom } from 'rxjs';
import { Table, TableSummary, TableUpdatePayload } from '../models/table.models';

@Injectable({
  providedIn: 'root',
})
export class TableService {
  private http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000/api';
  private readonly socketUrl = 'http://localhost:3000';
  private socket: Socket;

  // Reactive state signals
  currentTable = signal<Table | null>(null);
  tableSummary = signal<TableSummary | null>(null);
  currentParticipantId = signal<string | null>(null);
  isConnected = signal<boolean>(false);
  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  currentParticipant = computed(() => {
    const table = this.currentTable();
    const myId = this.currentParticipantId();
    if (!table || !myId) return null;
    return table.participants.find((p) => p.id === myId) ?? null;
  });

  constructor() {
    this.socket = io(this.socketUrl, {
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    this.setupSocketListeners();
    this.setupVisibilityListener();
  }

  private setupSocketListeners(): void {
    this.socket.on('connect', () => {
      this.isConnected.set(true);
      const activeCode = this.currentTable()?.code;
      if (activeCode) {
        this.socket.emit('joinTable', activeCode);
      }
    });

    this.socket.on('disconnect', () => {
      this.isConnected.set(false);
    });

    this.socket.on('tableUpdated', (payload: TableUpdatePayload) => {
      this.currentTable.set(payload.table);
      this.tableSummary.set(payload.summary);
    });
  }

  // Handles Browser tab wake-up after screen lock
  private setupVisibilityListener(): void {
    if (typeof document === 'undefined') return;

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        const activeCode = this.currentTable()?.code;
        if (activeCode) {
          if (!this.socket.connected) {
            this.socket.connect();
          }
          this.socket.emit('joinTable', activeCode);
        }
      }
    });
  }

  async createTable(venueName: string, creatorName: string): Promise<Table> {
    this.isLoading.set(true);
    this.errorMessage.set(null);

    try {
      const table = await firstValueFrom(
        this.http.post<Table>(`${this.apiUrl}/tables`, { venueName, creatorName })
      );
      this.currentTable.set(table);
      this.currentParticipantId.set(table.participants[0]?.id ?? null);
      this.socket.emit('joinTable', table.code);
      return table;
    } catch (err) {
      this.errorMessage.set('Não foi possível criar a mesa.');
      throw err;
    } finally {
      this.isLoading.set(false);
    }
  }

  async joinTable(code: string, participantName?: string): Promise<Table> {
    this.isLoading.set(true);
    this.errorMessage.set(null);
    const normalizedCode = code.trim().toUpperCase();

    try {
      let table = await firstValueFrom(
        this.http.get<Table>(`${this.apiUrl}/tables/${normalizedCode}`)
      );

      if (participantName && participantName.trim()) {
        table = await firstValueFrom(
          this.http.post<Table>(`${this.apiUrl}/tables/${normalizedCode}/participants`, {
            name: participantName.trim(),
          })
        );
        const added = table.participants[table.participants.length - 1];
        this.currentParticipantId.set(added?.id ?? null);
      }

      this.currentTable.set(table);
      this.socket.emit('joinTable', normalizedCode);
      return table;
    } catch (err) {
      this.errorMessage.set('Mesa não encontrada. Verifique o código de 4 letras.');
      throw err;
    } finally {
      this.isLoading.set(false);
    }
  }

  async addParticipant(name: string): Promise<void> {
    const code = this.currentTable()?.code;
    if (!code) return;

    await firstValueFrom(
      this.http.post<Table>(`${this.apiUrl}/tables/${code}/participants`, { name })
    );
  }

  async addItem(
    name: string,
    priceCents: number,
    quantity: number,
    consumedByIds: string[]
  ): Promise<void> {
    const code = this.currentTable()?.code;
    if (!code) return;

    await firstValueFrom(
      this.http.post<Table>(`${this.apiUrl}/tables/${code}/items`, {
        name,
        priceCents,
        quantity,
        consumedByIds,
      })
    );
  }

  async removeItem(itemId: string): Promise<void> {
    const code = this.currentTable()?.code;
    if (!code) return;

    await firstValueFrom(
      this.http.delete<Table>(`${this.apiUrl}/tables/${code}/items/${itemId}`)
    );
  }

  async toggleServiceFee(enabled: boolean): Promise<void> {
    const code = this.currentTable()?.code;
    if (!code) return;

    await firstValueFrom(
      this.http.patch<Table>(`${this.apiUrl}/tables/${code}/service-fee`, { enabled })
    );
  }

  formatCentsToBrl(cents: number): string {
    return (cents / 100).toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });
  }
}