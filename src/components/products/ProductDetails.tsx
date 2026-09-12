import React from 'react';
import { ProductLandingPage } from './ProductLandingPage';

interface ProductDetailsProps {
  productId?: string;
  onBack?: () => void;
}

/**
 * ProductDetails direciona para a Landing Page individual de alta conversão
 * mantendo 100% de retrocompatibilidade com rotas e componentes anteriores.
 */
export const ProductDetails: React.FC<ProductDetailsProps> = (props) => {
  return <ProductLandingPage {...props} />;
};

export default ProductDetails;
