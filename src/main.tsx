import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";

import { SidebarProvider } from "./components/ui/sidebar";

import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
	<React.StrictMode>
		<SidebarProvider defaultOpen={false}>
			<App />
		</SidebarProvider>
	</React.StrictMode>,
)

// Use contextBridge
window.ipcRenderer.on("main-process-message", (_event, message) => {
	console.log(message)
})
