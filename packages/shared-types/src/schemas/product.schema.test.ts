import { describe, it, expect } from 'vitest';
import { CreateProductSchema, ProductSchema } from './product.schema';

describe('Product Schemas', () => {
  // Dados válidos para 'CreateProductSchema'
  const validCreateData = {
    name: 'Shampoo Antiqueda',
    price: 59.9,
    quantity: 100,
    image_url: 'https://example.com/images/shampoo.png',
  };

  // Dados válidos para 'ProductSchema' (simulando retorno do DB)
  const validProductData = {
    ...validCreateData,
    id: 1,
    created_at: new Date(),
    updated_at: new Date(),
  };

  // --- Testes para CreateProductSchema ---
  describe('CreateProductSchema', () => {
    it('should validate correctly formatted product data', () => {
      const result = CreateProductSchema.safeParse(validCreateData);
      expect(result.success).toBe(true);
    });

    it('should allow an empty string for image_url', () => {
      const data = { ...validCreateData, image_url: '' };
      const result = CreateProductSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('should fail validation for an invalid image_url', () => {
      const data = { ...validCreateData, image_url: 'not-a-valid-url' };
      const result = CreateProductSchema.safeParse(data);
      expect(result.success).toBe(false);
      expect(
        result.error.issues.some((issue) => issue.path.includes('image_url')),
      ).toBe(true);
    });

    it('should fail validation for a negative quantity', () => {
      const data = { ...validCreateData, quantity: -1 };
      const result = CreateProductSchema.safeParse(data);
      expect(result.success).toBe(false);
      expect(
        result.error.issues.some((issue) => issue.path.includes('quantity')),
      ).toBe(true);
    });

    it('should fail validation for a non-integer quantity', () => {
      const data = { ...validCreateData, quantity: 10.5 };
      const result = CreateProductSchema.safeParse(data);
      expect(result.success).toBe(false);
      expect(
        result.error.issues.some((issue) => issue.path.includes('quantity')),
      ).toBe(true);
    });

    it('should fail validation for a non-positive price', () => {
      const data = { ...validCreateData, price: 0 };
      const result = CreateProductSchema.safeParse(data);
      expect(result.success).toBe(false);
      expect(
        result.error.issues.some((issue) => issue.path.includes('price')),
      ).toBe(true);
    });

    it('should fail validation for an empty name', () => {
      const data = { ...validCreateData, name: '' };
      const result = CreateProductSchema.safeParse(data);
      expect(result.success).toBe(false);
      expect(
        result.error.issues.some((issue) => issue.path.includes('name')),
      ).toBe(true);
    });
  });

  // --- Testes para ProductSchema ---
  describe('ProductSchema', () => {
    it('should validate a full product object (e.g., from DB)', () => {
      const result = ProductSchema.safeParse(validProductData);
      expect(result.success).toBe(true);
    });

    it('should fail if id is missing or invalid', () => {
      const data = { ...validProductData };
      delete (data as any).id; // Remover ID
      const result = ProductSchema.safeParse(data);
      expect(result.success).toBe(false);
      expect(
        result.error.issues.some((issue) => issue.path.includes('id')),
      ).toBe(true);
    });

    it('should fail validation for a negative quantity', () => {
      const data = { ...validProductData, quantity: -50 };
      const result = ProductSchema.safeParse(data);
      expect(result.success).toBe(false);
      expect(
        result.error.issues.some((issue) => issue.path.includes('quantity')),
      ).toBe(true);
    });

    it('should fail validation for an invalid image_url', () => {
      const data = { ...validProductData, image_url: 'ftp://invalid-url.com' };
      const result = ProductSchema.safeParse(data);
      expect(result.success).toBe(false);
      expect(
        result.error.issues.some((issue) => issue.path.includes('image_url')),
      ).toBe(true);
    });
  });
});