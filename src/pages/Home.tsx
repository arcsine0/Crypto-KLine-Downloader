import { useState, useEffect } from "react";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";

import { Form, FormField, FormLabel, FormControl, FormDescription, FormItem, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/spinner";

import { CalendarIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { categories, pairs, intervals } from "@/lib/arrays";

const formSchema = z.object({
    category: z.string({
        required_error: "Category is required"
    }),
    symbol: z.string({
        required_error: "Cryptocurrency pair is required"
    }),
    interval: z.string({
        required_error: "Interval is required"
    }),
    limit: z
        .number({
            required_error: "Limit number required"
        })
        .min(100, "Minimum limit is 100")
        .max(1000, "Maximum limit is 1000")
    ,
    start: z.date({
        required_error: "Start date is required"
    }),
    end: z.date().optional()
});

export default function HomePage() {
    const [APIConfig, setAPIConfig] = useState<{
        apiKey: string | undefined;
        apiSecret: string | undefined;
    } | undefined>(undefined);

    const [isFetching, setIsFetching] = useState<boolean>(false);

    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            category: "linear",
            symbol: "BTCUSDT",
            interval: "60",
            limit: 200,
            start: new Date("2013-01-01"),
            end: undefined,
        }
    });

    const fetchData = async (data: z.infer<typeof formSchema>) => {
        setIsFetching(true);

        const processedData = {
            ...data,
            start: data.start ? data.start.getTime() : new Date("2013-01-01").getTime(),
            end: data.end ? data.end.getTime() : new Date().getTime()
        };

        try {
            const response = await window.ipcRenderer.invoke("fetchData", processedData);

            if (response) {
                setIsFetching(false);
            }
        } catch (error) {
            console.log(error);
        }
    }

    const checkAPIConfig = async () => {
        const response = await window.ipcRenderer.invoke("getAPIConfig");
        if (response) {
            setAPIConfig({
                apiKey: response.apiKey,
                apiSecret: response.apiSecret,
            })
        }
    };

    useEffect(() => {
        checkAPIConfig();
    }, [])

    return (
        <div className="w-full h-full flex flex-col space-y-2">
            <span className="text-2xl text-zinc-900 font-bold">Crypocurrency Data Fetcher</span>
            <Form {...form}>
                <form
                    className="w-full flex flex-col space-y-4"
                    onSubmit={form.handleSubmit(fetchData)}
                >
                    <div className="w-full flex flex-row space-x-2">
                        <FormField
                            control={form.control}
                            name="category"
                            render={({ field }) => (
                                <FormItem className="w-full">
                                    <FormLabel>Category</FormLabel>
                                    <Select 
                                        onValueChange={field.onChange} 
                                        defaultValue={field.value}
                                        {...field}
                                    >
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select category">
                                                    {field.value}
                                                </SelectValue>
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {categories.map((category, index) => (
                                                <SelectItem key={index} value={category.value}>{category.title}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>Select the type of market data</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="symbol"
                            render={({ field }) => (
                                <FormItem className="w-full">
                                    <FormLabel>Cryptocurrency Pair</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select pair">
                                                    {field.value}
                                                </SelectValue>
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {pairs.map((pair, index) => (
                                                <SelectItem key={index} value={pair.value}>{pair.title}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>Select the currency pair</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <div className="w-full flex flex-row space-x-2">
                        <FormField
                            control={form.control}
                            name="interval"
                            render={({ field }) => (
                                <FormItem className="w-full">
                                    <FormLabel>Interval</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <SelectTrigger>
                                                <SelectValue placeholder="Select category">
                                                    {field.value}
                                                </SelectValue>
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {intervals.map((interval, index) => (
                                                <SelectItem key={index} value={interval.value}>{interval.title}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormDescription>Select the type of market data</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="limit"
                            render={({ field }) => (
                                <FormItem className="w-full">
                                    <FormLabel>Limit</FormLabel>
                                    <FormControl>
                                        <Input
                                            type="number"
                                            placeholder="200"
                                            min={100}
                                            max={1000}
                                            step={100}
                                            {...field}
                                            defaultValue={field.value}
                                        />
                                    </FormControl>
                                    <FormDescription>Input the number limit of data</FormDescription>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <div className="w-full flex flex-row space-x-2">
                        <FormField
                            control={form.control}
                            name="start"
                            render={({ field }) => (
                                <FormItem className="w-full flex flex-col space-y-2">
                                    <FormLabel>Start Date</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "flex flex-row space-x-2 text-left",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    <CalendarIcon className="opacity-50" />
                                                    {field.value ? (
                                                        format(field.value, "PPP")
                                                    ) : (
                                                        <span>Pick a date</span>
                                                    )}
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={field.onChange}
                                                disabled={(date) =>
                                                    date > new Date() || date < new Date("2013-01-01")
                                                }
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="end"
                            render={({ field }) => (
                                <FormItem className="w-full flex flex-col space-y-2">
                                    <FormLabel>End Date</FormLabel>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    variant={"outline"}
                                                    className={cn(
                                                        "flex flex-row space-x-2 text-left",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    <CalendarIcon className="opacity-50" />
                                                    {field.value ? (
                                                        format(field.value, "PPP")
                                                    ) : (
                                                        <span>Pick a date</span>
                                                    )}
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={field.onChange}
                                                disabled={(date) =>
                                                    date > new Date() || date < new Date("1900-01-01")
                                                }
                                                initialFocus
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>
                    <Button
                        className="w-full"
                        type="submit"
                        disabled={isFetching || !APIConfig || !APIConfig.apiKey || !APIConfig.apiSecret}
                    >
                        {isFetching ? (
                            <div className="flex flex-row space-x-2">
                                <LoadingSpinner />
                                <span className="text-zinc-50">Fetching Data</span>
                            </div>
                        ) : (
                            <span className="text-zinc-50">Fetch Data</span>
                        )}
                    </Button>
                    {(!APIConfig || !APIConfig.apiKey || !APIConfig.apiSecret) && (
                        <span className="text-sm text-zinc-500 text-center">Must set API Config in Settings first</span>
                    )}
                </form>
            </Form>
        </div>
    )
}