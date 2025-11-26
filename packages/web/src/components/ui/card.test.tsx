import { render, screen } from '@testing-library/react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from './card';

// Mock da função 'cn' para garantir que as classes são aplicadas corretamente
jest.mock('../../lib/utils', () => ({
  cn: jest.fn((...classes) => classes.filter(Boolean).join(' ')),
}));

describe('Card Component Family', () => {
  it('should render Card with default classes', () => {
    render(<Card data-testid="card-root">Card Content</Card>);
    const cardElement = screen.getByTestId('card-root');

    expect(cardElement).toBeInTheDocument();
    expect(cardElement).toHaveClass('rounded-xl border bg-card text-card-foreground shadow');
    expect(cardElement).toHaveTextContent('Card Content');
  });

  it('should render CardHeader with default classes and content', () => {
    render(
      <CardHeader data-testid="card-header">
        Header Content
      </CardHeader>
    );
    const headerElement = screen.getByTestId('card-header');

    expect(headerElement).toBeInTheDocument();
    expect(headerElement).toHaveClass('flex flex-col space-y-1.5 p-6');
    expect(headerElement).toHaveTextContent('Header Content');
  });

  it('should render CardTitle with default classes and content', () => {
    render(<CardTitle data-testid="card-title">My Title</CardTitle>);
    const titleElement = screen.getByTestId('card-title');

    expect(titleElement).toBeInTheDocument();
    expect(titleElement).toHaveClass('text-2xl font-semibold leading-none tracking-tight');
    expect(titleElement).toHaveTextContent('My Title');
  });

  it('should render CardDescription with default classes and content', () => {
    render(<CardDescription data-testid="card-description">A helpful description.</CardDescription>);
    const descriptionElement = screen.getByTestId('card-description');

    expect(descriptionElement).toBeInTheDocument();
    expect(descriptionElement).toHaveClass('text-sm text-muted-foreground');
    expect(descriptionElement).toHaveTextContent('A helpful description.');
  });

  it('should render CardContent with default classes and content', () => {
    render(<CardContent data-testid="card-content">Main card content.</CardContent>);
    const contentElement = screen.getByTestId('card-content');

    expect(contentElement).toBeInTheDocument();
    expect(contentElement).toHaveClass('p-6 pt-0');
    expect(contentElement).toHaveTextContent('Main card content.');
  });

  it('should render CardFooter with default classes and content', () => {
    render(<CardFooter data-testid="card-footer">Footer actions.</CardFooter>);
    const footerElement = screen.getByTestId('card-footer');

    expect(footerElement).toBeInTheDocument();
    expect(footerElement).toHaveClass('flex items-center p-6 pt-0');
    expect(footerElement).toHaveTextContent('Footer actions.');
  });

  it('should render a complete Card structure', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
          <CardDescription>Manage your account settings.</CardDescription>
        </CardHeader>
        <CardContent>
          Form fields here.
        </CardContent>
        <CardFooter>
          <button>Save</button>
        </CardFooter>
      </Card>
    );

    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(screen.getByText('Manage your account settings.')).toBeInTheDocument();
    expect(screen.getByText('Form fields here.')).toBeInTheDocument();
    expect(screen.getByText('Save')).toBeInTheDocument();
  });
});