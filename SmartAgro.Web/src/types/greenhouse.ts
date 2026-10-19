export interface Greenhouse {
  id: string;
  name: string;
  location: string;
  userId?: string;
  ownerId?: string;
  ownerUsername?: string;
  ownerEmail?: string;
  readingsCount?: number;
}

export interface CreateGreenhousePayload {
  name: string;
  location: string;
  userId: string;
}

export interface UpdateGreenhousePayload {
  name: string;
  location: string;
  userId?: string;
}