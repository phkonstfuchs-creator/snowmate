import AuthScreen from "@/features/auth/AuthScreen";

interface LoginPageProps {
  searchParams: Promise<{ confirmation?: string; account?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { confirmation, account } = await searchParams;

  return (
    <AuthScreen
      mode="login"
      confirmationFailed={confirmation === "failed"}
      accountDeleted={account === "deleted"}
    />
  );
}
