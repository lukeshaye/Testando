import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { TodayAppointmentsList, AppointmentSummary } from './TodayAppointmentsList';

describe('TodayAppointmentsList', () => {
  const mockAppointments: AppointmentSummary[] = [
    {
      id: '1',
      clientName: 'João Silva',
      serviceName: 'Corte de Cabelo',
      date: new Date('2023-10-27T10:00:00'),
      status: 'SCHEDULED',
    },
    {
      id: '2',
      clientName: 'Maria Souza',
      serviceName: 'Manicure',
      date: new Date('2023-10-27T14:30:00'),
      status: 'COMPLETED',
    },
    {
      id: '3',
      clientName: 'Pedro Santos',
      serviceName: 'Barba',
      date: new Date('2023-10-27T16:00:00'),
      status: 'CANCELED',
    },
  ];

  it('should render skeletons when isLoading is true', () => {
    const { container } = render(<TodayAppointmentsList isLoading={true} />);

    // Verifica se o título do card está presente
    expect(screen.getByText('Agendamentos de Hoje')).toBeInTheDocument();

    // Verifica se os skeletons estão presentes (classe animate-pulse)
    const skeletons = container.getElementsByClassName('animate-pulse');
    expect(skeletons.length).toBeGreaterThan(0);

    // Garante que nenhum conteúdo real seja renderizado
    expect(screen.queryByText('João Silva')).not.toBeInTheDocument();
    expect(screen.queryByText('Nenhum agendamento para hoje.')).not.toBeInTheDocument();
  });

  it('should render empty state message when appointments array is empty', () => {
    render(<TodayAppointmentsList appointments={[]} isLoading={false} />);

    expect(screen.getByText('Agendamentos de Hoje')).toBeInTheDocument();
    expect(screen.getByText('Nenhum agendamento para hoje.')).toBeInTheDocument();
  });

  it('should render a list of appointments correctly', () => {
    render(<TodayAppointmentsList appointments={mockAppointments} isLoading={false} />);

    // Verifica se o título está presente
    expect(screen.getByText('Agendamentos de Hoje')).toBeInTheDocument();

    // Verifica se os nomes dos clientes são renderizados
    expect(screen.getByText('João Silva')).toBeInTheDocument();
    expect(screen.getByText('Maria Souza')).toBeInTheDocument();
    expect(screen.getByText('Pedro Santos')).toBeInTheDocument();

    // Verifica se os serviços são renderizados
    expect(screen.getByText('Corte de Cabelo')).toBeInTheDocument();
    expect(screen.getByText('Manicure')).toBeInTheDocument();

    // Verifica se os horários estão formatados corretamente (HH:mm)
    // Nota: Dependendo do fuso horário do ambiente de teste, isso pode variar, 
    // mas a verificação de string parcial ou regex é segura aqui para fins ilustrativos.
    // O componente usa toLocaleTimeString('pt-BR'), assumindo que o mock date é respeitado.
    expect(screen.getByText('10:00')).toBeInTheDocument();
    expect(screen.getByText('14:30')).toBeInTheDocument();
    
    // Verifica os badges de status
    expect(screen.getByText('Agendado')).toBeInTheDocument();
    expect(screen.getByText('Concluído')).toBeInTheDocument();
    expect(screen.getByText('Cancelado')).toBeInTheDocument();
  });

  it('should handle absent status correctly', () => {
    const absentAppointment: AppointmentSummary[] = [{
      id: '4',
      clientName: 'Carlos',
      serviceName: 'Teste',
      date: new Date(),
      status: 'ABSENT'
    }];
    
    render(<TodayAppointmentsList appointments={absentAppointment} isLoading={false} />);
    expect(screen.getByText('Ausente')).toBeInTheDocument();
  });
});