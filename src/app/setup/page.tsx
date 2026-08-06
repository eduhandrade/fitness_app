import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogoMark } from "@/components/brand/logo-mark";
import { SetupButton } from "./setup-button";

export const dynamic = "force-dynamic";

export default function SetupPage() {
  return (
    <main className="flex min-h-svh flex-1 items-center justify-center px-6">
      <div className="w-full max-w-sm space-y-4">
        <div className="flex flex-col items-center gap-2 text-center">
          <LogoMark size={40} />
          <h1 className="text-lg font-semibold">Recuperar acesso</h1>
          <p className="text-sm text-foreground-muted">
            Toca no botão para criar (ou redefinir a senha) da conta definida
            por <span className="font-mono">SEED_USER_EMAIL</span> /{" "}
            <span className="font-mono">SEED_USER_PASSWORD</span> nas
            variáveis de ambiente do projeto.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Conta principal</CardTitle>
          </CardHeader>
          <CardContent>
            <SetupButton />
          </CardContent>
        </Card>

        <p className="text-center text-xs text-foreground-muted">
          Esta página só afeta a conta principal, definida pelas variáveis de
          ambiente. Contas criadas por convite em <span className="font-mono">/signup</span>{" "}
          não são afetadas. <Link href="/login" className="underline">Voltar ao login</Link>.
        </p>
      </div>
    </main>
  );
}
