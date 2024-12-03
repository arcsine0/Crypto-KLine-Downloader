import { useState, useEffect } from "react";

import { cn } from "@/lib/utils.ts";

import { useSidebar, Sidebar, SidebarContent, SidebarGroup, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarFooter } from "./components/ui/sidebar";
import { Progress } from "@/components/ui/progress.tsx";
import { House, ChartNoAxesColumn, FileDown, Settings } from "lucide-react";

import { ProgressProps } from "./lib/types.ts";

import HomePage from "./pages/Home.tsx";
import IndicatorsPage from "./pages/Indicators.tsx";
import PreviewPage from "./pages/Preview.tsx";
import SettingsPage from "./pages/Settings.tsx";
import { set } from "date-fns";

function App() {
    const [activeIndex, setActiveIndex] = useState<number>(0);

    const [progressCount, setProgressCount] = useState<number>(0);
    const [progressState, setProgressState] = useState<string>("Doing something...");
    const [showProgressBar, setShowProgressBar] = useState<boolean>(false);

    const { setOpen } = useSidebar();

    const pages = [
        {
            title: "Home",
            icon: House,
        },
        {
            title: "Indicators",
            icon: ChartNoAxesColumn,
        },
        {
            title: "Preview",
            icon: FileDown,
        },
    ];

    const renderPages = () => {
        switch (activeIndex) {
            case -1:
                return <SettingsPage />
            case 0:
                return <HomePage />
            case 1:
                return <IndicatorsPage />
            case 2:
                return <PreviewPage />
            default:
                return <HomePage />
        }
    }

    window.ipcRenderer.on("progress", (event, data: ProgressProps) => {
        if (data.status === "ongoing") {
            setShowProgressBar(true);
        } else {
            setShowProgressBar(false);
            setProgressCount(0);
            setProgressState("Doing something...");
        }

        setProgressCount(data.progress);
        setProgressState(data.state);
    });

    return (
        <div className="w-screen h-screen flex flex-row">
            <Sidebar
                collapsible="icon"
                onMouseEnter={() => setOpen(true)}
                onMouseLeave={() => setOpen(false)}
            >
                <SidebarContent>
                    <SidebarGroup>
                        <SidebarMenu>
                            {pages.map((page, index) => (
                                <SidebarMenuItem
                                    key={index}
                                >
                                    <SidebarMenuButton
                                        className={cn([
                                            activeIndex === index ? "bg-zinc-900" : "bg-zinc-50",
                                            activeIndex === index ? "hover:bg-zinc-700" : "hover:bg-zinc-200",
                                            activeIndex === index ? "active:bg-zinc-600" : "active:bg-zinc-300"
                                        ])}
                                        onClick={() => setActiveIndex(index)}
                                    >
                                        <page.icon
                                            color={activeIndex === index ? "#fafafa" : "#18181b"}
                                            size={50}
                                        />
                                        <span
                                            className={cn([
                                                activeIndex === index ? "text-zinc-50" : "text-zinc-900"
                                            ])}
                                        >
                                            {page.title}
                                        </span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ))}
                        </SidebarMenu>
                    </SidebarGroup>

                </SidebarContent>
                <SidebarFooter>
                    <SidebarMenu>
                        <SidebarMenuItem>
                            <SidebarMenuButton
                                className={cn([
                                    activeIndex === -1 ? "bg-zinc-900" : "bg-zinc-50",
                                    activeIndex === -1 ? "hover:bg-zinc-700" : "hover:bg-zinc-200",
                                    activeIndex === -1 ? "active:bg-zinc-600" : "active:bg-zinc-300"
                                ])}
                                onClick={() => setActiveIndex(-1)}
                            >
                                <Settings
                                    color={activeIndex === -1 ? "#fafafa" : "#18181b"}
                                    size={50}
                                />
                                <span
                                    className={cn([
                                        activeIndex === -1 ? "text-zinc-50" : "text-zinc-900"
                                    ])}
                                >
                                    Settings
                                </span>
                            </SidebarMenuButton>
                        </SidebarMenuItem>
                    </SidebarMenu>
                </SidebarFooter>
            </Sidebar>
            <div className="w-full h-full flex flex-col justify-between space-y-2">
                <div className="w-full flex-1 p-8">
                    {renderPages()}
                </div>
                <div className={cn([
                    showProgressBar ? "visible" : "invisible",
                    "w-full flex flex-col space-y-1"
                ])}>
                    <span className="text-sm text-zinc-500 pl-2">{progressState}</span>
                    <Progress value={progressCount} />
                </div>
            </div>
        </div>
    )
}

export default App
