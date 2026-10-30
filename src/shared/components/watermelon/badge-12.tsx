import type { ReactNode } from 'react';
import { Badge } from '@/shared/components/ui/badge';

// Watermelon "Badge 12", retinted to our tokens: a neutral status (waiting, in progress)
const Badge12 = ({ children = 'En attente' }: { children?: ReactNode }) => {
  return (
    <Badge className="border-none bg-muted text-muted-foreground focus-visible:ring-ring/20 focus-visible:outline-none">
      <span
        className="size-2 rounded-full bg-muted-foreground"
        aria-hidden="true"
      />
      {children}
    </Badge>
  );
};

export default Badge12;
