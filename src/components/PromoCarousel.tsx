import React from 'react';
import { HeroBanner } from './HeroBanner';
import { PromoBanner, StoreSettings } from '../types';

interface PromoCarouselProps {
  banners?: PromoBanner[];
  storeSettings?: StoreSettings;
  onSelectCategory?: (category: string) => void;
  onOpenParchiModal?: () => void;
}

export const PromoCarousel: React.FC<PromoCarouselProps> = ({
  onSelectCategory,
  onOpenParchiModal,
}) => {
  return (
    <HeroBanner
      onOpenParchiModal={onOpenParchiModal}
      onSelectCategory={onSelectCategory}
    />
  );
};
