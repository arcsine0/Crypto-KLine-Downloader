import { useState, useEffect } from "react";

import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DataTable } from "@/components/ui/data-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/spinner";

import { ColumnDef } from "@tanstack/react-table";

import { cn } from "@/lib/utils";
import { Dataset, DataTableRow } from "@/lib/types";
import { Label } from "@/components/ui/label";

export default function PreviewPage() {
    const [directory, setDirectory] = useState<string | undefined>(undefined);
    const [dataset, setDataset] = useState<Dataset | undefined>(undefined);

    const [isExporting, setIsExporting] = useState<boolean>(false);

    const handleDirectorySelect = async () => {
        const { canceled, filePaths } = await window.ipcRenderer.invoke("selectDirectory");
        if (!canceled && filePaths.length > 0) {
            setDirectory(filePaths[0]);
        }
    };

    const handleExport = async () => {
        setIsExporting(true);

        const response: string = await window.ipcRenderer.invoke("exportDataset", {
            directory: directory,
            dataset: dataset,
        });

        if (response) {
            setIsExporting(false);
        }
    }   

    const getDataset = async () => {
        try {
            const response: Dataset = await window.ipcRenderer.invoke("getDataset");

            if (response) {
                if (response.data.list.length > 0) {
                    setDataset(response)
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
        <div className="w-full h-full flex flex-col justify-between space-y-2">
            <div className="w-full flex flex-col space-y-2">
                <span className="text-2xl text-zinc-900 font-bold">Preview and Export</span>
            </div>
            <div className="w-full flex flex-col items-center space-y-2">
                {dataset ?
                    <DataTable<DataTableRow, unknown>
                        columns={Object.keys(dataset.data.list[0]).map((key) => ({
                            accessorKey: key,
                            header: key[0].toUpperCase() + key.slice(1),
                            cell: (info) => info.getValue(),

                        }))}
                        data={dataset.data.list as DataTableRow[]}
                    />
                    :
                    <span className="text-md text-zinc-500 text-center">No data fetched yet</span>
                }
                {/* <span className="text-sm text-zinc-500 text-center">{dataset?.name}</span> */}
            </div>
            <div className="w-full flex flex-col space-y-2">
                <span className="text-lg text-zinc-900 font-bold">Export dataset</span>
                <Label htmlFor="directory">Output directory</Label>
                <div className="flex items-center space-x-2">
                    <Button
                        className="justify-start"
                        variant="outline"
                        onClick={handleDirectorySelect}
                    >
                        <span>Select Directory</span>
                    </Button>
                    <Input
                        type="text"
                        disabled={!directory}
                        value={directory}
                        onChange={e => setDirectory(e.target.value)}
                    />
                </div>
                <Button
                    className="flex-1"
                    onClick={() => handleExport()}
                    disabled={!directory || !dataset || dataset.data.list.length === 0 || isExporting}
                >
                    {isExporting ? (
                        <div className="flex flex-row space-x-2">
                            <LoadingSpinner />
                            <span className="text-zinc-50">Exporting</span>
                        </div>
                    ) : (
                        <span className="text-zinc-50">Export</span>
                    )}
                </Button>
            </div>
        </div>
    )
}