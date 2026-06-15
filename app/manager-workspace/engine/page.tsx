import { redirect } from 'next/navigation';
import GenerationEngineHub from '../../../components/templates/workspace/GenerationEngineHub';
import TemplateWorkspaceShell from '../../../components/templates/workspace/TemplateWorkspaceShell';
import { requireAuth } from '../../../lib/saas/session';
import { previewGenerationPlan } from '../../../lib/templates/workspace/generation-engine-service';
import { getManagerTemplateLibraryContext } from '../../../lib/templates/workspace/template-library-service';

export default async function ManagerGenerationEnginePage() {
  const session = await requireAuth();
  if (!session.isManager && !session.isMaster) redirect(session.dashboardPath);
  const [context, plan] = await Promise.all([
    getManagerTemplateLibraryContext({ supabase: session.supabase, managerId: session.user.id }),
    previewGenerationPlan({ supabase: session.supabase, managerId: session.user.id })
  ]);

  return <TemplateWorkspaceShell
    session={session}
    activeHref="/manager-workspace/engine"
    title="Generation Engine"
    description="Preview, validate, and diagnose dynamic template output before release."
  >
    <GenerationEngineHub context={context} plan={plan} />
  </TemplateWorkspaceShell>;
}
