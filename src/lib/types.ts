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
        list: any[];
    };
}