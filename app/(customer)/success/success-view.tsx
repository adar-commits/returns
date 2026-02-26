"use client";

import Link from "next/link";

export default function SuccessView({ returnId }: { returnId: string }) {
  return (
    <>
      <h1>תודה</h1>
      <p>בקשתך התקבלה.</p>
      {returnId && (
        <p style={{ marginTop: 16, fontSize: 18 }}>
          <strong>מזהה הבקשה: {returnId}</strong>
        </p>
      )}
      <p style={{ marginTop: 24 }}>
        <Link href="/my-returns" style={{ color: "#8B4513", fontWeight: 600 }}>
          צפייה בסטטוס הבקשות שלי
        </Link>
      </p>
    </>
  );
}
