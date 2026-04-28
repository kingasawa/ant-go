import { redirect } from "next/navigation";

export default async function AppPage({
  params,
}: {
  params: Promise<{ appName: string }>;
}) {
  const { appName } = await params;
  redirect(`/account/app/${appName}/app-info`);
}

