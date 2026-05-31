from flask import Flask, render_template, request, redirect, url_for
from settings import DEBUG

from telegram import send_telegram_notification_async



app = Flask(__name__)

@app.route("/")
def home():
    return render_template("landing.html")


@app.route("/send-order", methods=["POST"])
def sent_order():
    name = request.form.get("name")
    email = request.form.get("email")
    phone = request.form.get("phone")
    comment = request.form.get("comment")

    send_telegram_notification_async(name=name, email=email, phone=phone, comment=comment)

    return redirect(url_for("/"))

if __name__ == "__main__":
    app.run(debug=DEBUG)