import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createSupabaseServerClient } from '../../lib/supabase/server';

export default function SignupPage() {
  async function signUp(formData: FormData) {
    'use server';

    const fullName = String(formData.get('fullName') || '').trim();
    const email = String(formData.get('email') || '').trim();
    const password = String(formData.get('password') || '');

    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName
        },
        emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || ''}/auth/callback`
      }
    });

    if (error) {
      redirect(`/signup?error=${encodeURIComponent(error.message)}`);
    }

    redirect('/login');
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <p className="eyebrow">xDisputer SaaS</p>
        <h1>Create account</h1>
        <p>New users are created as client users by default.</p>

        <form action={signUp} className="auth-form">
          <label>
            Full name
            <input name="fullName" type="text" required placeholder="Client name" />
          </label>
          <label>
            Email
            <input name="email" type="email" required placeholder="you@example.com" />
          </label>
          <label>
            Password
            <input name="password" type="password" required minLength={8} placeholder="Minimum 8 characters" />
          </label>
          <button type="submit">Create account</button>
        </form>

        <p>
          Already have an account? <Link href="/login">Sign in</Link>
        </p>
      </section>
    </main>
  );
}
