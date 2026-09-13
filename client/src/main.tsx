import { createRoot } from "react-dom/client";
import { StrictMode } from "react";
import App from "./App";
import "./index.css";
import { registerSW } from "virtual:pwa-register";

// Register PWA service worker automatically
if ("serviceWorker" in navigator) {
  registerSW({
    immediate: true,
  });
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
