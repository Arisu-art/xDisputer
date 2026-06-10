import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '../../lib/supabase/server';

export default function LoginPage({
  searchParams
}: {
  searchParams?: Promise<{ next?: string; error?: string }>;
}) {
  async function signIn(formData: FormData) {
    'use server';

    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '');
    const next = String(formData.get('next') || '/client');

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      redirect(`/login?error=${encodeURIComponent(error.message)}`);
    }

    redirect(next || '/client');
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <p className="eyebrow">xDisputer SaaS</p>
        <h1>Sign in</h1>
        <p>Access your protected document operations workspace.</p>

        <form action={signIn} className="auth-form">
          <input type="hidden" name="next" value="/client" />
          <label>
            Email
            <input name="email" type="email" required placeholder="you@example.com" />
          </label>
          <label>
            Password
            <input name="password" type="password" required placeholder="Password" />
          </label>
          <button type="submit">Sign in</button>
        </form>

        <p>
          No account yet? <Link href="/signup">Create one</Link>
        </p>
      </section>
    </main>
  );
}
