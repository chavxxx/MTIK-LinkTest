import { randomUUID } from 'node:crypto';

export type DeviceRecord = {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  password: string;
  useSSL: boolean;
  notes?: string;
  createdAt: string;
};

export type TestRecord = {
  id: string;
  deviceId: string;
  status: string;
  serverAddress: string;
  direction: 'tx' | 'rx' | 'both';
  protocol: 'tcp' | 'udp';
  durationSeconds: number;
  startedAt: string;
  completedAt?: string;
  throughputMbps?: number | null;
  jitterMs?: number | null;
  packetLossPercent?: number | null;
  notes?: string;
};

export const devices: Record<string, DeviceRecord> = {};
export const tests: Record<string, TestRecord> = {};

export function createDevice(device: Omit<DeviceRecord, 'id' | 'createdAt'>): DeviceRecord {
  const record: DeviceRecord = {
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    ...device
  };

  devices[record.id] = record;
  return record;
}

export function createTest(test: Omit<TestRecord, 'id'>): TestRecord {
  const record: TestRecord = {
    id: randomUUID(),
    ...test
  };

  tests[record.id] = record;
  return record;
}

export function listDevices(): DeviceRecord[] {
  return Object.values(devices);
}

export function listTests(): TestRecord[] {
  return Object.values(tests);
}
