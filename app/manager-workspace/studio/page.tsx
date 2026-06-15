import { redirect } from 'next/navigation';
import TemplateStudioHub from '../../../components/templates/workspace/TemplateStudioHub';
import TemplateWorkspaceShell from '../../../components/templates/workspace/TemplateWorkspaceShell';
import { requireAuth } from '../../../lib/saas/session';
import { getManagerTemplateLibraryContext } from '../../../lib/templates/workspace/template-library-service';
import { inspectTemplateStructure } from '../../../lib/templates/workspace/template-studio-service';

export default async function ManagerTemplateStudioPage() {
  const session = await requireAuth();
  if (!session.isManager && !session.isMaster) redirect(session.dashboardPath);
  const [context, inspection] = await Promise.all([
    getManagerTemplateLibraryContext({ supabase: session.supabase, managerId: session.user.id }),
    inspectTemplateStructure({ supabase: session.supabase, managerId: session.user.id })
  ]);

  return <TemplateWorkspaceShell
    session={session}
    activeHref="/manager-workspace/studio"
    title="Template Studio"
    description="Authoring hub for parser rules, canonical mappings, variables, preservation logic, and layout rules."
  >
    <TemplateStudioHub context={context} inspection={inspection} />
  </TemplateWorkspaceShell>;
}
