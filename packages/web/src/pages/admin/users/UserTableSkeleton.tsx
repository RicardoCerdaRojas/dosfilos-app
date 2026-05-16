import { TableCell, TableRow } from '@/components/ui/table';

/**
 * Skeleton row used while the users query is hydrating. Matches the live table's
 * 6 columns (checkbox + identity + activity + engagement + last-login + actions).
 */
export function UserTableSkeletonRow() {
    return (
        <TableRow>
            <TableCell><div className="h-4 w-4 bg-muted rounded animate-pulse" /></TableCell>
            <TableCell>
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
                    <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                            <div className="h-4 w-32 bg-muted rounded animate-pulse" />
                            <div className="h-4 w-12 bg-muted/70 rounded-full animate-pulse" />
                            <div className="h-4 w-14 bg-muted/70 rounded animate-pulse" />
                        </div>
                        <div className="h-3 w-44 bg-muted/60 rounded animate-pulse" />
                    </div>
                </div>
            </TableCell>
            <TableCell>
                <div className="space-y-1">
                    <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                    <div className="h-3 w-28 bg-muted/60 rounded animate-pulse" />
                </div>
            </TableCell>
            <TableCell><div className="h-5 w-16 bg-muted rounded-full animate-pulse" /></TableCell>
            <TableCell><div className="h-4 w-24 bg-muted rounded animate-pulse" /></TableCell>
            <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                    <div className="h-8 w-16 bg-muted rounded animate-pulse" />
                    <div className="h-8 w-8 bg-muted rounded animate-pulse" />
                </div>
            </TableCell>
        </TableRow>
    );
}

interface SkeletonStatProps {
    count?: number;
}

export function UserStatsSkeleton({ count = 6 }: SkeletonStatProps) {
    return (
        <div className="bg-card border rounded-lg overflow-hidden mb-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-y sm:divide-y-0 sm:divide-x divide-border">
                {Array.from({ length: count }).map((_, i) => (
                    <div key={i} className="px-4 py-3 space-y-1">
                        <div className="h-3 w-16 bg-muted/60 rounded animate-pulse" />
                        <div className="h-7 w-20 bg-muted rounded animate-pulse" />
                    </div>
                ))}
            </div>
        </div>
    );
}
