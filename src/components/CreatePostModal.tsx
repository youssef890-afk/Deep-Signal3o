import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import { ImagePlus, X, Loader2, Sparkles } from 'lucide-react';

interface CreatePostProps {
  onPosted: () => void;
}

export default function CreatePostModal({ onPosted }: CreatePostProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [caption, setCaption] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);

    setUploading(true);
    const ext = file.name.split('.').pop();
    const filePath = `${user.id}/${Date.now()}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('posts')
      .upload(filePath, file);

    if (uploadError) {
      alert('Failed to upload image: ' + uploadError.message);
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from('posts').getPublicUrl(filePath);
    setImagePreview(urlData.publicUrl);
    setUploading(false);
  };

  const handleSubmit = async () => {
    if (!imagePreview || !user) return;

    const { error } = await supabase.from('posts').insert({
      image_url: imagePreview,
      caption: caption.trim() || null,
    });

    if (error) {
      alert('Failed to create post: ' + error.message);
      return;
    }

    setCaption('');
    setImagePreview(null);
    setOpen(false);
    onPosted();
  };

  const handleClose = () => {
    setCaption('');
    setImagePreview(null);
    setOpen(false);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all text-neutral-300 hover:text-white group"
      >
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-rose-500/20 to-amber-500/20 flex items-center justify-center group-hover:from-rose-500/30 group-hover:to-amber-500/30 transition-all">
          <ImagePlus className="w-5 h-5" />
        </div>
        <span className="text-sm font-medium">Share something with the world...</span>
        <Sparkles className="w-4 h-4 ml-auto text-neutral-600" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={handleClose} />

      <div className="relative w-full max-w-lg bg-neutral-900 border border-white/10 rounded-2xl overflow-hidden animate-scale-in shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="text-lg font-semibold">Create Post</h2>
          <button onClick={handleClose} className="text-neutral-400 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {imagePreview ? (
            <div className="relative rounded-xl overflow-hidden">
              <img src={imagePreview} alt="Preview" className="w-full max-h-80 object-cover" />
              <button
                onClick={() => setImagePreview(null)}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 backdrop-blur flex items-center justify-center text-white hover:bg-black/80 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <label className="flex flex-col items-center justify-center gap-3 py-12 border-2 border-dashed border-white/10 rounded-xl cursor-pointer hover:border-rose-500/30 hover:bg-white/5 transition-all">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-rose-500/20 to-amber-500/20 flex items-center justify-center">
                <ImagePlus className="w-7 h-7 text-rose-400" />
              </div>
              <span className="text-sm text-neutral-400">Click to upload an image</span>
              <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
            </label>
          )}

          <textarea
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Write a caption..."
            rows={3}
            maxLength={500}
            className="w-full bg-neutral-800/80 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-rose-500/50 focus:ring-2 focus:ring-rose-500/20 transition-all resize-none"
          />

          <button
            onClick={handleSubmit}
            disabled={!imagePreview || uploading}
            className="w-full bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 text-white font-semibold py-3 rounded-xl hover:opacity-90 transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" /> Uploading...
              </>
            ) : (
              'Share Post'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
