import { Moon, Sun, Palette } from 'lucide-react'
import { DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu'
import { useTheme } from '@/components/theme-provider'

export function ThemeToggleMenu() {
  const { setTheme, theme, setColorTheme, colorTheme } = useTheme()

  const colorThemes = [
    { value: 'blue' as const, label: 'Azul Celestial', color: 'bg-blue-500' },
    { value: 'purple' as const, label: 'Púrpura Pastoral', color: 'bg-purple-500' },
    { value: 'green' as const, label: 'Verde Esperanza', color: 'bg-green-500' },
    { value: 'orange' as const, label: 'Naranja Cálido', color: 'bg-orange-500' },
  ]

  return (
    <>
      <DropdownMenuItem onClick={() => setTheme('light')}>
        <Sun className="mr-2 h-4 w-4" />
        <span>Modo Claro</span>
        {theme === 'light' && <span className="ml-auto text-xs">✓</span>}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => setTheme('dark')}>
        <Moon className="mr-2 h-4 w-4" />
        <span>Modo Oscuro</span>
        {theme === 'dark' && <span className="ml-auto text-xs">✓</span>}
      </DropdownMenuItem>
      <DropdownMenuItem onClick={() => setTheme('system')}>
        <span className="mr-2 h-4 w-4">💻</span>
        <span>Sistema</span>
        {theme === 'system' && <span className="ml-auto text-xs">✓</span>}
      </DropdownMenuItem>
      
      <DropdownMenuSeparator />
      <DropdownMenuLabel className="text-xs text-muted-foreground flex items-center gap-2">
        <Palette className="h-3 w-3" />
        Color del Tema
      </DropdownMenuLabel>
      
      {colorThemes.map((ct) => (
        <DropdownMenuItem key={ct.value} onClick={() => setColorTheme(ct.value)}>
          <div className={`mr-2 h-4 w-4 rounded-full ${ct.color}`} />
          <span>{ct.label}</span>
          {colorTheme === ct.value && <span className="ml-auto text-xs">✓</span>}
        </DropdownMenuItem>
      ))}
    </>
  )
}
