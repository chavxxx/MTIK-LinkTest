import net, { type Socket } from 'node:net';
import tls from 'node:tls';

export type RouterOSDeviceConfig = {
  host: string;
  port: number;
  username: string;
  password: string;
  useSSL: boolean;
};

export type BandwidthTestOptions = {
  serverAddress: string;
  direction: 'tx' | 'rx' | 'both';
  protocol: 'tcp' | 'udp';
  durationSeconds: number;
  user?: string;
  password?: string;
};

export type BandwidthTestResult = {
  status: 'completed';
  deviceName: string;
  serverAddress: string;
  direction: BandwidthTestOptions['direction'];
  protocol: BandwidthTestOptions['protocol'];
  durationSeconds: number;
  throughputMbps: number | null;
  txMbps: number | null;
  rxMbps: number | null;
  jitterMs: null;
  packetLossPercent: null;
  startedAt: string;
  completedAt: string;
  notes: string;
};

type Sentence = string[];
type ApiReply = Record<string, string>;
type PendingCommand = {
  resolve: (rows: ApiReply[]) => void;
  reject: (error: Error) => void;
  rows: ApiReply[];
  timer: NodeJS.Timeout;
};

const MAX_FRAME_BYTES = 1024 * 1024;

function encodeLength(length: number): Buffer {
  if (length < 0x80) return Buffer.from([length]);
  if (length < 0x4000) return Buffer.from([(length >> 8) | 0x80, length & 0xff]);
  if (length < 0x200000) return Buffer.from([(length >> 16) | 0xc0, (length >> 8) & 0xff, length & 0xff]);
  if (length < 0x10000000) {
    return Buffer.from([(length >> 24) | 0xe0, (length >> 16) & 0xff, (length >> 8) & 0xff, length & 0xff]);
  }
  const result = Buffer.alloc(5);
  result[0] = 0xf0;
  result.writeUInt32BE(length, 1);
  return result;
}

function decodeLength(buffer: Buffer, offset: number): { length: number; bytes: number } | null {
  if (offset >= buffer.length) return null;
  const first = buffer[offset]!;
  if ((first & 0x80) === 0) return { length: first, bytes: 1 };
  if ((first & 0xc0) === 0x80) {
    if (offset + 2 > buffer.length) return null;
    return { length: ((first & 0x3f) << 8) | buffer[offset + 1]!, bytes: 2 };
  }
  if ((first & 0xe0) === 0xc0) {
    if (offset + 3 > buffer.length) return null;
    return { length: ((first & 0x1f) << 16) | (buffer[offset + 1]! << 8) | buffer[offset + 2]!, bytes: 3 };
  }
  if ((first & 0xf0) === 0xe0) {
    if (offset + 4 > buffer.length) return null;
    return {
      length: ((first & 0x0f) << 24) | (buffer[offset + 1]! << 16) | (buffer[offset + 2]! << 8) | buffer[offset + 3]!,
      bytes: 4
    };
  }
  if (first === 0xf0) {
    if (offset + 5 > buffer.length) return null;
    return { length: buffer.readUInt32BE(offset + 1), bytes: 5 };
  }
  throw new Error('Invalid RouterOS API frame length.');
}

class RouterOSConnection {
  private socket!: Socket;
  private buffer = Buffer.alloc(0);
  private pending: PendingCommand | null = null;

  async connect(device: RouterOSDeviceConfig, timeoutMs: number): Promise<void> {
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const finish = (error?: Error) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        if (error) reject(error);
        else resolve();
      };
      const timer = setTimeout(() => finish(new Error('Timed out connecting to the MikroTik device.')), timeoutMs);

      this.socket = device.useSSL
        ? tls.connect({ host: device.host, port: device.port, servername: net.isIP(device.host) ? undefined : device.host, rejectUnauthorized: true }, () => finish())
        : net.createConnection({ host: device.host, port: device.port }, () => finish());

      this.socket.on('data', (chunk) => this.onData(chunk));
      this.socket.on('error', (error) => {
        if (!settled) finish(error);
        this.failPending(error);
      });
      this.socket.on('close', () => this.failPending(new Error('MikroTik connection closed unexpectedly.')));
      this.socket.setTimeout(timeoutMs, () => {
        const error = new Error('MikroTik API operation timed out.');
        this.failPending(error);
        this.socket.destroy(error);
      });
    });
  }

  async execute(words: string[], timeoutMs: number): Promise<ApiReply[]> {
    if (this.pending) throw new Error('A RouterOS API command is already in progress.');
    return new Promise<ApiReply[]>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending = null;
        reject(new Error('MikroTik API command timed out.'));
        this.socket.destroy();
      }, timeoutMs);
      this.pending = { resolve, reject, rows: [], timer };
      try {
        const chunks: Buffer[] = [];
        for (const word of words) {
          const bytes = Buffer.from(word, 'utf8');
          chunks.push(encodeLength(bytes.length), bytes);
        }
        chunks.push(Buffer.from([0]));
        this.socket.write(Buffer.concat(chunks));
      } catch (error) {
        this.failPending(error instanceof Error ? error : new Error('Could not send RouterOS API command.'));
      }
    });
  }

  close(): void {
    if (!this.socket || this.socket.destroyed) return;
    this.socket.end();
  }

  private onData(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    if (this.buffer.length > MAX_FRAME_BYTES) {
      this.failPending(new Error('RouterOS API response exceeded the maximum allowed size.'));
      this.socket.destroy();
      return;
    }

    while (true) {
      const sentence = this.readSentence();
      if (!sentence) return;
      this.handleSentence(sentence);
    }
  }

  private readSentence(): Sentence | null {
    const words: string[] = [];
    let offset = 0;
    while (true) {
      const frame = decodeLength(this.buffer, offset);
      if (!frame) return null;
      offset += frame.bytes;
      if (frame.length === 0) {
        this.buffer = this.buffer.subarray(offset);
        return words;
      }
      if (frame.length > MAX_FRAME_BYTES) throw new Error('RouterOS API word exceeded the maximum allowed size.');
      if (offset + frame.length > this.buffer.length) return null;
      words.push(this.buffer.toString('utf8', offset, offset + frame.length));
      offset += frame.length;
    }
  }

  private handleSentence(sentence: Sentence): void {
    const pending = this.pending;
    if (!pending) return;
    const type = sentence[0];
    if (type === '!re') {
      const row: ApiReply = {};
      for (const word of sentence.slice(1)) {
        if (!word.startsWith('=')) continue;
        const delimiter = word.indexOf('=', 1);
        if (delimiter > 1) row[word.slice(1, delimiter)] = word.slice(delimiter + 1);
      }
      pending.rows.push(row);
      return;
    }
    if (type === '!trap' || type === '!fatal') {
      const message = sentence.find((word) => word.startsWith('=message='))?.slice('=message='.length);
      this.finishPending(new Error(message || 'MikroTik rejected the API command.'));
      return;
    }
    if (type === '!done') this.finishPending(undefined, pending.rows);
  }

  private finishPending(error?: Error, rows: ApiReply[] = []): void {
    const pending = this.pending;
    if (!pending) return;
    this.pending = null;
    clearTimeout(pending.timer);
    if (error) pending.reject(error);
    else pending.resolve(rows);
  }

  private failPending(error: Error): void {
    this.finishPending(error);
  }
}

function parseMbps(value: string | undefined): number | null {
  if (!value) return null;
  const match = value.trim().match(/^([\d.]+)\s*(bps|k(?:bps|b\/s)|m(?:bps|b\/s)|g(?:bps|b\/s))?$/i);
  if (!match) return null;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) return null;
  const unit = (match[2] ?? 'bps').toLowerCase();
  const multiplier = unit.startsWith('g') ? 1000 : unit.startsWith('m') ? 1 : unit.startsWith('k') ? 0.001 : 0.000001;
  return amount * multiplier;
}

export class MikroTikBandwidthService {
  async startTest(device: RouterOSDeviceConfig, options: BandwidthTestOptions): Promise<BandwidthTestResult> {
    const startedAt = new Date().toISOString();
    const connection = new RouterOSConnection();
    const operationTimeoutMs = (options.durationSeconds + 30) * 1000;

    try {
      await connection.connect(device, operationTimeoutMs);
      await connection.execute(['/login', `=name=${device.username}`, `=password=${device.password}`], 10_000);

      const direction = options.direction === 'tx' ? 'transmit' : options.direction === 'rx' ? 'receive' : 'both';
      const command = [
        '/tool/bandwidth-test',
        `=address=${options.serverAddress}`,
        `=duration=${options.durationSeconds}s`,
        `=direction=${direction}`,
        `=protocol=${options.protocol}`
      ];
      if (options.user) command.push(`=user=${options.user}`);
      if (options.password) command.push(`=password=${options.password}`);

      const rows = await connection.execute(command, operationTimeoutMs);
      const last = rows.at(-1) ?? {};
      const txMbps = parseMbps(last['tx-current'] ?? last['tx-10-second-average'] ?? last['tx-total-average']);
      const rxMbps = parseMbps(last['rx-current'] ?? last['rx-10-second-average'] ?? last['rx-total-average']);
      const values = options.direction === 'tx' ? [txMbps] : options.direction === 'rx' ? [rxMbps] : [txMbps, rxMbps];
      const throughputMbps = values.every((value) => value === null)
        ? null
        : values.reduce<number>((total, value) => total + (value ?? 0), 0);

      return {
        status: 'completed',
        deviceName: device.host,
        serverAddress: options.serverAddress,
        direction: options.direction,
        protocol: options.protocol,
        durationSeconds: options.durationSeconds,
        throughputMbps,
        txMbps,
        rxMbps,
        jitterMs: null,
        packetLossPercent: null,
        startedAt,
        completedAt: new Date().toISOString(),
        notes: rows.length ? 'Live values returned by RouterOS. Jitter and packet loss are not provided by this BTest response.' : 'RouterOS completed the test but returned no bandwidth measurements.'
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'RouterOS bandwidth test failed.';
      throw new Error(`MikroTik test failed: ${message}`);
    } finally {
      connection.close();
    }
  }
}

