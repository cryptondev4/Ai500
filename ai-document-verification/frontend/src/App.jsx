import React, { useState, useEffect } from 'react';
import { Upload, FileText, AlertCircle, CheckCircle, BarChart3, X, TrendingUp, Shield, AlertTriangle } from 'lucide-react';

// API URL - ngrok bilan ishlash uchun .env faylida sozlang
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

export default function DocumentVerificationSystem() {
  const [documents, setDocuments] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [activeTab, setActiveTab] = useState('upload');
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDocuments();
    loadStatistics();
  }, []);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/documents`);
      if (!response.ok) throw new Error('Hujjatlarni yuklashda xatolik');
      const data = await response.json();
      setDocuments(data.documents || []);
      setError(null);
    } catch (error) {
      console.error('Hujjatlarni yuklashda xatolik:', error);
      setError('Hujjatlarni yuklashda xatolik. Serverga ulanishni tekshiring.');
    } finally {
      setLoading(false);
    }
  };

  const loadStatistics = async () => {
    try {
      const response = await fetch(`${API_URL}/statistics`);
      if (!response.ok) throw new Error('Statistikani yuklashda xatolik');
      const data = await response.json();
      setStatistics(data);
    } catch (error) {
      console.error('Statistikani yuklashda xatolik:', error);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(file => {
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/tiff', 'application/pdf'];
      return validTypes.includes(file.type) && file.size <= 16 * 1024 * 1024;
    });
    
    if (validFiles.length !== files.length) {
      alert('Ba\'zi fayllar noto\'g\'ri formatda yoki juda katta (max 16MB)');
    }
    
    setSelectedFiles(validFiles);
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      alert('Iltimos, fayllarni tanlang!');
      return;
    }

    setUploading(true);
    setError(null);
    const formData = new FormData();
    
    // Backend 'files' yoki 'file' qabul qiladi
    selectedFiles.forEach(file => {
      formData.append('files', file);
    });

    try {
      console.log('Uploading to:', `${API_URL}/upload`);
      
      const response = await fetch(`${API_URL}/upload`, {
        method: 'POST',
        body: formData,
        // Content-Type ni qo'shMANG, browser avtomatik qo'shadi
      });
      
      const data = await response.json();
      console.log('Response:', data);
      
      if (response.ok) {
        alert(`✅ ${data.total} ta hujjat muvaffaqiyatli tahlil qilindi!`);
        setSelectedFiles([]);
        document.getElementById('fileInput').value = ''; // Input ni tozalash
        await loadDocuments();
        await loadStatistics();
        setActiveTab('documents');
      } else {
        throw new Error(data.error || 'Xatolik yuz berdi!');
      }
    } catch (error) {
      console.error('Yuklashda xatolik:', error);
      setError(`Server bilan bog'lanishda xatolik: ${error.message}`);
      alert(`❌ Xatolik: ${error.message}\n\nServer ishlab turganini va URL to'g'riligini tekshiring.`);
    } finally {
      setUploading(false);
    }
  };

  const viewDocumentDetails = async (docId) => {
    try {
      const response = await fetch(`${API_URL}/document/${docId}`);
      if (!response.ok) throw new Error('Hujjat topilmadi');
      const data = await response.json();
      setSelectedDoc(data);
    } catch (error) {
      console.error('Ma\'lumotlarni yuklashda xatolik:', error);
      alert('Hujjat ma\'lumotlarini yuklashda xatolik!');
    }
  };

  const removeFile = (index) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800">
      {/* Animated Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute w-96 h-96 bg-purple-500/20 rounded-full blur-3xl -top-48 -left-48 animate-pulse"></div>
        <div className="absolute w-96 h-96 bg-pink-500/20 rounded-full blur-3xl -bottom-48 -right-48 animate-pulse delay-1000"></div>
      </div>

      <div className="relative container mx-auto px-4 py-8 max-w-7xl">
        {/* Header */}
        <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-2xl p-8 mb-8 border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-3">
                <Shield className="text-white" size={48} />
                <h1 className="text-4xl md:text-5xl font-black text-white drop-shadow-lg">
                  AI Hujjat Tekshirish
                </h1>
              </div>
              <p className="text-white/80 text-lg">
                Sun'iy intellekt yordamida hujjatlarning sahtelik yoki haqiqiyligini aniqlash
              </p>
            </div>
            <div className="hidden md:block">
              <div className="relative">
                <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full blur-xl opacity-50 animate-pulse"></div>
                <div className="relative bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-full font-bold shadow-lg">
                  AI500 Loyihasi
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="backdrop-blur-xl bg-red-500/20 border border-red-500/30 rounded-xl p-4 mb-6 flex items-center gap-3">
            <AlertTriangle className="text-red-300" size={24} />
            <p className="text-white font-medium">{error}</p>
            <button onClick={() => setError(null)} className="ml-auto text-white/80 hover:text-white">
              <X size={20} />
            </button>
          </div>
        )}

        {/* Statistics */}
        {statistics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="group backdrop-blur-xl bg-white/10 rounded-2xl shadow-xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-300 transform hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/70 font-semibold uppercase tracking-wide">Jami Hujjatlar</p>
                  <p className="text-4xl font-black text-white mt-2">{statistics.total}</p>
                  <p className="text-xs text-white/60 mt-1">Tahlil qilingan</p>
                </div>
                <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-transform">
                  <FileText className="text-white" size={32} />
                </div>
              </div>
            </div>
            
            <div className="group backdrop-blur-xl bg-white/10 rounded-2xl shadow-xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-300 transform hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/70 font-semibold uppercase tracking-wide">Sahte</p>
                  <p className="text-4xl font-black text-red-400 mt-2">{statistics.fraud}</p>
                  <p className="text-xs text-white/60 mt-1">Aniqlangan</p>
                </div>
                <div className="bg-gradient-to-br from-red-500 to-pink-500 p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-transform">
                  <AlertCircle className="text-white" size={32} />
                </div>
              </div>
            </div>
            
            <div className="group backdrop-blur-xl bg-white/10 rounded-2xl shadow-xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-300 transform hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/70 font-semibold uppercase tracking-wide">Haqiqiy</p>
                  <p className="text-4xl font-black text-green-400 mt-2">{statistics.genuine}</p>
                  <p className="text-xs text-white/60 mt-1">Tasdiqlangan</p>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-emerald-500 p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-transform">
                  <CheckCircle className="text-white" size={32} />
                </div>
              </div>
            </div>
            
            <div className="group backdrop-blur-xl bg-white/10 rounded-2xl shadow-xl p-6 border border-white/20 hover:bg-white/20 transition-all duration-300 transform hover:scale-105">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-white/70 font-semibold uppercase tracking-wide">Sahtelik</p>
                  <p className="text-4xl font-black text-orange-400 mt-2">{statistics.fraud_percentage}%</p>
                  <p className="text-xs text-white/60 mt-1">Foiz nisbati</p>
                </div>
                <div className="bg-gradient-to-br from-orange-500 to-yellow-500 p-4 rounded-2xl shadow-lg group-hover:scale-110 transition-transform">
                  <TrendingUp className="text-white" size={32} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="backdrop-blur-xl bg-white/10 rounded-2xl shadow-2xl overflow-hidden border border-white/20">
          {/* Tabs */}
          <div className="flex border-b border-white/10">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 px-8 py-5 font-bold text-lg transition-all duration-300 flex items-center justify-center gap-3 ${
                activeTab === 'upload'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                  : 'bg-white/5 text-white/70 hover:bg-white/10'
              }`}
            >
              <Upload size={24} />
              <span>Yuklash</span>
            </button>
            <button
              onClick={() => setActiveTab('documents')}
              className={`flex-1 px-8 py-5 font-bold text-lg transition-all duration-300 flex items-center justify-center gap-3 ${
                activeTab === 'documents'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                  : 'bg-white/5 text-white/70 hover:bg-white/10'
              }`}
            >
              <FileText size={24} />
              <span>Hujjatlar</span>
            </button>
          </div>

          <div className="p-8">
            {activeTab === 'upload' && (
              <div className="space-y-8">
                {/* Drop Zone */}
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-600 to-pink-600 rounded-2xl blur-xl opacity-30 group-hover:opacity-50 transition-opacity"></div>
                  <div className="relative border-2 border-dashed border-white/30 rounded-2xl p-16 text-center hover:border-white/50 transition-all duration-300 bg-white/5">
                    <Upload className="mx-auto text-white mb-6 group-hover:scale-110 transition-transform" size={80} />
                    <h3 className="text-2xl font-bold text-white mb-3">
                      Hujjatlarni yuklang
                    </h3>
                    <p className="text-white/70 mb-6 text-lg">
                      PNG, JPG, JPEG, PDF, TIFF (Max 16MB)
                    </p>
                    <input
                      type="file"
                      multiple
                      accept=".pdf,.png,.jpg,.jpeg,.tif,.tiff"
                      onChange={handleFileSelect}
                      className="hidden"
                      id="fileInput"
                      disabled={uploading}
                    />
                    <label
                      htmlFor="fileInput"
                      className="inline-block bg-gradient-to-r from-purple-600 to-pink-600 text-white font-bold px-8 py-4 rounded-xl cursor-pointer hover:shadow-2xl hover:scale-105 transition-all duration-300 disabled:opacity-50"
                    >
                      Fayllarni tanlash
                    </label>
                  </div>
                </div>

                {/* Selected Files */}
                {selectedFiles.length > 0 && (
                  <div className="backdrop-blur-xl bg-white/10 rounded-2xl p-6 border border-white/20">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-bold text-white text-xl">
                        Tanlangan fayllar ({selectedFiles.length})
                      </h4>
                      <button
                        onClick={() => setSelectedFiles([])}
                        className="text-white/70 hover:text-white text-sm"
                      >
                        Hammasini tozalash
                      </button>
                    </div>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between bg-white/5 rounded-xl p-4 hover:bg-white/10 transition-all">
                          <div className="flex items-center gap-3 flex-1">
                            <FileText size={24} className="text-white/70" />
                            <div className="flex-1 min-w-0">
                              <p className="text-white font-medium truncate">{file.name}</p>
                              <p className="text-white/50 text-sm">{(file.size / 1024).toFixed(2)} KB</p>
                            </div>
                          </div>
                          <button
                            onClick={() => removeFile(index)}
                            className="text-white/50 hover:text-red-400 transition-colors ml-4"
                          >
                            <X size={20} />
                          </button>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={handleUpload}
                      disabled={uploading}
                      className="mt-6 w-full bg-gradient-to-r from-green-600 to-emerald-600 text-white font-bold px-8 py-4 rounded-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      {uploading ? (
                        <span className="flex items-center justify-center gap-3">
                          <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                          Yuklanmoqda...
                        </span>
                      ) : (
                        '✨ Yuklash va AI Tahlil Qilish'
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'documents' && (
              <div className="space-y-4">
                {loading ? (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-white/70">Yuklanmoqda...</p>
                  </div>
                ) : documents.length === 0 ? (
                  <div className="text-center py-16">
                    <FileText className="mx-auto text-white/30 mb-4" size={64} />
                    <p className="text-white/70 text-lg">Hali hujjatlar yuklanmagan</p>
                    <button
                      onClick={() => setActiveTab('upload')}
                      className="mt-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-3 rounded-xl hover:shadow-xl transition-all"
                    >
                      Birinchi hujjatni yuklash
                    </button>
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-xl">
                    <table className="w-full">
                      <thead className="bg-white/10 backdrop-blur-xl">
                        <tr>
                          <th className="px-6 py-4 text-left text-xs font-bold text-white/70 uppercase tracking-wider">
                            ID
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-white/70 uppercase tracking-wider">
                            Fayl nomi
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-white/70 uppercase tracking-wider">
                            Sana
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-white/70 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-white/70 uppercase tracking-wider">
                            Ishonch
                          </th>
                          <th className="px-6 py-4 text-left text-xs font-bold text-white/70 uppercase tracking-wider">
                            Harakat
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/10">
                        {documents.map((doc) => (
                          <tr key={doc.id} className="hover:bg-white/5 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-white">
                              #{doc.id}
                            </td>
                            <td className="px-6 py-4 text-sm text-white">
                              <div className="flex items-center gap-2">
                                <FileText size={16} className="text-white/50" />
                                <span className="truncate max-w-xs">{doc.filename}</span>
                              </div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-white/70">
                              {new Date(doc.upload_date).toLocaleString('uz-UZ')}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <span
                                className={`px-4 py-2 rounded-full text-xs font-bold inline-flex items-center gap-2 ${
                                  doc.status === 'FRAUD'
                                    ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg'
                                    : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
                                }`}
                              >
                                {doc.status === 'FRAUD' ? (
                                  <>
                                    <AlertCircle size={14} />
                                    SOHTE
                                  </>
                                ) : (
                                  <>
                                    <CheckCircle size={14} />
                                    HAQIQIY
                                  </>
                                )}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-white">
                              {doc.confidence ? `${doc.confidence.toFixed(1)}%` : 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm">
                              <button
                                onClick={() => viewDocumentDetails(doc.id)}
                                className="bg-gradient-to-r from-purple-600 to-pink-600 text-white px-4 py-2 rounded-lg font-bold hover:shadow-xl transition-all hover:scale-105"
                              >
                                Ko'rish
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Document Details Modal */}
        {selectedDoc && (
          <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
              <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 p-6 flex justify-between items-center">
                <h3 className="text-3xl font-black text-white flex items-center gap-3">
                  <Shield size={32} />
                  Hujjat Ma'lumotlari
                </h3>
                <button
                  onClick={() => setSelectedDoc(null)}
                  className="text-white hover:bg-white/20 p-2 rounded-lg transition-all"
                >
                  <X size={28} />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="backdrop-blur-xl bg-white/10 rounded-xl p-6 border border-white/20">
                  <label className="text-sm font-bold text-white/70 uppercase tracking-wide block mb-2">Fayl nomi</label>
                  <p className="text-white text-lg font-semibold">{selectedDoc.filename}</p>
                </div>

                <div className="backdrop-blur-xl bg-white/10 rounded-xl p-6 border border-white/20">
                  <label className="text-sm font-bold text-white/70 uppercase tracking-wide block mb-3">Status</label>
                  <span
                    className={`px-6 py-3 rounded-full text-base font-bold inline-flex items-center gap-2 ${
                      selectedDoc.status === 'FRAUD'
                        ? 'bg-gradient-to-r from-red-500 to-pink-500 text-white shadow-lg'
                        : 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
                    }`}
                  >
                    {selectedDoc.status === 'FRAUD' ? (
                      <>
                        <AlertCircle size={18} />
                        SOHTE HUJJAT
                      </>
                    ) : (
                      <>
                        <CheckCircle size={18} />
                        HAQIQIY HUJJAT
                      </>
                    )}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="backdrop-blur-xl bg-white/10 rounded-xl p-6 border border-white/20">
                    <label className="text-sm font-bold text-white/70 uppercase tracking-wide block mb-2">Ishonch darajasi</label>
                    <p className="text-3xl font-black text-white">{selectedDoc.confidence?.toFixed(1)}%</p>
                    <div className="mt-3 bg-white/20 rounded-full h-3 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${
                          selectedDoc.status === 'FRAUD' 
                            ? 'bg-gradient-to-r from-red-500 to-pink-500'
                            : 'bg-gradient-to-r from-green-500 to-emerald-500'
                        }`}
                        style={{ width: `${selectedDoc.confidence}%` }}
                      ></div>
                    </div>
                  </div>

                  <div className="backdrop-blur-xl bg-white/10 rounded-xl p-6 border border-white/20">
                    <label className="text-sm font-bold text-white/70 uppercase tracking-wide block mb-2">Yuklangan sana</label>
                    <p className="text-white text-lg font-semibold">
                      {new Date(selectedDoc.upload_date).toLocaleString('uz-UZ', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                </div>

                {selectedDoc.analysis?.reasons && (
                  <div className="backdrop-blur-xl bg-white/10 rounded-xl p-6 border border-white/20">
                    <label className="text-sm font-bold text-white/70 uppercase tracking-wide block mb-4 flex items-center gap-2">
                      <BarChart3 size={18} />
                      Tahlil natijalari
                    </label>
                    <ul className="space-y-3">
                      {selectedDoc.analysis.reasons.map((reason, index) => (
                        <li key={index} className="flex items-start gap-3 text-white">
                          <span className="bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-bold flex-shrink-0 mt-0.5">
                            {index + 1}
                          </span>
                          <span className="flex-1">{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedDoc.analysis?.features && (
                  <div className="backdrop-blur-xl bg-white/10 rounded-xl p-6 border border-white/20">
                    <label className="text-sm font-bold text-white/70 uppercase tracking-wide block mb-4">
                      Texnik ko'rsatkichlar
                    </label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                        <p className="text-white/60 text-sm mb-1">Aniqlik (Sharpness)</p>
                        <p className="text-2xl font-bold text-white">
                          {selectedDoc.analysis.features.sharpness?.toFixed(1)}
                        </p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                        <p className="text-white/60 text-sm mb-1">Kontrast</p>
                        <p className="text-2xl font-bold text-white">
                          {selectedDoc.analysis.features.contrast?.toFixed(1)}
                        </p>
                      </div>
                      <div className="bg-white/5 rounded-lg p-4 border border-white/10">
                        <p className="text-white/60 text-sm mb-1">Yorug'lik</p>
                        <p className="text-2xl font-bold text-white">
                          {selectedDoc.analysis.features.brightness?.toFixed(1)}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        <pre>
        loyiha nomi : AI hujjatlarni tekshirish tizimi
        loyiha haqida qisqacha : 
        bu loyiha suniy intellekt yordamida hujjatlarni tekshirish tizimi bu tizim orqali foydalanuvchilar osonlik bilan hujjatlarni yuklab ularning sohtemi yoki haqiqiyligini aniqlab beradi
         muammo yechim: 
        hozirgi kunda asosiy muamo fribgarlar broni nomidan kridit yoki pul olish bunga yechim bizning AI yani hujjatlarni qisqa voqt ichida tahrirlab haqiqiy yoki sohtaligini aniqlab beradi yani masalan fribgar broni nomidan kridit ovotgan bolsa uni barbir sohtalik joyi bor chunki ism familyani mantaj qilayotgan joyida baribir hatolika yol qoyadi va bizning AI shu hatolikni topib uni bartaraf etadi 
        jamoa: 
        kamandada 4 kishi - Abubakr Abduvohidov full stack 
        Toxirov Farrux ai developer 
        Ziyaviddinov Jamshid backend developer 
        Arslon Ibragimov  front-end 
        nima uchun jamoa bu muammoni hal qila oladi : 
        nimaga hal qila omasligi kere albatta hal qiladi chunki biz buni ustida juda kop ishladik bu oddiy muammo emas bu "big" muammo biz shu muammoni hal qilish uchun tuni kun oylab harakat qildik va buni ustidan amalga oshirib erishdik 
        yol haritasi : 
        boshida idea kelmadi keyin idea topdik uni strukturasini yozdik va amalga oshirdik keyingi MVP ozimiz sinab kordik bu ishladi keyinchalik bu loyihani 100% takomillashtirdik 
        yechim:
         biza loyihani backend AI frontend orqali ishladik bu dasturda ozi frontend kerak emas edi sababi bu oddiy ilova yoki sayt emas bu dastur bu dasturni isha churish uchun alohida bitta kampiyuter kere bu hazilakam narsa emas
        </pre>
      </div>
    </div>
  );
}