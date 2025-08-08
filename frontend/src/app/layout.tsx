import type { Metadata } from "next";
import { Inter, Montserrat } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { TimezoneProvider } from "@/contexts/TimezoneContext";
import { LoadingProvider } from "@/contexts/LoadingContext";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { GlobalLoadingIndicator } from "@/components/ui/GlobalLoadingIndicator";
import { LoadingInitializer } from "@/components/LoadingInitializer";
import { GoogleOAuthProvider } from "@react-oauth/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

export const metadata: Metadata = {
  title: "TimeBooking - Connect with Service Providers",
  description: "Book appointments with trusted service providers in your area. Find and schedule services easily with TimeBooking.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${montserrat.variable}`} suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning={true}>
        <LoadingProvider>
          <GoogleOAuthProvider clientId={process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || ""}>
            <TimezoneProvider>
              <AuthProvider>
                <LoadingInitializer />
                <div className="min-h-screen flex flex-col">
                  <Header />
                  <main className="flex-1">
                    {children}
                  </main>
                  <Footer />
                </div>
                <GlobalLoadingIndicator />
              </AuthProvider>
            </TimezoneProvider>
          </GoogleOAuthProvider>
        </LoadingProvider>
      </body>
    </html>
  );
}
