import { useState } from 'react';
import { FileUpload } from './components/FileUpload';
import { TranslationView } from './components/TranslationView';
import { parseEpub } from './lib/epub-parser';
import { Languages } from 'lucide-react';

function App() {
  const [book, setBook] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleFileSelect = async (file) => {
    setIsProcessing(true);
    try {
      // Simulate specialized loading feel
      await new Promise(r => setTimeout(r, 800));

      const parsedBook = await parseEpub(file);
      console.log("Book Parsed:", parsedBook);
      setBook(parsedBook);
    } catch (e) {
      console.error(e);
      alert("Failed to parse EPUB: " + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-paper font-serif selection:bg-ink-200 selection:text-ink-900">
      {/* Header */}
      <header className="fixed top-0 w-full z-10 bg-white/80 backdrop-blur-md border-b border-ink-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-ink-900 rounded-lg flex items-center justify-center text-paper">
              <Languages size={18} />
            </div>
            <span className="font-bold text-lg tracking-tight text-ink-900">
              InkTranslate
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-32 px-6 max-w-7xl mx-auto pb-20">
        {!book ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-12 animate-ink-flow">
            <div className="text-center space-y-4 max-w-xl">
              <h1 className="text-4xl md:text-5xl font-bold text-ink-900 tracking-tight leading-tight">
                Translate Books with <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-ink-800 to-ink-500">
                  Nuance & Context
                </span>
              </h1>
              <p className="text-ink-500 text-lg leading-relaxed">
                AI-powered translation that preserves structure, formatting, and the soul of the story.
              </p>
            </div>

            <FileUpload onFileSelect={handleFileSelect} isProcessing={isProcessing} />
          </div>
        ) : (
          <TranslationView book={book} onReset={() => setBook(null)} />
        )}
      </main>
    </div>
  );
}

export default App;
