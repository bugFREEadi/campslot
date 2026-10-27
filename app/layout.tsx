import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "CampusSlot · Make room for your next idea",
  description:
    "Reserve campus equipment, manage loans and keep your next project moving.",
  icons: { icon: "/favicon.svg" },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
