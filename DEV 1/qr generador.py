import qrcode
import time
from Firma_qr import sign_qr

def generar_qr_fisico(carnet: str, dias_validez: int = 7):
    print(f"Generando credencial para el carné: {carnet}...")
    
    # 1. Calcular la fecha de expiración (Epoch)
    expiracion = int(time.time()) + (dias_validez * 24 * 60 * 60)
    
    # 2. Firmar el token con tu llave privada (Firma_qr.py)
    token_jwt = sign_qr(carnet, expiracion)
    print(f"Token JWT creado exitosamente (Inicia con: {token_jwt[:15]}...)")
    
    # 3. Dibujar y guardar la imagen QR
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(token_jwt)
    qr.make(fit=True)
    
    img = qr.make_image(fill_color="black", back_color="white")
    nombre_archivo = f"QR_Acceso_{carnet}.png"
    img.save(nombre_archivo)
    print(f"¡Listo! Imagen guardada como {nombre_archivo}")

if __name__ == "__main__":
    # Probaremos con un carné genérico de la Zona Verde
    generar_qr_fisico("1517925")