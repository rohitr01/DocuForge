import { useState, useRef, useCallback } from 'react';
import ReactCrop, { type Crop } from 'react-image-crop';
import 'react-image-crop/dist/ReactCrop.css';
import { Upload, Download, Crop as CropIcon, Trash2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

export default function ImageCropUtility() {
  const [file, setFile] = useState<File | null>(null);
  const [imgSrc, setImgSrc] = useState<string>('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<Crop | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [croppedImageUrl, setCroppedImageUrl] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      const f = acceptedFiles[0];
      setFile(f);
      setCrop(undefined);
      setCompletedCrop(null);
      setCroppedImageUrl(null);
      
      const reader = new FileReader();
      reader.addEventListener('load', () => setImgSrc(reader.result?.toString() || ''));
      reader.readAsDataURL(f);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    maxFiles: 1,
  });

  const handleCropImage = async () => {
    if (!completedCrop || !imgRef.current || !completedCrop.width || !completedCrop.height) return;

    const scaleX = imgRef.current.naturalWidth / imgRef.current.width;
    const scaleY = imgRef.current.naturalHeight / imgRef.current.height;

    const canvas = document.createElement('canvas');
    canvas.width = completedCrop.width * scaleX;
    canvas.height = completedCrop.height * scaleY;
    const ctx = canvas.getContext('2d');

    if (!ctx) return;

    ctx.drawImage(
      imgRef.current,
      completedCrop.x * scaleX,
      completedCrop.y * scaleY,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY,
      0,
      0,
      completedCrop.width * scaleX,
      completedCrop.height * scaleY
    );

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      setCroppedImageUrl(url);
    }, file?.type || 'image/jpeg', 1);
  };

  const removeFile = () => {
    setFile(null);
    setImgSrc('');
    setCrop(undefined);
    setCompletedCrop(null);
    setCroppedImageUrl(null);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 py-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-extrabold text-white">Freehand Crop</h1>
        <p className="text-slate-400">Slice exactly what you need seamlessly directly in your local browser.</p>
      </div>

      <AnimatePresence mode="wait">
        {!file ? (
          <motion.div key="drop" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
            <div
              {...getRootProps()}
              className={cn(
                "border-2 border-dashed rounded-3xl p-16 flex flex-col items-center justify-center gap-6 cursor-pointer bg-slate-800/30 transition-all duration-300",
                isDragActive ? "border-blue-400 bg-blue-400/10 scale-105" : "border-slate-700 hover:border-slate-500 hover:bg-slate-800/50"
              )}
            >
              <input {...getInputProps()} />
              <div className="bg-blue-500/20 p-6 rounded-full"><Upload className="w-12 h-12 text-blue-400" /></div>
              <p className="text-xl font-medium text-slate-200">Drag & drop your Image to Crop</p>
            </div>
          </motion.div>
        ) : (
          <motion.div key="edit" className="grid lg:grid-cols-4 gap-8">
            <div className="lg:col-span-1 border border-white/5 bg-slate-800/30 rounded-3xl p-6 h-fit space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2"><CropIcon className="w-5 h-5"/> Toolset</h3>
                <button onClick={removeFile} className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg"><Trash2 className="w-5 h-5"/></button>
              </div>

              <button 
                onClick={handleCropImage} disabled={!completedCrop?.width}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
              >
                Apply Crop
              </button>

              {croppedImageUrl && (
                <div className="pt-4 border-t border-white/10 mt-4 space-y-4">
                  <div className="bg-black/40 rounded-xl overflow-hidden p-2 text-center text-xs text-slate-400">Preview:
                    <img src={croppedImageUrl} alt="Crop Final" className="mt-2 rounded-lg max-w-full h-auto object-contain mx-auto border border-white/5" />
                  </div>
                  <a href={croppedImageUrl} download={`cropped_${file.name}`} className="w-full py-3 bg-green-600 hover:bg-green-500 text-white rounded-xl font-medium flex items-center justify-center gap-2 transition-colors">
                    <Download className="w-5 h-5"/> Download Cropped Image
                  </a>
                </div>
              )}
            </div>

            <div className="lg:col-span-3">
               <div className="bg-black/40 border border-white/5 rounded-3xl p-6 min-h-[600px] flex items-center justify-center overflow-auto relative">
                {imgSrc && (
                  <ReactCrop
                    crop={crop}
                    onChange={(c) => setCrop(c)}
                    onComplete={(c) => setCompletedCrop(c)}
                    className="max-h-[600px] object-contain shadow-2xl"
                  >
                    <img
                      ref={imgRef}
                      src={imgSrc}
                      alt="Crop Source"
                      className="max-h-[600px] w-auto inline-block"
                      onLoad={(_e) => {
                         // Default crop center
                         setCrop({ unit: '%', width: 50, height: 50, x: 25, y: 25 });
                      }}
                    />
                  </ReactCrop>
                )}
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
