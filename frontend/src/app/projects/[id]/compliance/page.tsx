"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Shield } from "lucide-react";

export default function ProjectCompliancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Compliance Reporting</CardTitle>
          <CardDescription>
            Generate compliance evidence and reports
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Shield className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
            <p className="text-muted-foreground mb-4">
              Compliance reporting is coming soon. You&apos;ll be able to
              generate evidence for SOC2, ISO, and HIPAA directly from your
              scan history.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}