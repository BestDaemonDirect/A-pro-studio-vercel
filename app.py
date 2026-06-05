from flask import Flask, render_template, request
from settings import DEBUG

from telegram import send_telegram_notification



app = Flask(__name__)

@app.route("/", methods=["GET", "POST"])
def home():
    if request.method == "POST":
        name = request.form.get("name")
        email = request.form.get("email")
        phone = request.form.get("phone")
        comment = request.form.get("comment")

        send_telegram_notification(name=name, email=email, phone=phone, comment=comment)

    return render_template("landing.html")




if __name__ == "__main__":
    app.run(debug=DEBUG)