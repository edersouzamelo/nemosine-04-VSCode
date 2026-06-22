import { auth } from "@/auth";
import { redirect } from "next/navigation";
import ManuscritosClient from "./ManuscritosClient";

export default async function ManuscritosPage({
  searchParams,
}: {
  searchParams?: Promise<{ embed?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;

  if (!session?.user?.id) {
    redirect("/access?callbackUrl=/soberano/manuscritos");
  }

  return <ManuscritosClient embed={params?.embed === "true"} />;
}
