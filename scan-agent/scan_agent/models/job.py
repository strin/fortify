"""Job models for vulnerability scanning."""
from enum import Enum
from typing import Optional, Dict, Any
from dataclasses import dataclass, field
from datetime import datetime
import json

class JobStatus(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"

class JobType(Enum):
    SCAN_REPO = "scan_repo"
    SCAN_FILE = "scan_file"
    BATCH_SCAN = "batch_scan"

@dataclass
class ScanJobData:
    """Data for a repository scan job."""
    repo_url: str
    branch: Optional[str] = "main"
    scan_options: Dict[str, Any] = field(default_factory=dict)
    claude_cli_args: Optional[str] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "repo_url": self.repo_url,
            "branch": self.branch,
            "scan_options": self.scan_options,
            "claude_cli_args": self.claude_cli_args
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> "ScanJobData":
        return cls(**data)

@dataclass
class Job:
    """Represents a job in the queue."""
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