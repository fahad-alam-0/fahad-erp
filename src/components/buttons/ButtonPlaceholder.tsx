import React from 'react';
import { Button, ButtonProps } from '@/components/ui/button';

export const ButtonPlaceholder: React.FC<ButtonProps> = (props) => {
  return <Button {...props}>{props.children || 'Placeholder Button'}</Button>;
};
