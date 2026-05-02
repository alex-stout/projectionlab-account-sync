import React from "react";
import ReactDom from "react-dom/client";
import App from "./App";

const rootEl = document.getElementById("root");
if (!rootEl) throw new Error("popup root element not found");
ReactDom.createRoot(rootEl).render(
	<React.StrictMode>
		<App />
	</React.StrictMode>,
);
