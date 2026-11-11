import { z } from 'zod';

export const CreateDeviceSchema = z.object({
  name: z.string().min(2),
  host: z.string().min(1),
  port: z.number().int().min(1).max(65535).default(8728),
  username: z.string().min(1),
  password: z.string().min(1),
  useSSL: z.boolean().default(false),
  notes: z.string().optional()
});

export const TestRequestSchema = z.object({
  deviceId: z.string().min(1),
  serverAddress: z.string().min(1),
  direction: z.enum(['tx', 'rx', 'both']).default('both'),
  protocol: z.enum(['tcp', 'udp']).default('tcp'),
  durationSeconds: z.number().int().min(5).max(300).default(30),
  user: z.string().optional(),
  password: z.string().optional()
});

export type DeviceInput = z.infer<typeof CreateDeviceSchema>;
export type TestRequestInput = z.infer<typeof TestRequestSchema>;
