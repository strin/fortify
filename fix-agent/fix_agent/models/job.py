"""Job models for vulnerability fixing."""

from enum import Enum
from typing import Optional, Dict, Any
from dataclasses import dataclass, field
from datetime import datetime
import json

class JobStatus(Enum):
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"

class JobType(Enum):
    FIX_VULNERABILITY = "FIX_VULNERABILITY"
    
@dataclass
class VulnerabilityData:
    """Data structure for vulnerability information."""
    id: str
    title: str
    description: str
    severity: str
    category: str
    filePath: str
    startLine: int
    endLine: Optional[int] = None
    codeSnippet: str
    recommendation: str
    metadata: Optional[Dict[str, Any]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "severity": self.severity,
            "category": self.category,
            "filePath": self.filePath,
            "startLine": self.startLine,
            "endLine": self.endLine,
            "codeSnippet": self.codeSnippet,
            "recommendation": self.recommendation,
            "metadata": self.metadata or {},
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "VulnerabilityData":
        return cls(
            id=data["id"],
            title=data["title"],
            description=data["description"],
            severity=data["severity"],
            category=data["category"],
            filePath=data["filePath"],
            startLine=data["startLine"],
            endLine=data.get("endLine"),
            codeSnippet=data["codeSnippet"],
            recommendation=data["recommendation"],
            metadata=data.get("metadata"),
        )

@dataclass
class FixJobData:
    """Data for a vulnerability fix job."""
    repo_url: str
    vulnerability: VulnerabilityData
    scan_job_id: str
    user_id: str
    branch: Optional[str] = "main"
    commit_hash: Optional[str] = None
    pr_options: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "repo_url": self.repo_url,
            "branch": self.branch,
            "commit_hash": self.commit_hash,
            "vulnerability": self.vulnerability.to_dict(),
            "scan_job_id": self.scan_job_id,
            "user_id": self.user_id,
            "pr_options": self.pr_options,
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "FixJobData":
        return cls(
            repo_url=data["repo_url"],
            branch=data.get("branch", "main"),
            commit_hash=data.get("commit_hash"),
            vulnerability=VulnerabilityData.from_dict(data["vulnerability"]),
            scan_job_id=data["scan_job_id"],
            user_id=data["user_id"],
            pr_options=data.get("pr_options", {}),
        )

@dataclass
class Job:
    """Represents a fix job in the queue."""
    id: str
    type: JobType
    status: JobStatus
    data: Dict[str, Any]
    created_at: datetime
    updated_at: datetime
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "type": self.type.value,
            "status": self.status.value,
            "data": self.data,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "result": self.result,
            "error": self.error
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "Job":
        return cls(
            id=data["id"],
            type=JobType(data["type"]),
            status=JobStatus(data["status"]),
            data=data["data"],
            created_at=datetime.fromisoformat(data["created_at"]),
            updated_at=datetime.fromisoformat(data["updated_at"]),
            result=data.get("result"),
            error=data.get("error")
        )