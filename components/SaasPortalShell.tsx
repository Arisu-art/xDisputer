import type { ReactNode } from 'react';
import ObsidianAppShell from './ObsidianAppShell';

export type SaasPortalShellProps = {
  role: 'admin' | 'client';
  email?: string | null;
  title: string;
  subtitle: string;
  children: ReactNode;
};

export default function SaasPortalShell(props: SaasPortalShellProps) {
  return <ObsidianAppShell {...props} />;
}
