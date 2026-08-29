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
  const [alreadyInstalled, setAlreadyInstalled] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((error) => console.error("Service worker registration failed", error));
    }

    const installed = window.matchMedia("(display-mode: standalone)").matches;
    setAlreadyInstalled(installed);
    const wasDismissed = window.localStorage.getItem("farmfinder-install-dismissed") === "true";
    const initializeBanner = window.setTimeout(() => {
      setDismissed(installed || wasDismissed);
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
    setShowIosHelp(false);
    if (installPrompt) {
      await installPrompt.prompt();
      const choice = await installPrompt.userChoice;
      if (choice.outcome === "accepted") {
        dismiss();
        setAlreadyInstalled(true);
      }
      setInstallPrompt(null);
      return;
    }
    if (/iphone|ipad|ipod/i.test(navigator.userAgent)) {
      setShowIosHelp(true);
      return;
    }
    window.alert("To add FarmFinder to your phone, open your browser menu and choose Add to Home screen or Install app.");
  }

  const isIos = typeof navigator !== "undefined" && /iphone|ipad|ipod/i.test(navigator.userAgent);
  const canShowBanner = !dismissed && !alreadyInstalled && (Boolean(installPrompt) || isIos);

  return <>
    {!alreadyInstalled && <button className="install-app-reopen" type="button" onClick={() => void install()} aria-label="Install FarmFinder app">📱 Install App</button>}
    {showIosHelp && !canShowBanner && <aside className="install-app-banner" aria-label="Install FarmFinder"><div><strong>Install FarmFinder</strong><span>Tap the Share button in Safari, then choose <strong>Add to Home Screen</strong>.</span></div><button className="install-dismiss" type="button" onClick={() => setShowIosHelp(false)} aria-label="Close install instructions">×</button></aside>}
    {canShowBanner && <aside className="install-app-banner" aria-label="Install FarmFinder">
      <div><strong>Put FarmFinder on your phone</strong><span>Open the map and farmer updates like an app—no app store needed.</span></div>
      {showIosHelp ? <p>Tap the Share button in Safari, then choose <strong>Add to Home Screen</strong>.</p> : <button type="button" onClick={() => void install()}>Install FarmFinder</button>}
      <button className="install-dismiss" type="button" onClick={dismiss} aria-label="Dismiss install suggestion">×</button>
    </aside>}
  </>;
}
