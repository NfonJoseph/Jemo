// This root layout is required by Next.js but the actual layout is in [locale]/layout.tsx
// The middleware will redirect all requests to the appropriate locale
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
