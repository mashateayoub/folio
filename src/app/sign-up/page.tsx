import AuthScreen from "@/features/auth/components/auth-screen";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  return <AuthScreen mode="sign-up" next={(await searchParams).next} />;
}
