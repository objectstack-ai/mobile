import React from "react";
import { TextInput, View, type TextInputProps } from "react-native";
import { cn } from "~/lib/utils";

export interface InputProps extends TextInputProps {
  className?: string;
  containerClassName?: string;
}

export const Input = React.forwardRef<TextInput, InputProps>(
  ({ className, containerClassName, ...props }, ref) => {
    const [isFocused, setIsFocused] = React.useState(false);

    return (
      <View
        className={cn(
          "rounded-xl border border-input bg-background px-4",
          isFocused && "border-ring ring-1 ring-ring",
          containerClassName
        )}
      >
        <TextInput
          ref={ref}
          className={cn(
            "h-12 text-base text-foreground placeholder:text-muted-foreground",
            className
          )}
          placeholderTextColor="#94a3b8"
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          {...props}
        />
      </View>
    );
  }
);

Input.displayName = "Input";
