import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { toIsoDateOnly } from "@/lib/date";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "@/components/profile/profile-form";
import { InviteFriendButton } from "@/components/profile/invite-friend-button";

export default async function ProfilePage() {
  const userId = await requireUserId();
  const profile = await prisma.profile.findUnique({ where: { userId } });
  const inviteCode = process.env.SIGNUP_INVITE_CODE;

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Profile</h1>

      <Card>
        <CardHeader>
          <CardTitle>About you</CardTitle>
        </CardHeader>
        <CardContent>
          <ProfileForm
            heightCm={profile?.heightCm}
            dateOfBirth={
              profile?.dateOfBirth ? toIsoDateOnly(profile.dateOfBirth) : null
            }
            sex={profile?.sex}
          />
        </CardContent>
      </Card>

      {inviteCode && (
        <Card>
          <CardHeader>
            <CardTitle>Invite a friend</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="mb-3 text-sm text-foreground-muted">
              Compartilhe o Trivo com alguém — a pessoa cria a própria conta,
              isolada da sua, sem precisar digitar o código de convite.
            </p>
            <InviteFriendButton inviteCode={inviteCode} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
