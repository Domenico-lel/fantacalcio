import { fetchCareerHub } from "@/app/career-actions";
import CareerGame from "./CareerGame";

export const dynamic = "force-dynamic";

export default async function CarrieraPage() {
  const hub = await fetchCareerHub();
  return <CareerGame initialHub={hub} />;
}
