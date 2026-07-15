import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const { callbackUrl } = await searchParams;

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="flex h-10 w-10 items-center justify-center rounded-full border-[3px] border-primary">
          <span className="h-2 w-2 rounded-full bg-primary-strong" />
        </span>
        <h1 className="text-lg font-semibold">Sign in to Trivo</h1>
        <p className="text-sm text-foreground-muted">
          Your personal triathlon training companion.
        </p>
      </div>
      <LoginForm callbackUrl={callbackUrl ?? "/"} />
    </div>
  );
}
