import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { Heart, MessageCircle, Share2, Music2, Loader2 } from 'lucide-react';
import Avatar from '@/components/Avatar';
import { useNavigate } from 'react-router-dom';

interface VideoPost {
  id: string;
  video_url: string;
  caption: string;
  user_id: string;
  created_at: string;
  profile?: {
    username: string;
    avatar_url: string;
  };
}

export default function ReelsPage() {
  const [videos, setVideos] = useState<VideoPost[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchReels();
  }, []);

  async function fetchReels() {
    setLoading(true);
    try {
      // جلب المنشورات التي تحتوي على فيديوهات فقط
      const { data, error } = await supabase
        .from('posts')
        .select('*, profile:profiles(username, avatar_url)')
        .not('video_url', 'is', null)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVideos(data || []);
    } catch (err) {
      console.error('Error fetching reels:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-4">
        <p className="text-neutral-400 text-sm">لا توجد فيديوهات ريلز حالياً</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-black snap-y snap-mandatory overflow-y-scroll scrollbar-hide">
      {videos.map((video) => (
        <ReelItem key={video.id} video={video} onNavigate={navigate} />
      ))}
    </div>
  );
}

function ReelItem({ video, onNavigate }: { video: VideoPost; onNavigate: any }) {
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
    <div className="h-screen w-full snap-start relative flex items-center justify-center bg-black overflow-hidden">
      {/* الفيديو الرئيسي */}
      <video
        ref={videoRef}
        src={video.video_url}
        loop
        autoPlay
        playsInline
        onClick={togglePlay}
        className="h-full w-full object-cover cursor-pointer"
      />

      {/* التدرج اللوني فوق الفيديو بأسفل الشاشة */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-black/80 pointer-events-none" />

      {/* تفاصيل الكاتب والوصف أسفل يسار الفيديو */}
      <div className="absolute bottom-20 left-4 right-16 text-white z-10 space-y-3">
        <div 
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => onNavigate(`/profile/${video.user_id}`)}
        >
          <Avatar
            src={video.profile?.avatar_url}
            name={video.profile?.username || 'User'}
            size="sm"
          />
          <span className="font-bold text-sm">@{video.profile?.username}</span>
        </div>

        {video.caption && <p className="text-xs text-neutral-200 line-clamp-2">{video.caption}</p>}

        <div className="flex items-center gap-2 text-xs text-neutral-300">
          <Music2 className="w-3.5 h-3.5 animate-spin" />
          <span>الصوت الأصلي - {video.profile?.username}</span>
        </div>
      </div>

      {/* أزرار التفاعل على يمين الفيديو */}
      <div className="absolute right-4 bottom-24 flex flex-col items-center gap-6 z-10 text-white">
        <button className="flex flex-col items-center gap-1">
          <div className="p-3 bg-neutral-900/50 backdrop-blur-md rounded-full border border-white/10">
            <Heart className="w-6 h-6 hover:text-rose-500 transition" />
          </div>
        </button>

        <button 
          onClick={() => onNavigate(`/post/${video.id}`)}
          className="flex flex-col items-center gap-1"
        >
          <div className="p-3 bg-neutral-900/50 backdrop-blur-md rounded-full border border-white/10">
            <MessageCircle className="w-6 h-6" />
          </div>
        </button>

        <button 
          onClick={() => navigator.share?.({ title: 'Reels', url: window.location.href })}
          className="flex flex-col items-center gap-1"
        >
          <div className="p-3 bg-neutral-900/50 backdrop-blur-md rounded-full border border-white/10">
            <Share2 className="w-6 h-6" />
          </div>
        </button>
      </div>
    </div>
  );
}

