import { app, BrowserWindow, ipcMain } from "electron";
import Store from "electron-store";

import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { createHmac } from "node:crypto";

import { requestData, requestCredentials, RequestHeaders, responseData, Dataset, ProgressProps } from "@/lib/types";
import { indicators, intervals, defaultColumns } from "../src/lib/arrays";

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
    win.resizable = false;

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

        let totalTimeRange = (data.end ? parseInt(data.end) : Date.now()) - parseInt(data.start);
        if (isNaN(totalTimeRange)) {
            console.error("Invalid start or end date");
            totalTimeRange = 1;
        }

        let keepFetching = true;

        console.log(`Starting fetch for ${data.symbol} at ${new Date(data.start).toLocaleString()}`);
        while (keepFetching) {
            let currentEnd = 0;
            switch (data.interval) {
                case "1m":
                case "3m":
                case "5m":
                case "15m":
                case "30m":
                case "60m":
                case "120m":
                case "240m":
                case "360m":
                case "720m":
                    const intervalMinutes = parseInt(data.interval, 10);
                    currentEnd = parseInt(currentStart) + (data.limit * intervalMinutes * 60 * 1000);
                    break;
                case "D":
                    currentEnd = parseInt(currentStart) + (data.limit * 24 * 60 * 60 * 1000);
                    break;
                case "W":
                    currentEnd = parseInt(currentStart) + (data.limit * 7 * 24 * 60 * 60 * 1000);
                    break;
                case "M":
                    currentEnd = parseInt(currentStart) + (data.limit * 30 * 24 * 60 * 60 * 1000);
                    break;
                default:
                    console.error("Unsupported interval:", data.interval);
                    return undefined;
            }

            let endTimestamp = data.end ? parseInt(data.end) : Date.now();
            if (isNaN(endTimestamp)) {
                endTimestamp = Date.now();
                console.warn("Invalid end date. Using current time.");
            }
            currentEnd = Math.min(currentEnd, endTimestamp);

            const requestData = {
                ...data,
                interval: intervals.find(interval => interval.title === data.interval)?.value || 60,
                start: currentStart,
                end: currentEnd
            };
            const progress: ProgressProps = {
                status: "ongoing",
                progress: Math.max(1, Math.min(99, Math.round(((parseInt(currentStart) - parseInt(data.start)) / totalTimeRange) * 100))),
                state: `Fetching date ${currentStart} data...`,
            }

            win?.webContents.send("progress", progress);

            const response = await requestFromBybit("/v5/market/kline", requestData, "GET");

            if (!response || !response.result || !response.result.list || response.result.list.length === 0) {
                console.error("Invalid or empty response:", response);

                const progress: ProgressProps = {
                    status: "ended",
                    progress: 100,
                    state: "Failed",
                }

                win?.webContents.send("progress", progress);
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

            responseData.result.list.forEach(item => {
                dataset.data.list.push({
                    timestamp: parseFloat(item[0]),
                    open: parseFloat(item[1]),
                    high: parseFloat(item[2]),
                    low: parseFloat(item[3]),
                    close: parseFloat(item[4]),
                    volume: parseFloat(item[5]),
                });
            });

            const lastTimestamp = responseData.result.list[responseData.result.list.length - 1][0];

            dataset.name = `${data.symbol} at ${data.interval} from ${new Date(data.start).toLocaleDateString()} to ${new Date(lastTimestamp).toLocaleString()}`
            dataset.data.list.push(...responseData.result.list);

            if (lastTimestamp >= (data.end || Date.now())) {
                const progress: ProgressProps = {
                    status: "ended",
                    progress: 100,
                    state: "Finished",
                }
                win?.webContents.send("progress", progress);

                keepFetching = false;
            } else {
                currentStart = (parseInt(lastTimestamp) + 1).toString();
            }
        }
        console.log("Final Dataset Length: ", dataset.data.list.length);
        console.log(dataset.data.list[0]);

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

            if (response) {
                if (response === "Empty") { return "Failed"; }
                dataset = response;
                console.log(dataset.data.list[209], dataset.data.list[210])

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

    ipcMain.handle("calculateIndicators", async (event, data) => {
        try {
            const selectedIndicators: string[] = data;

            if (!dataset || dataset === "Empty" || !dataset.data || !dataset.data.list) {
                console.error("No valid dataset available to process indicators.");
                return "Failed";
            }

            const datasetWithIndicators: Dataset = {
                ...dataset,
                data: {
                    ...dataset.data,
                    list: dataset.data.list.map(item => ({ ...item })),
                },
            };

            const compiledIndicators = [...indicators.Trend, ...indicators.Momentum, ...indicators.Volatility, ...indicators.Volume];

            const openings = dataset.data.list.map(item => item.open);
            const highs = dataset.data.list.map(item => item.high);
            const lows = dataset.data.list.map(item => item.low);
            const closings = dataset.data.list.map(item => item.close);
            const volumes = dataset.data.list.map(item => item.volume);

            for (let i = 0; i < selectedIndicators.length; i++) {
                const indicatorName = selectedIndicators[i];
                const indicator = compiledIndicators.find(ind => ind.value === indicatorName);

                const progress: ProgressProps = {
                    status: "ongoing",
                    progress: Math.round((i / selectedIndicators.length) * 99),
                    state: `Calculating ${indicatorName}`,
                }
                win?.webContents.send("progress", progress);

                if (indicator && indicator.func) {
                    let indicatorArgs: any[] = indicator.params.length === 0 || (indicator.params.length === 1 && indicator.params.includes("any")) ? [] : [[0]];

                    if (indicator.params.includes("any")) {
                        indicatorArgs.push(closings);
                    } else {
                        for (const param of indicator.params) {
                            switch (param) {
                                case "openings": indicatorArgs.push(openings); break;
                                case "highs": indicatorArgs.push(highs); break;
                                case "lows": indicatorArgs.push(lows); break;
                                case "closings": indicatorArgs.push(closings); break;
                                case "volumes": indicatorArgs.push(volumes); break;
                                case "any": indicatorArgs.push(closings); break;
                                default: console.warn(`Unknown parameter: ${param}`);
                            }
                        }
                    }

                    if (indicatorArgs.length > 0 && indicatorArgs[0].length === 1 && indicatorArgs[0][0] === 0) {
                        indicatorArgs.shift();
                    }

                    if (indicator.config && Object.keys(indicator.config).length > 0) {
                        indicatorArgs.push(indicator.config)
                    }

                    let result = indicator.func(...(indicatorArgs as [number[], ...any[]]));
                    result = result.result || result;

                    if (Array.isArray(result)) {
                        datasetWithIndicators.data.list.forEach((item, index) => {
                            item[indicatorName] = isNaN(parseFloat(result[index])) ? null : parseFloat(result[index]).toFixed(2);
                        });
                    } else if (typeof result === "object" && result !== null) {
                        const resultKeys = Object.keys(result);
                
                        for (const key of resultKeys) {
                            const columnName = `${indicatorName}_${key.toUpperCase()}`;
                            datasetWithIndicators.data.list.forEach((item, index) => {
                                item[columnName] = isNaN(parseFloat(result[key][index])) ? null : parseFloat(result[key][index]).toFixed(2);
                            });
                        }
                    } else {
                        console.warn(`Unexpected indicator result type for ${indicatorName}:`, typeof result);
                    }

                    datasetWithIndicators.data.list = datasetWithIndicators.data.list.filter(item => {
                        return Object.values(item).some(value => value !== null);
                    })
                } else {
                    console.warn(`Indicator function not found for ${indicatorName}`);
                }
            }

            const progress: ProgressProps = {
                status: "ended",
                progress: 100,
                state: "Finished",
            }
            win?.webContents.send("progress", progress);

            dataset = datasetWithIndicators;
            return "Success";


        } catch (error) {
            console.error("Error processing indicators:", error);
            return "Failed"; // Indicate failure
        }
    });

    createWindow();
});
