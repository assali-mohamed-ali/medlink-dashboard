import type { ReactNode } from 'react';
import { Badge } from '@/shared/components/ui/badge';

// Watermelon "Badge 15", retinted to our tokens (accent = sage, primary = teal): a done or confirmed status
const Badge15 = ({ children = 'Confirmé' }: { children?: ReactNode }) => {
  return (
    <Badge className="border-none bg-accent text-accent-foreground focus-visible:ring-ring/20 focus-visible:outline-none">
      <span
        className="size-2 rounded-full bg-primary"
        aria-hidden="true"
      />
      {children}
    </Badge>
  );
};

export default Badge15;
