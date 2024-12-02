import { useState, useEffect } from "react";

import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { cn } from "@/lib/utils";
import { Dataset } from "@/lib/types";

export default function PreviewPage() {
    const [dataset, setDataset] = useState<Dataset | undefined>(undefined);

    const getDataset = async () => {
        try {
            const response = await window.ipcRenderer.invoke("getDataset");

            if (response) {
                const temp: Dataset = {
                    name: response.name,
                    data: response.data 
                };

                if (temp.data.list.length > 0) {
                    setDataset(temp);
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
                            {dataset.data.list.map((item, index) => (
                                <TableRow key={index}>
                                    <TableCell>{item[0]}</TableCell>
                                    <TableCell>{item[1]}</TableCell>
                                    <TableCell>{item[2]}</TableCell>
                                    <TableCell>{item[3]}</TableCell>
                                    <TableCell>{item[4]}</TableCell>
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