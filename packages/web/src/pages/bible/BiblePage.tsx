import React, { useState } from 'react';
import { BibleProvider, useBible } from '@/context/BibleContext';
import { NavigationDrawer } from './components/NavigationDrawer';
import { Button } from '@/components/ui/button';
import { ChevronDown, Search, Columns2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { BibleVersionFactory } from '@/data/repositories/bible/BibleVersionFactory';

import { SearchSidebar } from './components/SearchSidebar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { VersionSelector } from './components/VersionSelector';
import { QuickVerseFinder } from './components/QuickVerseFinder';
import { BibleReader } from './components/BibleReader';

const BibleLayout = () => {
    const [navigationOpen, setNavigationOpen] = useState(false);
    const [searchOpen, setSearchOpen] = useState(false);

    const {
        isParallelMode,
        toggleParallelMode,
        versionId,
        secondaryVersionId,
        setSecondaryVersion,
        increaseFontSize,
        decreaseFontSize,
        bookName,
        chapter
    } = useBible();

    const allVersions = BibleVersionFactory.getAllVersions();
    const secondaryOptions = allVersions.filter((v) => v.id !== versionId);
    const effectiveSecondary = secondaryVersionId ?? secondaryOptions[0]?.id ?? '';

    const toggleSearchSidebar = () => {
        setSearchOpen(!searchOpen);
        if (!searchOpen) setNavigationOpen(false);
    };

    return (
        <div className="flex flex-col h-full w-full overflow-hidden">
            <header className="h-14 border-b flex items-center px-4 justify-between bg-white shrink-0 z-40">
                <div className="flex items-center gap-2">
                    <Button
                        variant="ghost"
                        className="text-lg font-semibold text-slate-800 hover:bg-slate-100 px-2 h-auto py-1"
                        onClick={() => setNavigationOpen(true)}
                    >
                        <span className="mr-1 font-serif text-xl">{bookName} {chapter}</span>
                        <ChevronDown className="h-4 w-4 text-slate-400" />
                    </Button>
                </div>

                <div className="flex items-center gap-1">
                    <QuickVerseFinder className="mr-2 hidden md:flex" />

                    {/* Font size — visible cluster (was hidden in popover) */}
                    <div className="hidden sm:flex items-center border rounded-md bg-slate-50">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={decreaseFontSize}
                            className="h-8 w-8 text-slate-500"
                            title="Reducir tamaño"
                        >
                            <span className="text-xs">A-</span>
                        </Button>
                        <div className="w-px h-4 bg-slate-200" />
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={increaseFontSize}
                            className="h-8 w-8 text-slate-500"
                            title="Aumentar tamaño"
                        >
                            <span className="text-sm">A+</span>
                        </Button>
                    </div>

                    <div className="h-4 w-px bg-slate-200 mx-2" />

                    {/* Version cluster — order mirrors the column layout
                        below: primary on the LEFT (it owns the left
                        column), then split toggle, then secondary on
                        the RIGHT (matches the right column). Reading
                        the bar left-to-right matches the screen. */}
                    <VersionSelector />

                    <Button
                        variant={isParallelMode ? 'secondary' : 'ghost'}
                        size="icon"
                        onClick={toggleParallelMode}
                        title={isParallelMode ? 'Desactivar modo paralelo' : 'Activar modo paralelo'}
                        className="mx-1"
                    >
                        <Columns2 className="h-5 w-5 text-slate-500" />
                    </Button>

                    {isParallelMode && (
                        <Select
                            value={effectiveSecondary}
                            onValueChange={(v) => setSecondaryVersion(v)}
                        >
                            <SelectTrigger className="h-8 w-auto border-none shadow-none focus:ring-0 gap-1 px-2 font-medium text-slate-600 hover:text-slate-900 text-xs">
                                <SelectValue placeholder="Versión paralela" />
                            </SelectTrigger>
                            <SelectContent>
                                {secondaryOptions.map((v) => (
                                    <SelectItem key={v.id} value={v.id}>
                                        {v.id} — {v.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    )}

                    <div className="h-4 w-px bg-slate-200 mx-2" />

                    <Button
                        variant={searchOpen ? "secondary" : "ghost"}
                        size="icon"
                        onClick={toggleSearchSidebar}
                        title="Buscar"
                    >
                        <Search className="h-5 w-5 text-slate-500" />
                    </Button>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden relative">
                {/* Navigation Overlay */}
                {navigationOpen && (
                    <>
                        <div
                            className="fixed inset-0 top-14 bg-black/20 z-40 backdrop-blur-sm transition-opacity"
                            onClick={() => setNavigationOpen(false)}
                        />
                        <NavigationDrawer
                            className="fixed left-0 top-14 bottom-0 w-80 z-50 transition-transform duration-300 animate-in slide-in-from-left shadow-2xl border-r"
                            onClose={() => setNavigationOpen(false)}
                        />
                    </>
                )}

                <main className="flex-1 bg-white overflow-hidden relative flex">
                    <div className={cn("flex-1 h-full border-r", isParallelMode ? "w-1/2" : "w-full")}>
                         <BibleReader className="h-full w-full" />
                    </div>
                    {isParallelMode && (
                        <div className="flex-1 h-full w-1/2 bg-slate-50">
                            <div className="h-10 border-b flex items-center px-4 bg-slate-100">
                                <span className="text-xs font-semibold text-slate-500 uppercase">
                                    {secondaryVersionId}
                                </span>
                            </div>
                            <BibleReader
                                className="h-[calc(100%-2.5rem)] w-full"
                                versionId={secondaryVersionId || 'ASV'}
                            />
                        </div>
                    )}

                    {searchOpen && (
                        <SearchSidebar
                            className="w-96 border-l shrink-0 shadow-2xl z-20 absolute right-0 top-0 bottom-0 bg-white"
                            onClose={() => setSearchOpen(false)}
                        />
                    )}
                </main>
            </div>
        </div>
    );
};

export const BiblePage: React.FC = () => {
    return (
        <BibleProvider>
            <BibleLayout />
        </BibleProvider>
    );
};
