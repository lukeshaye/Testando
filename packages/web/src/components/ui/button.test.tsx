import { render, screen } from '@testing-library/react';
import { Button } from './button'; // Presume que o Button está no mesmo diretório

// Mock da função 'cn' para garantir que as classes são aplicadas corretamente
// Em um ambiente de teste real, 'cn' deve ser totalmente funcional, mas aqui estamos focando no Button
jest.mock('../../lib/utils', () => ({
  cn: jest.fn((...classes) => classes.filter(Boolean).join(' ')),
}));

describe('Button Component', () => {
  it('should render the default button with correct text and classes', () => {
    render(<Button>Click Me</Button>);
    const buttonElement = screen.getByText('Click Me');
    expect(buttonElement).toBeInTheDocument();
    // O mock do 'cn' retornará as classes em string, o que é suficiente para o teste
    expect(buttonElement).toHaveClass('inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background');
    expect(buttonElement).toHaveClass('h-10 py-2 px-4'); // Default size
    expect(buttonElement).toHaveClass('bg-primary text-primary-foreground hover:bg-primary/90'); // Default variant
  });

  it('should render the destructive variant correctly', () => {
    render(<Button variant="destructive">Delete</Button>);
    const buttonElement = screen.getByText('Delete');
    expect(buttonElement).toBeInTheDocument();
    // Teste para a aplicação da variante 'destructive'
    expect(buttonElement).toHaveClass('bg-destructive text-destructive-foreground hover:bg-destructive/90');
  });

  it('should render the outline variant correctly', () => {
    render(<Button variant="outline">Outline</Button>);
    const buttonElement = screen.getByText('Outline');
    expect(buttonElement).toBeInTheDocument();
    expect(buttonElement).toHaveClass('border border-input hover:bg-accent hover:text-accent-foreground');
  });

  it('should render the icon size correctly', () => {
    render(<Button size="icon">Icon</Button>);
    const buttonElement = screen.getByText('Icon');
    expect(buttonElement).toBeInTheDocument();
    // Teste para o tamanho 'icon'
    expect(buttonElement).toHaveClass('h-10 w-10');
    // Não deve ter classes de padding do default
    expect(buttonElement).not.toHaveClass('py-2 px-4');
  });

  it('should be disabled when the disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    const buttonElement = screen.getByText('Disabled');
    expect(buttonElement).toBeDisabled();
    // Classes de disabled devem ser aplicadas pelo 'cn'
    expect(buttonElement).toHaveClass('disabled:opacity-50 disabled:pointer-events-none');
  });

  it('should render as an anchor tag when asChild and href are provided', () => {
    // Nota: Em um teste real, se 'asChild' não for usada com o RouterLink do Next.js,
    // o componente pode renderizar um 'a' tag. Estamos testando o comportamento 'asChild'.
    render(<Button asChild><a href="/test">Link Button</a></Button>);
    const linkElement = screen.getByRole('link', { name: /Link Button/i });
    expect(linkElement).toBeInTheDocument();
    expect(linkElement.tagName).toBe('A');
    expect(linkElement).toHaveAttribute('href', '/test');
    // Classes do botão devem ser aplicadas ao link
    expect(linkElement).toHaveClass('bg-primary text-primary-foreground hover:bg-primary/90');
  });
});