import { auth, signIn } from "@/auth";
import { redirect } from "next/navigation";

export default async function LandingPage() {
  const session = await auth();

  // Already signed in — send to the right place
  if (session?.user) {
    if (!session.user.onboardingComplete) {
      redirect("/onboarding");
    }
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 px-4">
      <div className="w-full max-w-md text-center">
        {/* Logo / Wordmark */}
        <div className="mb-8">
          <span className="text-5xl font-extrabold tracking-tight text-indigo-600">
            FitBook
          </span>
          <p className="mt-2 text-lg text-gray-600">
            Your personal training, organised.
          </p>
        </div>

        {/* Feature highlights */}
        <ul className="mb-10 space-y-3 text-left text-sm text-gray-600">
          {[
            "Book sessions with your trainer in seconds",
            "Automatic Google Calendar events on every booking",
            "Email reminders so you never miss a session",
            "Full session history and workout tracking",
          ].map((feat) => (
            <li key={feat} className="flex items-start gap-2">
              <span className="mt-0.5 text-indigo-500">✓</span>
              {feat}
            </li>
          ))}
        </ul>

        {/* Sign-in button */}
        <form
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: "/onboarding" });
          }}
        >
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-3 rounded-xl bg-white px-6 py-4 text-base font-semibold text-gray-700 shadow-md ring-1 ring-gray-200 transition hover:shadow-lg active:scale-[0.98] min-h-[44px]"
          >
            {/* Google "G" icon */}
            <svg className="h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </button>
        </form>

        <p className="mt-6 text-xs text-gray-400">
          By signing in you agree to our terms. We&apos;ll request Google
          Calendar access to create events on your behalf.
        </p>
      </div>
    </main>
  );
}
