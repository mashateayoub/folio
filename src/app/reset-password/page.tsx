import AuthScreen from "@/features/auth/components/auth-screen";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  return (
    <AuthScreen mode="reset-password" token={(await searchParams).token} />
  );
}
