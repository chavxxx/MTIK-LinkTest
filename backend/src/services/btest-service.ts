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

export type PublicDevice = Omit<DeviceRecord, 'password'>;

export type TestRecord = {
  id: string;
  deviceId: string;
  deviceName: string;
  status: 'running' | 'completed' | 'failed';
  serverAddress: string;
  direction: 'tx' | 'rx' | 'both';
  protocol: 'tcp' | 'udp';
  durationSeconds: number;
  startedAt: string;
  completedAt?: string;
  throughputMbps?: number | null;
  txMbps?: number | null;
  rxMbps?: number | null;
  jitterMs?: number | null;
  packetLossPercent?: number | null;
  notes?: string;
};

const devices: Record<string, DeviceRecord> = {};
const tests: Record<string, TestRecord> = {};

export function createDevice(device: Omit<DeviceRecord, 'id' | 'createdAt'>): DeviceRecord {
  const record: DeviceRecord = { id: randomUUID(), createdAt: new Date().toISOString(), ...device };
  devices[record.id] = record;
  return record;
}

export function getDevice(id: string): DeviceRecord | undefined {
  return devices[id];
}

export function createTest(test: Omit<TestRecord, 'id'>): TestRecord {
  const record: TestRecord = { id: randomUUID(), ...test };
  tests[record.id] = record;
  return record;
}

export function updateTest(id: string, patch: Partial<TestRecord>): TestRecord | undefined {
  const existing = tests[id];
  if (!existing) return undefined;
  Object.assign(existing, patch);
  return existing;
}

export function listDevices(): PublicDevice[] {
  return Object.values(devices).map(({ password: _password, ...device }) => device);
}

export function listTests(): TestRecord[] {
  return Object.values(tests).sort((a, b) => b.startedAt.localeCompare(a.startedAt));
}

export function hasDevice(id: string): boolean {
  return Boolean(devices[id]);
}
