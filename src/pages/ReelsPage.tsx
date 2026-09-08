import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Heart, MessageCircle, Share2, Loader2, Plus, X, Upload, Music2 } from 'lucide-react';

interface Reel {
  id: string;
  user_id: string;
  video_url: string;
  caption: string;
  created_at: string;
  profiles?: {
    username: string;
    avatar_url?: string;
  };
}

export default function ReelsPage() {
  const { user } = useAuth();
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);
  
  // حالات النافذة المنبثقة لرفع فيديو جديد
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [caption, setCaption] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    loadReels();
  }, []);

  async function loadReels() {
    setLoading(true);
    try {
      // 1. جلب فيديوهات الريلز من الجدول
      const { data: reelsData, error: reelsError } = await supabase
        .from('reels')
        .select('*')
        .order('created_at', { ascending: false });

      if (reelsError) throw reelsError;

      // 2. جلب بيانات المستخدمين لربط كل فيديو باسم صاحبه
      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, username, avatar_url');

      const profilesMap = new Map(profilesData?.map((p) => [p.id, p]));

      const formattedReels: Reel[] = (reelsData || []).map((reel) => ({
        ...reel,
        profiles: {
          username: profilesMap.get(reel.user_id)?.username || 'مستخدم',
          avatar_url: profilesMap.get(reel.user_id)?.avatar_url || '',
        },
      }));

      setReels(formattedReels);
    } catch (err: any) {
      console.error('خطأ في جلب الريلز:', err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleUploadReel(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedFile || !user) return;

    setUploading(true);
    try {
      // رفع الفيديو إلى Storage في Supabase
      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `reel_${user.id}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('posts')
        .upload(filePath, selectedFile);

      if (uploadError) throw uploadError;

      // الحصول على رابط الفيديو العام
      const { data: urlData } = supabase.storage
        .from('posts')
        .getPublicUrl(filePath);

      // حفظ البيانات في جدول reels
      const { error: insertError } = await supabase.from('reels').insert([
        {
          user_id: user.id,
          video_url: urlData.publicUrl,
          caption: caption.trim(),
        },
      ]);

      if (insertError) throw insertError;

      // إعادة تعيين المدخلات وتحديث القائمة
      setIsModalOpen(false);
      setCaption('');
      setSelectedFile(null);
      loadReels();
    } catch (err: any) {
      alert('حدث خطأ أثناء رفع الفيديو: ' + err.message);
    } finally {
      setUploading(false);
    }
  }

  if (loading) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-black text-rose-500">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-black snap-y snap-mandatory overflow-y-scroll relative pb-16 no-scrollbar">
      {/* زر إضافة مقطع ريلز جديد */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="fixed top-4 right-4 z-40 bg-rose-500/80 hover:bg-rose-600 text-white p-3 rounded-full backdrop-blur-md shadow-lg transition-transform active:scale-95 flex items-center justify-center"
        title="نشر مقطع ريلز"
      >
        <Plus className="w-6 h-6" />
      </button>

      {/* النافذة المنبثقة لرفع ريلز جديد */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-white/10 rounded-2xl w-full max-w-md p-5 text-white shadow-2xl">
            <div className="flex justify-between items-center mb-4 border-b border-white/10 pb-3">
              <h3 className="text-base font-bold">نشر مقطع ريلز جديد</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-neutral-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUploadReel} className="space-y-4">
              <div>
                <label className="block text-xs text-neutral-400 mb-1">وصف الفيديو</label>
                <input
                  type="text"
                  placeholder="اكتب وصفاً أو هاشتاق..."
                  value={caption}
                  onChange={(e) => setCaption(e.target.value)}
                  className="w-full bg-neutral-950 border border-white/10 p-3 rounded-xl text-xs text-white focus:outline-none focus:border-rose-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs text-neutral-400 mb-1">اختر ملف الفيديو</label>
                <input
                  type="file"
                  accept="video/*"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="w-full text-xs text-neutral-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-rose-500/10 file:text-rose-400 hover:file:bg-rose-500/20"
                />
              </div>

              <button
                type="submit"
                disabled={uploading || !selectedFile}
                className="w-full bg-rose-500 hover:bg-rose-600 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl text-xs flex justify-center items-center gap-2 transition-colors mt-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    جاري الرفع...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    نشر الفيديو
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* عرض مقاطع الريلز */}
      {reels.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-neutral-500 text-xs gap-2">
          <p>لا توجد مقاطع ريلز حالياً.</p>
          <p className="text-[11px] text-neutral-600">اضغط على زر (+ ) في الأعلى لنشر أول فيديو!</p>
        </div>
      ) : (
        reels.map((reel) => <ReelItem key={reel.id} reel={reel} />)
      )}
    </div>
  );
}

function ReelItem({ reel }: { reel: Reel }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  return (
    <div className="relative w-full h-screen snap-start flex items-center justify-center bg-black overflow-hidden">
      <video
        ref={videoRef}
        src={reel.video_url}
        className="w-full h-full object-cover cursor-pointer"
        loop
        autoPlay
        playsInline
        onClick={togglePlay}
      />

      {/* التراكب السفلي لبيانات الفيديو والأزرار */}
      <div className="absolute bottom-20 left-0 right-0 p-4 flex justify-between items-end bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none">
        {/* معلومات صاحب الفيديو والوصف */}
        <div className="space-y-2 text-white max-w-[75%] pointer-events-auto">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-rose-500 flex items-center justify-center font-bold text-xs border border-white/20">
              {reel.profiles?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
            <span className="font-bold text-xs drop-shadow">{reel.profiles?.username}</span>
          </div>
          {reel.caption && <p className="text-xs text-neutral-200 line-clamp-2 drop-shadow">{reel.caption}</p>}
          <div className="flex items-center gap-1.5 text-[11px] text-neutral-300">
            <Music2 className="w-3.5 h-3.5 animate-spin" />
            <span>الصوت الأصلي - {reel.profiles?.username}</span>
          </div>
        </div>

        {/* أزرار التفاعل الجانبية */}
        <div className="flex flex-col items-center gap-5 text-white pointer-events-auto">
          <button className="flex flex-col items-center gap-1 group">
            <div className="p-3 bg-black/40 backdrop-blur-md rounded-full border border-white/10 group-active:scale-90 transition-transform">
              <Heart className="w-6 h-6 text-white group-hover:text-rose-500 transition-colors" />
            </div>
            <span className="text-[10px] text-neutral-300">إعجاب</span>
          </button>

          <button className="flex flex-col items-center gap-1 group">
            <div className="p-3 bg-black/40 backdrop-blur-md rounded-full border border-white/10 group-active:scale-90 transition-transform">
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <span className="text-[10px] text-neutral-300">تعليق</span>
          </button>

          <button className="flex flex-col items-center gap-1 group">
            <div className="p-3 bg-black/40 backdrop-blur-md rounded-full border border-white/10 group-active:scale-90 transition-transform">
              <Share2 className="w-6 h-6 text-white" />
            </div>
            <span className="text-[10px] text-neutral-300">مشاركة</span>
          </button>
        </div>
      </div>
    </div>
  );
}

