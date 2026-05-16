import { CountrySummary } from '@dosfilos/domain';
import { Card } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Globe } from 'lucide-react';

interface Props {
    countries: CountrySummary[];
    limit?: number;
}

/**
 * Country Table Component
 * 
 * Displays a table of countries with visit, registration, and login data
 * along with conversion rates
 */
export function CountryTable({ countries, limit = 10 }: Props) {
    const displayedCountries = countries.slice(0, limit);

    return (
        <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
                <Globe className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold">
                    Top {limit} Países
                </h3>
            </div>

            {displayedCountries.length === 0 ? (
                <div className="text-center py-12">
                    <Globe className="h-12 w-12 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-muted-foreground">No hay datos disponibles</p>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>País</TableHead>
                                <TableHead className="text-right">Visitas</TableHead>
                                <TableHead className="text-right">Registros</TableHead>
                                <TableHead className="text-right">Logins</TableHead>
                                <TableHead className="text-right">Conv. %</TableHead>
                                <TableHead className="text-right">Act. %</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {displayedCountries.map((country) => (
                                <TableRow key={country.countryCode}>
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <span className="text-2xl">{getFlagEmoji(country.countryCode)}</span>
                                            <span>{country.country}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {country.landingVisits.toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {country.registrations.toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        {country.logins.toLocaleString()}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <ConversionBadge value={country.conversionRate} />
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <ConversionBadge value={country.activationRate} />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </Card>
    );
}

/**
 * Conversion Badge - semantic-token percentage chip.
 */
function ConversionBadge({ value }: { value: number }) {
    const tone =
        value >= 50 ? 'bg-success-subtle text-success-subtle-foreground' :
        value >= 25 ? 'bg-warning-subtle text-warning-subtle-foreground' :
        'bg-destructive/10 text-destructive';

    return (
        <span className={`inline-block px-2 py-1 rounded-md text-xs font-medium tabular-nums ${tone}`}>
            {value.toFixed(1)}%
        </span>
    );
}

/**
 * Get flag emoji from country code (ISO 3166-1 alpha-2)
 */
function getFlagEmoji(countryCode: string): string {
    if (countryCode === 'XX' || !countryCode) return '🌍';
    
    const codePoints = countryCode
        .toUpperCase()
        .split('')
        .map((char) => 127397 + char.charCodeAt(0));
    
    return String.fromCodePoint(...codePoints);
}
