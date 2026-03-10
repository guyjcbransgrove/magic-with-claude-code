interface Props {
  count: number;
}

export default function HandZone({ count }: Props) {
  if (count === 0) return null;

  return (
    <div className="hand-zone">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card-back" />
      ))}
    </div>
  );
}
