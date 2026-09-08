import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import { Heart, MessageCircle, Share2, Loader2, Music2 } from 'lucide-react';

interface Reel {
  id: string;
  user_id: string;
  video_url: string;
  caption: string;
  created_at: string;
  profiles?: { username: string; avatar_url: string };
}

export default function ReelsPage() {
  const { user } = useAuth();
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReels();
  }, []);

  async function loadReels() {
    setLoading(true);
    try {
      const { data: reelsData } = await supabase
        .from('reels')
        .select('*')
        .order('created_at', { ascending: false });

      const { data: profilesData } = await supabase.from('profiles').select('id, username, avatar_url');
      const profilesMap = new Map(profilesData?.map((p) => [p.id, p]));

      const formatted = (reelsData || []).map((reel) => ({
        ...reel,
        profiles: {
          username: profilesMap.get(reel.user_id)?.username || 'مستخدم',
          avatar_url: profilesMap.get(reel.user_id)?.avatar_url || '',
        },
      }));

      setReels(formatted);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
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
    <div className="h-screen w-full bg-black snap-y snap-mandatory overflow-y-scroll scrollbar-hide pb-16">
      {reels.length === 0 ? (
        <div className="h-full flex items-center justify-center text-neutral-500 text-xs">
          لا توجد مقاطع ريلز حالياً.
        </div>
      ) : (
        reels.map((reel) => <ReelCard key={reel.id} reel={reel} />)
      )}
    </div>
  );
}

function ReelCard({ reel }: { reel: Reel }) {
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
    <div className="relative w-full h-screen snap-start flex items-center justify-center bg-black">
      <video
        ref={videoRef}
        src={reel.video_url}
        className="w-full h-full object-cover"
        loop
        autoPlay
        playsInline
        onClick={togglePlay}
      />

      {/* التراكب السفلي للمعلومات والأزرار */}
      <div className="absolute bottom-20 left-0 right-0 p-4 flex justify-between items-end bg-gradient-to-t from-black/80 via-black/20 to-transparent">
        {/* معلومات المستخدم والموضوع */}
        <div className="space-y-2 text-white max-w-[80%]">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-rose-500 flex items-center justify-center font-bold text-xs border border-white/20">
              {reel.profiles?.username?.charAt(0).toUpperCase()}
            </div>
            <span className="font-bold text-xs">{reel.profiles?.username}</span>
          </div>
          <p className="text-xs text-neutral-200 line-clamp-2">{reel.caption}</p>
          <div className="flex items-center gap-1 text-[11px] text-neutral-400">
            <Music2 className="w-3.5 h-3.5 animate-spin" />
            <span>الصوت الأصلي - {reel.profiles?.username}</span>
          </div>
        </div>

        {/* أزرار التفاعل الجانبية */}
        <div className="flex flex-col items-center gap-4 text-white">
          <button className="flex flex-col items-center gap-1">
            <div className="p-2.5 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
              <Heart className="w-5 h-5" />
            </div>
            <span className="text-[10px]">إعجاب</span>
          </button>

          <button className="flex flex-col items-center gap-1">
            <div className="p-2.5 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
              <MessageCircle className="w-5 h-5" />
            </div>
            <span className="text-[10px]">تعليق</span>
          </button>

          <button className="flex flex-col items-center gap-1">
            <div className="p-2.5 bg-black/40 backdrop-blur-md rounded-full border border-white/10">
              <Share2 className="w-5 h-5" />
            </div>
            <span className="text-[10px]">مشاركة</span>
          </button>
        </div>
      </div>
    </div>
  );
}
