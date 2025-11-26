import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'

// Componentes Shadcn/UI (Princípio CDA 2.17)
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/packages/web/src/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/packages/web/src/components/ui/form'
import { Input } from '@/packages/web/src/components/ui/input'
import { Textarea } from '@/packages/web/src/components/ui/textarea'
import { Button } from '@/packages/web/src/components/ui/button'

// Tipos Compartilhados (Princípio DSpP 2.16)
import { CreateProductSchema, ProductType } from '@/packages/shared-types'

// Hooks de Dados (Princípios CQRS 2.12 e SoC 2.5)
import { useAddProductMutation } from '../hooks/useAddProductMutation'
import { useUpdateProductMutation } from '../hooks/useUpdateProductMutation'

// --- Definição de Tipos ---

/**
 * Interface para os dados do formulário.
 * Usa `null` para campos numéricos para permitir que os inputs fiquem vazios,
 * conforme a lógica legada migrada de Products.tsx.
 */
interface ProductFormData {
  name: string
  description?: string | null
  price: number | null // Permite `null` para o campo de formulário
  quantity?: number | null // Permite `null` para o campo de formulário
  image_url?: string | null
}

/**
 * Valores padrão para o formulário de criação.
 */
const defaultFormValues: ProductFormData = {
  name: '',
  description: '',
  price: null,
  quantity: null,
  image_url: '',
}

/**
 * Propriedades do componente ProductFormModal.
 */
interface ProductFormModalProps {
  isOpen: boolean
  onClose: () => void
  editingProduct: ProductType | null
}

/**
 * Componente de modal para Adicionar ou Editar um Produto.
 * Responsável pela UI do formulário, validação (Zod) e
 * delegação da lógica de API para os hooks de mutação (SoC 2.5).
 */
export function ProductFormModal({
  isOpen,
  onClose,
  editingProduct,
}: ProductFormModalProps) {
  // --- Hooks de Mutação (CQRS) ---
  const addMutation = useAddProductMutation()
  const updateMutation = useUpdateProductMutation()
  const isPending = addMutation.isPending || updateMutation.isPending

  // --- Lógica de Formulário (useForm) ---
  const form = useForm<ProductFormData>({
    // Validação: "Mantenha zodResolver(CreateProductSchema)" (Plano 3.2.1)
    // Usamos `as any` conforme a implementação legada para permitir
    // que o formulário (ProductFormData) use `null` para campos numéricos
    // que o schema final (CreateProductSchema) espera como `number`.
    resolver: zodResolver(CreateProductSchema as any),
    defaultValues: defaultFormValues,
  })

  // --- Efeito para popular o formulário ---
  // "useEffect: Implemente para dar reset() no formulário quando editingProduct mudar" (Plano 3.2.1)
  useEffect(() => {
    if (isOpen) {
      if (editingProduct) {
        // Modo Edição: Popula o formulário com dados do produto
        form.reset({
          name: editingProduct.name,
          description: editingProduct.description || '',
          // Lógica legada: Converte centavos para R$ para o input
          price: editingProduct.price / 100,
          quantity: editingProduct.quantity || 0,
          image_url: editingProduct.image_url || '',
        })
      } else {
        // Modo Criação: Reseta para os valores padrão
        form.reset(defaultFormValues)
      }
    }
  }, [isOpen, editingProduct, form])

  /**
   * Handler de submissão do formulário.
   */
  const onSubmit = async (formData: ProductFormData) => {
    // "Tratamento de Dados: Mantenha a lógica de conversão de price (R$ para centavos)" (Plano 3.2.1)
    const dataForApi = {
      ...formData,
      price: Math.round(Number(formData.price) * 100), // Converte R$ para centavos
      quantity: Number(formData.quantity) || 0,
      description: formData.description || null,
      image_url: formData.image_url || null,
    }

    try {
      if (editingProduct) {
        // Modo Edição
        await updateMutation.mutateAsync({
          ...dataForApi,
          id: editingProduct.id,
        } as ProductType) // Força o tipo esperado pela mutação
      } else {
        // Modo Criação
        await addMutation.mutateAsync(
          dataForApi as z.infer<typeof CreateProductSchema>,
        )
      }
      onClose() // Fecha o modal em caso de sucesso
    } catch (error) {
      // O hook de mutação (useAdd/useUpdate) é responsável por
      // exibir o feedback de erro (toast), conforme Plano 3.1.2
      console.error('Falha ao salvar produto:', error)
    }
  }

  // Handler para controlar o estado de abertura/fechamento do Dialog
  const handleOpenChange = (open: boolean) => {
    if (!open) {
      onClose()
    }
  }

  return (
    // --- UI com Shadcn/ui (Princípio CDA 2.17) ---
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>
            {editingProduct ? 'Editar Produto' : 'Novo Produto'}
          </DialogTitle>
          <DialogDescription>
            {editingProduct
              ? 'Atualize os dados do produto.'
              : 'Preencha os dados para criar um novo produto.'}
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Campo: Nome */}
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Shampoo Hidratante" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Campo: Descrição */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva o produto..."
                      {...field}
                      value={field.value || ''} // Garante que o campo não seja `null`
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Campos: Preço e Quantidade (Grid) */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço (R$) *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="45.50"
                        step="0.01"
                        {...field}
                        value={field.value ?? ''} // Permite input vazio
                        onChange={(e) =>
                          // Converte string vazia para `null`
                          field.onChange(
                            e.target.value === ''
                              ? null
                              : parseFloat(e.target.value),
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Quantidade *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="20"
                        step="1"
                        {...field}
                        value={field.value ?? ''} // Permite input vazio
                        onChange={(e) =>
                          // Converte string vazia para `null`
                          field.onChange(
                            e.target.value === ''
                              ? null
                              : parseInt(e.target.value, 10),
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Campo: URL da Imagem */}
            <FormField
              control={form.control}
              name="image_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL da Imagem</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://exemplo.com/imagem.jpg"
                      {...field}
                      value={field.value || ''} // Garante que o campo não seja `null`
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending}>
                {/* "Estado de Loading: O botão 'Salvar' deve exibir um spinner" (Plano 3.2.1) */}
                {isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {isPending ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}