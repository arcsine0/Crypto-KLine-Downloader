import { app, BrowserWindow, ipcMain } from "electron";
import Store from "electron-store";

import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { createHmac } from "node:crypto";

import { requestData, requestCredentials, RequestHeaders, responseData, Dataset } from "@/lib/types";

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

// temporary
const intervals = [
    { title: "1m", value: "1" },
    { title: "3m", value: "3" },
    { title: "5m", value: "5" },
    { title: "15m", value: "15" },
    { title: "30m", value: "30" },
    { title: "60m", value: "60" },
    { title: "120m", value: "120" },
    { title: "240m", value: "240" },
    { title: "360m", value: "360" },
    { title: "720m", value: "720" },
    { title: "1D", value: "D" },
    { title: "1W", value: "W" },
    { title: "1M", value: "M" },
];

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

async function requestFromBybit(endpoint: string, data: any, method: "GET" | "POST") {
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

// const responseData: responseData = {
//     retCode: response.retCode,
//     retMsg: response.retMsg,
//     result: {
//         symbol: response.result.symbol,
//         category: response.result.category,
//         list: response.result.list.reverse(),
//     }
// };

async function fetchFullDataFromBybit(data: requestData): Promise<Dataset | "Empty" | undefined> {
    try {
        let dataset: Dataset = {
            name: `${data.symbol} at ${data.interval} from ${new Date(data.start).toLocaleDateString()} to ${new Date(data.end || Date.now()).toLocaleDateString()}`,
            data: {
                category: data.category,
                symbol: data.symbol,
                list: []
            },
        };

        let currentStart = data.start;
        let keepFetching = true;

        console.log(`Starting fetch for ${data.symbol} at ${new Date(data.start).toLocaleString()}`);
        while (keepFetching) {
            let currentEnd = 0;
            if (data.interval.match(/^\d+[m]$/)) {
                const intervalMinutes = parseInt(data.interval, 10);
                currentEnd = parseInt(currentStart) + (data.limit * intervalMinutes * 60 * 1000);
            }
            else if (data.interval ==="D") {
                currentEnd = parseInt(currentStart) + (data.limit * 24 * 60 * 60 * 1000);
            }
            else {
                console.log("Intervals other than minutes and days are not supported")
                return undefined;
            }

            let endTimestamp = data.end ? parseInt(data.end) : Date.now();
            if (isNaN(endTimestamp)) {
                endTimestamp = Date.now(); // Use current time if data.end is invalid
                console.warn("Invalid end date. Using current time.");
            }
            currentEnd = Math.min(currentEnd, endTimestamp);
            console.log(currentStart, currentEnd)

            const requestData = { 
                ...data, 
                interval: intervals.find(interval => interval.title === data.interval)?.value || 60,
                start: currentStart, 
                end: currentEnd 
            };
            const response = await requestFromBybit("/v5/market/kline", requestData, "GET");

            if (!response || !response.result || !response.result.list || response.result.list.length === 0) {
                console.error("Invalid or empty response:", response);
                return "Empty";
            }

            const responseData: responseData = {
                retCode: response.retCode,
                retMsg: response.retMsg,
                result: {
                    symbol: response.result.symbol,
                    category: response.result.category,
                    list: response.result.list.reverse(),
                }
            };

            const lastTimestamp = responseData.result.list[responseData.result.list.length - 1][0];
            console.log(`Fetched data from ${new Date(currentStart).toLocaleString()} to ${new Date(lastTimestamp).toLocaleString()}`);

            dataset.name = `${data.symbol} at ${data.interval} from ${new Date(data.start).toLocaleDateString()} to ${new Date(lastTimestamp).toLocaleString()}`
            dataset.data.list.push(...responseData.result.list);

            if (lastTimestamp >= (data.end || Date.now())) {
                console.log(`Reached end timestamp`);
                keepFetching = false;
            } else {
                console.log(`Continuing to next fetch`);
                currentStart = (parseInt(lastTimestamp) + 1).toString();
            }
        }
        console.log("Final Dataset Length: ", dataset.data.list.length);
        
        return dataset;

    } catch (error) {
        console.error("Error fetching data:", error);
        return undefined;
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

    let dataset: Dataset | "Empty" | undefined = undefined;
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
                const response = await fetchFullDataFromBybit(data);
                // const response = await requestFromBybit("/v5/market/kline", data, "GET");

                if (response) {
                    // if (response === "Empty") { return "Failed"; }
                    // const responseData: responseData = {
                    //     retCode: response.retCode,
                    //     retMsg: response.retMsg,
                    //     result: {
                    //         symbol: response.result.symbol,
                    //         category: response.result.category,
                    //         list: response.result.list.reverse(),
                    //     }
                    // };
                    // const startDate = responseData.result.list[0][0];
                    // const endDate = responseData.result.list[responseData.result.list.length - 1][0];

                    // dataset = {
                    //     name: `${data.symbol} at ${data.interval} from ${startDate} to ${endDate}`,
                    //     data: responseData.result,
                    // };
                    dataset = response;

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
