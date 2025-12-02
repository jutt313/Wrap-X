from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, UniqueConstraint
from sqlalchemy.dialects import postgresql
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class OAuthApp(Base):
    """Stores OAuth client metadata + scopes for a wrapped API/provider pair."""

    __tablename__ = "oauth_apps"

    id = Column(Integer, primary_key=True, index=True)
    wrapped_api_id = Column(
        Integer,
        ForeignKey("wrapped_apis.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    provider = Column(String(50), nullable=False)
    client_id = Column(Text, nullable=True)
    client_secret_encrypted = Column(Text, nullable=True)
    redirect_url = Column(Text, nullable=True)
    scopes = Column(postgresql.ARRAY(Text), nullable=True)
    access_token_encrypted = Column(Text, nullable=True)
    refresh_token_encrypted = Column(Text, nullable=True)
    token_expires_at = Column(DateTime(timezone=True), nullable=True)
    state_token = Column(String(128), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint("wrapped_api_id", "provider", name="uq_oauth_apps_wrap_provider"),
    )

    wrapped_api = relationship("WrappedAPI", back_populates="oauth_apps")


