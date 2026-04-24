import { useState, useRef, useEffect } from 'react';
import { ShieldAlert, Eraser, Download, MousePointer2, RotateCcw } from 'lucide-react';

export default function SmartRedaction() {
  const [image, setImage] = useState<string | null>(null);

  const [blocks, setBlocks] = useState<{ x: number, y: number, w: number, h: number }[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target?.result as string);
        setBlocks([]);
      };
      reader.readAsDataURL(file);
    }
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!image) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top;
    setStartPos({ x, y });
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || !image) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = ('touches' in e ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = ('touches' in e ? e.touches[0].clientY : e.clientY) - rect.top;
    
    const ctx = canvasRef.current!.getContext('2d');
    if (ctx) {
      renderCanvas();
      ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
      ctx.fillRect(startPos.x, startPos.y, x - startPos.x, y - startPos.y);
    }
  };

  const stopDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const x = ('changedTouches' in e ? e.changedTouches[0].clientX : e.clientX) - rect.left;
    const y = ('changedTouches' in e ? e.changedTouches[0].clientY : e.clientY) - rect.top;
    
    const newBlock = {
      x: Math.min(startPos.x, x),
      y: Math.min(startPos.y, y),
      w: Math.abs(x - startPos.x),
      h: Math.abs(y - startPos.y)
    };
    
    if (newBlock.w > 5 && newBlock.h > 5) {
      setBlocks([...blocks, newBlock]);
    }
    setIsDrawing(false);
    renderCanvas();
  };

  const renderCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.src = image;
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      ctx.fillStyle = 'black';
      blocks.forEach(block => {
        ctx.fillRect(block.x, block.y, block.w, block.h);
      });
    };
  };

  useEffect(() => {
    renderCanvas();
  }, [image, blocks]);

  const downloadRedacted = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = 'redacted_document.png';
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 py-8 px-4">
      <div className="flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-red-500" />
            Smart Redaction
          </h1>
          <p className="text-slate-400">Draw over sensitive information to permanently black it out.</p>
        </div>
        
        <div className="flex gap-4">
          <button 
            onClick={() => setBlocks([])}
            className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-all flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
          <button 
            onClick={downloadRedacted}
            disabled={!image}
            className="px-6 py-2 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Download className="w-4 h-4" /> Download
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900/50 border border-white/10 rounded-3xl p-6 space-y-6">
            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-slate-400 mb-2 block">Upload File</span>
                <input 
                  type="file" 
                  onChange={handleUpload} 
                  accept="image/*"
                  className="block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-500/10 file:text-indigo-400 hover:file:bg-indigo-500/20 transition-all cursor-pointer"
                />
              </label>
            </div>

            <div className="space-y-4 pt-4 border-t border-white/10">
              <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                <MousePointer2 className="w-4 h-4 text-indigo-400" />
                Instructions
              </h3>
              <ul className="text-xs text-slate-400 space-y-2">
                <li>• Click and drag on the image to redact text.</li>
                <li>• Black boxes are permanent after download.</li>
                <li>• No data leaves your browser.</li>
              </ul>
            </div>

            <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-4 flex gap-3">
              <Eraser className="w-5 h-5 text-red-500 shrink-0" />
              <p className="text-[10px] text-red-200/50 uppercase tracking-widest font-bold">Permanent Scrubber</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          <div 
            ref={containerRef}
            className="relative bg-black/40 border border-white/5 rounded-3xl overflow-hidden flex items-center justify-center min-h-[500px] cursor-crosshair group"
          >
            {!image && (
              <div className="text-center space-y-4 opacity-30">
                <ShieldAlert className="w-20 h-20 mx-auto" />
                <p className="text-xl font-medium">Upload a document to start redacting</p>
              </div>
            )}
            
            <canvas
              ref={canvasRef}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="max-w-full h-auto shadow-2xl transition-transform duration-200"
              style={{ touchAction: 'none' }}
            />

            {image && (
              <div className="absolute bottom-6 right-6 flex gap-2">
                <div className="bg-black/60 backdrop-blur-md border border-white/10 rounded-full px-4 py-2 flex items-center gap-4 text-xs font-medium text-white shadow-2xl">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                    {blocks.length} Redactions
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
