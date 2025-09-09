import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/app/api/auth/[...nextauth]/config';
import { prisma } from '@/lib/prisma';

interface GitHubActionsInstallRequest {
  enable_branch_protection?: boolean;
  config?: {
    mode?: 'full' | 'diff-only';
    severity_threshold?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    block_merge?: boolean;
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ scanId: string }> }
) {
  try {
    const { scanId } = await params;
    const session = await getServerSession(authConfig);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body: GitHubActionsInstallRequest = await request.json();
    
    // Find the user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Find the scan job and validate ownership
    const scanJob = await prisma.scanJob.findUnique({
      where: { id: scanId },
      include: {
        scanTarget: true
      }
    });

    if (!scanJob) {
      return NextResponse.json({ error: 'Scan not found' }, { status: 404 });
    }

    if (scanJob.userId !== user.id) {
      return NextResponse.json({ error: 'Unauthorized access to scan' }, { status: 403 });
    }

    if (scanJob.status !== 'COMPLETED') {
      return NextResponse.json({ 
        error: 'Scan must be completed before installing GitHub Actions' 
      }, { status: 400 });
    }

    // Extract repository information from scan target
    if (!scanJob.scanTarget) {
      return NextResponse.json({ error: 'Scan target not found' }, { status: 404 });
    }

    const repoUrl = scanJob.scanTarget.repoUrl;
    const repoMatch = repoUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
    
    if (!repoMatch) {
      return NextResponse.json({ error: 'Invalid repository URL' }, { status: 400 });
    }

    const [, owner, repo] = repoMatch;
    const repoName = repo.replace(/\.git$/, '');

    // Check if user has GitHub access token
    if (!user.githubAccessToken) {
      return NextResponse.json({ 
        error: 'GitHub access token not found. Please reconnect your GitHub account.' 
      }, { status: 400 });
    }

    // Generate workflow content
    const config = {
      mode: body.config?.mode || 'full',
      severity_threshold: body.config?.severity_threshold || 'HIGH',
      block_merge: body.config?.block_merge !== false
    };

    const workflowContent = generateFortifyWorkflow(config);

    // Create workflow file via GitHub API
    const githubResponse = await createWorkflowFile(
      user.githubAccessToken,
      owner,
      repoName,
      workflowContent
    );

    if (!githubResponse.success) {
      return NextResponse.json({ 
        error: githubResponse.error || 'Failed to create workflow file' 
      }, { status: 500 });
    }

    // Set up branch protection if requested
    let branchProtectionResult = null;
    if (body.enable_branch_protection) {
      branchProtectionResult = await setupBranchProtection(
        user.githubAccessToken,
        owner,
        repoName,
        scanJob.scanTarget.branch || 'main'
      );
    }

    // Track conversion event (you can expand this with analytics)
    console.log(`GitHub Actions installed for ${owner}/${repoName} by user ${user.id}`);

    return NextResponse.json({
      success: true,
      workflow_file: '.github/workflows/fortify-security.yml',
      commit_sha: githubResponse.commit_sha,
      repository: `${owner}/${repoName}`,
      branch_protection_enabled: branchProtectionResult?.success || false,
      next_steps: [
        'Create a pull request to test the workflow',
        'Review branch protection settings in GitHub',
        'Configure team notifications for security alerts'
      ]
    });

  } catch (error) {
    console.error('Error installing GitHub Actions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

function generateFortifyWorkflow(config: {
  mode: string;
  severity_threshold: string;
  block_merge: boolean;
}): string {
  return `name: Fortify Security Scan
on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  security-scan:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      pull-requests: write
      checks: write
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Run Fortify Security Scan
        uses: fortify-security/pr-scan-action@v1
        with:
          api-token: \${{ secrets.FORTIFY_API_TOKEN }}
          scan-mode: '${config.mode}'
          severity-threshold: '${config.severity_threshold}'
          block-merge: ${config.block_merge}
          
      - name: Upload scan results
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: fortify-scan-results
          path: fortify-results.json
          retention-days: 30
`;
}

async function createWorkflowFile(
  githubToken: string,
  owner: string,
  repo: string,
  content: string
): Promise<{ success: boolean; commit_sha?: string; error?: string }> {
  try {
    const path = '.github/workflows/fortify-security.yml';
    
    // Check if file already exists
    const checkResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'Fortify-Security-App'
        }
      }
    );

    let sha = undefined;
    if (checkResponse.ok) {
      const existingFile = await checkResponse.json();
      sha = existingFile.sha;
    }

    // Create or update the file
    const createResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'Fortify-Security-App'
        },
        body: JSON.stringify({
          message: sha ? 'Update Fortify security scanning workflow' : 'Add Fortify security scanning workflow',
          content: Buffer.from(content).toString('base64'),
          ...(sha && { sha })
        })
      }
    );

    if (!createResponse.ok) {
      const errorData = await createResponse.json();
      return { 
        success: false, 
        error: errorData.message || 'Failed to create workflow file' 
      };
    }

    const result = await createResponse.json();
    return { 
      success: true, 
      commit_sha: result.commit.sha 
    };

  } catch (error) {
    console.error('Error creating workflow file:', error);
    return { 
      success: false, 
      error: 'Failed to create workflow file' 
    };
  }
}

async function setupBranchProtection(
  githubToken: string,
  owner: string,
  repo: string,
  branch: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/branches/${branch}/protection`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'Fortify-Security-App'
        },
        body: JSON.stringify({
          required_status_checks: {
            strict: true,
            contexts: ['security-scan']
          },
          enforce_admins: false,
          required_pull_request_reviews: null,
          restrictions: null
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.warn('Branch protection setup failed:', errorData.message);
      return { 
        success: false, 
        error: errorData.message || 'Failed to setup branch protection' 
      };
    }

    return { success: true };

  } catch (error) {
    console.error('Error setting up branch protection:', error);
    return { 
      success: false, 
      error: 'Failed to setup branch protection' 
    };
  }
}
