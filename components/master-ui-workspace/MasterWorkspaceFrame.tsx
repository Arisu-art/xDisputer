import type { ReactNode } from 'react';

export default function MasterWorkspaceFrame({ children }: { children: ReactNode }) {
  return <div data-master-workspace-frame="true">{children}</div>;
}
