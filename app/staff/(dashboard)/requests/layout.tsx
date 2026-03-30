export default function StaffRequestsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div dir="rtl" lang="he" style={{ direction: "rtl", textAlign: "right", width: "100%" }}>
      {children}
    </div>
  );
}
