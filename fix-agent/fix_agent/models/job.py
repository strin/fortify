"""
Fix job models and data structures.

This module defines the data structures used for fix jobs, including job status,
types, and the various data payloads used throughout the fix process.
"""

import json
from datetime import datetime
from enum import Enum
from typing import Dict, Any, Optional, List
from pydantic import BaseModel, Field, validator


class FixJobType(str, Enum):
    """Types of fix jobs supported by the fix agent."""
    VULNERABILITY_FIX = "VULNERABILITY_FIX"
    SECURITY_ENHANCEMENT = "SECURITY_ENHANCEMENT"


class FixJobStatus(str, Enum):
    """Status values for fix jobs throughout their lifecycle."""
    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class VulnerabilityData(BaseModel):
    """Vulnerability information needed for fixing."""
    title: str
    filePath: str
    startLine: int
    endLine: Optional[int] = None
    codeSnippet: str
    severity: str
    category: str
    description: str
    recommendation: str


class FixOptions(BaseModel):
    """Options for how the fix should be applied."""
    createBranch: bool = True
    branchPrefix: str = "fix"
    createPullRequest: bool = True
    prTitle: str
    prDescription: str


class FixJobData(BaseModel):
    """Complete data structure for a fix job."""
    vulnerabilityId: str
    scanJobId: str
    repositoryUrl: str
    branch: str = "main"
    commitSha: Optional[str] = None
    vulnerability: VulnerabilityData
    fixOptions: FixOptions


class FixResult(BaseModel):
    """Result data structure when a fix is completed."""
    success: bool
    branchName: Optional[str] = None
    commitSha: Optional[str] = None
    pullRequestUrl: Optional[str] = None
    pullRequestId: Optional[int] = None
    filesModified: List[str] = Field(default_factory=list)
    fixApplied: str  # Description of what was fixed
    confidence: float = 0.0  # AI confidence in the fix (0-1)


class FixJob(BaseModel):
    """Complete fix job object."""
    id: str
    type: FixJobType
    status: FixJobStatus
    data: FixJobData
    result: Optional[FixResult] = None
    error: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None

    class Config:
        use_enum_values = True
        json_encoders = {
            datetime: lambda v: v.isoformat() if v else None
        }

    @validator('data', pre=True)
    def parse_data(cls, v):
        """Parse data field if it comes as a string."""
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                raise ValueError("Invalid JSON in data field")
        return v

    @validator('result', pre=True)
    def parse_result(cls, v):
        """Parse result field if it comes as a string."""
        if v is None:
            return None
        if isinstance(v, str):
            try:
                return json.loads(v)
            except json.JSONDecodeError:
                raise ValueError("Invalid JSON in result field")
        return v

    def to_dict(self) -> Dict[str, Any]:
        """Convert job to dictionary format for JSON serialization."""
        return {
            "id": self.id,
            "type": self.type.value if isinstance(self.type, FixJobType) else self.type,
            "status": self.status.value if isinstance(self.status, FixJobStatus) else self.status,
            "data": self.data.dict() if isinstance(self.data, FixJobData) else self.data,
            "result": self.result.dict() if isinstance(self.result, FixResult) else self.result,
            "error": self.error,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "updated_at": self.updated_at.isoformat() if self.updated_at else None,
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "finished_at": self.finished_at.isoformat() if self.finished_at else None,
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'FixJob':
        """Create FixJob instance from dictionary."""
        # Parse datetime fields
        datetime_fields = ['created_at', 'updated_at', 'started_at', 'finished_at']
        for field in datetime_fields:
            if data.get(field) and isinstance(data[field], str):
                data[field] = datetime.fromisoformat(data[field].replace('Z', '+00:00'))

        # Parse nested objects
        if 'data' in data and isinstance(data['data'], dict):
            data['data'] = FixJobData.parse_obj(data['data'])
        
        if 'result' in data and data['result'] and isinstance(data['result'], dict):
            data['result'] = FixResult.parse_obj(data['result'])

        return cls.parse_obj(data)


def ensure_json_serializable(data: Any) -> Any:
    """
    Convert data to JSON-serializable format.
    
    This function handles complex objects like datetime, Pydantic models,
    and Enums to ensure they can be properly serialized to JSON.
    """
    if isinstance(data, datetime):
        return data.isoformat()
    elif isinstance(data, BaseModel):
        return data.dict()
    elif isinstance(data, Enum):
        return data.value
    elif isinstance(data, dict):
        return {k: ensure_json_serializable(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [ensure_json_serializable(item) for item in data]
    else:
        return data