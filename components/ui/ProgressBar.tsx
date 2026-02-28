const STEPS = ["בחירת הזמנה", "בחירת פריטים", "משלוח ואיסוף", "סיכום ותשלום"];

export default function ProgressBar({ currentStep }: { currentStep: number }) {
  return (
    <div className="stepper" style={{ marginTop: "var(--space-4)" }}>
      {STEPS.map((label, i) => (
        <div
          key={i}
          className="stepper-step"
          data-active={i === currentStep}
          data-done={i < currentStep}
        >
          <span className="stepper-dot">{i < currentStep ? "✓" : i + 1}</span>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}
