import "../globals.css";

/**
 * Re-import global design system for the /staff subtree so production/dev splits always
 * ship the same CSS chunk as the root layout (guards against rare cases where staff HTML
 * referenced styles that didn’t hydrate).
 */
export default function StaffRootLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
