import React from "react";
import { Text, View } from "react-native";
import { Button } from "~/components/ui/Button";
import i18n from "~/lib/i18n";

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View className="flex-1 items-center justify-center gap-4 px-6">
          <Text className="text-xl font-semibold text-foreground">
            {i18n.t("errorBoundary.title")}
          </Text>
          <Text className="text-center text-sm text-muted-foreground">
            {this.state.error?.message ?? i18n.t("errorBoundary.message")}
          </Text>
          <Button onPress={this.handleRetry}>{i18n.t("errorBoundary.retry")}</Button>
        </View>
      );
    }

    return this.props.children;
  }
}
