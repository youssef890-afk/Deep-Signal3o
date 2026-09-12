import {
  useState,
  useEffect,
  useRef,
} from 'react';
import {
  useNavigate,
} from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import {
  Heart,
  MessageCircle,
  Share2,
  Music2,
  Loader2,
  Volume2,
  VolumeX,
  Play,
} from 'lucide-react';
import Avatar from '@/components/Avatar';

interface VideoPost {
  id: string;
  video_url: string;
  caption: string | null;
  user_id: string;
  created_at: string;
  post_type: string | null;
  video_type: string | null;
  profile: {
    username: string;
    avatar_url: string | null;
  } | null;
}

export default function ReelsPage() {
  const [videos, setVideos] = useState<VideoPost[]>([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    void fetchReels();
  }, []);

  async function fetchReels() {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('posts')
        .select(
          `
            id,
            video_url,
            caption,
            user_id,
            created_at,
            post_type,
            video_type,
            profile:profiles(
              username,
              avatar_url
            )
          `
        )
        .not('video_url', 'is', null)
        .or('post_type.eq.reel,video_type.eq.reel')
        .order('created_at', {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      setVideos((data as VideoPost[]) || []);
    } catch (error: unknown) {
      console.error(
        'Error fetching reels:',
        error
      );

      setVideos([]);
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
        <p className="text-neutral-400 text-sm">
          لا توجد فيديوهات ريلز حالياً
        </p>
      </div>
    );
  }

  return (
    <div className="h-screen w-full bg-black snap-y snap-mandatory overflow-y-scroll scrollbar-hide">
      {videos.map((video) => (
        <ReelItem
          key={video.id}
          video={video}
          onNavigate={navigate}
        />
      ))}
    </div>
  );
}

function ReelItem({
  video,
  onNavigate,
}: {
  video: VideoPost;
  onNavigate: ReturnType<typeof useNavigate>;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const itemRef = useRef<HTMLDivElement>(null);

  const [isActive, setIsActive] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  /*
   * نراقبو واش الـ Reel داخل الشاشة.
   * غير إلا وصل المستخدم ليه، كنبدأو التشغيل.
   */
  useEffect(() => {
    const element = itemRef.current;

    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];

        setIsActive(entry.isIntersecting);

        if (!videoRef.current) return;

        if (entry.isIntersecting) {
          videoRef.current.currentTime = 0;

          videoRef.current.muted = true;

          void videoRef.current
            .play()
            .then(() => {
              setIsPlaying(true);
            })
            .catch(() => {
              setIsPlaying(false);
            });
        } else {
          videoRef.current.pause();
          setIsPlaying(false);
        }
      },
      {
        threshold: 0.75,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();

      if (videoRef.current) {
        videoRef.current.pause();
      }
    };
  }, []);

  const togglePlay = () => {
    if (!videoRef.current) return;

    if (videoRef.current.paused) {
      void videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;

    const newMutedState = !videoRef.current.muted;

    videoRef.current.muted = newMutedState;

    setIsMuted(newMutedState);

    /*
     * إذا المستخدم شعل الصوت،
     * نخليو الفيديو الحالي فقط هو اللي عندو الصوت.
     */
    if (!newMutedState && isActive) {
      void videoRef.current.play().catch(() => {});
    }
  };

  async function handleShare() {
    if (
      typeof navigator.share !==
      'function'
    ) {
      return;
    }

    try {
      await navigator.share({
        title: 'Deep Signal Reel',
        url: window.location.href,
      });
    } catch (error: unknown) {
      if (
        error instanceof DOMException &&
        error.name === 'AbortError'
      ) {
        return;
      }

      console.error(
        'Error sharing reel:',
        error
      );
    }
  }

  const username =
    video.profile?.username || 'User';

  return (
    <div
      ref={itemRef}
      className="
        h-screen
        w-full
        snap-start
        relative
        flex
        items-center
        justify-center
        bg-black
        overflow-hidden
      "
    >
      <video
        ref={videoRef}
        src={video.video_url}
        loop
        playsInline
        muted
        preload={isActive ? 'auto' : 'metadata'}
        onClick={togglePlay}
        className="
          h-full
          w-full
          object-cover
          cursor-pointer
        "
      />

      {/* Play icon */}
      {!isPlaying && (
        <button
          type="button"
          onClick={togglePlay}
          className="
            absolute
            inset-0
            flex
            items-center
            justify-center
            z-20
          "
        >
          <div className="
            w-16
            h-16
            rounded-full
            bg-black/50
            backdrop-blur-md
            flex
            items-center
            justify-center
          ">
            <Play className="w-8 h-8 text-white fill-white" />
          </div>
        </button>
      )}

      {/* Gradient */}
      <div className="
        absolute
        inset-0
        bg-gradient-to-b
        from-transparent
        via-transparent
        to-black/80
        pointer-events-none
      " />

      {/* Bottom information */}
      <div className="
        absolute
        bottom-20
        left-4
        right-16
        text-white
        z-30
        space-y-3
      ">
        <div
          className="
            flex
            items-center
            gap-3
            cursor-pointer
          "
          onClick={() =>
            onNavigate(
              `/profile/${video.user_id}`
            )
          }
        >
          <Avatar
            src={
              video.profile?.avatar_url
            }
            name={username}
            size="sm"
          />

          <span className="font-bold text-sm">
            @{username}
          </span>
        </div>

        {video.caption && (
          <p className="
            text-xs
            text-neutral-200
            line-clamp-2
          ">
            {video.caption}
          </p>
        )}

        <div className="
          flex
          items-center
          gap-2
          text-xs
          text-neutral-300
        ">
          <Music2 className="
            w-3.5
            h-3.5
            animate-spin
          " />

          <span>
            الصوت الأصلي - {username}
          </span>
        </div>
      </div>

      {/* Right buttons */}
      <div className="
        absolute
        right-4
        bottom-24
        flex
        flex-col
        items-center
        gap-5
        z-30
        text-white
      ">
        {/* Sound */}
        <button
          type="button"
          onClick={toggleMute}
          className="
            flex
            flex-col
            items-center
            gap-1
          "
        >
          <div className="
            p-3
            bg-neutral-900/50
            backdrop-blur-md
            rounded-full
            border
            border-white/10
          ">
            {isMuted ? (
              <VolumeX className="w-6 h-6" />
            ) : (
              <Volume2 className="w-6 h-6" />
            )}
          </div>
        </button>

        {/* Like */}
        <button
          type="button"
          className="
            flex
            flex-col
            items-center
            gap-1
          "
        >
          <div className="
            p-3
            bg-neutral-900/50
            backdrop-blur-md
            rounded-full
            border
            border-white/10
          ">
            <Heart className="
              w-6
              h-6
              hover:text-rose-500
              transition
            " />
          </div>
        </button>

        {/* Comments */}
        <button
          type="button"
          onClick={() =>
            onNavigate(
              `/post/${video.id}`
            )
          }
          className="
            flex
            flex-col
            items-center
            gap-1
          "
        >
          <div className="
            p-3
            bg-neutral-900/50
            backdrop-blur-md
            rounded-full
            border
            border-white/10
          ">
            <MessageCircle className="w-6 h-6" />
          </div>
        </button>

        {/* Share */}
        <button
          type="button"
          onClick={() =>
            void handleShare()
          }
          className="
            flex
            flex-col
            items-center
            gap-1
          "
        >
          <div className="
            p-3
            bg-neutral-900/50
            backdrop-blur-md
            rounded-full
            border
            border-white/10
          ">
            <Share2 className="w-6 h-6" />
          </div>
        </button>
      </div>
    </div>
  );
}
