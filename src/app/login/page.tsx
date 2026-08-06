import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogoMark } from "@/components/brand/logo-mark";
import { LoginForm } from "@/components/auth/login-form";
import { PasskeyLoginButton } from "@/components/auth/passkey-login-button";
import { getOptionalUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const userId = await getOptionalUserId();
  if (userId) redirect("/");

  return (
    <main className="flex min-h-svh flex-1 items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <LogoMark size={40} />
          <h1 className="text-lg font-semibold">Entrar no Trivo</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Login</CardTitle>
          </CardHeader>
          <CardContent>
            <LoginForm />
            <PasskeyLoginButton />
          </CardContent>
        </Card>

        <p className="text-center text-xs text-foreground-muted">
          Não tem uma conta?{" "}
          <Link href="/signup" className="underline">
            Criar conta
          </Link>
        </p>
      </div>
    </main>
  );
}
