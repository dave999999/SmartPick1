import { useState, useEffect, useCallback } from "react";

/**
 * BeforeInstallPromptEvent is a custom event that is fired when the browser
 * determines that a PWA is installable. It is not part of the standard DOM event types.
 */
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
  prompt(): Promise<void>;
}

/**
 * @returns An object with PWA installation state and functions.
 * - `canInstallPWA`: A boolean indicating if the PWA installation prompt can be shown.
 * - `promptInstall`: A function to trigger the PWA installation prompt.
 * - `isAppInstalled`: A boolean indicating if the PWA has been installed.
 * - `isStandalone`: A boolean indicating if the app is running in standalone (PWA) mode.
 */
export const usePWAInstall = () => {
  const [installPromptEvent, setInstallPromptEvent] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isAppInstalled, setIsAppInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    // Check if running in standalone mode
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setIsStandalone(true);
    }

    const handleBeforeInstallPrompt = (event: Event) => {
      // Prevent the mini-infobar from appearing on mobile
      event.preventDefault();
      // Stash the event so it can be triggered later.
      setInstallPromptEvent(event as BeforeInstallPromptEvent);
      console.log("PWA install prompt event captured.");
    };

    const handleAppInstalled = () => {
      // Hide the app-provided install promotion
      setInstallPromptEvent(null);
      setIsAppInstalled(true);
      console.log("PWA has been installed.");
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const promptInstall = useCallback(async () => {
    if (!installPromptEvent) {
      console.error("PWA install prompt not available.");
      return;
    }

    installPromptEvent.prompt();
    const { outcome } = await installPromptEvent.userChoice;
    console.log(`User response to the install prompt: ${outcome}`);

    // We've used the prompt, so we can't use it again. Clear it.
    setInstallPromptEvent(null);
  }, [installPromptEvent]);

  return {
    canInstallPWA: !!installPromptEvent,
    promptInstall,
    isAppInstalled,
    isStandalone,
  };
};