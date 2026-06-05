import logging
import requests
from settings import TELEGRAM_BOT_CHAT_ID, TELEGRAM_BOT_TOKEN

logger = logging.getLogger(__name__)

def _message_text(name, email, phone, comment):
    return (
        "📩 New contact from A-Pro Studio\n\n"
        "🌐 Website: https://studio.a-pro.kz/\n\n"
        "👤 Name: {name}\n"
        "📧 Email: {email}\n"
        "📞 Phone: {phone}\n\n"
        "💬 Message: {comment}"
    ).format(
        name=name or "-",
        email=email or "-",
        phone=phone or "-",
        comment=comment or "-Nothing..."
    )

def send_telegram_notification(name, email, phone, comment):
    token = TELEGRAM_BOT_TOKEN
    chat_id = TELEGRAM_BOT_CHAT_ID
    if not token or not chat_id:
        logger.warning("Telegram is not configured: missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID")
        return False
    url = f"https://api.telegram.org/bot{token}/sendMessage"
    data = {"chat_id": chat_id, "text": _message_text(name, email, phone, comment), "disable_web_page_preview": True}
    try:
        resp = requests.post(url, json=data, timeout=10)
        if not resp.ok:
            logger.error("Telegram sendMessage failed: %s %s", resp.status_code, resp.text)
            return False
        return True
    except requests.RequestException as exc:
        logger.exception("Telegram sendMessage request failed: %s", exc)
        return False


