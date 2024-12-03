export interface requestData {
    category: string;
    symbol: string;
    interval: string;
    limit: number;
    start: string;
    end?: string;
}

export interface requestCredentials {
    apiKey: string;
    apiSecret: string;
    recvWindow: number;
    timestamp: string;
}

export interface RequestHeaders {
    "X-BAPI-SIGN": string;
    "X-BAPI-SIGN-TYPE": string;
    "X-BAPI-TIMESTAMP": string;
    "X-BAPI-RECV-WINDOW": string;
    "Content-Type"?: string;
    [key: string]: any | undefined;
}

export interface responseData {
    retCode: number;
    retMsg: string;
    result: {
        symbol: string;
        category: string;
        list: any[];
    };
}

export interface Dataset {
    name: string | undefined;
    data: {
        symbol: string;
        category: string;
        list: {
            timestamp: number;
            open: number;
            high: number;
            low: number;
            close: number;
            volume: number;
            [key: string]: any;
        }[];
    };
}

export interface ProgressProps {
    status: string;
    progress: number;
    state: string;
}

export interface IndicatorResult {
    result?: any;
    [key: string]: any;
}

export interface IndicatorProps<T = number, R extends IndicatorResult = IndicatorResult> { //T defaults to number
    [key: string]: {
        title: string;
        value: string;
        func: (data: T[], ...args: any[]) => R;
        params: ("openings" | "highs" | "lows" | "closings" | "volumes" | "any")[];
        config: {
            period?: number;
            smooth?: number;
            multiplier?: number;
            start?: number;
            [key: string]: any;
        }
    }[]
}

export interface DataTableRow {
    timestamp: number;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
    [key: string]: any;
}