"""
Email utility for sending verification codes.
"""
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
from dotenv import load_dotenv

load_dotenv()  # Load environment variables from .env file

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
        email: Recipient email address
        code: 6-digit verification code

    Returns:
        bool: True if email sent successfully, False otherwise
    """
    print(f"DEBUG: send_verification_email called for {email} with code {code}")  # Debug line

    # Check if credentials look like placeholders (development mode)
    is_dev_mode = (
        not SMTP_USERNAME or
        SMTP_USERNAME == "your-email@gmail.com" or
        "your-email" in SMTP_USERNAME or
        not SMTP_PASSWORD or
        SMTP_PASSWORD == "your-app-password" or
        "your-app" in SMTP_PASSWORD
    )
    print(f"DEBUG: SMTP_USERNAME='{SMTP_USERNAME}', SMTP_PASSWORD='{SMTP_PASSWORD}'")  # Debug line
    print(f"DEBUG: is_detected_as_dev_mode={is_dev_mode}")  # Debug line

    if is_dev_mode:
        # Development mode: print email to console instead of sending
        print(f"\n{'='*50}")
        print(f"DEVELOPMENT MODE - Email would be sent to: {email}")
        print(f"Subject: TaskMaster Password Reset Verification Code")
        print(f"From: {FROM_EMAIL}")
        print(f"To: {email}")
        print(f"\nEmail Body:")
        print(f"Hello,")
        print(f"We received a request to reset your TaskMaster password.")
        print(f"Your verification code is: {code}")
        print(f"This verification code will expire in 10 minutes.")
        print(f"If you did not request a password reset, you can safely ignore this email.")
        print(f"Thank you,")
        print(f"TaskMaster Team")
        print(f"{'='*50}\n")
        return True  # Pretend we sent it successfully in dev mode

    try:
        # Create message
        message = MIMEMultipart("alternative")
        message["Subject"] = "TaskMaster Password Reset Verification Code"
        message["From"] = FROM_EMAIL
        message["To"] = email

        # Create the HTML body
        html_body = f"""
        <html>
        <body>
            <p>Hello,</p>
            <p>We received a request to reset your TaskMaster password.</p>
            <p>Your verification code is:</p>
            <h2 style="letter-spacing: 5px; font-family: monospace; background-color: #f0f0f0; padding: 10px; display: inline-block; border-radius: 4px;">{code}</h2>
            <p>This verification code will expire in 10 minutes.</p>
            <p>If you did not request a password reset, you can safely ignore this email.</p>
            <p>Thank you,</p>
            <p>TaskMaster Team</p>
        </body>
        </html>
        """

        # Also create plain text version
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

        # Attach parts
        part1 = MIMEText(text_body, "plain")
        part2 = MIMEText(html_body, "html")
        message.attach(part1)
        message.attach(part2)

        # Create secure connection and send email
        context = ssl.create_default_context()
        with smtplib.SMTP(SMTP_SERVER, SMTP_PORT) as server:
            server.starttls(context=context)
            server.login(SMTP_USERNAME, SMTP_PASSWORD)
            server.sendmail(FROM_EMAIL, email, message.as_string())

        return True

    except Exception as e:
        print(f"Failed to send email: {e}")
        return False