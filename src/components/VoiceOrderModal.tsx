import React from 'react';
import { VoiceGroceryModal } from './VoiceGroceryModal';
import { StoreSettings } from '../types';

interface VoiceOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  storeSettings?: StoreSettings;
}

export const VoiceOrderModal: React.FC<VoiceOrderModalProps> = (props) => {
  return <VoiceGroceryModal {...props} />;
};

export default VoiceOrderModal;
