"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { signIn } from "next-auth/react";
import ExitIntentPopup from "./ExitIntentPopup";
import Globe3D from "./Globe3D";
import SampleScanReport from "./SampleScanReport";

export default function LandingPage() {
  const handleGitHubScan = () => {
    signIn("github", { callbackUrl: "/new-project" });
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    element?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-gray-950 via-gray-900 to-gray-950 text-white">
      {/* Ambient gradient orbs */}
      <div className="pointer-events-none absolute -top-24 -left-24 h-80 w-80 rounded-full bg-purple-600/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-cyan-500/10 blur-3xl" />
      <ExitIntentPopup />

      {/* Hero Section */}
      <section className="pt-8 pb-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <nav className="flex justify-between items-center mb-16">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full blur-md opacity-60 animate-pulse" />
                <div className="relative bg-gradient-to-r from-blue-600 to-purple-600 rounded-full p-2">
                  <span className="text-xl">🔒</span>
                </div>
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                Fortify AI
              </h1>
            </div>
            <div className="flex gap-4">
              <Button 
                asChild 
                variant="ghost" 
                className="hover:scale-105 transition-transform duration-200"
              >
                <Link href="/login">Sign In</Link>
              </Button>
              <Button 
                variant="outline" 
                onClick={() => scrollToSection('pricing')}
                className="hover:scale-105 transition-transform duration-200"
              >
                Pricing
              </Button>
            </div>
          </nav>

          <div className="mx-auto max-w-7xl">
            <div className="grid md:grid-cols-12 gap-10 items-center">
              {/* Left: Messaging */}
              <div className="md:col-span-7">
                <h2 className="text-left text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
                  Keep the Vibe, Fortify the Code
                </h2>
                <p className="text-left text-xl md:text-2xl text-gray-300 mb-10 max-w-2xl">
                  Vibe coding is the biggest security risk of the AI era.
                  Fortify catches the vulnerabilities AI-generated code
                  creates—so you can move fast without shipping risk.
                </p>

                <div className="flex flex-col sm:flex-row gap-6 items-center mb-12">
                  <Button 
                    onClick={handleGitHubScan} 
                    size="xl" 
                    className="group bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 hover:scale-105 transform-gpu px-8 py-4 text-lg font-semibold"
                  >
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <div className="absolute inset-0 bg-white/20 rounded-full blur-md group-hover:blur-lg transition-all duration-300" />
                        <span className="relative text-2xl">🔒</span>
                      </div>
                      <span>Scan My GitHub Repo for Free</span>
                      <div className="ml-2 transform group-hover:translate-x-1 transition-transform duration-200">
                        →
                      </div>
                    </div>
                  </Button>
                  <div className="relative group">
                    <div className="absolute -inset-1 bg-gradient-to-r from-pink-600 to-purple-600 rounded-lg blur opacity-25 group-hover:opacity-75 transition duration-300" />
                    <div className="relative">
                      <SampleScanReport />
                    </div>
                  </div>
                </div>

                {/* Trust row */}
                <div className="flex flex-wrap items-center gap-x-6 gap-y-3 text-sm text-gray-300">
                  <span className="flex items-center">
                    <span className="text-green-400 mr-2">✅</span>1,000+
                    developers
                  </span>
                  <span className="h-3 w-px bg-gray-600 hidden sm:inline-block"></span>
                  <span className="flex items-center">
                    <span className="text-green-400 mr-2">✅</span>OWASP Top 10
                  </span>
                  <span className="h-3 w-px bg-gray-600 hidden sm:inline-block"></span>
                  <span className="flex items-center">
                    <span className="text-green-400 mr-2">✅</span>95% accuracy
                  </span>
                  <span className="h-3 w-px bg-gray-600 hidden sm:inline-block"></span>
                  <span className="flex items-center">
                    <span className="text-green-400 mr-2">✅</span>Read-only
                    GitHub access
                  </span>
                </div>
              </div>

              {/* Right: Rotating 3D Globe */}
              <div className="md:col-span-5">
                <div className="relative mx-auto h-72 w-72 md:h-[420px] md:w-[420px] rounded-full overflow-hidden">
                  <Globe3D className="h-full w-full" />
                  <div className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-br from-blue-500/20 via-purple-500/10 to-cyan-400/20 mix-blend-screen"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Problem Statement Section */}
      <section className="py-24 px-4 bg-gradient-to-b from-gray-900/40 to-gray-950/60 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 w-72 h-72 bg-red-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        </div>
        
        <div className="container mx-auto max-w-6xl relative">
          <div className="mb-16 text-center">
            <div className="inline-flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-full px-6 py-3 mb-6">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-red-400 font-medium text-sm uppercase tracking-wide">Security Alert</span>
            </div>
            <h3 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-red-400 via-orange-400 to-yellow-400 bg-clip-text text-transparent">
              Vibe Coding: A Big Security Risk
            </h3>
            <p className="text-xl md:text-2xl text-gray-300 max-w-4xl mx-auto mb-8 leading-relaxed">
              In the AI-generated code era, vibe coding has become a massive
              security vulnerability. Here&apos;s what&apos;s putting your codebase at risk:
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Add staggered animation classes to each card */}
            <Card className="group bg-card/70 border-destructive/20 hover:border-destructive/40 hover:shadow-lg hover:shadow-red-500/10 transition-all duration-300 hover:scale-105 transform-gpu animate-fadeInUp" style={{ animationDelay: '0.1s' }}>
              <CardHeader className="text-center">
                <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300 filter drop-shadow-lg">🚨</div>
                <CardTitle className="text-red-400 group-hover:text-red-300 transition-colors">
                  AI generates insecure code patterns
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 group-hover:text-gray-200 transition-colors leading-relaxed">
                  Vibe coding creates vulnerabilities that traditional security
                  tools miss entirely
                </p>
              </CardContent>
            </Card>

            <Card className="group bg-card/70 border-yellow-500/20 hover:border-yellow-400/40 hover:shadow-lg hover:shadow-yellow-500/10 transition-all duration-300 hover:scale-105 transform-gpu animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
              <CardHeader className="text-center">
                <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300 filter drop-shadow-lg">⏰</div>
                <CardTitle className="text-yellow-400 group-hover:text-yellow-300 transition-colors">
                  Manual reviews slow you down
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 group-hover:text-gray-200 transition-colors leading-relaxed">
                  Traditional tools can&apos;t keep pace with AI-assisted
                  development
                </p>
              </CardContent>
            </Card>

            <Card className="group bg-card/70 border-destructive/20 hover:border-destructive/40 hover:shadow-lg hover:shadow-red-500/10 transition-all duration-300 hover:scale-105 transform-gpu animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
              <CardHeader className="text-center">
                <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300 filter drop-shadow-lg">💸</div>
                <CardTitle className="text-red-400 group-hover:text-red-300 transition-colors">
                  One breach costs more than prevention
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 group-hover:text-gray-200 transition-colors leading-relaxed">
                  Security incidents average <span className="font-bold text-red-400">$4.45M</span> in damages
                </p>
              </CardContent>
            </Card>

            <Card className="group bg-card/70 border-orange-500/20 hover:border-orange-400/40 hover:shadow-lg hover:shadow-orange-500/10 transition-all duration-300 hover:scale-105 transform-gpu animate-fadeInUp" style={{ animationDelay: '0.4s' }}>
              <CardHeader className="text-center">
                <div className="text-5xl mb-4 group-hover:scale-110 transition-transform duration-300 filter drop-shadow-lg">🔧</div>
                <CardTitle className="text-orange-400 group-hover:text-orange-300 transition-colors">
                  Vibe coding creates unknown risks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 group-hover:text-gray-200 transition-colors leading-relaxed">
                  Software engineers don&apos;t know what security risks AI has
                  introduced into their codebase
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Solution Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h3 className="text-4xl md:text-5xl font-bold mb-6">
              The Only Security Solution Built for Vibe Coding
            </h3>
            <p className="text-xl text-gray-300 max-w-4xl mx-auto mb-8">
              Our AI agents understand how AI generates code and fortify it
              against the unique vulnerabilities that come with AI-assisted
              development.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <Card className="bg-gray-800/80 border-blue-500/20">
              <CardHeader className="text-center">
                <CardTitle className="text-blue-400">
                  Instant Detection
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">
                  Scans code and dependencies in seconds, not hours
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/80 border-green-500/20">
              <CardHeader className="text-center">
                <CardTitle className="text-green-400">
                  AI-Powered Fixes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">
                  Automatically generates pull requests with security patches
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/80 border-purple-500/20">
              <CardHeader className="text-center">
                <CardTitle className="text-purple-400">
                  Developer-Friendly
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">
                  Works in your IDE, CI/CD, and GitHub workflow
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/80 border-cyan-500/20">
              <CardHeader className="text-center">
                <CardTitle className="text-cyan-400">
                  Zero False Positives
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">
                  Smart AI reduces noise, focuses on real threats
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 px-4 bg-gray-800/50">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h3 className="text-4xl md:text-5xl font-bold mb-6">
              Core Features
            </h3>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            <div>
              <div className="flex items-center mb-6">
                <span className="text-4xl mr-4">🔍</span>
                <h4 className="text-2xl font-bold">Comprehensive Scanning</h4>
              </div>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-start">
                  <span className="text-blue-400 mr-3">•</span>
                  <span>
                    <strong>Internal Code Analysis</strong> - Detects auth
                    issues, data leaks, exposed secrets
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-3">•</span>
                  <span>
                    <strong>Dependency Monitoring</strong> - Identifies
                    vulnerable packages and backdoors
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-blue-400 mr-3">•</span>
                  <span>
                    <strong>Real-time Feedback</strong> - Get security insights
                    as you code
                  </span>
                </li>
              </ul>
            </div>

            <div>
              <div className="flex items-center mb-6">
                <span className="text-4xl mr-4">🛠️</span>
                <h4 className="text-2xl font-bold">Automated Fixes</h4>
              </div>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-start">
                  <span className="text-green-400 mr-3">•</span>
                  <span>
                    <strong>Smart PR Generation</strong> - Creates pull requests
                    with secure code implementations
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-3">•</span>
                  <span>
                    <strong>Context-Aware Solutions</strong> - Fixes consider
                    your specific codebase and framework
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-green-400 mr-3">•</span>
                  <span>
                    <strong>One-Click Application</strong> - Apply security
                    patches instantly
                  </span>
                </li>
              </ul>
            </div>

            <div>
              <div className="flex items-center mb-6">
                <span className="text-4xl mr-4">🔗</span>
                <h4 className="text-2xl font-bold">Seamless Integration</h4>
              </div>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-start">
                  <span className="text-purple-400 mr-3">•</span>
                  <span>
                    <strong>GitHub Integration</strong> - Automatic scans on
                    pull requests
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-purple-400 mr-3">•</span>
                  <span>
                    <strong>IDE Plugins</strong> - VS Code extension for
                    real-time feedback
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-purple-400 mr-3">•</span>
                  <span>
                    <strong>CI/CD Pipeline</strong> - GitHub Actions integration
                    in under 15 minutes
                  </span>
                </li>
              </ul>
            </div>

            <div>
              <div className="flex items-center mb-6">
                <span className="text-4xl mr-4">📊</span>
                <h4 className="text-2xl font-bold">Security Dashboard</h4>
              </div>
              <ul className="space-y-3 text-gray-300">
                <li className="flex items-start">
                  <span className="text-cyan-400 mr-3">•</span>
                  <span>
                    <strong>Vulnerability Tracking</strong> - Monitor security
                    posture over time
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-cyan-400 mr-3">•</span>
                  <span>
                    <strong>Compliance Reporting</strong> - Generate reports for
                    security teams
                  </span>
                </li>
                <li className="flex items-start">
                  <span className="text-cyan-400 mr-3">•</span>
                  <span>
                    <strong>Risk Prioritization</strong> - Focus on the most
                    critical issues first
                  </span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <h3 className="text-4xl md:text-5xl font-bold mb-6">
              Trusted by Developers Who Ship Fast and Secure
            </h3>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            <Card className="bg-gray-800/80 border-gray-600">
              <CardContent className="pt-6">
                <blockquote className="text-lg text-gray-300 mb-4">
                  &quot;Fortify AI caught 12 security issues in our Supabase
                  integration that we completely missed. The auto-generated
                  fixes saved us hours of research.&quot;
                </blockquote>
                <cite className="text-gray-400">
                  — Sarah Chen, Senior Developer at TechCorp
                </cite>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/80 border-gray-600">
              <CardContent className="pt-6">
                <blockquote className="text-lg text-gray-300 mb-4">
                  &quot;Finally, a security tool that actually helps instead of
                  just complaining. The GitHub integration is seamless.&quot;
                </blockquote>
                <cite className="text-gray-400">
                  — Marcus Rodriguez, Security Engineer
                </cite>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-blue-400 mb-2">
                50,000+
              </div>
              <div className="text-gray-300">
                vulnerabilities detected and fixed
              </div>
            </div>
            <div>
              <div className="text-4xl font-bold text-green-400 mb-2">95%</div>
              <div className="text-gray-300">
                of auto-generated fixes are accepted
              </div>
            </div>
            <div>
              <div className="text-4xl font-bold text-purple-400 mb-2">
                &lt;5%
              </div>
              <div className="text-gray-300">false positive rate</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-cyan-400 mb-2">10s</div>
              <div className="text-gray-300">average scan time</div>
            </div>
          </div>
        </div>
      </section>

      {/* Secondary CTA */}
      <section className="py-16 px-4 bg-gray-800/50">
        <div className="container mx-auto max-w-4xl text-center">
          <h3 className="text-3xl md:text-4xl font-bold mb-4">
            See Fortify AI in Action
          </h3>
          <p className="text-xl text-gray-300 mb-8">
            Watch how we detect and fix a real SQL injection vulnerability
          </p>
          <Button size="xl" variant="outline">
            ▶️ Watch 2-Minute Demo
          </Button>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 relative overflow-hidden">
        {/* Background effects */}
        <div className="absolute inset-0">
          <div className="absolute top-10 left-20 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-10 right-20 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>
        
        <div className="container mx-auto max-w-6xl relative">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-full px-6 py-3 mb-6">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-blue-400 font-medium text-sm uppercase tracking-wide">Pricing</span>
            </div>
            <h3 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-blue-400 via-purple-400 to-cyan-400 bg-clip-text text-transparent">
              Simple, Transparent Pricing
            </h3>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Choose the plan that fits your security needs. Start free and scale as you grow.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <Card className="bg-gray-800/80 border-gray-600 relative">
              <CardHeader className="text-center">
                <div className="mb-4">
                  <Badge variant="secondary" className="mb-4">
                    Perfect for Getting Started
                  </Badge>
                </div>
                <CardTitle className="text-3xl font-bold">Free Tier</CardTitle>
                <div className="text-4xl font-bold mt-4">
                  $0
                  <span className="text-lg font-normal text-gray-400">
                    /month
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <span className="text-green-400 mr-3">✅</span>Public
                    repository scans
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-400 mr-3">✅</span>Email
                    security reports
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-400 mr-3">✅</span>Basic
                    vulnerability detection
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-400 mr-3">✅</span>Up to 10
                    scans per month
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-400 mr-3">✅</span>Community
                    support
                  </li>
                </ul>
              <Button
                onClick={handleGitHubScan}
                className="w-full mt-6 hover:scale-105 transition-all duration-200 hover:shadow-lg"
                variant="secondary"
              >
                <span className="mr-2">✨</span>
                Get Started Free
              </Button>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/80 border-blue-500 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-blue-600 text-white">Most Popular</Badge>
              </div>
              <CardHeader className="text-center">
                <div className="mb-4">
                  <Badge variant="secondary" className="mb-4">
                    For Serious Development
                  </Badge>
                </div>
                <CardTitle className="text-3xl font-bold">Pro Tier</CardTitle>
                <div className="text-4xl font-bold mt-4">
                  $49
                  <span className="text-lg font-normal text-gray-400">
                    /user/month
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <li className="flex items-center">
                    <span className="text-green-400 mr-3">✅</span>Everything in
                    Free
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-400 mr-3">✅</span>Private
                    repository access
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-400 mr-3">✅</span>Unlimited
                    scans
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-400 mr-3">✅</span>Real-time IDE
                    integration
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-400 mr-3">✅</span>Auto-fix pull
                    requests
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-400 mr-3">✅</span>CI/CD
                    pipeline integration
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-400 mr-3">✅</span>Priority
                    support
                  </li>
                  <li className="flex items-center">
                    <span className="text-green-400 mr-3">✅</span>Compliance
                    reporting
                  </li>
                </ul>
              <Button
                onClick={handleGitHubScan}
                className="w-full mt-6 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
              >
                <span className="mr-2">🚀</span>
                Start Pro Trial
              </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-4 bg-gray-800/50">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h3 className="text-4xl md:text-5xl font-bold mb-6">
              Frequently Asked Questions
            </h3>
          </div>

          <div className="space-y-8">
            <Card className="bg-gray-800/80 border-gray-600">
              <CardHeader>
                <CardTitle className="text-xl">
                  Do you access my private code?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">
                  For public repositories, we only analyze what&apos;s publicly
                  available. For private repos (Pro tier), we use read-only
                  access and never store your code.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/80 border-gray-600">
              <CardHeader>
                <CardTitle className="text-xl">
                  How accurate are the vulnerability detections?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">
                  Our AI maintains 95% accuracy with less than 5% false
                  positives, trained on millions of security patterns.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/80 border-gray-600">
              <CardHeader>
                <CardTitle className="text-xl">
                  What programming languages do you support?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">
                  Currently JavaScript and Python, with more languages coming
                  soon based on user feedback.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/80 border-gray-600">
              <CardHeader>
                <CardTitle className="text-xl">
                  How long does a scan take?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">
                  Most scans complete in under 60 seconds. Large repositories
                  may take up to 5 minutes.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gray-800/80 border-gray-600">
              <CardHeader>
                <CardTitle className="text-xl">
                  Can I integrate with my existing tools?
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300">
                  Yes! We integrate with GitHub, VS Code, and popular CI/CD
                  pipelines. More integrations coming soon.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-16 px-4">
        <div className="container mx-auto max-w-4xl text-center">
          <h3 className="text-4xl md:text-5xl font-bold mb-6">
            Join 1,000+ Developers Building Secure Software
          </h3>
          <p className="text-xl text-gray-300 mb-8">
            Start with a free scan of your public repository. Upgrade anytime.
          </p>
                <Button
                  onClick={handleGitHubScan}
                  size="xl"
                  className="group bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-2xl hover:shadow-blue-500/25 transition-all duration-300 hover:scale-105 transform-gpu mb-6 px-12 py-6 text-xl font-bold"
                >
                  <div className="flex items-center gap-4">
                    <div className="relative">
                      <div className="absolute inset-0 bg-white/20 rounded-full blur-md group-hover:blur-lg transition-all duration-300" />
                      <span className="relative text-3xl">🚀</span>
                    </div>
                    <span>Scan My Code Now - Free</span>
                    <div className="ml-2 transform group-hover:translate-x-2 transition-transform duration-200">
                      →
                    </div>
                  </div>
                </Button>
          <p className="text-sm text-gray-400">
            Read-only GitHub access • Results in 60 seconds • Cancel anytime
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-gray-700">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <span className="text-lg font-bold">🔒 Fortify AI</span>
              <p className="text-sm text-gray-400 mt-1">
                Stop security vulnerabilities before they ship
              </p>
            </div>
            <div className="flex gap-6 text-sm text-gray-400">
              <Link href="/privacy" className="hover:text-white">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-white">
                Terms of Service
              </Link>
              <Link href="/contact" className="hover:text-white">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
