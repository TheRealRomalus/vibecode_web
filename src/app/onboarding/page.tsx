import { auth } from "@/auth";
import { redirect } from "next/navigation";
import OnboardingForm from "./OnboardingForm";

export default async function OnboardingPage() {
  const session = await auth();

  // Not signed in → back to landing
  if (!session?.user) redirect("/");

  // Already onboarded → send to the right dashboard
  if (session.user.onboardingComplete) {
    redirect(session.user.role === "TRAINER" ? "/trainer" : "/dashboard");
  }

  return <OnboardingForm />;
}
