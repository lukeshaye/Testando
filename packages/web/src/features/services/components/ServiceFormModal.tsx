// /packages/web/src/features/services/components/ServiceFormModal.tsx

import { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { CreateServiceSchema, type ServiceType, type CreateServiceType } from '@/packages/shared-types';
import { useAddServiceMutation } from '../hooks/useAddServiceMutation';
import { useUpdateServiceMutation } from '../hooks/useUpdateServiceMutation';
import { formatCurrency, parseCurrency } from '@/packages/web/src/lib/utils';
import { Loader2 } from 'lucide-react';

interface ServiceFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingService?: ServiceType | null;
}

export function ServiceFormModal({ isOpen, onClose, editingService }: ServiceFormModalProps) {
  const addMutation = useAddServiceMutation();
  const updateMutation = useUpdateServiceMutation();

  const isSubmitting = addMutation.isPending || updateMutation.isPending;

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateServiceType>({
    resolver: zodResolver(CreateServiceSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      duration: 30,
      imageUrl: null, // Refatorado: image_url -> imageUrl (camelCase)
      color: '#000000',
    },
  });

  // Popula o formulário ao abrir para edição ou reseta para criação
  useEffect(() => {
    if (isOpen) {
      if (editingService) {
        reset({
          name: editingService.name,
          description: editingService.description || '',
          price: editingService.price, 
          duration: editingService.duration,
          // Refatorado: Garante que string vazia vire null e usa camelCase
          imageUrl: editingService.imageUrl || null, 
          color: editingService.color || '#000000',
        });
      } else {
        reset({
          name: '',
          description: '',
          price: 0,
          duration: 30,
          imageUrl: null, // Refatorado: image_url -> imageUrl
          color: '#000000',
        });
      }
    }
  }, [isOpen, editingService, reset]);

  const onSubmit = (data: CreateServiceType) => {
    // Sanitização final para garantir que campos opcionais vazios sejam null
    const sanitizedData = {
      ...data,
      imageUrl: data.imageUrl === '' ? null : data.imageUrl, // Refatorado: image_url -> imageUrl
      description: data.description === '' ? null : data.description,
      color: data.color === '' ? null : data.color,
    };
    
    if (editingService) {
      updateMutation.mutate(
        { ...sanitizedData, id: editingService.id },
        {
          onSuccess: () => {
            onClose();
          },
        }
      );
    } else {
      addMutation.mutate(sanitizedData, {
        onSuccess: () => {
          onClose();
        },
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            {editingService ? 'Editar Serviço' : 'Novo Serviço'}
          </DialogTitle>
          <DialogDescription>
            Preencha os detalhes do serviço abaixo. Clique em salvar quando terminar.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Controller
              name="name"
              control={control}
              render={({ field }) => (
                <Input
                  {...field}
                  id="name"
                  placeholder="Ex: Corte Masculino"
                  disabled={isSubmitting}
                />
              )}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Controller
              name="description"
              control={control}
              render={({ field: { value, ...field } }) => (
                <Textarea
                  {...field}
                  id="description"
                  placeholder="Detalhes sobre o serviço..."
                  disabled={isSubmitting}
                  value={value || ''}
                />
              )}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Preço */}
            <div className="space-y-2">
              <Label htmlFor="price">Preço (R$) *</Label>
              <Controller
                name="price"
                control={control}
                render={({ field: { onChange, value, ...field } }) => (
                  <Input
                    {...field}
                    id="price"
                    type="text"
                    placeholder="R$ 0,00"
                    disabled={isSubmitting}
                    // Formata o valor numérico (centavos) para exibição (ex: "R$ 50,00")
                    value={formatCurrency(value)}
                    onChange={(e) => {
                      // Converte input string formatado para centavos (number) para o estado
                      const rawValue = e.target.value;
                      const numericValue = parseCurrency(rawValue);
                      onChange(numericValue);
                    }}
                  />
                )}
              />
              {errors.price && (
                <p className="text-sm text-destructive">{errors.price.message}</p>
              )}
            </div>

            {/* Duração */}
            <div className="space-y-2">
              <Label htmlFor="duration">Duração (min) *</Label>
              <Controller
                name="duration"
                control={control}
                render={({ field: { onChange, value, ...field } }) => (
                  <Input
                    {...field}
                    id="duration"
                    type="number"
                    min={0}
                    disabled={isSubmitting}
                    value={value}
                    onChange={(e) => onChange(Number(e.target.value))}
                  />
                )}
              />
              {errors.duration && (
                <p className="text-sm text-destructive">{errors.duration.message}</p>
              )}
            </div>
          </div>

          {/* Cor e Imagem */}
          <div className="grid grid-cols-[100px_1fr] gap-4">
            <div className="space-y-2">
              <Label htmlFor="color">Cor</Label>
              <Controller
                name="color"
                control={control}
                render={({ field: { value, onChange, ...field } }) => (
                  <div className="flex items-center gap-2">
                    <Input
                      {...field}
                      id="color"
                      type="color"
                      className="h-10 w-full p-1 cursor-pointer"
                      disabled={isSubmitting}
                      value={value || '#000000'}
                      onChange={(e) => onChange(e.target.value)}
                    />
                  </div>
                )}
              />
              {errors.color && (
                <p className="text-sm text-destructive">{errors.color.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="imageUrl">URL da Imagem</Label>
              <Controller
                name="imageUrl" // Refatorado: image_url -> imageUrl
                control={control}
                render={({ field: { value, onChange, ...field } }) => (
                  <Input
                    {...field}
                    id="imageUrl" // Refatorado: id alinhado com o nome do campo
                    placeholder="https://..."
                    disabled={isSubmitting}
                    value={value || ''}
                    onChange={(e) => {
                      // Converte string vazia para null para satisfazer validação .url().nullable()
                      const val = e.target.value;
                      onChange(val === '' ? null : val);
                    }}
                  />
                )}
              />
              {errors.imageUrl && ( // Refatorado: errors.image_url -> errors.imageUrl
                <p className="text-sm text-destructive">{errors.imageUrl.message}</p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editingService ? 'Salvar Alterações' : 'Criar Serviço'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}