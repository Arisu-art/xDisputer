'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';

export default function ConsoleNavLink({
  href,
  className,
  children
}: {
  href: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} prefetch={false} className={className}>
      {children}
    </Link>
  );
}
