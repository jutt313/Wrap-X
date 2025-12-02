from pydantic_settings import BaseSettings
from typing import Optional


class Settings(BaseSettings):
    database_url: str
    database_sync_url: str
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 30
    openai_api_key: Optional[str] = None  # For chat command parsing
    openai_model: str = "gpt-4-turbo"  # Model for chat command parsing (GPT-4 for better function calling)
    encryption_key: Optional[str] = None  # For encrypting/decrypting API keys
    
    # Stripe Configuration
    stripe_secret_key: Optional[str] = None  # Stripe secret key (sk_test_... or sk_live_...)
    stripe_publishable_key: Optional[str] = None  # Stripe publishable key (pk_test_... or pk_live_...)
    stripe_webhook_secret: Optional[str] = None  # Stripe webhook secret (whsec_...)
    
    # Stripe Product IDs (from Stripe Dashboard)
    stripe_product_starter: Optional[str] = None  # prod_...
    stripe_product_professional: Optional[str] = None  # prod_...
    stripe_product_business: Optional[str] = None  # prod_...
    
    # Stripe Price IDs (from Stripe Dashboard)
    stripe_price_starter: Optional[str] = None  # price_...
    stripe_price_professional: Optional[str] = None  # price_...
    stripe_price_business: Optional[str] = None  # price_...

    # Frontend/backend configuration
    frontend_base_url: str = "http://localhost:3000"  # Default to localhost for development
    backend_base_url: str = "http://localhost:8000"  # Used for OAuth redirect URLs
    
    # Render API (optional, for MCP)
    render_api: Optional[str] = None
    
    # SMTP Configuration (for email sending)
    smtp_host: Optional[str] = None
    smtp_port: int = 587
    smtp_user: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_from_email: Optional[str] = None
    smtp_from_name: Optional[str] = "Wrap-X Team"
    smtp_use_tls: bool = True
    
    # Google Custom Search API Configuration
    google_cse_api_key: Optional[str] = None
    google_cse_id: Optional[str] = None

    class Config:
        env_file = ".env"
        case_sensitive = False


settings = Settings()

