import * as React from "react"
import { Maximize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

export interface ExpandableTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
}

const ExpandableTextarea = React.forwardRef<HTMLTextAreaElement, ExpandableTextareaProps>(
  ({ className, label, value, onChange, ...props }, ref) => {
    const [isOpen, setIsOpen] = React.useState(false)
    const [tempValue, setTempValue] = React.useState(value)

    // Sync tempValue when value changes externally or when dialog opens
    React.useEffect(() => {
      setTempValue(value)
    }, [value, isOpen])

    const handleSave = () => {
      if (onChange) {
        const event = {
          target: { value: tempValue },
        } as React.ChangeEvent<HTMLTextAreaElement>
        onChange(event)
      }
      setIsOpen(false)
    }

    return (
      <div className="relative group">
        <Textarea
          value={value}
          onChange={onChange}
          className={cn("pr-10 min-h-[80px] resize-y", className)}
          ref={ref}
          {...props}
        />
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-2 right-2 h-6 w-6 text-muted-foreground hover:text-foreground opacity-50 group-hover:opacity-100 transition-opacity"
              title="Expandir editor"
            >
              <Maximize2 className="h-3.5 w-3.5" />
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>{label || "Editor de Texto"}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 py-4">
              <Textarea
                value={tempValue}
                onChange={(e) => setTempValue(e.target.value)}
                className="h-full resize-none font-mono text-base p-4"
                placeholder={props.placeholder}
              />
            </div>
            <DialogFooter className="flex justify-between items-center">
              <div className="text-xs text-muted-foreground">
                {String(tempValue || '').length} caracteres
              </div>
              <div className="flex gap-2">
                <DialogClose asChild>
                  <Button variant="outline">Cancelar</Button>
                </DialogClose>
                <Button onClick={handleSave}>Guardar Cambios</Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }
)
ExpandableTextarea.displayName = "ExpandableTextarea"

export { ExpandableTextarea }
