import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EthicAI Audit",
  description: "Fairness audit dashboard for ML predictions",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="bg-white text-gray-900">
        <header className="border-b border-gray-200">
          <div className="mx-auto max-w-5xl px-6 py-4 flex items-center justify-between">
            <a href="/" className="font-semibold text-lg">
              EthicAI Audit
            </a>
            <nav className="flex gap-6 text-sm">
              <a href="/audit" className="hover:underline">
                Audit
              </a>
              <a href="/about" className="hover:underline">
                About
              </a>
            </nav>
          </div>
        </header>

        {children}
      </body>
    </html>
  );
}
