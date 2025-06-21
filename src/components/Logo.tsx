
import { Bike } from 'lucide-react';
import Link from 'next/link';

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2 text-lg font-semibold text-sidebar-foreground hover:text-accent transition-colors">
      <Bike className="h-7 w-7 text-accent" />
      <span>MotoFox</span>
    </Link>
  );
}
