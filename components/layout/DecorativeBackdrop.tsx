/** Layer paling belakang: blob organik + grain supaya efek glassmorphism hidup. */
export function DecorativeBackdrop() {
  return (
    <div className="decorative-backdrop" aria-hidden="true">
      <div className="backdrop-blob backdrop-blob-1" />
      <div className="backdrop-blob backdrop-blob-2" />
      <div className="backdrop-blob backdrop-blob-3" />
    </div>
  );
}
