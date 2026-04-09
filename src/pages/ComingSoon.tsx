import { Hammer } from 'lucide-react';

export default function ComingSoon({ title, description }: { title: string, description: string }) {
  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-500 py-20 text-center">
      <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-indigo-500/10 mb-6">
        <Hammer className="w-12 h-12 text-indigo-400" />
      </div>
      <h1 className="text-4xl font-extrabold text-white">{title}</h1>
      <p className="text-slate-400 max-w-xl mx-auto text-lg">{description}</p>
      <div className="pt-8">
        <div className="inline-block px-6 py-3 rounded-full bg-slate-800/50 border border-slate-700 text-slate-300 font-medium">
          Under Active Development
        </div>
      </div>
    </div>
  );
}
