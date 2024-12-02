import { app, BrowserWindow, ipcMain } from "electron";
import Store from "electron-store";

import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { createHmac } from "node:crypto";

import { requestData, requestCredentials, RequestHeaders, Dataset } from "@/lib/types";

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// The built directory structure
//
// ├─┬─┬ dist
// │ │ └── index.html
// │ │
// │ ├─┬ dist-electron
// │ │ ├── main.js
// │ │ └── preload.mjs
// │
process.env.APP_ROOT = path.join(__dirname, "..");

// 🚧 Use ["ENV_NAME"] avoid vite:define plugin - Vite@2.x
export const VITE_DEV_SERVER_URL = process.env["VITE_DEV_SERVER_URL"];
export const MAIN_DIST = path.join(process.env.APP_ROOT, "dist-electron");
export const RENDERER_DIST = path.join(process.env.APP_ROOT, "dist");

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, "public") : RENDERER_DIST;

let win: BrowserWindow | null;

const store = new Store({
    defaults: {
        apiKey: undefined,
        apiSecret: undefined,
    },
});

function createWindow() {
    win = new BrowserWindow({
        width: 1024,
        height: 768,
        icon: path.join(process.env.VITE_PUBLIC, "electron-vite.svg"),
        webPreferences: {
            preload: path.join(__dirname, "preload.mjs"),
        },
    })

    win.removeMenu();

    // Test active push message to Renderer-process.
    win.webContents.on("did-finish-load", () => {
        win?.webContents.send("main-process-message", (new Date).toLocaleString())
    })

    if (VITE_DEV_SERVER_URL) {
        win.loadURL(VITE_DEV_SERVER_URL)
    } else {
        // win.loadFile("dist/index.html")
        win.loadFile(path.join(RENDERER_DIST, "index.html"))
    }
}

function getSignature(params: requestData, creds: requestCredentials) {
    return createHmac("sha256", creds.apiSecret)
        .update(creds.timestamp + creds.apiKey + creds.recvWindow + JSON.stringify(params))
        .digest("hex");
}

async function requestFromBybit(endpoint: string, data: any,  method: "GET" | "POST") {
    const recvWindow = 5000;

    const sign = getSignature(data, {
        apiKey: store.get("apiKey") || "",
        apiSecret: store.get("apiSecret") || "",
        recvWindow: recvWindow,
        timestamp: Date.now().toString(),
    });

    const queryString = new URLSearchParams(data).toString();
    const headers: RequestHeaders = {
        "X-BAPI-SIGN-TYPE": "2",
        "X-BAPI-SIGN": sign,
        "X-BAPI-API-KEY": store.get("apiKey"),
        "X-BAPI-TIMESTAMP": recvWindow.toString(),
        "X-BAPI-RECV-WINDOW": Date.now().toString(),
    }

    if (method === "POST") {
        headers["Content-Type"] = "application/json; charset=utf-8";
    }

    const response = await fetch(`https://api-testnet.bybit.com${endpoint}?${queryString}`, {
        method: method,
        headers: headers,
        body: method === "GET" ? null : JSON.stringify(data),
    });

    if (response.ok) {
        return response.json();
    } else {
        return response.status;
    }
}

// Quit when all windows are closed, except on macOS. There, it"s common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit()
        win = null
    }
});

app.on("activate", () => {
    // On OS X it"s common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) {
        createWindow()
    }
});

let dataset: Dataset | undefined = undefined;
app.whenReady().then(() => {
    ipcMain.handle("getAPIConfig", async () => {
        return {
            apiKey: store.get("apiKey"),
            apiSecret: store.get("apiSecret"),
        };
    })

    ipcMain.handle("setAPIConfig", async (event, data: { key: string, secret: string }) => {
        store.set("apiKey", data.key);
        store.set("apiSecret", data.secret);

        return "Success";
    });

    ipcMain.handle("fetchData", async (event, data: requestData) => {
        try {
            const response = await requestFromBybit("/v5/market/kline", data, "GET");

            if (response) {
                dataset = {
                    name:  `${data.symbol} at ${data.interval} from ${new Date(data.start).toLocaleDateString()} to ${new Date(data.end || Date.now()).toLocaleDateString()}`,
                    data: response.result,
                }

                return "Success";
            } else {
                return "Failed";
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        }
    });

    ipcMain.handle("getDataset", async () => {
        return dataset;
    });

    createWindow();
});
