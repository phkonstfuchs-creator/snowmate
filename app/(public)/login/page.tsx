import AuthScreen from "@/features/auth/AuthScreen";

interface LoginPageProps {
  searchParams: Promise<{ confirmation?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { confirmation } = await searchParams;

  return (
    <AuthScreen
      mode="login"
      confirmationFailed={confirmation === "failed"}
    />
  );
}
