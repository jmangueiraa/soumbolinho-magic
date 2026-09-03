import React from 'react';
import { ProductDetails } from './ProductDetails';
import { Product } from '../../types';

interface ProductDetailPageProps {
  product?: Product;
  onBack?: () => void;
}

export const ProductDetailPage: React.FC<ProductDetailPageProps> = ({ product, onBack }) => {
  return <ProductDetails productId={product?.id} onBack={onBack} />;
};

export default ProductDetailPage;
