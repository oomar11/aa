"use client";

import { MaterialSystemsEditor } from "@/components/materials/MaterialSystemsEditor";
import { ProfilesConceptGuide } from "@/components/materials/ProfilesConceptGuide";

export function ProfilesMaterialsView() {
  return (
    <div className="flex flex-col gap-3">
      <ProfilesConceptGuide />
      <MaterialSystemsEditor category="profiles" />
    </div>
  );
}
