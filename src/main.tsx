import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "leaflet/dist/leaflet.css";
import "./styles.css";
import App from "./App";
import { AuthProvider } from "@/context/AuthContext";
import { CityProvider } from "@/context/CityContext";
import { ToastProvider } from "@/context/ToastContext";

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element #root is missing from index.html.");
}

createRoot(container).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CityProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </CityProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
);
