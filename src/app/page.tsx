import { OperationsConsole } from "@/components/OperationsConsole";
import { getSystemSnapshot } from "@/lib/snapshot";

export const dynamic = "force-dynamic";

export default function Home() {
  return <OperationsConsole initialSnapshot={getSystemSnapshot()} />;
}
