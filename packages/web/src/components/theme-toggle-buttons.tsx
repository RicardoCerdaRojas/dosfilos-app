import { Moon, Sun, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/components/theme-provider'
import { cn } from '@/lib/utils'

export function ThemeToggleButtons() {
  const { theme, setTheme } = useTheme()

  return (
    <div className="flex items-center gap-1 border rounded-md p-1">
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-7 w-7",
          theme === 'light' && "bg-accent"
        )}
        onClick={() => setTheme('light')}
        title="Modo Claro"
      >
        <Sun className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-7 w-7",
          theme === 'dark' && "bg-accent"
        )}
        onClick={() => setTheme('dark')}
        title="Modo Oscuro"
      >
        <Moon className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={cn(
          "h-7 w-7",
          theme === 'system' && "bg-accent"
        )}
        onClick={() => setTheme('system')}
        title="Tema del Sistema"
      >
        <Monitor className="h-4 w-4" />
      </Button>
    </div>
  )
}
