"use client"; // Componentes de classe com estado e ciclo de vida devem ser Componentes do Cliente

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { Button } from './ui/button'; // CORREÇÃO: Importa o componente Button
import Router from 'next/router'; // CORREÇÃO: Importa o router do Next.js para navegação

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });

    if (process.env.NODE_ENV === 'production') {
      // Exemplo: Sentry.captureException(error, { extra: errorInfo });
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  /**
   * CORREÇÃO: Altera a navegação de 'window.location.href' (hard refresh)
   * para 'Router.push' (navegação SPA do Next.js),
   * resolvendo a violação do SoC (2.5).
   */
  handleGoHome = () => {
    Router.push('/');
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen bg-background flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            {/* --- CARD PRINCIPAL --- */}
            <div className="bg-card text-foreground border border-border py-8 px-4 shadow sm:rounded-lg sm:px-10">
              <div className="text-center">
                {/* --- ÍCONE DE ERRO --- */}
                <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-destructive/10 mb-4">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>

                {/* --- TÍTULO E MENSAGEM --- */}
                <h1 className="text-2xl font-bold text-foreground mb-2">
                  Oops! Algo deu errado
                </h1>

                <p className="text-muted-foreground mb-6">
                  Ocorreu um erro inesperado. Nossa equipe foi notificada e está trabalhando para resolver o problema.
                </p>

                {/* --- DETALHES DO ERRO (DESENVOLVIMENTO) --- */}
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <div className="mb-6 p-4 bg-destructive/10 border border-destructive/30 rounded-md text-left">
                    <h3 className="text-sm font-medium text-destructive mb-2">
                      Detalhes do erro (modo desenvolvimento):
                    </h3>
                    <pre className="text-xs text-destructive whitespace-pre-wrap overflow-auto">
                      {this.state.error.toString()}
                      {this.state.errorInfo?.componentStack}
                    </pre>
                  </div>
                )}

                {/* --- BOTÕES DE AÇÃO --- */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  {/*
                   * CORREÇÃO: Substitui classes manuais pelo <Button> padronizado.
                   * Resolve a violação dos princípios CDA (2.17) e DRY (2.2).
                   * O gradiente é tratado pelo 'variant="default"' do <Button>.
                   */}
                  <Button onClick={this.handleRetry}>
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Tentar novamente
                  </Button>

                  {/*
                   * CORREÇÃO: Substitui classes manuais pelo <Button variant="outline">.
                   */}
                  <Button variant="outline" onClick={this.handleGoHome}>
                    <Home className="w-4 h-4 mr-2" />
                    Ir para início
                  </Button>
                </div>

                {/* --- MENSAGEM DE SUPORTE --- */}
                <div className="mt-6 text-sm text-muted-foreground">
                  <p>
                    Se o problema persistir, entre em contato conosco em{' '}
                    <a
                      href="mailto:suporte@salonflow.app"
                      className="text-primary hover:brightness-110"
                    >
                      suporte@salonflow.app
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;