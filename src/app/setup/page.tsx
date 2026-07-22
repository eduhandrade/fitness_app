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
          <h1 className="text-lg font-semibold">Configurar Trivo</h1>
          <p className="text-sm text-foreground-muted">
            Toca no botão para criar sua conta no banco de dados.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Primeira configuração</CardTitle>
          </CardHeader>
          <CardContent>
            <SetupButton />
          </CardContent>
        </Card>

        <p className="text-center text-xs text-foreground-muted">
          Depois de criar, <Link href="/" className="underline">volta para o app</Link>.
        </p>
      </div>
    </main>
  );
}
