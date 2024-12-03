import { useState, useEffect } from "react";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/spinner";

import { indicators, defaultColumns } from "@/lib/arrays";
import { Dataset } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function IndicatorsPage() {
    const [dataset, setDataset] = useState<Dataset | undefined>(undefined);
    const [selectedIndicators, setSelectedIndicators] = useState<string[]>([]);
    const [isProcessingIndicators, setIsProcessingIndicators] = useState<boolean>(false);

    const handleToggle = (value: string) => {
        if (selectedIndicators.includes(value)) {
            setSelectedIndicators(selectedIndicators.filter((indicator) => indicator !== value));
        } else {
            setSelectedIndicators([...selectedIndicators, value]);
        }
    }

    const processIndicators = async () => {
        setIsProcessingIndicators(true);

        try {
            const response = await window.ipcRenderer.invoke("calculateIndicators", selectedIndicators);

            if (response) {
                getDataset();
                setSelectedIndicators([]);
            }
        } catch (error) {
            console.log(error);
        }

        setIsProcessingIndicators(false);
    }

    const getDataset = async () => {
        try {
            const response: Dataset = await window.ipcRenderer.invoke("getDataset");

            if (response) {
                if (response.data.list.length > 0) {
                    setDataset(response);
                }
            }
        } catch (error) {
            console.log(error);
        }
    }

    useEffect(() => {
        getDataset();
    }, [])

    return (
        <div className="w-full h-full flex flex-col space-y-2">
            <div className="flex-none flex flex-col space-y-2">
                <span className="text-2xl text-zinc-900 font-bold">Technical Analysis and Indicators</span>
                <span className="text-md text-zinc-500">Select indicators below to add to your dataset </span>
            </div>
            <div className="w-full flex-auto flex flex-col space-y-2 overflow-y-scroll">
                {Object.entries(indicators).map(([key, value]) => (
                    <div
                        key={key}
                        className="w-full flex flex-col p-4 space-y-2 border border-zinc-200 rounded-md"
                    >
                        <span className="text-lg text-zinc-900 font-bold">{key}</span>
                        <ToggleGroup
                            className="w-full flex flex-row flex-wrap justify-start gap-2 overflow-y-scroll"
                            type="multiple"
                        >
                            {value.map((indicator, index) => (
                                <ToggleGroupItem
                                    key={index}
                                    className={cn([
                                        selectedIndicators.includes(indicator.value) && "bg-zinc-900",
                                    ])}
                                    value={indicator.value}
                                    disabled={Object.keys(dataset?.data.list[0] || defaultColumns).map(key => key.includes("_") ? key.split("_", 1)[0] : key).includes(indicator.value)}
                                    onClick={() => handleToggle(indicator.value)}
                                >
                                    {indicator.title}
                                </ToggleGroupItem>
                            ))}
                        </ToggleGroup>
                    </div>
                ))}
            </div>
            <div className="w-full flex-none flex flex-col space-y-2">
                <div className="w-full flex flex-col space-y-2">
                    <span className="text-lg text-zinc-900 font-bold">Selected Indicators</span>
                    <div className="w-full flex flex-row flex-wrap p-4 gap-2 border border-zinc-200 rounded-md">
                        {selectedIndicators.length > 0 ?
                            <>
                                {selectedIndicators.map((indicator, index) => (
                                    <span key={index} className="text-md text-zinc-500">{indicator}</span>
                                ))}
                            </>
                            :
                            <span className="text-md text-zinc-500">No indicators selected</span>
                        }
                    </div>
                </div>
                <Button
                    className="w-full"
                    disabled={!dataset || dataset.data.list.length === 0 || isProcessingIndicators || selectedIndicators.length === 0}
                    onClick={() => processIndicators()}
                >
                    {isProcessingIndicators ? (
                        <div className="flex flex-row space-x-2">
                            <LoadingSpinner />
                            <span className="text-zinc-50">Calculating Indicators</span>
                        </div>
                    ) : (
                        <span className="text-zinc-50">Calculate Indicators</span>
                    )}
                </Button>
                {(!dataset || dataset.data.list.length === 0) && (
                    <span className="text-sm text-zinc-500 text-center">No data fetched yet</span>
                )}
            </div>
            
        </div>
    )
}