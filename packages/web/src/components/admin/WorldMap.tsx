import { CountrySummary } from '@dosfilos/domain';
import { Card } from '@/components/ui/card';
import { ComposableMap, Geographies, Geography } from 'react-simple-maps';
import { scaleLinear } from 'd3-scale';
import { Globe } from 'lucide-react';

interface Props {
    countries: CountrySummary[];
}

// GeoJSON topology URL for world map
const geoUrl = 'https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json';

/**
 * World Map Component
 * 
 * Displays an interactive world map colored by landing visits
 * Uses react-simple-maps for SVG-based rendering
 */
export function WorldMap({ countries }: Props) {
    // Create a map of country code to visit count
    const countryDataMap = new Map(
        countries.map((c) => [c.countryCode, c.landingVisits])
    );

    // Find max visits for color scaling
    const maxVisits = Math.max(...countries.map((c) => c.landingVisits), 1);

    // Read brand primary HSL at runtime so the map heat follows the active color
    // theme (blue/purple/green/orange) instead of being locked to a sky palette.
    const primaryHsl = typeof window !== 'undefined'
        ? getComputedStyle(document.documentElement).getPropertyValue('--primary').trim()
        : '244 76% 59%';
    const primaryDark = `hsl(${primaryHsl})`;
    const primaryFaint = `hsl(${primaryHsl} / 0.15)`;
    const mutedFill = typeof window !== 'undefined'
        ? `hsl(${getComputedStyle(document.documentElement).getPropertyValue('--muted').trim()})`
        : 'hsl(210 40% 96%)';
    const borderColor = typeof window !== 'undefined'
        ? `hsl(${getComputedStyle(document.documentElement).getPropertyValue('--border').trim()})`
        : 'hsl(214 32% 91%)';

    const colorScale = scaleLinear<string>()
        .domain([0, maxVisits])
        .range([primaryFaint, primaryDark]);

    return (
        <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
                <Globe className="h-5 w-5 text-muted-foreground" />
                <h3 className="text-lg font-semibold">Distribución Global</h3>
            </div>

            <div className="relative w-full" style={{ paddingBottom: '50%' }}>
                <div className="absolute inset-0">
                    <ComposableMap
                        projectionConfig={{ scale: 147 }}
                        style={{ width: '100%', height: '100%' }}
                    >
                        <Geographies geography={geoUrl}>
                            {({ geographies }) =>
                                geographies.map((geo) => {
                                    const countryCode = geo.properties.ISO_A2;
                                    const visits = countryDataMap.get(countryCode) || 0;
                                    const fillColor = visits > 0 ? colorScale(visits) : mutedFill;

                                    return (
                                        <Geography
                                            key={geo.rsmKey}
                                            geography={geo}
                                            fill={fillColor}
                                            stroke={borderColor}
                                            strokeWidth={0.5}
                                            style={{
                                                default: { outline: 'none' },
                                                hover: {
                                                    fill: primaryDark,
                                                    outline: 'none',
                                                    cursor: 'pointer',
                                                },
                                                pressed: { outline: 'none' },
                                            }}
                                        />
                                    );
                                })
                            }
                        </Geographies>
                    </ComposableMap>
                </div>
            </div>

            <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <span>Menos visitas</span>
                <div className="flex gap-1">
                    {[0, 0.25, 0.5, 0.75, 1].map((value) => (
                        <div
                            key={value}
                            className="w-8 h-4 rounded"
                            style={{ backgroundColor: colorScale(maxVisits * value) }}
                        />
                    ))}
                </div>
                <span>Más visitas</span>
            </div>
        </Card>
    );
}
