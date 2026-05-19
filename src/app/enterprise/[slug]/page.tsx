export const dynamic = "force-dynamic";

import { notFound } from "next/navigation";
import { getEnterpriseSnapshot } from "@/lib/modules/enterprise";
import EnterpriseDashboard from "@/components/EnterpriseDashboard";

type Props = { params: Promise<{ slug: string }> };

export default async function EnterpriseSlugPage({ params }: Props) {
  const { slug } = await params;

  try {
    const snapshot = await getEnterpriseSnapshot(slug);
    if (!snapshot) notFound();
    return <EnterpriseDashboard snapshot={snapshot} slug={slug} />;
  } catch {
    notFound();
  }
}
