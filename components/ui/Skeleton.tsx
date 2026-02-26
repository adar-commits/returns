export default function Skeleton({
  width,
  height = 20,
  className = "",
}: {
  width?: string | number;
  height?: number;
  className?: string;
}) {
  return (
    <div
      className={`skeleton ${className}`}
      style={{
        width: width ?? "100%",
        height,
      }}
      aria-hidden
    />
  );
}
