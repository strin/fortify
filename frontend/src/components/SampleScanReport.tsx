"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AlertTriangle, Shield, Code, GitBranch } from "lucide-react"

export default function SampleScanReport() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="xl" variant="outline">
          📋 See Example Scan Report
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-gray-900 border-gray-700">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-400" />
            Security Scan Report - react-todo-app
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 text-white">
          {/* Summary Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Card className="bg-red-900/20 border-red-500/30">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-red-400">5</div>
                <div className="text-sm text-red-300">Critical Issues</div>
              </CardContent>
            </Card>
            <Card className="bg-yellow-900/20 border-yellow-500/30">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-yellow-400">3</div>
                <div className="text-sm text-yellow-300">Medium Issues</div>
              </CardContent>
            </Card>
            <Card className="bg-blue-900/20 border-blue-500/30">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-blue-400">2</div>
                <div className="text-sm text-blue-300">Low Issues</div>
              </CardContent>
            </Card>
            <Card className="bg-green-900/20 border-green-500/30">
              <CardContent className="p-4 text-center">
                <div className="text-2xl font-bold text-green-400">95%</div>
                <div className="text-sm text-green-300">Security Score</div>
              </CardContent>
            </Card>
          </div>

          {/* Detailed Issues */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold mb-4">Detected Vulnerabilities</h3>
            
            {/* Critical Issue */}
            <Card className="bg-red-900/10 border-red-500/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-red-400">
                    <AlertTriangle className="w-5 h-5" />
                    SQL Injection Vulnerability
                  </CardTitle>
                  <Badge variant="destructive">Critical</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <Code className="w-4 h-4" />
                  <span>src/api/users.js:42</span>
                </div>
                <p className="text-gray-300">
                  Direct string concatenation in SQL query allows potential SQL injection attacks.
                </p>
                <div className="bg-gray-800 p-3 rounded-md">
                  <code className="text-sm text-red-300">
                    const query = &quot;SELECT * FROM users WHERE id = &quot; + userId;
                  </code>
                </div>
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-green-400" />
                  <span className="text-green-400 text-sm">Auto-fix available</span>
                  <Button size="sm" variant="success">
                    Apply Fix
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Medium Issue */}
            <Card className="bg-yellow-900/10 border-yellow-500/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-yellow-400">
                    <AlertTriangle className="w-5 h-5" />
                    Hardcoded API Key
                  </CardTitle>
                  <Badge className="bg-yellow-600 text-white">Medium</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <Code className="w-4 h-4" />
                  <span>src/config/api.js:15</span>
                </div>
                <p className="text-gray-300">
                  API key is hardcoded in source code and should be moved to environment variables.
                </p>
                <div className="bg-gray-800 p-3 rounded-md">
                  <code className="text-sm text-yellow-300">
                    const API_KEY = &quot;sk-1234567890abcdef...&quot;;
                  </code>
                </div>
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-green-400" />
                  <span className="text-green-400 text-sm">Auto-fix available</span>
                  <Button size="sm" variant="success">
                    Apply Fix
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Dependency Issue */}
            <Card className="bg-red-900/10 border-red-500/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-red-400">
                    <AlertTriangle className="w-5 h-5" />
                    Vulnerable Dependency
                  </CardTitle>
                  <Badge variant="destructive">Critical</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-gray-300">
                  <Code className="w-4 h-4" />
                  <span>package.json</span>
                </div>
                <p className="text-gray-300">
                  lodash@4.17.20 contains prototype pollution vulnerability (CVE-2021-23337)
                </p>
                <div className="bg-gray-800 p-3 rounded-md">
                  <code className="text-sm text-red-300">
                    &quot;lodash&quot;: &quot;4.17.20&quot;
                  </code>
                </div>
                <div className="flex items-center gap-2">
                  <GitBranch className="w-4 h-4 text-green-400" />
                  <span className="text-green-400 text-sm">Auto-fix available - Update to 4.17.21</span>
                  <Button size="sm" variant="success">
                    Apply Fix
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Scan Details */}
          <div className="bg-gray-800/50 p-4 rounded-lg">
            <h4 className="font-semibold mb-2">Scan Details</h4>
            <div className="grid grid-cols-2 gap-4 text-sm text-gray-300">
              <div>
                <span className="text-gray-400">Repository:</span> user/react-todo-app
              </div>
              <div>
                <span className="text-gray-400">Scan Duration:</span> 23 seconds
              </div>
              <div>
                <span className="text-gray-400">Files Scanned:</span> 47
              </div>
              <div>
                <span className="text-gray-400">Languages:</span> JavaScript, TypeScript
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button variant="cta">
              Get Full Report
            </Button>
            <Button variant="outline">
              Download PDF
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
