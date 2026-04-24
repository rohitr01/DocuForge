import { useState, useRef, useCallback } from 'react';
import { Camera, RefreshCcw, Download, Maximize, AlertCircle } from 'lucide-react';

export default function DocumentScanner() {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } } 
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setIsCameraActive(true);
      setCapturedImage(null);
    } catch (err) {
      console.error("Error accessing camera:", err);
      alert("Could not access camera. Please ensure you have given permission.");
    }
  };

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
      setIsCameraActive(false);
    }
  }, [stream]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Apply "Scanner" filters (B&W/High Contrast)
        // ctx.filter = 'contrast(1.2) grayscale(1)'; 
        // Note: Filters can be added for a "scan" look
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
        setCapturedImage(dataUrl);
        stopCamera();
      }
    }
  };

  const downloadScan = () => {
    if (capturedImage) {
      const link = document.createElement('a');
      link.href = capturedImage;
      link.download = `scan_${Date.now()}.jpg`;
      link.click();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-8 px-4">
      <div className="text-center space-y-4">
        <div className="bg-indigo-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-500/20">
          <Camera className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-white">Smart Document Scanner</h1>
        <p className="text-slate-400 max-w-2xl mx-auto">
          Capture documents directly from your camera. Auto-optimization for high-contrast, print-ready digital copies.
        </p>
      </div>

      <div className="relative aspect-[3/4] max-w-lg mx-auto bg-slate-900 rounded-[2.5rem] border-4 border-white/10 overflow-hidden shadow-2xl">
        {isCameraActive ? (
          <div className="relative w-full h-full">
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover"
            />
            {/* Scanner Overlay */}
            <div className="absolute inset-8 border-2 border-indigo-500/30 rounded-2xl pointer-events-none">
              <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-indigo-500 rounded-tl-lg"></div>
              <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-indigo-500 rounded-tr-lg"></div>
              <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-indigo-500 rounded-bl-lg"></div>
              <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-indigo-500 rounded-br-lg"></div>
            </div>
            
            <button 
              onClick={capturePhoto}
              className="absolute bottom-10 left-1/2 -translate-x-1/2 w-20 h-20 bg-white rounded-full border-8 border-white/20 hover:scale-110 active:scale-95 transition-all shadow-2xl flex items-center justify-center"
            >
              <div className="w-12 h-12 rounded-full border-4 border-slate-900"></div>
            </button>
          </div>
        ) : capturedImage ? (
          <div className="relative w-full h-full p-4 flex flex-col items-center justify-center">
            <img src={capturedImage} alt="Captured scan" className="max-h-full rounded-xl shadow-2xl" />
            <div className="absolute bottom-10 flex gap-4">
              <button 
                onClick={startCamera}
                className="p-4 bg-white/10 hover:bg-white/20 backdrop-blur-md rounded-2xl text-white transition-all"
                title="Retake"
              >
                <RefreshCcw className="w-6 h-6" />
              </button>
              <button 
                onClick={downloadScan}
                className="px-8 py-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl font-bold transition-all shadow-xl shadow-indigo-500/20 flex items-center gap-2"
              >
                <Download className="w-5 h-5" /> Save Scan
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center space-y-6">
            <div className="w-24 h-24 bg-white/5 rounded-[2rem] flex items-center justify-center text-slate-500">
              <Maximize className="w-12 h-12" />
            </div>
            <button 
              onClick={startCamera}
              className="px-10 py-5 bg-white text-black rounded-[1.5rem] font-bold text-lg hover:bg-slate-100 transition-colors shadow-2xl"
            >
              Start Scanner
            </button>
            <p className="text-sm text-slate-500">Requires camera access</p>
          </div>
        )}
      </div>

      <div className="max-w-lg mx-auto bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex gap-3">
        <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
        <p className="text-xs text-amber-200/70 leading-relaxed text-center">
          Best results: Place document on a dark, flat surface with good lighting. Hold the phone directly above the document.
        </p>
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
