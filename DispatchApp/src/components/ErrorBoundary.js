import React from 'react';
import { View, Text, ScrollView, SafeAreaView } from 'react-native';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <SafeAreaView style={{ flex: 1, backgroundColor: '#990000', padding: 20 }}>
          <ScrollView>
            <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
              Fatal Crash Caught
            </Text>
            <Text style={{ color: 'white', fontSize: 16, marginBottom: 10 }}>
              {this.state.error && this.state.error.toString()}
            </Text>
            <Text style={{ color: '#ffaaaa', fontSize: 12, fontFamily: 'monospace' }}>
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </Text>
          </ScrollView>
        </SafeAreaView>
      );
    }
    return this.props.children;
  }
}
