import type { Reservation } from '../api/types';

const STORAGE_KEY = 'dev_local_reservations_v1';

export interface LocalReservationSnapshot {
  reservation: Reservation;
  sitterSnapshot?: {
    id: string;
    name: string;
    email?: string; // Add email field
    price_per_visit?: number;
    service_areas?: string[];
    profile_id?: string;
  };
  ownerSnapshot?: {
    id: string;
    name: string;
    email?: string;
  };
}

const readStorage = (): LocalReservationSnapshot[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed as LocalReservationSnapshot[];
    }
    return [];
  } catch (error) {
    console.warn('[localReservations] Failed to read storage', error);
    return [];
  }
};

const writeStorage = (records: LocalReservationSnapshot[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (error) {
    console.warn('[localReservations] Failed to write storage', error);
  }
};

export const saveLocalReservation = (snapshot: LocalReservationSnapshot) => {
  const records = readStorage();
  const idx = records.findIndex(
    (record) => record.reservation.id === snapshot.reservation.id
  );
  if (idx >= 0) {
    records[idx] = snapshot;
  } else {
    records.push(snapshot);
  }
  writeStorage(records);
};

export const getLocalReservationRecord = (
  reservationId: string
): LocalReservationSnapshot | undefined => {
  return readStorage().find(
    (record) => record.reservation.id === reservationId
  );
};

export const listLocalReservationRecords = (): LocalReservationSnapshot[] => {
  return readStorage();
};

export const removeLocalReservation = (reservationId: string) => {
  const records = readStorage().filter(
    (record) => record.reservation.id !== reservationId
  );
  writeStorage(records);
};

export const isLocalReservationId = (reservationId?: string | null): boolean =>
  Boolean(reservationId && reservationId.startsWith('local-'));
