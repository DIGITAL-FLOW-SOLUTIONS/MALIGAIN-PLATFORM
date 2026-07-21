import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// ---------------------------------------------------------------------------
// API base URL — when deployed as a separate Render Static Site the admin
// panel lives on a different domain from the API.  Set VITE_API_URL at build
// time (e.g. https://maligain-api.onrender.com) and every /api/… fetch will
// be transparently rewritten to the correct origin.  Omit the var (or leave
// it empty) for same-origin setups (local dev, monolithic deploy).
// ---------------------------------------------------------------------------
const apiBase =
  ((import.meta.env.VITE_API_URL as string | undefined) ?? "").replace(
    /\/$/,
    "",
  );

if (apiBase) {
  const _fetch = window.fetch.bind(window);
  window.fetch = (input, init?) => {
    if (typeof input === "string" && /^\/(api|callbackurl)(\/|$|\?)/.test(input)) {
      input = apiBase + input;
    }
    return _fetch(input, init);
  };
}

createRoot(document.getElementById("root")!).render(<App />);
