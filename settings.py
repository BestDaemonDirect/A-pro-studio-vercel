from dotenv import load_dotenv
import os

load_dotenv()

DEBUG = True if os.environ.get("DEBUG") == "true" else False 

TELEGRAM_BOT_TOKEN = os.environ.get("TELEGRAM_BOT_TOKEN", "")
TELEGRAM_BOT_CHAT_ID = os.environ.get("TELEGRAM_BOT_CHAT_ID", "")
