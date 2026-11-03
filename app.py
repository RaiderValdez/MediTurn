from flask import Flask, render_template, session, redirect, url_for, jsonify

app = Flask(__name__)
app.secret_key = "mediturn-dev"

@app.route("/")
def index():
    if "rol" not in session:
        return redirect(url_for("login"))
    return render_template("index.html")

@app.route("/login")
def login():
    return render_template("login.html")

@app.route("/logout")
def logout():
    session.clear()
    return redirect(url_for("login"))

@app.route("/api/login", methods=["POST"])
def api_login():
    session["rol"] = "Administrador"      # cambia a Paciente, Médico o Recepcionista para ver cada menú
    session["nombre"] = "Raider Valdez R"
    return jsonify(ok=True)

@app.route("/api/<path:ruta>", methods=["GET", "POST", "PUT"])
def api_vacia(ruta):
    return jsonify([])                    # sin datos todavía

if __name__ == "__main__":
    app.run(debug=True)