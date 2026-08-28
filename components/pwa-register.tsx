"use client";

import { useEffect, useState } from "react";

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PwaRegister() {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [showIosHelp, setShowIosHelp] = useState(false);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((error) => console.error("Service worker registration failed", error));
    }

    const alreadyInstalled = window.matchMedia("(display-mode: standalone)").matches;
    const wasDismissed = window.localStorage.getItem("farmfinder-install-dismissed") === "true";
    const initializeBanner = window.setTimeout(() => {
      setDismissed(alreadyInstalled || wasDismissed);
    }, 0);

    const onInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onInstallPrompt);
    return () => {
      window.clearTimeout(initializeBanner);
      window.removeEventListener("beforeinstallprompt", onInstallPrompt);
    };
  }, []);

  function dismiss() {
    window.localStorage.setItem("farmfinder-install-dismissed", "true");
    setDismissed(true);
  }

  async function install() {
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") dismiss();
      setInstallPrompt(null);
      return;
    }
    if (/iphone|ipad|ipod/i.test(navigator.userAgent)) setShowIosHelp(true);
  }

  if (dismissed) return null;
  const isIos = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
  if (!installPrompt && !isIos) return null;

  return <aside className="install-app-banner" aria-label="Install FarmFinder">
    <div><strong>Put FarmFinder on your phone</strong><span>Open the map and farmer updates like an app—no app store needed.</span></div>
    {showIosHelp ? <p>Tap the Share button in Safari, then choose <strong>Add to Home Screen</strong>.</p> : <button type="button" onClick={() => void install()}>Install FarmFinder</button>}
    <button className="install-dismiss" type="button" onClick={dismiss} aria-label="Dismiss install suggestion">×</button>
  </aside>;
}
