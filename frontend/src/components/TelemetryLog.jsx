export default function TelemetryLog({ packet, broker }) {
  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-card">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-[11px] font-bold uppercase tracking-wider text-slate-600">Live telemetry inspector</h2>
        <div className="flex items-center gap-3 font-mono text-[10px] text-slate-500">
          <span>
            Broker: <span className="text-slate-700">{broker.broker || '…'}</span>
          </span>
          <span>
            Topic: <span className="text-slate-700">{broker.topic || '…'}</span>
          </span>
          <span>
            Source: <span className="text-slate-700">{packet ? packet.src : '…'}</span>
          </span>
        </div>
      </div>
      <pre className="max-h-32 overflow-auto whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 p-3 font-mono text-[11px] leading-5 text-slate-500">
        {packet ? JSON.stringify(packet, null, 2) : 'Awaiting telemetry packets…'}
      </pre>
    </section>
  );
}