import { prisma } from "@/lib/prisma";
import { requireUserId } from "@/lib/session";
import { toIsoDateOnly } from "@/lib/date";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ProfileForm } from "@/components/profile/profile-form";

export default async function ProfilePage() {
  const userId = await requireUserId();
  const profile = await prisma.profile.findUnique({ where: { userId } });

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
    </div>
  );
}
