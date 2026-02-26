export default function Loader({ className = "" }: { className?: string }) {
  return <div className={`loader ${className}`} style={{ margin: "0 auto" }} aria-hidden />;
}
