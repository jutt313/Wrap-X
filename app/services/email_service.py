import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.image import MIMEImage
from typing import Optional, Dict, Any
from pathlib import Path
from jinja2 import Environment, FileSystemLoader, select_autoescape
from app.config import settings
import os

logger = logging.getLogger(__name__)

# Setup Jinja2 environment for email templates
template_dir = Path(__file__).parent.parent / "templates" / "emails"
env = Environment(
    loader=FileSystemLoader(str(template_dir)),
    autoescape=select_autoescape(['html', 'xml'])
)


class EmailService:
    """Service for sending emails via SMTP"""
    
    def __init__(self):
        self.smtp_host = settings.smtp_host
        self.smtp_port = settings.smtp_port
        self.smtp_user = settings.smtp_user
        self.smtp_password = settings.smtp_password
        self.from_email = settings.smtp_from_email or settings.smtp_user
        self.from_name = settings.smtp_from_name or "Wrap-X Team"
        self.use_tls = settings.smtp_use_tls
        
    def _get_smtp_connection(self):
        """Create and return SMTP connection"""
        if not all([self.smtp_host, self.smtp_user, self.smtp_password]):
            logger.warning("SMTP configuration incomplete. Email sending disabled.")
            return None
            
        try:
            server = smtplib.SMTP(self.smtp_host, self.smtp_port)
            if self.use_tls:
                server.starttls()
            server.login(self.smtp_user, self.smtp_password)
            return server
        except Exception as e:
            logger.error(f"Failed to connect to SMTP server: {e}")
            return None
    
    def _render_template(self, template_name: str, context: Dict[str, Any]) -> str:
        """Render email template with context"""
        try:
            template = env.get_template(template_name)
            return template.render(**context)
        except Exception as e:
            logger.error(f"Failed to render template {template_name}: {e}")
            raise
    
    def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> bool:
        """
        Send email via SMTP
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            html_content: HTML email body
            text_content: Plain text email body (optional)
            
        Returns:
            bool: True if email sent successfully, False otherwise
        """
        if not all([self.smtp_host, self.smtp_user, self.smtp_password]):
            logger.warning("SMTP not configured. Email not sent.")
            return False
            
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{self.from_name} <{self.from_email}>"
            msg['To'] = to_email
            
            # Add text and HTML parts
            if text_content:
                text_part = MIMEText(text_content, 'plain')
                msg.attach(text_part)
            
            html_part = MIMEText(html_content, 'html')
            msg.attach(html_part)
            
            # Send email
            server = self._get_smtp_connection()
            if not server:
                return False
                
            server.send_message(msg)
            server.quit()
            
            logger.info(f"Email sent successfully to {to_email}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return False
    
    def send_template_email(
        self,
        to_email: str,
        template_name: str,
        subject: str,
        context: Dict[str, Any]
    ) -> bool:
        """
        Send email using a template
        
        Args:
            to_email: Recipient email address
            template_name: Name of template file (e.g., 'welcome.html')
            subject: Email subject
            context: Template context variables
            
        Returns:
            bool: True if email sent successfully, False otherwise
        """
        try:
            # Add common context variables
            context.setdefault('frontend_url', settings.frontend_base_url)
            context.setdefault('support_email', 'info@wrap-x.com')
            context.setdefault('company_name', 'Wrap-X')
            
            # Render template
            html_content = self._render_template(template_name, context)
            
            # Generate plain text version (simple strip of HTML tags)
            text_content = self._html_to_text(html_content)
            
            return self.send_email(to_email, subject, html_content, text_content)
            
        except Exception as e:
            logger.error(f"Failed to send template email {template_name} to {to_email}: {e}")
            return False
    
    def _html_to_text(self, html: str) -> str:
        """Simple HTML to text converter"""
        import re
        # Remove script and style elements
        html = re.sub(r'<script[^>]*>.*?</script>', '', html, flags=re.DOTALL | re.IGNORECASE)
        html = re.sub(r'<style[^>]*>.*?</style>', '', html, flags=re.DOTALL | re.IGNORECASE)
        # Remove HTML tags
        text = re.sub(r'<[^>]+>', '', html)
        # Decode HTML entities
        text = text.replace('&nbsp;', ' ')
        text = text.replace('&amp;', '&')
        text = text.replace('&lt;', '<')
        text = text.replace('&gt;', '>')
        text = text.replace('&quot;', '"')
        # Clean up whitespace
        text = re.sub(r'\s+', ' ', text)
        return text.strip()


# Global email service instance
email_service = EmailService()

