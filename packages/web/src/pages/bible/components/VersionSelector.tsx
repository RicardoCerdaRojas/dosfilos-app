import React from 'react';
import { useBible } from '@/context/BibleContext';
import { BibleVersionFactory } from '@/data/repositories/bible/BibleVersionFactory';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const VersionSelector: React.FC = () => {
    const { versionId, setVersion } = useBible();
    const versions = BibleVersionFactory.getAllVersions();

    return (
        <Select value={versionId} onValueChange={setVersion}>
            <SelectTrigger className="w-auto border-none shadow-none focus:ring-0 gap-1 px-2 font-medium text-slate-600 hover:text-slate-900 h-9">
                <SelectValue placeholder="Versión" />
            </SelectTrigger>
            <SelectContent>
                {versions.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                        {v.id} - {v.name}
                    </SelectItem>
                ))}
            </SelectContent>
        </Select>
    );
};
