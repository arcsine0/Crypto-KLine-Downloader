import { useState, useEffect } from "react";

import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { cn } from "@/lib/utils";
import { Dataset } from "@/lib/types";

export default function PreviewPage() {
    const [dataset, setDataset] = useState<Dataset | undefined>(undefined);
    const previewRows = 50;

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
            <span className="text-2xl text-zinc-900 font-bold">Preview and Export</span>
            <div className="w-full flex flex-row space-x-4"> 
                <span className="text-sm text-zinc-500">Showing <span className="text-bold">{previewRows}</span> out of <span className="text-bold">{dataset?.data.list.length || 0}</span> Rows</span>
            </div>
            <div className="w-full h-1/2">
                {dataset ?
                    <Table className="w-full">
                        <TableCaption>{dataset.name}</TableCaption>
                        <TableHeader className="grow">
                            <TableRow>
                                <TableHead>Timestamp</TableHead>
                                <TableHead>Open</TableHead>
                                <TableHead>High</TableHead>
                                <TableHead>Low</TableHead>
                                <TableHead>Close</TableHead>
                                <TableHead>Volume</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody className="shrink overflow-y-scroll">
                            {dataset.data.list.slice(0, previewRows).map((item, index) => (
                                <TableRow key={index}>
                                    <TableCell>{item[0]}</TableCell>
                                    <TableCell>{item[1]}</TableCell>
                                    <TableCell>{item[2]}</TableCell>
                                    <TableCell>{item[3]}</TableCell>
                                    <TableCell>{item[4]}</TableCell>
                                    <TableCell>{item[5]}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    :
                    <span className="text-md text-zinc-500 text-center">No data fetched yet</span>
                }
            </div>
            

        </div>
    )
}