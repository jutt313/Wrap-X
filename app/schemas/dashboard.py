from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime


class DashboardStatsResponse(BaseModel):
    total_requests: int
    success_rate: float  # percentage 0-100
    active_wrapped_apis: int
    estimated_cost: float  # USD
    
    class Config:
        from_attributes = True


class GraphDataset(BaseModel):
    name: str
    data: List[float]


class GraphDataResponse(BaseModel):
    dates: List[str]  # ISO date strings
    datasets: List[GraphDataset]
    averages: Optional[List[float]] = None  # For success rate graph
    totals: Optional[List[float]] = None  # For cost graph
    
    class Config:
        from_attributes = True


class WrappedAPIListItem(BaseModel):
    id: int
    name: str
    endpoint_id: str
    is_active: bool
    provider_name: Optional[str] = None
    requests_count: int  # 24h requests
    success_rate: float  # percentage
    cost: float  # total cost
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    class Config:
        from_attributes = True

