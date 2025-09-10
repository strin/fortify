"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Shield, Code, GitBranch } from "lucide-react";

export default function SampleScanReport() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="xl" variant="outline">
          📋 See Example Scan Report
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-popover border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" />
            Security Scan Report - react-todo-app
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 text-white">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-destructive/20 border-destructive/30">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-destructive">5</div>
                <div className="text-sm text-destructive/80">
                  Critical Issues
                </div>
              </CardContent>
            </Card>
            <Card className="bg-chart-4/20 border-chart-4/30">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-chart-4">3</div>
                <div className="text-sm text-chart-4/80">Medium Issues</div>
              </CardContent>
            </Card>
            <Card className="bg-chart-2/20 border-chart-2/30">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-chart-2">2</div>
                <div className="text-sm text-chart-2/80">Low Issues</div>
              </CardContent>
            </Card>
            <Card className="bg-chart-1/20 border-chart-1/30">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-chart-1">95%</div>
                <div className="text-sm text-chart-1/80">Security Score</div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Issues */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold mb-4">
              Detected Vulnerabilities
            </h3>

            {/* Critical Issue */}
            <Card className="bg-destructive/10 border-destructive/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="w-5 h-5" />
                    SQL Injection Vulnerability
                  </CardTitle>
                  <Badge variant="destructive">Critical</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Code className="w-4 h-4" />
                  <span>src/api/users.js:42</span>
                </div>
                <p className="text-muted-foreground">
                  Direct string concatenation in SQL query allows potential SQL
                  injection attacks.
                </p>
                <div className="bg-card p-3 rounded-md">
                  <code className="text-sm text-destructive/80">
                    const query = &quot;SELECT * FROM users WHERE id = &quot; +
                    userId;
                  </code>
                </div>
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-chart-1" />
                  <span className="text-chart-1 text-sm">
                    Auto-fix available
                  </span>
                  <Button size="sm" variant="success">
                    Apply Fix
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Medium Issue */}
            <Card className="bg-chart-4/10 border-chart-4/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-chart-4">
                    <AlertTriangle className="w-5 h-5" />
                    Hardcoded API Key
                  </CardTitle>
                  <Badge className="bg-chart-4 text-white">Medium</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Code className="w-4 h-4" />
                  <span>src/config/api.js:15</span>
                </div>
                <p className="text-muted-foreground">
                  API key is hardcoded in source code and should be moved to
                  environment variables.
                </p>
                <div className="bg-card p-3 rounded-md">
                  <code className="text-sm text-chart-4/80">
                    const API_KEY = &quot;sk-1234567890abcdef...&quot;;
                  </code>
                </div>
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-chart-1" />
                  <span className="text-chart-1 text-sm">
                    Auto-fix available
                  </span>
                  <Button size="sm" variant="success">
                    Apply Fix
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Dependency Issue */}
            <Card className="bg-destructive/10 border-destructive/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-destructive">
                    <AlertTriangle className="w-5 h-5" />
                    Vulnerable Dependency
                  </CardTitle>
                  <Badge variant="destructive">Critical</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Code className="w-4 h-4" />
                  <span>package.json</span>
                </div>
                <p className="text-muted-foreground">
                  lodash@4.17.20 contains prototype pollution vulnerability
                  (CVE-2021-23337)
                </p>
                <div className="bg-card p-3 rounded-md">
                  <code className="text-sm text-destructive/80">
                    &quot;lodash&quot;: &quot;4.17.20&quot;
                  </code>
                </div>
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-chart-1" />
                  <span className="text-chart-1 text-sm">
                    Auto-fix available - Update to 4.17.21
                  </span>
                  <Button size="sm" variant="success">
                    Apply Fix
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Scan Details */}
          <div className="bg-card/50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Scan Details</h4>
            <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
              <div>
                <span className="text-muted-foreground">Repository:</span>{" "}
                user/react-todo-app
              </div>
              <div>
                <span className="text-muted-foreground">Scan Duration:</span> 23 seconds
              </div>
              <div>
                <span className="text-muted-foreground">Files Scanned:</span> 47
              </div>
              <div>
                <span className="text-muted-foreground">Languages:</span> JavaScript,
                TypeScript
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button variant="cta">Get Full Report</Button>
            <Button variant="outline">Download PDF</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
