import * as React from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number;
  onChange: (value: number) => void;
}

export const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, className, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState("");
    const [isFocused, setIsFocused] = React.useState(false);

    // Format number to Brazilian currency display (without R$ symbol)
    const formatCurrency = (num: number): string => {
      return num.toLocaleString('pt-BR', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    };

    // Parse Brazilian formatted string to number
    const parseValue = (str: string): number => {
      if (!str || str === "" || str === "-") return 0;
      // Replace dots (thousands separator) and convert comma to dot (decimal separator)
      const normalized = str.replace(/\./g, '').replace(',', '.');
      const parsed = parseFloat(normalized);
      return isNaN(parsed) ? 0 : parsed;
    };

    // Initialize display value from prop
    React.useEffect(() => {
      if (!isFocused) {
        setDisplayValue(formatCurrency(value));
      }
    }, [value, isFocused]);

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      // Show formatted value for editing so user can see thousands separators
      if (value === 0) {
        setDisplayValue("");
      } else {
        setDisplayValue(formatCurrency(value));
      }
      // Select all text for easy replacement
      setTimeout(() => e.target.select(), 0);
      props.onFocus?.(e);
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      const parsedValue = parseValue(displayValue);
      onChange(parsedValue);
      setDisplayValue(formatCurrency(parsedValue));
      props.onBlur?.(e);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value;
      
      // Allow digits, dots (thousands), commas (decimal), and minus sign
      // Remove any character that isn't a digit, dot, comma, or minus
      const cleaned = inputValue.replace(/[^\d.,-]/g, '');
      
      setDisplayValue(cleaned);
      // Update parent with parsed value on each change
      const parsedValue = parseValue(cleaned);
      onChange(parsedValue);
    };

    return (
      <Input
        ref={ref}
        type="text"
        inputMode="decimal"
        value={displayValue}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        className={cn(className)}
        {...props}
      />
    );
  }
);

CurrencyInput.displayName = "CurrencyInput";
