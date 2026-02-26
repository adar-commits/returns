const STEPS = ["בחירת הזמנה", "בחירת פריטים", "כתובת משלוח/איסוף", "סיכום ותשלום"];

export default function ProgressBar({ currentStep }: { currentStep: number }) {
  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
      {STEPS.map((label, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 14,
            opacity: i < currentStep ? 1 : i === currentStep ? 1 : 0.6,
          }}
        >
          <span
            style={{
              width: 24,
              height: 24,
              borderRadius: "50%",
              background: i < currentStep ? "#8B4513" : i === currentStep ? "#8B4513" : "#eee",
              color: i <= currentStep ? "white" : "#666",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
            }}
          >
            {i < currentStep ? "✓" : i + 1}
          </span>
          <span>{label}</span>
        </div>
      ))}
    </div>
  );
}
