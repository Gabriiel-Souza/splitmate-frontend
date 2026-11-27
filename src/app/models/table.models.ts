export interface Participant {
  id: string;
  name: string;
}

export interface Item {
  id: string;
  name: string;
  priceCents: number;
  quantity: number;
  consumedByIds: string[];
}

export interface Table {
  id: string;
  code: string;
  venueName: string;
  serviceFeeEnabled: boolean;
  participants: Participant[];
  items: Item[];
}

export interface ConsumedItemDetail {
  itemId: string;
  name: string;
  quantity: number;
  shareCents: number;
}

export interface ParticipantSummary {
  participantId: string;
  name: string;
  subtotalCents: number;
  serviceFeeCents: number;
  totalCents: number;
  consumedItems: ConsumedItemDetail[];
}

export interface TableSummary {
  code: string;
  venueName: string;
  serviceFeeEnabled: boolean;
  subtotalCents: number;
  serviceFeeCents: number;
  grandTotalCents: number;
  participants: ParticipantSummary[];
}

export interface TableUpdatePayload {
  table: Table;
  summary: TableSummary;
}