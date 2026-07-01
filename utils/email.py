"""
Email utility for sending verification codes.
"""

import logging
import os
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# Email configuration from environment variables
SMTP_SERVER = os.getenv("SMTP_SERVER", "smtp.gmail.com")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USERNAME = os.getenv("SMTP_USERNAME", "")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD", "")
FROM_EMAIL = os.getenv("SMTP_FROM_EMAIL", "noreply@taskmaster.com")


def send_verification_email(email: str, code: str) -> bool:
    """
    Send a verification code email to the specified email address.

    Args:
        email: Recipient email address.
        code: Six-digit verification code.

    Returns:
        True if the email was sent (or simulated in development mode),
        otherwise False.
    """

    # Detect development mode (placeholder credentials)
    is_dev_mode = (
        not SMTP_USERNAME
        or SMTP_USERNAME == "your-email@gmail.com"
        or "your-email" in SMTP_USERNAME
        or not SMTP_PASSWORD
        or SMTP_PASSWORD == "your-app-password"
        or "your-app" in SMTP_PASSWORD
    )

    if is_dev_mode:
        logger.info(
            "Development mode: verification email simulated for %s",
            email,
        )

        # Useful during development. Consider removing in production.
        logger.debug("Verification code for %s: %s", email, code)

        return True

    try:
        message = MIMEMultipart("alternative")
        message["Subject"] = "TaskMaster Password Reset Verification Code"
        message["From"] = FROM_EMAIL
        message["To"] = email

        html_body = f"""
        <html>
        <body>
            <p>Hello,</p>

            <p>We received a request to reset your TaskMaster password.</p>

            <p>Your verification code is:</p>

            <h2 style="
                letter-spacing:5px;
                font-family:monospace;
                background:#f0f0f0;
                padding:10px;
                display:inline-block;
                border-radius:4px;
            ">
                {code}
            </h2>

            <p>This verification code will expire in 10 minutes.</p>

            <p>
                If you did not request a password reset,
                you can safely ignore this email.
            </p>

            <p>Thank you,<br>TaskMaster Team</p>
        </body>
        </html>
        """

        text_body = f"""
Hello,

We received a request to reset your TaskMaster password.

Your verification code is:

{code}

This verification code will expire in 10 minutes.

If you did not request a password reset, you can safely ignore this email.

Thank you,

TaskMaster Team
"""

        message.attach(MIMEText(text_body, "plain"))
        message.attach(MIMEText(html_body, "html"))

        context = ssl.create_default_context()

        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls(context=context)
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.sendmail(
                FROM_EMAIL,
                email,
                message.as_string(),
            )

        logger.info(
            "Verification email sent successfully to %s",
            email,
        )

        return True

    except Exception:
        logger.exception(
            "Failed to send verification email to %s",
            email,
        )
        return False