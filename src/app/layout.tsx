import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { Toaster } from "react-hot-toast";
import { Footer } from "@/components/Footer";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NeedMap - Connecting Communities",
  description: "Connecting NGOs and volunteers for smart resource allocation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} h-full antialiased`}
    >
      <body className="font-inter min-h-screen bg-[#FAFAF9] text-[#1A1A1A] flex flex-col">
        <AuthProvider>
          <div className="flex-grow flex flex-col">
            {children}
          </div>
          <Footer />
          <Toaster position="bottom-center" />
        </AuthProvider>
      </body>
    </html>
  );
}
