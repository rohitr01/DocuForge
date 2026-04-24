import { useState, useRef } from 'react';
import { createWorker } from 'tesseract.js';
import { FileText, Copy, Loader2, Download, AlertCircle, Search } from 'lucide-react';

export default function OCRExtractor() {
  const [image, setImage] = useState<string | null>(null);
  const [text, setText] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  const [copySuccess, setCopySuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setImage(event.target?.result as string);
        setText('');
      };
      reader.readAsDataURL(file);
    }
  };

  const processImage = async () => {
    if (!image) return;
    setIsProcessing(true);


    try {
      const worker = await createWorker('eng');
      
      // Since it's version 5+, we use recognize directly
      const { data: { text } } = await worker.recognize(image);
      setText(text);
      await worker.terminate();
    } catch (error) {
      console.error('OCR Error:', error);
      setText('Error processing image. Please try another one.');
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(text);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 2000);
  };

  const downloadText = () => {
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'extracted_text.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-8">
      <div className="text-center space-y-4">
        <div className="bg-indigo-500 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-indigo-500/20">
          <FileText className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-4xl font-bold text-white">AI OCR Text Extractor</h1>
        <p className="text-slate-400 max-w-2xl mx-auto">
          Extract editable text from any image or scanned document. 100% private processing using Tesseract.js directly in your browser.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Upload Section */}
        <div className="space-y-6">
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-3xl p-12 text-center transition-all cursor-pointer group
              ${image ? 'border-indigo-500/50 bg-indigo-500/5' : 'border-white/10 hover:border-indigo-500/30 bg-white/5 hover:bg-white/10'}`}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              accept="image/*" 
              className="hidden" 
            />
            {image ? (
              <img src={image} alt="Upload preview" className="max-h-64 mx-auto rounded-xl shadow-2xl" />
            ) : (
              <div className="space-y-4">
                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto group-hover:scale-110 transition-transform">
                  <Search className="w-8 h-8 text-slate-400" />
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-medium text-white">Select Image</p>
                  <p className="text-sm text-slate-400">JPG, PNG, WebP supported</p>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={processImage}
            disabled={!image || isProcessing}
            className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all
              ${!image || isProcessing 
                ? 'bg-white/5 text-slate-500 cursor-not-allowed' 
                : 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/25'}`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Extracting Text...
              </>
            ) : (
              <>
                <FileText className="w-5 h-5" />
                Start Extraction
              </>
            )}
          </button>

          <div className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
            <p className="text-xs text-amber-200/70 leading-relaxed">
              For best results, ensure the text is clear, high-contrast, and oriented correctly. Complex layouts might require manual correction.
            </p>
          </div>
        </div>

        {/* Results Section */}
        <div className="flex flex-col h-full bg-slate-900/50 border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Extracted Text</span>
            </div>
            {text && (
              <div className="flex gap-2">
                <button 
                  onClick={copyToClipboard}
                  className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors"
                  title="Copy to clipboard"
                >
                  <Copy className={`w-4 h-4 ${copySuccess ? 'text-green-400' : ''}`} />
                </button>
                <button 
                  onClick={downloadText}
                  className="p-2 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors"
                  title="Download as TXT"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
          <div className="flex-1 p-6 font-mono text-sm leading-relaxed text-slate-300 overflow-auto min-h-[300px] whitespace-pre-wrap">
            {isProcessing ? (
              <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-50">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
                <p>AI is reading your document...</p>
              </div>
            ) : text ? (
              text
            ) : (
              <div className="h-full flex flex-col items-center justify-center opacity-30 text-center">
                <FileText className="w-12 h-12 mb-4" />
                <p>Your extracted text will appear here</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
