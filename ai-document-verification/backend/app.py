from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import sqlite3
from datetime import datetime
import hashlib
import json
from werkzeug.utils import secure_filename
import pytesseract
from PIL import Image
import numpy as np
import cv2

app = Flask(__name__)

CORS(app, resources={
    r"/api/*": {
        "origins": "*",
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "expose_headers": ["Content-Type"],
        "supports_credentials": True
    }
})

UPLOAD_FOLDER = 'uploads'
DATABASE = 'documents.db'
ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg', 'tif', 'tiff'}

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024  # 16MB

os.makedirs(UPLOAD_FOLDER, exist_ok=True)

def init_db():
    try:
        conn = sqlite3.connect(DATABASE)
        c = conn.cursor()
        c.execute('''CREATE TABLE IF NOT EXISTS documents
                     (id INTEGER PRIMARY KEY AUTOINCREMENT,
                      filename TEXT NOT NULL,
                      file_hash TEXT NOT NULL,
                      upload_date TEXT NOT NULL,
                      status TEXT NOT NULL,
                      confidence REAL,
                      analysis_result TEXT,
                      file_path TEXT)''')
        conn.commit()
        conn.close()
        print("Database initialized successfully")
    except Exception as e:
        print(f"Database initialization error: {e}")

init_db()

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def calculate_hash(file_path):
    """Fayl hashini hisoblash"""
    try:
        hash_md5 = hashlib.md5()
        with open(file_path, "rb") as f:
            for chunk in iter(lambda: f.read(4096), b""):
                hash_md5.update(chunk)
        return hash_md5.hexdigest()
    except Exception as e:
        print(f"Hash calculation error: {e}")
        return None

def analyze_document_features(image_path):
    """Hujjat xususiyatlarini tahlil qilish"""
    try:
        img = cv2.imread(image_path)
        if img is None:
            print(f"Could not read image: {image_path}")
            return None
     
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        features = {}
        
        laplacian_var = cv2.Laplacian(gray, cv2.CV_64F).var()
        features['sharpness'] = float(laplacian_var)
        
        features['contrast'] = float(gray.std())
        
        features['brightness'] = float(gray.mean())
        
        edges = cv2.Canny(gray, 100, 200)
        features['edge_density'] = float(np.sum(edges > 0) / edges.size)
        
        return features
    except Exception as e:
        print(f"Feature extraction error: {e}")
        return None

def detect_fraud(file_path, filename):
    """AI asosida hujjatni tekshirish"""
    try:
        image = Image.open(file_path)
        try:
            text = pytesseract.image_to_string(image, lang='uzb+eng+rus')
        except Exception as ocr_error:
            print(f"OCR error: {ocr_error}")
            text = pytesseract.image_to_string(image, lang='eng+rus')
        features = analyze_document_features(file_path)
        
        if not features:
            return {
                'is_fraud': False,
                'confidence': 50.0,
                'reasons': ['Tahlil qilib bo\'lmadi'],
                'text_length': 0
            }
        
        fraud_indicators = []
        fraud_score = 0

        if features['sharpness'] < 100:
            fraud_score += 25
            fraud_indicators.append("Sifat juda past (blur)")

        if features['contrast'] < 20 or features['contrast'] > 100:
            fraud_score += 20
            fraud_indicators.append("G'ayritabiiy kontrast")

        if len(text.strip()) < 50:
            fraud_score += 30
            fraud_indicators.append("Matn juda kam yoki yo'q")

        if features['edge_density'] < 0.05:
            fraud_score += 15
            fraud_indicators.append("Hujjat strukturasi aniq emas")

        words = text.split()
        if len(set(words)) < len(words) * 0.3 and len(words) > 10:
            fraud_score += 10
            fraud_indicators.append("Takroriy matnlar aniqlandi")

        is_fraud = fraud_score > 50
        confidence = min(fraud_score, 95) if is_fraud else min(100 - fraud_score, 95)
        
        return {
            'is_fraud': is_fraud,
            'confidence': round(confidence, 2),
            'reasons': fraud_indicators if fraud_indicators else ['Hujjat haqiqiy ko\'rinadi'],
            'text_length': len(text),
            'features': features
        }
        
    except Exception as e:
        print(f"Analysis error: {e}")
        return {
            'is_fraud': False,
            'confidence': 50.0,
            'reasons': [f'Xatolik: {str(e)}'],
            'text_length': 0
        }

@app.route('/api/upload', methods=['OPTIONS'])
def upload_options():
    return '', 204

@app.route('/api/upload', methods=['POST'])
def upload_file():
    """Fayllarni yuklash va tahlil qilish"""
    try:
        print("Upload request received")
        print(f"Files in request: {request.files}")
        print(f"Form data: {request.form}")
    
        if 'files' not in request.files and 'file' not in request.files:
            return jsonify({'error': 'Fayllar topilmadi', 'details': 'files yoki file key kerak'}), 400
        
        files = request.files.getlist('files') if 'files' in request.files else request.files.getlist('file')
        
        if not files or files[0].filename == '':
            return jsonify({'error': 'Fayllar tanlanmagan'}), 400
        
        results = []
        
        for file in files:
            if file and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
                unique_filename = f"{timestamp}_{filename}"
                file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
                file.save(file_path)
                print(f"File saved: {file_path}")
                file_hash = calculate_hash(file_path)
                
                if not file_hash:
                    return jsonify({'error': 'Hash hisoblashda xatolik'}), 500
                analysis = detect_fraud(file_path, filename)
                print(f"Analysis result: {analysis}")
                conn = sqlite3.connect(DATABASE)
                c = conn.cursor()
                c.execute('''INSERT INTO documents 
                            (filename, file_hash, upload_date, status, confidence, analysis_result, file_path)
                            VALUES (?, ?, ?, ?, ?, ?, ?)''',
                         (filename, file_hash, datetime.now().isoformat(),
                          'FRAUD' if analysis['is_fraud'] else 'GENUINE',
                          analysis['confidence'], json.dumps(analysis), file_path))
                doc_id = c.lastrowid
                conn.commit()
                conn.close()
                
                results.append({
                    'id': doc_id,
                    'filename': filename,
                    'status': 'FRAUD' if analysis['is_fraud'] else 'GENUINE',
                    'confidence': analysis['confidence'],
                    'reasons': analysis['reasons']
                })
            else:
                return jsonify({'error': f'Fayl turi ruxsat etilmagan: {file.filename}'}), 400
        return jsonify({'results': results, 'total': len(results)}), 200
    except Exception as e:
        print(f"Upload error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': 'Server xatosi', 'details': str(e)}), 500
@app.route('/api/documents', methods=['GET'])
def get_documents():
    """Barcha hujjatlarni olish"""
    try:
        conn = sqlite3.connect(DATABASE)
        c = conn.cursor()
        c.execute('SELECT id, filename, upload_date, status, confidence FROM documents ORDER BY id DESC')
        docs = c.fetchall()
        conn.close()
        
        documents = []
        for doc in docs:
            documents.append({
                'id': doc[0],
                'filename': doc[1],
                'upload_date': doc[2],
                'status': doc[3],
                'confidence': doc[4]
            })
        
        return jsonify({'documents': documents}), 200
    except Exception as e:
        print(f"Get documents error: {e}")
        return jsonify({'error': 'Hujjatlarni yuklashda xatolik'}), 500

@app.route('/api/document/<int:doc_id>', methods=['GET'])
def get_document(doc_id):
    """Bitta hujjat ma'lumotlarini olish"""
    try:
        conn = sqlite3.connect(DATABASE)
        c = conn.cursor()
        c.execute('SELECT * FROM documents WHERE id = ?', (doc_id,))
        doc = c.fetchone()
        conn.close()
        if not doc:
            return jsonify({'error': 'Hujjat topilmadi'}), 404
        analysis = json.loads(doc[6]) if doc[6] else {}
        return jsonify({
            'id': doc[0],
            'filename': doc[1],
            'file_hash': doc[2],
            'upload_date': doc[3],
            'status': doc[4],
            'confidence': doc[5],
            'analysis': analysis
        }), 200
    except Exception as e:
        print(f"Get document error: {e}")
        return jsonify({'error': 'Hujjatni yuklashda xatolik'}), 500

@app.route('/api/statistics', methods=['GET'])
def get_statistics():
    """Statistika"""
    try:
        conn = sqlite3.connect(DATABASE)
        c = conn.cursor()
        c.execute('SELECT COUNT(*) FROM documents')
        total = c.fetchone()[0]
        c.execute('SELECT COUNT(*) FROM documents WHERE status = "FRAUD"')
        fraud = c.fetchone()[0]
        c.execute('SELECT COUNT(*) FROM documents WHERE status = "GENUINE"')
        genuine = c.fetchone()[0]
        c.execute('SELECT AVG(confidence) FROM documents WHERE status = "FRAUD"')
        avg_fraud_conf = c.fetchone()[0] or 0
        c.execute('SELECT AVG(confidence) FROM documents WHERE status = "GENUINE"')
        avg_genuine_conf = c.fetchone()[0] or 0
        conn.close()
        return jsonify({
            'total': total,
            'fraud': fraud,
            'genuine': genuine,
            'fraud_percentage': round(fraud / total * 100, 2) if total > 0 else 0,
            'avg_fraud_confidence': round(avg_fraud_conf, 2),
            'avg_genuine_confidence': round(avg_genuine_conf, 2)
        }), 200
    except Exception as e:
        print(f"Statistics error: {e}")
        return jsonify({'error': 'Statistika yuklashda xatolik'}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({'status': 'ok', 'message': 'Server ishlayapti'}), 200
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS')
    return response

if __name__ == '__main__':
    print("Starting Flask server...")
    print(f"Upload folder: {os.path.abspath(UPLOAD_FOLDER)}")
    print(f"Database: {os.path.abspath(DATABASE)}")
    app.run(debug=True, host='0.0.0.0', port=5000)