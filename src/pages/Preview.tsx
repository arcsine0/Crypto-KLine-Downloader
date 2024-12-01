import { useState } from "react";

import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { cn } from "@/lib/utils";

export default function PreviewPage() {
    return (
        <div className="w-full h-screen flex flex-col space-y-2">
            <span className="text-2xl text-zinc-900 font-bold">Preview and Export</span>
            <Table>
                <TableCaption>[pair] at [interval] from [start date] to [end date]</TableCaption>
                <TableHeader>
                    <TableRow>
                        
                    </TableRow>
                </TableHeader>
            </Table>
        </div>
    )
}