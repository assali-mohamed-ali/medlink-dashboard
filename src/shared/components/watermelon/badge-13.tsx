import type { ReactNode } from 'react';
import { Badge } from '@/shared/components/ui/badge';

// Watermelon "Badge 13", already on our tokens (destructive = --error): a cancelled or failed status
const Badge13 = ({ children = 'Annulé' }: { children?: ReactNode }) => {
  return (
    <Badge className="bg-destructive/10 [a&]:hover:bg-destructive/5 focus-visible:ring-destructive/20 text-destructive border-none focus-visible:outline-none">
      <span className="bg-destructive size-2 rounded-full" aria-hidden="true" />
      {children}
    </Badge>
  );
};

export default Badge13;
