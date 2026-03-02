import React from 'react'

interface NumericInputProps {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  decimalPlaces?: number | null // if number, format on blur
  allowComma?: boolean
  min?: number
  max?: number
  onValidate?: (valid: boolean, numberValue: number | null, raw: string) => void
  formatCurrency?: boolean
  currency?: string
  locale?: string
}

export default function NumericInput({
  id,
  value,
  onChange,
  placeholder,
  className,
  decimalPlaces = null,
  allowComma = true,
  min,
  max,
  onValidate,
  formatCurrency = false,
  currency = 'BRL',
  locale = 'pt-BR'
}: NumericInputProps) {
  const [isFocused, setIsFocused] = React.useState(false)
  const [displayValue, setDisplayValue] = React.useState<string>(value || '')

  // helper: format a numeric string (dot decimal) to currency string
  const formatToCurrency = (raw: string) => {
    if (raw === '') return ''
    const n = Number(raw)
    if (Number.isNaN(n)) return ''
    try {
      return new Intl.NumberFormat(locale, { style: 'currency', currency }).format(n)
    } catch {
      return n.toFixed(decimalPlaces ?? 2)
    }
  }

  // when prop value changes (external), update display accordingly
  React.useEffect(() => {
    if (formatCurrency && !isFocused) {
      setDisplayValue(value ? formatToCurrency(value) : '')
    } else {
      setDisplayValue(value ?? '')
    }
  }, [value, formatCurrency, isFocused])
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let v = e.target.value
    if (formatCurrency) {
      // while typing in currency mode, accept anything and normalize
      // normalize commas to dots
      if (allowComma) v = v.replace(/,/g, '.')
      // remove currency symbol and non-digit/./- chars
      const cleaned = v.replace(new RegExp(`[^0-9\\.-]`, 'g'), '')
      // allow empty
      if (cleaned === '') {
        onChange('')
        setDisplayValue('')
        return
      }
      // ensure valid numeric pattern
      if (/^-?\d*\.?\d*$/.test(cleaned)) {
        onChange(cleaned)
        // update display while typing (unformatted) when focused
        setDisplayValue(cleaned)
      }
      return
    }

    if (allowComma) v = v.replace(/,/g, '.')

    // allow empty
    if (v === '') {
      onChange('')
      setDisplayValue('')
      return
    }

    // allow only numbers with optional single dot and optional leading -
    if (/^-?\d*\.?\d*$/.test(v)) {
      onChange(v)
      setDisplayValue(v)
    }
  }

  const handleBlur = () => {
    setIsFocused(false)
    // when using currency formatting, show formatted currency on blur
    if (formatCurrency) {
      if (displayValue === '') {
        if (typeof onValidate === 'function') onValidate(false, null, '')
        return
      }
      const n = Number(displayValue)
      if (!Number.isNaN(n)) {
        const formatted = formatToCurrency(String(n))
        setDisplayValue(formatted)
        if (typeof onValidate === 'function') onValidate(true, n, String(displayValue))
      } else {
        if (typeof onValidate === 'function') onValidate(false, null, String(displayValue))
      }
      return
    }

    if (value === '') return
    if (decimalPlaces !== null) {
      const n = Number(value)
      if (!Number.isNaN(n)) {
        onChange(n.toFixed(decimalPlaces))
        if (typeof onValidate === 'function') onValidate(true, n, String(value))
      } else {
        if (typeof onValidate === 'function') onValidate(false, null, String(value))
      }
    } else {
      // enforce min/max if provided
      let n = Number(value)
      if (!Number.isNaN(n)) {
        if (typeof min === 'number' && n < min) n = min
        if (typeof max === 'number' && n > max) n = max
        // keep original formatting (no fixed decimals)
        onChange(String(n))
        if (typeof onValidate === 'function') onValidate(true, n, String(value))
      } else {
        if (typeof onValidate === 'function') onValidate(false, null, String(value))
      }
    }
  }

  return (
    <input
      id={id}
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={() => {
        setIsFocused(true)
        // when focusing, show raw numeric value (without currency mask)
        if (formatCurrency) {
          // try to parse displayValue (which might be formatted) into raw
          const raw = String(value || '')
          setDisplayValue(raw)
        }
      }}
      placeholder={placeholder}
      className={className}
      aria-valuemin={min}
      aria-valuemax={max}
    />
  )
}
