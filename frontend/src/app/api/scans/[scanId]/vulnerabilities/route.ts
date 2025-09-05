import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "@/app/api/auth/[...nextauth]/utils";

export async function GET(
  request: NextRequest,
  { params }: { params: { scanId: string } }
) {
  try {
    const session = await getServerSession();
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { scanId } = params;
    const { searchParams } = new URL(request.url);
    
    // Parse query parameters
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const severity = searchParams.get('severity');
    const category = searchParams.get('category');
    const filePath = searchParams.get('filePath');

    // First, verify the scan belongs to the user
    const scanJob = await prisma.scanJob.findFirst({
      where: {
        id: scanId,
        userId: session.user.id,
      },
      select: {
        id: true,
        data: true,
        status: true,
        createdAt: true,
        finishedAt: true,
        vulnerabilitiesFound: true,
      },
    });

    if (!scanJob) {
      return NextResponse.json(
        { error: "Scan not found or unauthorized" },
        { status: 404 }
      );
    }

    // Build where clause for vulnerabilities
    const whereClause: any = {
      scanJobId: scanId,
    };

    if (severity) {
      whereClause.severity = severity;
    }

    if (category) {
      whereClause.category = category;
    }

    if (filePath) {
      whereClause.filePath = {
        contains: filePath,
        mode: 'insensitive',
      };
    }

    // Get total count for pagination
    const totalCount = await prisma.codeVulnerability.count({
      where: whereClause,
    });

    // Get vulnerabilities with pagination
    const vulnerabilities = await prisma.codeVulnerability.findMany({
      where: whereClause,
      orderBy: [
        { severity: 'desc' }, // Order by severity (CRITICAL first)
        { filePath: 'asc' },
        { startLine: 'asc' },
      ],
      skip: (page - 1) * limit,
      take: limit,
    });

    // Get summary statistics
    const severityCounts = await prisma.codeVulnerability.groupBy({
      by: ['severity'],
      where: { scanJobId: scanId },
      _count: {
        severity: true,
      },
    });

    const categoryCounts = await prisma.codeVulnerability.groupBy({
      by: ['category'],
      where: { scanJobId: scanId },
      _count: {
        category: true,
      },
    });

    const fileCounts = await prisma.codeVulnerability.groupBy({
      by: ['filePath'],
      where: { scanJobId: scanId },
      _count: {
        filePath: true,
      },
      orderBy: {
        _count: {
          filePath: 'desc',
        },
      },
      take: 10, // Top 10 files with most vulnerabilities
    });

    const summary = {
      totalVulnerabilities: totalCount,
      severityCounts: severityCounts.reduce((acc, item) => {
        acc[item.severity] = item._count.severity;
        return acc;
      }, {} as Record<string, number>),
      categoryCounts: categoryCounts.reduce((acc, item) => {
        acc[item.category] = item._count.category;
        return acc;
      }, {} as Record<string, number>),
      topFiles: fileCounts.map(item => ({
        filePath: item.filePath,
        count: item._count.filePath,
      })),
    };

    const pagination = {
      page,
      limit,
      totalPages: Math.ceil(totalCount / limit),
      totalCount,
      hasNext: page < Math.ceil(totalCount / limit),
      hasPrev: page > 1,
    };

    return NextResponse.json({
      scanJob: {
        id: scanJob.id,
        data: scanJob.data,
        status: scanJob.status,
        createdAt: scanJob.createdAt,
        finishedAt: scanJob.finishedAt,
        vulnerabilitiesFound: scanJob.vulnerabilitiesFound,
      },
      vulnerabilities,
      summary,
      pagination,
    });

  } catch (error) {
    console.error("Error fetching vulnerabilities:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
