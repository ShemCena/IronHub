import type { Metadata } from "next";
import { Inter, Barlow_Condensed } from "next/font/google";
import { FeedbackProvider } from "@/components/ui/feedback-modal";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-barlow",
  display: "swap",
});

export const metadata: Metadata = {
  title: "IRONHUB — Fitness Management System",
  description:
    "Operational gym management platform for members, QR check-in, manual over-the-counter payments, plans, and reporting.",
};

const extensionErrorGuardScript = `
(function () {
  if (typeof window === "undefined") return;
  window.addEventListener(
    "error",
    function (e) {
      if (e && typeof e.filename === "string" && e.filename.indexOf("chrome-extension://") === 0) {
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    },
    true
  );
  window.addEventListener(
    "unhandledrejection",
    function (e) {
      var stack = (e && e.reason && e.reason.stack) ? String(e.reason.stack) : "";
      var msg = (e && e.reason && e.reason.message) ? String(e.reason.message) : "";
      if (stack.indexOf("chrome-extension://") !== -1 || msg.indexOf("MetaMask") !== -1) {
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    },
    true
  );
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${barlowCondensed.variable} dark`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: extensionErrorGuardScript }} />
      </head>
      <body
        className="min-h-screen bg-[#090A0D] text-[#F5F6F8] antialiased selection:bg-[#E32935]/30 selection:text-white"
        suppressHydrationWarning
      >
        <FeedbackProvider>{children}</FeedbackProvider>
      </body>
    </html>
  );
}
