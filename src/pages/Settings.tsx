import { useState, useEffect } from "react";

import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";

import { Form, FormField, FormLabel, FormControl, FormDescription, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/spinner";

import { cn } from "@/lib/utils";

const formSchema = z.object({
    key: z.string({
        required_error: "API Key is required"
    }).min(1, "API Key must match the Bybit key format"),
    secret: z.string({
        required_error: "API Secret is required"
    }).min(1, "API Key must match the Bybit key format"),
});

export default function SettingsPage() {
    const [isConfigSetting, setIsConfigSetting] = useState<boolean>(false);

    const form = useForm({
        resolver: zodResolver(formSchema),
        defaultValues: {
            key: "",
            secret: "",
        },
    });

    const getAPIConfig = async () => {
        const response = await window.ipcRenderer.invoke("getAPIConfig");
        if (response) { 
            form.register("key", response.apiKey);
            form.register("secret", response.apiSecret);
        }
    };

    const setAPIConfig = async (data: z.infer<typeof formSchema>) => {
        setIsConfigSetting(true);

        try {
            const response = await window.ipcRenderer.invoke("setAPIConfig", data);

            if (response) {
                setIsConfigSetting(false);
            }
        } catch (error) {
            console.log(error);
        }
    }

    useEffect(() => {
        getAPIConfig();
    }, []);

    return (
        <div className="w-full h-full flex flex-col space-y-4">
            <span className="text-2xl text-zinc-900 font-bold">Settings</span>
            <span className="text-md text-zinc-500">This application utilizes the Bybit API to fetch cryptocurrency data, therefore it requires your API credentials in order to access their servers. </span>
            <Form {...form}>
                <form
                    className="w-full flex flex-col space-y-4"
                    onSubmit={form.handleSubmit(setAPIConfig)}
                >
                    <FormField
                        control={form.control}
                        name="key"
                        render={({ field }) => (
                            <FormItem className="w-full">
                                <FormLabel>Bybit API Key</FormLabel>
                                <FormControl>
                                    <Input 
                                        placeholder="Enter API Key" 
                                        defaultValue={field.value} 
                                        {...field} 
                                    />
                                </FormControl>
                                <FormDescription>This API key will not be sent to our servers and will only be saved locally</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="secret"
                        render={({ field }) => (
                            <FormItem className="w-full">
                                <FormLabel>Bybit API Secret</FormLabel>
                                <FormControl>
                                    <Input 
                                        type="password" 
                                        placeholder="Enter API Secret" 
                                        defaultValue={field.value} 
                                        {...field} 
                                    />
                                </FormControl>
                                <FormDescription>Same goes with this</FormDescription>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                    <Button
                        className="w-full"
                        type="submit"
                        disabled={isConfigSetting}
                    >
                        {isConfigSetting ? (
                            <div className="flex flex-row space-x-2">
                                <LoadingSpinner />
                                <span className="text-zinc-50">Saving Config</span>
                            </div>
                        ) : (
                            <span className="text-zinc-50">Save Config</span>
                        )}
                    </Button>
                </form>
            </Form>
        </div>
    )
}