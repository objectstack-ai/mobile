import React from "react";
import { TextInput, View, type TextInputProps } from "react-native";
import { cn } from "~/lib/utils";

export interface InputProps extends TextInputProps {
  className?: string;
  containerClassName?: string;
  /** Render an element on the trailing edge (e.g. a password visibility toggle). */
  rightSlot?: React.ReactNode;
  /** Render an element on the leading edge (e.g. a search icon). */
  leftSlot?: React.ReactNode;
  /** Switches the border to the destructive colour to signal a validation error. */
  error?: boolean;
}

export const Input = React.forwardRef<TextInput, InputProps>(
  (
    { className, containerClassName, rightSlot, leftSlot, error, ...props },
    ref
  ) => {
    const [isFocused, setIsFocused] = React.useState(false);

    return (
      <View
        className={cn(
          "h-12 flex-row items-center rounded-xl border border-input bg-background px-4",
          isFocused && "border-ring ring-1 ring-ring",
          error && "border-destructive",
          containerClassName
        )}
      >
        {leftSlot ? <View className="mr-2">{leftSlot}</View> : null}
        <TextInput
          ref={ref}
          className={cn(
            "h-full flex-1 text-base text-foreground placeholder:text-muted-foreground",
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
        {rightSlot ? <View className="ml-2">{rightSlot}</View> : null}
      </View>
    );
  }
);

Input.displayName = "Input";
