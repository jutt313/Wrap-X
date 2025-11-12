from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_, case, cast, Date
from sqlalchemy.orm import selectinload
from datetime import datetime, timedelta, date as date_type
from typing import Optional, List
from app.database import get_db
from app.models.user import User
from app.models.wrapped_api import WrappedAPI
from app.models.api_log import APILog
from app.models.llm_provider import LLMProvider
from app.schemas.dashboard import (
    DashboardStatsResponse,
    GraphDataResponse,
    GraphDataset,
    WrappedAPIListItem
)
from app.auth.dependencies import get_current_active_user
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


def get_date_filter(time_range: str):
    """Get date filter based on time range"""
    now = datetime.utcnow()
    if time_range == "today":
        return now - timedelta(days=1)
    elif time_range == "7d":
        return now - timedelta(days=7)
    elif time_range == "30d":
        return now - timedelta(days=30)
    else:
        return now - timedelta(days=30)  # default to 30 days


@router.get("/stats", response_model=DashboardStatsResponse)
async def get_dashboard_stats(
    time_range: str = Query(default="30d", regex="^(today|7d|30d)$"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get dashboard KPI statistics"""
    try:
        date_filter = get_date_filter(time_range)
        
        # Get all wrapped APIs for this user
        wrapped_apis_result = await db.execute(
            select(WrappedAPI.id).where(WrappedAPI.user_id == current_user.id)
        )
        wrapped_api_ids = [row[0] for row in wrapped_apis_result.all()]
        
        if not wrapped_api_ids:
            return DashboardStatsResponse(
                total_requests=0,
                success_rate=0.0,
                active_wrapped_apis=0,
                estimated_cost=0.0
            )
        
        # Total requests
        total_requests_result = await db.execute(
            select(func.count(APILog.id))
            .where(
                and_(
                    APILog.wrapped_api_id.in_(wrapped_api_ids),
                    APILog.created_at >= date_filter
                )
            )
        )
        total_requests = total_requests_result.scalar() or 0
        
        # Success rate
        if total_requests > 0:
            success_count_result = await db.execute(
                select(func.count(APILog.id))
                .where(
                    and_(
                        APILog.wrapped_api_id.in_(wrapped_api_ids),
                        APILog.created_at >= date_filter,
                        APILog.is_success == True
                    )
                )
            )
            success_count = success_count_result.scalar() or 0
            success_rate = (success_count / total_requests) * 100
        else:
            success_rate = 0.0
        
        # Active wrapped APIs count
        active_apis_result = await db.execute(
            select(func.count(WrappedAPI.id))
            .where(
                and_(
                    WrappedAPI.user_id == current_user.id,
                    WrappedAPI.is_active == True
                )
            )
        )
        active_wrapped_apis = active_apis_result.scalar() or 0
        
        # Estimated cost
        cost_result = await db.execute(
            select(func.coalesce(func.sum(APILog.cost), 0))
            .where(
                and_(
                    APILog.wrapped_api_id.in_(wrapped_api_ids),
                    APILog.created_at >= date_filter
                )
            )
        )
        estimated_cost = float(cost_result.scalar() or 0)
        
        return DashboardStatsResponse(
            total_requests=total_requests,
            success_rate=round(success_rate, 2),
            active_wrapped_apis=active_wrapped_apis,
            estimated_cost=round(estimated_cost, 2)
        )
    except Exception as e:
        logger.error(f"Error getting dashboard stats: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch dashboard statistics"
        )


@router.get("/graphs/spending", response_model=GraphDataResponse)
async def get_spending_graph(
    time_range: str = Query(default="7d", regex="^(today|7d|30d)$"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get spending graph data (stacked bar chart)"""
    try:
        date_filter = get_date_filter(time_range)
        
        # Get wrapped APIs with their logs
        wrapped_apis_result = await db.execute(
            select(WrappedAPI)
            .options(selectinload(WrappedAPI.api_logs))
            .where(WrappedAPI.user_id == current_user.id)
        )
        wrapped_apis = wrapped_apis_result.scalars().all()
        
        if not wrapped_apis:
            return GraphDataResponse(
                dates=[],
                datasets=[],
                totals=[]
            )
        
        # Group by date and wrapped_api_id
        # Get unique dates in range
        dates_result = await db.execute(
            select(func.date(APILog.created_at).label('date'))
            .where(
                and_(
                    APILog.wrapped_api_id.in_([api.id for api in wrapped_apis]),
                    APILog.created_at >= date_filter
                )
            )
            .distinct()
            .order_by('date')
        )
        # Keep dates as date objects for queries
        date_objects = []
        for row in dates_result.all():
            date_val = row[0]
            # Convert to date object if it's a string
            if isinstance(date_val, str):
                date_val = datetime.strptime(date_val, '%Y-%m-%d').date()
            elif isinstance(date_val, datetime):
                date_val = date_val.date()
            elif not isinstance(date_val, date_type):
                date_val = date_val.date() if hasattr(date_val, 'date') else date_val
            date_objects.append(date_val)
        
        if not date_objects:
            return GraphDataResponse(
                dates=[],
                datasets=[],
                totals=[]
            )
        
        # Build datasets for each wrapped API
        datasets = []
        totals = []
        
        for api in wrapped_apis:
            api_costs = []
            for date_obj in date_objects:
                cost_result = await db.execute(
                    select(func.coalesce(func.sum(APILog.cost), 0))
                    .where(
                        and_(
                            APILog.wrapped_api_id == api.id,
                            func.date(APILog.created_at) == date_obj,
                            APILog.created_at >= date_filter
                        )
                    )
                )
                api_costs.append(float(cost_result.scalar() or 0))
            
            if any(cost > 0 for cost in api_costs):
                datasets.append(GraphDataset(
                    name=api.name,
                    data=api_costs
                ))
        
        # Calculate totals for each date
        for date_obj in date_objects:
            total_result = await db.execute(
                select(func.coalesce(func.sum(APILog.cost), 0))
                .where(
                    and_(
                        APILog.wrapped_api_id.in_([api.id for api in wrapped_apis]),
                        func.date(APILog.created_at) == date_obj,
                        APILog.created_at >= date_filter
                    )
                )
            )
            totals.append(float(total_result.scalar() or 0))
        
        # Convert to strings for response
        date_strings = [str(d) for d in date_objects]
        
        return GraphDataResponse(
            dates=date_strings,
            datasets=datasets,
            totals=totals
        )
    except Exception as e:
        logger.error(f"Error getting spending graph: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch spending graph data: {str(e)}"
        )


@router.get("/graphs/success-rate", response_model=GraphDataResponse)
async def get_success_rate_graph(
    time_range: str = Query(default="7d", regex="^(today|7d|30d)$"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get success rate graph data (stacked line chart)"""
    try:
        date_filter = get_date_filter(time_range)
        
        # Get wrapped APIs
        wrapped_apis_result = await db.execute(
            select(WrappedAPI).where(WrappedAPI.user_id == current_user.id)
        )
        wrapped_apis = wrapped_apis_result.scalars().all()
        
        if not wrapped_apis:
            return GraphDataResponse(
                dates=[],
                datasets=[],
                averages=[]
            )
        
        # Get unique dates
        dates_result = await db.execute(
            select(func.date(APILog.created_at).label('date'))
            .where(
                and_(
                    APILog.wrapped_api_id.in_([api.id for api in wrapped_apis]),
                    APILog.created_at >= date_filter
                )
            )
            .distinct()
            .order_by('date')
        )
        # Keep dates as date objects for queries
        date_objects = []
        for row in dates_result.all():
            date_val = row[0]
            # Convert to date object if it's a string
            if isinstance(date_val, str):
                date_val = datetime.strptime(date_val, '%Y-%m-%d').date()
            elif isinstance(date_val, datetime):
                date_val = date_val.date()
            elif not isinstance(date_val, date_type):
                date_val = date_val.date() if hasattr(date_val, 'date') else date_val
            date_objects.append(date_val)
        
        if not date_objects:
            return GraphDataResponse(
                dates=[],
                datasets=[],
                averages=[]
            )
        
        # Build datasets
        datasets = []
        averages = []
        
        for api in wrapped_apis:
            api_rates = []
            for date_obj in date_objects:
                # Get total and success count for this date
                stats_result = await db.execute(
                    select(
                        func.count(APILog.id).label('total'),
                        func.sum(case((APILog.is_success == True, 1), else_=0)).label('success')
                    )
                    .where(
                        and_(
                            APILog.wrapped_api_id == api.id,
                            func.date(APILog.created_at) == date_obj,
                            APILog.created_at >= date_filter
                        )
                    )
                )
                stats = stats_result.first()
                total = stats.total or 0
                success = stats.success or 0
                
                if total > 0:
                    rate = (success / total) * 100
                else:
                    rate = 0.0
                
                api_rates.append(round(rate, 2))
            
            if any(rate > 0 for rate in api_rates):
                datasets.append(GraphDataset(
                    name=api.name,
                    data=api_rates
                ))
        
        # Calculate averages for each date
        for date_obj in date_objects:
            stats_result = await db.execute(
                select(
                    func.count(APILog.id).label('total'),
                    func.sum(
                        case((APILog.is_success == True, 1), else_=0)
                    ).label('success')
                )
                .where(
                    and_(
                        APILog.wrapped_api_id.in_([api.id for api in wrapped_apis]),
                        func.date(APILog.created_at) == date_obj,
                        APILog.created_at >= date_filter
                    )
                )
            )
            stats = stats_result.first()
            total = stats.total or 0
            success = stats.success or 0
            
            if total > 0:
                avg = (success / total) * 100
            else:
                avg = 0.0
            
            averages.append(round(avg, 2))
        
        # Convert to strings for response
        date_strings = [str(d) for d in date_objects]
        
        return GraphDataResponse(
            dates=date_strings,
            datasets=datasets,
            averages=averages
        )
    except Exception as e:
        logger.error(f"Error getting success rate graph: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch success rate graph data: {str(e)}"
        )


@router.get("/graphs/cost", response_model=GraphDataResponse)
async def get_cost_graph(
    time_range: str = Query(default="7d", regex="^(today|7d|30d)$"),
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get cost graph data (stacked line chart)"""
    try:
        date_filter = get_date_filter(time_range)
        
        # Get wrapped APIs
        wrapped_apis_result = await db.execute(
            select(WrappedAPI).where(WrappedAPI.user_id == current_user.id)
        )
        wrapped_apis = wrapped_apis_result.scalars().all()
        
        if not wrapped_apis:
            return GraphDataResponse(
                dates=[],
                datasets=[],
                totals=[]
            )
        
        # Get unique dates
        dates_result = await db.execute(
            select(func.date(APILog.created_at).label('date'))
            .where(
                and_(
                    APILog.wrapped_api_id.in_([api.id for api in wrapped_apis]),
                    APILog.created_at >= date_filter
                )
            )
            .distinct()
            .order_by('date')
        )
        # Keep dates as date objects for queries
        date_objects = []
        for row in dates_result.all():
            date_val = row[0]
            # Convert to date object if it's a string
            if isinstance(date_val, str):
                date_val = datetime.strptime(date_val, '%Y-%m-%d').date()
            elif isinstance(date_val, datetime):
                date_val = date_val.date()
            elif not isinstance(date_val, date_type):
                date_val = date_val.date() if hasattr(date_val, 'date') else date_val
            date_objects.append(date_val)
        
        if not date_objects:
            return GraphDataResponse(
                dates=[],
                datasets=[],
                totals=[]
            )
        
        # Build datasets
        datasets = []
        totals = []
        
        for api in wrapped_apis:
            api_costs = []
            for date_obj in date_objects:
                cost_result = await db.execute(
                    select(func.coalesce(func.sum(APILog.cost), 0))
                    .where(
                        and_(
                            APILog.wrapped_api_id == api.id,
                            func.date(APILog.created_at) == date_obj,
                            APILog.created_at >= date_filter
                        )
                    )
                )
                api_costs.append(float(cost_result.scalar() or 0))
            
            if any(cost > 0 for cost in api_costs):
                datasets.append(GraphDataset(
                    name=api.name,
                    data=api_costs
                ))
        
        # Calculate totals
        for date_obj in date_objects:
            total_result = await db.execute(
                select(func.coalesce(func.sum(APILog.cost), 0))
                .where(
                    and_(
                        APILog.wrapped_api_id.in_([api.id for api in wrapped_apis]),
                        func.date(APILog.created_at) == date_obj,
                        APILog.created_at >= date_filter
                    )
                )
            )
            totals.append(float(total_result.scalar() or 0))
        
        # Convert to strings for response
        date_strings = [str(d) for d in date_objects]
        
        return GraphDataResponse(
            dates=date_strings,
            datasets=datasets,
            totals=totals
        )
    except Exception as e:
        logger.error(f"Error getting cost graph: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch cost graph data: {str(e)}"
        )


@router.get("/wrapped-apis", response_model=List[WrappedAPIListItem])
async def get_wrapped_apis_list(
    current_user: User = Depends(get_current_active_user),
    db: AsyncSession = Depends(get_db)
):
    """Get list of all wrapped APIs with summary stats"""
    try:
        # Get all wrapped APIs with provider info
        wrapped_apis_result = await db.execute(
            select(WrappedAPI, LLMProvider)
            .outerjoin(LLMProvider, WrappedAPI.provider_id == LLMProvider.id)
            .where(WrappedAPI.user_id == current_user.id)
            .order_by(WrappedAPI.created_at.desc())
        )
        results = wrapped_apis_result.all()
        
        if not results:
            return []
        
        # Calculate stats for each API (last 24 hours)
        twenty_four_hours_ago = datetime.utcnow() - timedelta(hours=24)
        api_list = []
        
        for wrapped_api, provider in results:
            # Get request count for last 24h
            requests_result = await db.execute(
                select(func.count(APILog.id))
                .where(
                    and_(
                        APILog.wrapped_api_id == wrapped_api.id,
                        APILog.created_at >= twenty_four_hours_ago
                    )
                )
            )
            requests_count = requests_result.scalar() or 0
            
            # Calculate success rate for last 24h
            if requests_count > 0:
                success_result = await db.execute(
                    select(func.count(APILog.id))
                    .where(
                        and_(
                            APILog.wrapped_api_id == wrapped_api.id,
                            APILog.created_at >= twenty_four_hours_ago,
                            APILog.is_success == True
                        )
                    )
                )
                success_count = success_result.scalar() or 0
                success_rate = (success_count / requests_count) * 100
            else:
                success_rate = 0.0
            
            # Get total cost
            cost_result = await db.execute(
                select(func.coalesce(func.sum(APILog.cost), 0))
                .where(APILog.wrapped_api_id == wrapped_api.id)
            )
            cost = float(cost_result.scalar() or 0)
            
            api_list.append(WrappedAPIListItem(
                id=wrapped_api.id,
                name=wrapped_api.name,
                endpoint_id=wrapped_api.endpoint_id,
                is_active=wrapped_api.is_active,
                provider_name=provider.provider_name if provider else None,
                requests_count=requests_count,
                success_rate=round(success_rate, 2),
                cost=round(cost, 2),
                created_at=wrapped_api.created_at,
                updated_at=wrapped_api.updated_at
            ))
        
        return api_list
    except Exception as e:
        logger.error(f"Error getting wrapped APIs list: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to fetch wrapped APIs list: {str(e)}"
        )

