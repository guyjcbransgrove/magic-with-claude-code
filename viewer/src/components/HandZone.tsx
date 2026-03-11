interface Props {
  count: number;
}

export default function HandZone({ count }: Props) {
  if (count === 0) return null;

  // Show up to 7 card backs, fanned/overlapping
  const cards = Math.min(count, 7);

  return (
    <div className="hand-zone">
      <div className="hand-fan">
        {Array.from({ length: cards }).map((_, i) => (
          <div
            key={i}
            className="card-back"
            style={{ marginTop: i > 0 ? "-30px" : "0" }}
          />
        ))}
      </div>
      <span className="hand-count">{count}</span>
    </div>
  );
}
