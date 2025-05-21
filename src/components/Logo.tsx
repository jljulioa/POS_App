
import { Bike } from 'lucide-react';
import Link from 'next/link';

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-sidebar-foreground hover:text-sidebar-primary transition-colors">
      <Bike className="h-7 w-7 text-sidebar-primary" />
      <span>MotoPoint</span>
    </Link>
  );
}
