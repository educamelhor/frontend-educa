import cv2
import os
import sys

def detectar_e_salvar_rosto(caminho_entrada, caminho_saida, margem=0.3):
    # Carrega o classificador pré-treinado para detecção de rosto frontal
    cascade = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")

    imagem = cv2.imread(caminho_entrada)
    if imagem is None:
        print("Erro: imagem não encontrada.")
        return False

    cinza = cv2.cvtColor(imagem, cv2.COLOR_BGR2GRAY)
    rostos = cascade.detectMultiScale(cinza, scaleFactor=1.1, minNeighbors=5)

    if len(rostos) == 0:
        print("Nenhum rosto detectado.")
        return False

    x, y, w, h = rostos[0]

    # Adiciona margem proporcional
    margem_x = int(w * margem)
    margem_y = int(h * margem)

    x1 = max(x - margem_x, 0)
    y1 = max(y - margem_y, 0)
    x2 = min(x + w + margem_x, imagem.shape[1])
    y2 = min(y + h + margem_y, imagem.shape[0])

    rosto_recortado = imagem[y1:y2, x1:x2]
    cv2.imwrite(caminho_saida, rosto_recortado)
    print(f"Imagem salva em: {caminho_saida}")
    return True

# Exemplo de uso via terminal:
# python detectar_rosto.py entrada.jpg saida.jpg
if __name__ == "__main__":
    if len(sys.argv) != 3:
        print("Uso: python detectar_rosto.py entrada.jpg saida.jpg")
    else:
        detectar_e_salvar_rosto(sys.argv[1], sys.argv[2])
