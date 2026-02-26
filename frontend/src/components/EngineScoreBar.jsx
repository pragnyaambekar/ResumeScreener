export default function EngineScoreBar({ engine, score }) {
  return (
    <div style={{ marginBottom: 10 }}>
      <strong>{engine}</strong>
      <div style={{ background: "#eee", height: 10 }}>
        <div
          style={{
            width: `${score * 100}%`,
            height: 10,
            background: "green"
          }}
        />
      </div>
    </div>
  );
}
