import { ReactNode } from "react";
import { Helmet } from "react-helmet";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "./Tooltip";
import { SonnerToaster } from "./SonnerToaster";
import { ScrollToHashElement } from "./ScrollToHashElement";
import { PWAInstallBanner } from "./PWAInstallBanner";
import { AuthProvider } from "../helpers/useAuth";
import { LanguageProvider } from "../helpers/useTranslation";
import { useExpiredReservationsChecker } from "../helpers/useExpiredReservationsChecker";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnMount: false,
      refetchOnWindowFocus: false,
    },
  },
});

/**
 * A small component to encapsulate the background reservation checker hook.
 * This keeps the main provider component clean.
 */
const ExpiredReservationsChecker = () => {
  useExpiredReservationsChecker();
  return null; // This component does not render anything
};


export const GlobalContextProviders = ({
  children,
}: {
  children: ReactNode;
}) => {
  return (
    <LanguageProvider>
      <QueryClientProvider client={queryClient}>
        <Helmet>
          <link rel="manifest" href="/manifest.json" />
          <meta name="theme-color" content="#f97316" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
          <meta name="apple-mobile-web-app-title" content="SmartPick" />
          <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
          <link rel="apple-touch-icon" sizes="152x152" href="/apple-touch-icon-152x152.png" />
          <link rel="apple-touch-icon" sizes="120x120" href="/apple-touch-icon-120x120.png" />
          <link rel="apple-touch-icon" sizes="76x76" href="/apple-touch-icon-76x76.png" />
        </Helmet>
        <ScrollToHashElement />
        <AuthProvider>
          <TooltipProvider>
            <ExpiredReservationsChecker />
            {children}
            <SonnerToaster />
            <PWAInstallBanner />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </LanguageProvider>
  );
};