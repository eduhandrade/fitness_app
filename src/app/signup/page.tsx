import Link from "next/link";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogoMark } from "@/components/brand/logo-mark";
import { SignupForm } from "@/components/auth/signup-form";
import { getOptionalUserId } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const userId = await getOptionalUserId();
  if (userId) redirect("/");

  const { code } = await searchParams;

  return (
    <main className="flex min-h-svh flex-1 items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <LogoMark size={40} />
          <h1 className="text-lg font-semibold">Criar conta no Trivo</h1>
          <p className="text-sm text-foreground-muted">
            Você precisa de um código de convite para criar sua conta.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Nova conta</CardTitle>
          </CardHeader>
          <CardContent>
            <SignupForm defaultInviteCode={code} />
          </CardContent>
        </Card>

        <p className="text-center text-xs text-foreground-muted">
          Já tem uma conta?{" "}
          <Link href="/login" className="underline">
            Entrar
          </Link>
        </p>
      </div>
    </main>
  );
}
