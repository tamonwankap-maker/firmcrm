"use client";

import { updateUserAction } from "@/features/users/actions";
import { UserForm, type UserFormValues } from "@/features/users/components/user-form";

export function EditUserForm({
  userId,
  defaults,
  practiceAreas,
}: {
  userId: string;
  defaults: UserFormValues;
  practiceAreas: { id: string; name: string }[];
}) {
  return (
    <UserForm
      mode="edit"
      action={updateUserAction.bind(null, userId)}
      defaults={defaults}
      practiceAreas={practiceAreas}
    />
  );
}
