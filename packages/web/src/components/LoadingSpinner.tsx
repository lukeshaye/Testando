import { Loader2 } from 'lucide-react';

/**
 * Componente LoadingSpinner.
 * Renderiza um ícone giratório.
 * Este componente é agnóstico de layout e foi projetado para ser
 * universalmente reutilizável (ex: dentro de um botão ou como parte
 * de um indicador de página inteira).
 *
 * * Corrigido conforme Veredito (Rejeitado 2):
 * Removido todo o layout wrapper (flex, flex-col, items-center, py-12)
 * e texto visível para obedecer estritamente aos princípios
 * SoC (2.5) e DRY (2.2).
 *
 * O componente consumidor é responsável por aplicar qualquer layout
 * (ex: 'flex', 'justify-center', 'min-h-screen') e adicionar
 * texto visível (ex: <p>Carregando...</p>) se necessário.
 *
 * @param {string} [className] Classes Tailwind CSS adicionais para
 * permitir dimensionamento (ex: 'w-4 h-4' para um botão, 'w-12 h-12'
 * para uma página).
 */
export default function LoadingSpinner({ className }: { className?: string }) {
  // Combina as classes padrão com quaisquer classes personalizadas
  // O padrão é 'w-6 h-6', um tamanho razoável para reutilização.
  const classes = `animate-spin text-primary ${className || 'w-6 h-6'}`;

  return (
    <Loader2
      className={classes}
      role="status"
      aria-live="polite"
    >
      <span className="sr-only">Carregando...</span>
    </Loader2>
  );
}