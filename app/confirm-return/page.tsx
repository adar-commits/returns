import { redirect } from "next/navigation";
import { confirmByToken } from "@/lib/return-request";

export default async function ConfirmReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  if (!token) {
    return (
      <main style={{ padding: "2rem", textAlign: "center" }}>
        <p>קישור לא תקין.</p>
      </main>
    );
  }
  const result = await confirmByToken(token);
  if (!result) {
    return (
      <main style={{ padding: "2rem", textAlign: "center" }}>
        <p>הבקשה לא נמצאה או כבר אושרה.</p>
      </main>
    );
  }
  return (
    <main style={{ padding: "2rem", textAlign: "center" }}>
      <h1>אושר</h1>
      <p>בקשת ההחזרה אושרה בהצלחה.</p>
      <p>מזהה: {result.return_id}</p>
    </main>
  );
}
