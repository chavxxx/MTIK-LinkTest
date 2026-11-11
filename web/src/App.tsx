import { useEffect, useState } from 'react';

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
  status: string;
  serverAddress: string;
  direction: 'tx' | 'rx' | 'both';
  protocol: 'tcp' | 'udp';
  durationSeconds: number;
  throughputMbps?: number | null;
  jitterMs?: number | null;
  packetLossPercent?: number | null;
};

export default function App() {
  const [devices, setDevices] = useState<Device[]>([]);
  const [tests, setTests] = useState<TestRecord[]>([]);
  const [form, setForm] = useState({
    deviceId: '',
    serverAddress: '203.0.113.10',
    direction: 'both',
    protocol: 'tcp',
    durationSeconds: '30'
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [devicesRes, testsRes] = await Promise.all([
          fetch('http://localhost:4000/api/devices'),
          fetch('http://localhost:4000/api/tests')
        ]);

        const devicesData = await devicesRes.json();
        const testsData = await testsRes.json();

        setDevices(devicesData);
        setTests(testsData);

        if (devicesData[0]) {
          setForm((current) => ({ ...current, deviceId: devicesData[0].id }));
        }
      } catch (error) {
        console.error('Failed to load initial data', error);
      }
    };

    fetchData();
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const response = await fetch('http://localhost:4000/api/tests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        deviceId: form.deviceId,
        serverAddress: form.serverAddress,
        direction: form.direction,
        protocol: form.protocol,
        durationSeconds: Number(form.durationSeconds)
      })
    });

    if (!response.ok) {
      console.error('Failed to start bandwidth test');
      return;
    }

    const created = await response.json();
    setTests((current) => [created, ...current]);
  };

  return (
    <div className="page-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">MikroTik Diagnostics</p>
          <h1>MTIK-LinkTest</h1>
        </div>
      </header>

      <main className="content-grid">
        <section className="panel">
          <h2>Start bandwidth test</h2>
          <form onSubmit={handleSubmit} className="form-grid">
            <label>
              Device
              <select
                value={form.deviceId}
                onChange={(event) => setForm({ ...form, deviceId: event.target.value })}
              >
                <option value="">Select a device</option>
                {devices.map((device) => (
                  <option key={device.id} value={device.id}>
                    {device.name} ({device.host})
                  </option>
                ))}
              </select>
            </label>

            <label>
              BTest server
              <input
                value={form.serverAddress}
                onChange={(event) => setForm({ ...form, serverAddress: event.target.value })}
              />
            </label>

            <label>
              Direction
              <select
                value={form.direction}
                onChange={(event) => setForm({ ...form, direction: event.target.value as 'tx' | 'rx' | 'both' })}
              >
                <option value="tx">TX</option>
                <option value="rx">RX</option>
                <option value="both">Both</option>
              </select>
            </label>

            <label>
              Protocol
              <select
                value={form.protocol}
                onChange={(event) => setForm({ ...form, protocol: event.target.value as 'tcp' | 'udp' })}
              >
                <option value="tcp">TCP</option>
                <option value="udp">UDP</option>
              </select>
            </label>

            <label>
              Duration (seconds)
              <input
                type="number"
                min={5}
                max={300}
                value={form.durationSeconds}
                onChange={(event) => setForm({ ...form, durationSeconds: event.target.value })}
              />
            </label>

            <button type="submit">Run test</button>
          </form>
        </section>

        <section className="panel">
          <h2>Connected devices</h2>
          {devices.length === 0 ? (
            <p>No MikroTik devices configured yet.</p>
          ) : (
            <ul className="device-list">
              {devices.map((device) => (
                <li key={device.id}>
                  <strong>{device.name}</strong>
                  <span>{device.host}:{device.port}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>

      <section className="panel results-panel">
        <h2>Recent results</h2>
        {tests.length === 0 ? (
          <p>No bandwidth tests yet.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Server</th>
                <th>Direction</th>
                <th>Protocol</th>
                <th>Throughput</th>
                <th>Jitter</th>
                <th>Loss</th>
              </tr>
            </thead>
            <tbody>
              {tests.map((test) => (
                <tr key={test.id}>
                  <td>{test.serverAddress}</td>
                  <td>{test.direction}</td>
                  <td>{test.protocol}</td>
                  <td>{test.throughputMbps ?? 'n/a'} Mbps</td>
                  <td>{test.jitterMs ?? 'n/a'} ms</td>
                  <td>{test.packetLossPercent ?? 'n/a'}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  );
}
