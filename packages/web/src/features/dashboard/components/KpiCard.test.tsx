import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { DollarSign } from 'lucide-react';
import { KpiCard } from './KpiCard';

describe('KpiCard', () => {
  const defaultProps = {
    title: 'Total Recebido',
    value: 'R$ 1.500,00',
    icon: DollarSign,
    description: '+10% este mês',
  };

  it('should render content correctly when not loading', () => {
    render(<KpiCard {...defaultProps} isLoading={false} />);

    // Verifica se o título, valor e descrição estão visíveis
    expect(screen.getByText(defaultProps.title)).toBeInTheDocument();
    expect(screen.getByText(defaultProps.value)).toBeInTheDocument();
    expect(screen.getByText(defaultProps.description)).toBeInTheDocument();

    // Verifica se o ícone foi renderizado (Lucide icons renderizam SVGs)
    const icon = document.querySelector('svg.lucide-dollar-sign');
    expect(icon).toBeInTheDocument();
  });

  it('should render skeletons and hide content when isLoading is true', () => {
    const { container } = render(<KpiCard {...defaultProps} isLoading={true} />);

    // O conteúdo real NÃO deve estar visível
    expect(screen.queryByText(defaultProps.title)).not.toBeInTheDocument();
    expect(screen.queryByText(defaultProps.value)).not.toBeInTheDocument();
    expect(screen.queryByText(defaultProps.description)).not.toBeInTheDocument();

    // Verifica a presença de elementos Skeleton (geralmente identificados pela classe animate-pulse no Shadcn)
    // Existem 3 skeletons no componente (título, ícone, valor) + 1 na descrição
    const skeletons = container.getElementsByClassName('animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('should not render description skeleton if description is not provided', () => {
    const propsNoDesc = { ...defaultProps, description: undefined };
    render(<KpiCard {...propsNoDesc} isLoading={false} />);

    expect(screen.getByText(defaultProps.title)).toBeInTheDocument();
    expect(screen.queryByText(defaultProps.description)).not.toBeInTheDocument();
  });
});