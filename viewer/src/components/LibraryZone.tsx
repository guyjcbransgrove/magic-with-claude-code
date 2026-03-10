interface Props {
  count: number;
}

export default function LibraryZone({ count }: Props) {
  return (
    <div className="library-zone">
      <div className="library-pile">
        <div className="library-back" />
        <div className="library-back library-back-offset" />
      </div>
      <span className="library-count">{count}</span>
    </div>
  );
}
