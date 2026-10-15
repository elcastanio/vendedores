import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// La app abrió bien: se libera la marca de la auto-reparación (ver index.html).
setTimeout(() => { try { sessionStorage.removeItem("ec_reparo"); } catch (e) {} }, 3000);
