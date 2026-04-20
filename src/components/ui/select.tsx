'use client'

import * as React from 'react'
import { Check, ChevronDown } from 'lucide-react'

import { Button } from './button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from './command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './popover'

const Select = React.forwardRef(
  ({ children, placeholder, className, ...props }, ref) => {
    const [open, setOpen] = React.useState(false)

    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[200px] justify-between"
            {...props}
          >
            {children}
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0">
          <Command>
            <CommandInput placeholder={placeholder} />
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>{children}</CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    )
  }
)
Select.displayName = 'Select'

const SelectTrigger = Button
const SelectValue = React.forwardRef(({ children, ...props }, ref) => (
  <span ref={ref} {...props}>{children}</span>
))

const SelectContent = PopoverContent
const SelectItem = React.forwardRef(({ children, className, ...props }, ref) => (
  <CommandItem className={className} {...props} ref={ref}>
    <Check className="mr-2 h-4 w-4 [&[data-selected=true]]:opacity-100" />
    {children}
  </CommandItem>
))

const SelectGroup = CommandGroup

export { Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectItem }

