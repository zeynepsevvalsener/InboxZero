from datetime import datetime

from pydantic import BaseModel, Field


class CreateJobRequest(BaseModel):
    items: list[str] = Field(min_length=1)
    locale: str = Field(default="en", pattern="^(en|tr)$")


class ItemResponse(BaseModel):
    id: str
    status: str
    attempts: int
    input_text: str
    category: str | None = None
    priority: str | None = None
    sentiment: str | None = None
    summary: str | None = None
    suggested_reply: str | None = None
    error: str | None = None
    updated_at: datetime
    retryable: bool = False


class JobCounts(BaseModel):
    queued: int = 0
    processing: int = 0
    done: int = 0
    failed: int = 0


class JobSummaryResponse(BaseModel):
    id: str
    status: str
    total_items: int
    created_at: datetime
    counts: JobCounts
    progress: float = Field(description="Percentage of items in terminal state (done + failed)")


class JobDetailResponse(JobSummaryResponse):
    items: list[ItemResponse]


class CreateJobResponse(BaseModel):
    id: str
    status: str
    total_items: int
