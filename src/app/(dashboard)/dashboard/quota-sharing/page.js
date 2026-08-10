import { Suspense } from "react";
import { CardSkeleton } from "@/shared/components/Loading";
import QuotaSharingClient from "./QuotaSharingClient";

export default function QuotaSharingPage() {
  return (
    <Suspense fallback={<CardSkeleton />}>
      <QuotaSharingClient />
    </Suspense>
  );
}
