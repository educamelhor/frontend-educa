from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import cv2
from werkzeug.utils import secure_filename

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = "uploads"
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")

def detectar_rosto(caminho_entrada, caminho_saida, margem=0.3):
    imagem = cv2.imread(caminho_entrada)
    if imagem is None:
        return False, "Imagem inválida"

    cinza = cv2.cvtColor(imagem, cv2.COLOR_BGR2GRAY)
    rostos = cascade.detectMultiScale(cinza, scaleFactor=1.1, minNeighbors=5)

    if len(rostos) == 0:
        return False, "Nenhum rosto detectado"

    x, y, w, h = rostos[0]
    margem_x = int(w * margem)
    margem_y = int(h * margem)

    x1 = max(x - margem_x, 0)
    y1 = max(y - margem_y, 0)
    x2 = min(x + w + margem_x, imagem.shape[1])
    y2 = min(y + h + margem_y, imagem.shape[0])

    rosto = imagem[y1:y2, x1:x2]
    cv2.imwrite(caminho_saida, rosto)
    return True, os.path.basename(caminho_saida)

@app.route("/api/recortar-rosto", methods=["POST"])
def recortar_rosto():
    if "foto" not in request.files:
        return jsonify({"erro": "Nenhum arquivo enviado"}), 400

    arquivo = request.files["foto"]
    if arquivo.filename == "":
        return jsonify({"erro": "Nome de arquivo vazio"}), 400

    nome_seguro = secure_filename(arquivo.filename)
    caminho_original = os.path.join(UPLOAD_FOLDER, nome_seguro)
    arquivo.save(caminho_original)

    nome_saida = "recortado_" + nome_seguro
    caminho_saida = os.path.join(UPLOAD_FOLDER, nome_saida)

    sucesso, resultado = detectar_rosto(caminho_original, caminho_saida)

    if not sucesso:
        return jsonify({"erro": resultado}), 422

    return jsonify({"caminho": f"/{UPLOAD_FOLDER}/{resultado}"}), 200

if __name__ == "__main__":
    app.run(port=5001)