import { z } from 'zod';

const hostSchema = z.string().trim().min(1).max(253).refine(
  (value) => !/[\s/=;]/.test(value),
  'Use a hostname or IP address without a port or path.'
);

export const CreateDeviceSchema = z.object({
  name: z.string().trim().min(2).max(80),
  host: hostSchema,
  port: z.number().int().min(1).max(65535).default(8728),
  username: z.string().min(1).max(128),
  password: z.string().min(1).max(256),
  useSSL: z.boolean().default(false),
  notes: z.string().max(500).optional()
});

export const TestRequestSchema = z.object({
  deviceId: z.string().trim().min(1),
  serverAddress: hostSchema,
  direction: z.enum(['tx', 'rx', 'both']).default('both'),
  protocol: z.enum(['tcp', 'udp']).default('tcp'),
  durationSeconds: z.number().int().min(5).max(120).default(30),
  user: z.string().max(128).optional(),
  password: z.string().max(256).optional()
});

export type DeviceInput = z.infer<typeof CreateDeviceSchema>;
export type TestRequestInput = z.infer<typeof TestRequestSchema>;
