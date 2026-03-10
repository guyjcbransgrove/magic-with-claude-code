interface Props {
  life: number;
  poisonCounters: number;
}

export default function LifeTotal({ life, poisonCounters }: Props) {
  return (
    <div className="life-total">
      <span className="life-number">{life}</span>
      {poisonCounters > 0 && (
        <span className="poison-count">{poisonCounters} poison</span>
      )}
    </div>
  );
}
