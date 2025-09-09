"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Shield, 
  CheckCircle, 
  ArrowRight, 
  GitBranch, 
  ExternalLink,
  Loader2,
  AlertTriangle
} from "lucide-react";

interface GitHubActionsInstallCTAProps {
  scanId: string;
  vulnerabilityCount: number;
  criticalCount: number;
  highCount: number;
  repositoryName: string;
  repositoryOwner: string;
}

interface InstallationResult {
  success: boolean;
  workflowFile: string;
  commitSha: string;
  installationId: string;
  nextSteps: string[];
}

export default function GitHubActionsInstallCTA({
  scanId,
  vulnerabilityCount,
  criticalCount,
  highCount,
  repositoryName,
  repositoryOwner
}: GitHubActionsInstallCTAProps) {
  const [installing, setInstalling] = useState(false);
  const [installed, setInstalled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [installResult, setInstallResult] = useState<InstallationResult | null>(null);

  const handleInstallGitHubActions = async () => {
    try {
      setInstalling(true);
      setError(null);

      const response = await fetch(`/api/v1/scan/${scanId}/install-github-actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          enable_branch_protection: true,
          config: {
            mode: 'full',
            severity_threshold: 'HIGH',
            block_merge: true
          }
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to install GitHub Actions');
      }

      setInstallResult(data);
      setInstalled(true);

      // Track conversion event
      if (typeof window !== 'undefined' && (window as any).gtag) {
        (window as any).gtag('event', 'github_actions_install', {
          scan_id: scanId,
          repository: `${repositoryOwner}/${repositoryName}`,
          vulnerability_count: vulnerabilityCount
        });
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setInstalling(false);
    }
  };

  if (installed && installResult) {
    return (
      <Card className="bg-gradient-to-r from-green-600 to-emerald-600 border-none mb-8">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <CheckCircle className="h-5 w-5" />
            GitHub Actions Successfully Installed!
          </CardTitle>
          <CardDescription className="text-green-100">
            Your repository is now protected with automatic security scanning on every pull request.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-green-500/20 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <GitBranch className="h-4 w-4 text-green-100" />
                <span className="text-green-100 font-medium">Workflow File Created</span>
              </div>
              <code className="text-sm text-green-50 bg-green-800/30 px-2 py-1 rounded">
                {installResult.workflowFile}
              </code>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">✅</div>
                <div className="text-sm text-green-100">PR Protection Active</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">🛡️</div>
                <div className="text-sm text-green-100">Branch Rules Set</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-1">🚀</div>
                <div className="text-sm text-green-100">Ready for PRs</div>
              </div>
            </div>

            <div className="space-y-2">
              <h4 className="text-white font-medium">Next Steps:</h4>
              <ul className="space-y-1">
                {installResult.nextSteps.map((step, index) => (
                  <li key={index} className="flex items-center gap-2 text-green-100 text-sm">
                    <ArrowRight className="h-3 w-3" />
                    {step}
                  </li>
                ))}
              </ul>
            </div>

            <Button 
              asChild
              className="w-full bg-white text-green-600 hover:bg-green-50"
            >
              <a 
                href={`https://github.com/${repositoryOwner}/${repositoryName}/actions`}
                target="_blank"
                rel="noopener noreferrer"
              >
                View GitHub Actions
                <ExternalLink className="h-4 w-4 ml-2" />
              </a>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Determine urgency level and messaging
  const isHighRisk = criticalCount > 0 || highCount > 0;
  const urgencyMessage = criticalCount > 0 
    ? `${criticalCount} critical vulnerabilities found`
    : highCount > 0 
    ? `${highCount} high-severity vulnerabilities found`
    : `${vulnerabilityCount} security issues found`;

  return (
    <Card className="bg-gradient-to-r from-blue-600 to-purple-600 border-none mb-8">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <CardTitle className="text-white flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Protect This Repository Automatically
            </CardTitle>
            <CardDescription className="text-blue-100">
              {urgencyMessage}. Prevent similar issues in every pull request.
            </CardDescription>
          </div>
          {isHighRisk && (
            <Badge variant="destructive" className="bg-red-500">
              <AlertTriangle className="h-3 w-3 mr-1" />
              High Risk
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Value proposition icons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-2">⚡</div>
              <div className="text-sm text-blue-100 font-medium">5-minute setup</div>
              <div className="text-xs text-blue-200">One-time configuration</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-2">🛡️</div>
              <div className="text-sm text-blue-100 font-medium">PR protection</div>
              <div className="text-xs text-blue-200">Block vulnerable merges</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-white mb-2">🤖</div>
              <div className="text-sm text-blue-100 font-medium">Auto-fixes</div>
              <div className="text-xs text-blue-200">AI-generated solutions</div>
            </div>
          </div>

          {/* Social proof */}
          <div className="text-center">
            <div className="text-xs text-blue-200 mb-1">
              Join 1,000+ developers using Fortify PR protection
            </div>
            <div className="flex justify-center items-center gap-1 text-xs text-blue-100">
              <span>95% of auto-fixes accepted</span>
              <span>•</span>
              <span>50,000+ vulnerabilities prevented</span>
            </div>
          </div>

          {/* Error display */}
          {error && (
            <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-3">
              <div className="flex items-center gap-2 text-red-100">
                <AlertTriangle className="h-4 w-4" />
                <span className="text-sm">{error}</span>
              </div>
            </div>
          )}

          {/* CTA Button */}
          <Button 
            onClick={handleInstallGitHubActions}
            disabled={installing}
            className="w-full bg-white text-blue-600 hover:bg-blue-50 font-semibold py-3"
          >
            {installing ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Installing GitHub Actions...
              </>
            ) : (
              <>
                Install GitHub Actions - Free
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>

          {/* What you'll get */}
          <div className="bg-blue-500/20 rounded-lg p-4">
            <h4 className="text-white font-medium mb-3">What you&apos;ll get:</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2 text-blue-100">
                <CheckCircle className="h-4 w-4 text-green-300" />
                Automatic security scans on every PR
              </li>
              <li className="flex items-center gap-2 text-blue-100">
                <CheckCircle className="h-4 w-4 text-green-300" />
                Block merges when vulnerabilities found
              </li>
              <li className="flex items-center gap-2 text-blue-100">
                <CheckCircle className="h-4 w-4 text-green-300" />
                AI-generated fixes in PR comments
              </li>
              <li className="flex items-center gap-2 text-blue-100">
                <CheckCircle className="h-4 w-4 text-green-300" />
                Security dashboard and reporting
              </li>
            </ul>
          </div>

          {/* Technical preview */}
          <details className="bg-blue-800/30 rounded-lg">
            <summary className="text-blue-100 text-sm cursor-pointer p-3 hover:bg-blue-700/30">
              Preview workflow configuration
            </summary>
            <div className="px-3 pb-3">
              <pre className="text-xs text-blue-200 bg-blue-900/50 p-3 rounded overflow-x-auto">
{`.github/workflows/fortify-security.yml
name: Fortify Security Scan
on:
  pull_request:
    types: [opened, synchronize, reopened]
jobs:
  security-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: fortify-security/pr-scan-action@v1
        with:
          severity-threshold: 'HIGH'
          block-merge: true`}
              </pre>
            </div>
          </details>
        </div>
      </CardContent>
    </Card>
  );
}
