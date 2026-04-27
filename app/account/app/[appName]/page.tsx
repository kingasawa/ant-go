import { redirect } from "next/navigation";

export default function AppPage({ params }: { params: { appName: string } }) {
  redirect(`/account/app/${params.appName}/app-info`);
}

