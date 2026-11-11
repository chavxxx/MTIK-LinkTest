import { useCallback, useEffect, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:4000';

type Device = {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  useSSL: boolean;
};

type TestRecord = {
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

export default function App() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [tests, setTests] = useState<TestRecord[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [deviceForm, setDeviceForm] = useState({ name: '', host: '', port: '8729', username: '', password: '', useSSL: true });
  const [form, setForm] = useState({ deviceId: '', serverAddress: '', direction: 'both', protocol: 'tcp', durationSeconds: '30', user: '', password: '' });

  const refresh = useCallback(async () => {
    const [devicesResponse, testsResponse] = await Promise.all([
      fetch(`${API_BASE}/api/devices`),
      fetch(`${API_BASE}/api/tests`)
    ]);
    if (!devicesResponse.ok || !testsResponse.ok) throw new Error('Could not load devices and test history.');
    const [deviceData, testData] = await Promise.all([devicesResponse.json(), testsResponse.json()]);
    setDevices(deviceData);
    setTests(testData);
    if (!form.deviceId && deviceData[0]) setForm((current) => ({ ...current, deviceId: deviceData[0].id }));
  }, [form.deviceId]);

  useEffect(() => {
    refresh().catch((cause: unknown) => setError(cause instanceof Error ? cause.message : 'Backend is unavailable.'));
  }, [refresh]);

  const addDevice = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const response = await fetch(`${API_BASE}/api/devices`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...deviceForm, port: Number(deviceForm.port) })
    });
    const data = await response.json();
    if (!response.ok) { setError(data.error?.message ?? 'Could not save device.'); return; }
    setDeviceForm({ name: '', host: '', port: '8729', username: '', password: '', useSSL: true });
    setForm((current) => ({ ...current, deviceId: data.id }));
    await refresh();
  };

  const runTest = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`${API_BASE}/api/tests`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, durationSeconds: Number(form.durationSeconds) })
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Bandwidth test failed.');
      await refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Bandwidth test failed.');
      await refresh().catch(() => undefined);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page-shell">
      <header className="topbar"><div><p className="eyebrow">MikroTik Diagnostics</p><h1>MTIK-LinkTest</h1><p>Run a controlled RouterOS bandwidth test against an authorized BTest server.</p></div></header>
      {error && <div className="notice" role="alert">{error}</div>}
      <main className="content-grid">
        <section className="panel">
          <h2>Connect a MikroTik device</h2>
          <p>Use a RouterOS API account with the minimum permissions required. API-SSL is recommended.</p>
          <form onSubmit={addDevice} className="form-grid">
            <label>Device name<input required minLength={2} value={deviceForm.name} onChange={(e) => setDeviceForm({ ...deviceForm, name: e.target.value })} /></label>
            <label>Router host or IP<input required placeholder="192.168.88.1" value={deviceForm.host} onChange={(e) => setDeviceForm({ ...deviceForm, host: e.target.value })} /></label>
            <label>API port<input required type="number" min="1" max="65535" value={deviceForm.port} onChange={(e) => setDeviceForm({ ...deviceForm, port: e.target.value })} /></label>
            <label>Username<input required autoComplete="username" value={deviceForm.username} onChange={(e) => setDeviceForm({ ...deviceForm, username: e.target.value })} /></label>
            <label>Password<input required type="password" autoComplete="new-password" value={deviceForm.password} onChange={(e) => setDeviceForm({ ...deviceForm, password: e.target.value })} /></label>
            <label className="check-label"><input type="checkbox" checked={deviceForm.useSSL} onChange={(e) => setDeviceForm({ ...deviceForm, useSSL: e.target.checked, port: e.target.checked ? '8729' : '8728' })} /> Use API-SSL (TLS certificate must be trusted by backend)</label>
            <button type="submit">Save device</button>
          </form>
        </section>
        <section className="panel">
          <h2>Start bandwidth test</h2>
          <form onSubmit={runTest} className="form-grid">
            <label>Test client<select required value={form.deviceId} onChange={(e) => setForm({ ...form, deviceId: e.target.value })}><option value="">Select a device</option>{devices.map((device) => <option key={device.id} value={device.id}>{device.name} ({device.host})</option>)}</select></label>
            <label>BTest server address<input required placeholder="btest.example.net" value={form.serverAddress} onChange={(e) => setForm({ ...form, serverAddress: e.target.value })} /></label>
            <label>Direction<select value={form.direction} onChange={(e) => setForm({ ...form, direction: e.target.value })}><option value="tx">Transmit</option><option value="rx">Receive</option><option value="both">Both</option></select></label>
            <label>Protocol<select value={form.protocol} onChange={(e) => setForm({ ...form, protocol: e.target.value })}><option value="tcp">TCP</option><option value="udp">UDP</option></select></label>
            <label>Duration (5–120 seconds)<input type="number" min="5" max="120" required value={form.durationSeconds} onChange={(e) => setForm({ ...form, durationSeconds: e.target.value })} /></label>
            <label>BTest username (optional)<input autoComplete="username" value={form.user} onChange={(e) => setForm({ ...form, user: e.target.value })} /></label>
            <label>BTest password (optional)<input type="password" autoComplete="new-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></label>
            <button type="submit" disabled={busy || !devices.length}>{busy ? 'Test running…' : 'Run test'}</button>
          </form>
        </section>
      </main>
      <section className="panel results-panel"><h2>Configured devices</h2>{devices.length === 0 ? <p>No devices configured. Add a MikroTik device above.</p> : <ul className="device-list">{devices.map((device) => <li key={device.id}><strong>{device.name}</strong><span>{device.host}:{device.port} · {device.useSSL ? 'API-SSL' : 'API'}</span></li>)}</ul>}</section>
      <section className="panel results-panel"><h2>Test history</h2>{tests.length === 0 ? <p>No bandwidth tests yet.</p> : <div className="table-wrap"><table><thead><tr><th>Status</th><th>Device</th><th>Server</th><th>Direction</th><th>Protocol</th><th>Combined</th><th>TX / RX</th><th>Started</th></tr></thead><tbody>{tests.map((test) => <tr key={test.id}><td><span className={`status ${test.status}`}>{test.status}</span></td><td>{test.deviceName}</td><td>{test.serverAddress}</td><td>{test.direction}</td><td>{test.protocol}</td><td>{test.throughputMbps == null ? '—' : `${test.throughputMbps.toFixed(2)} Mbps`}</td><td>{test.txMbps == null ? '—' : test.txMbps.toFixed(2)} / {test.rxMbps == null ? '—' : test.rxMbps.toFixed(2)} Mbps</td><td>{new Date(test.startedAt).toLocaleString()}</td></tr>)}</tbody></table></div>}</section>
      <footer>Tests can impact live traffic. Run only on devices and BTest servers you are authorized to use. Results are held in memory until the backend restarts.</footer>
    </div>
  );
}
