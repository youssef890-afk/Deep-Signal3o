import {
  useEffect,
  useRef,
  useState,
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

interface Reel {
  id: string;
  user_id: string;
  video_url: string;
  caption: string | null;
  created_at: string;
  post_type: 'reel';
  video_type: 'reel';
  profile: {
    username: string;
    avatar_url: string | null;
  } | null;
}

export default function ReelsPage() {
  const [reels, setReels] = useState<Reel[]>([]);
  const [loading, setLoading] = useState(true);

  const navigate = useNavigate();

  useEffect(() => {
    void loadReels();
  }, []);

  async function loadReels() {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from('posts')
        .select(`
          id,
          user_id,
          video_url,
          caption,
          created_at,
          post_type,
          video_type,
          profile:profiles(
            username,
            avatar_url
          )
        `)
        .eq('post_type', 'reel')
        .eq('video_type', 'reel')
        .not('video_url', 'is', null)
        .order('created_at', {
          ascending: false,
        });

      if (error) {
        throw error;
      }

      setReels(
        (data as Reel[]) || []
      );
    } catch (error) {
      console.error(
        'Error loading reels:',
        error
      );

      setReels([]);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-rose-500 animate-spin" />
      </div>
    );
  }

  if (reels.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-neutral-400 text-sm">
          لا توجد Reels حالياً
        </p>
      </div>
    );
  }

  return (
    <main className="
      h-screen
      w-full
      bg-black
      overflow-y-auto
      snap-y
      snap-mandatory
      scrollbar-hide
    ">
      {reels.map((reel) => (
        <ReelItem
          key={reel.id}
          reel={reel}
          navigate={navigate}
        />
      ))}
    </main>
  );
}

function ReelItem({
  reel,
  navigate,
}: {
  reel: Reel;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const videoRef =
    useRef<HTMLVideoElement>(null);

  const containerRef =
    useRef<HTMLDivElement>(null);

  const [isVisible, setIsVisible] =
    useState(false);

  const [isPlaying, setIsPlaying] =
    useState(false);

  const [isMuted, setIsMuted] =
    useState(true);

  /*
   * مراقبة الـReel اللي داخل الشاشة
   */
  useEffect(() => {
    const element =
      containerRef.current;

    if (!element) return;

    const observer =
      new IntersectionObserver(
        (entries) => {
          const entry =
            entries[0];

          if (!videoRef.current) {
            return;
          }

          if (entry.isIntersecting) {
            setIsVisible(true);

            /*
             * يبدأ Muted
             */
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
            setIsVisible(false);

            /*
             * مهم:
             * أي Reel خرج من الشاشة
             * يتوقف مباشرة.
             */
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

  function togglePlay() {
    const video =
      videoRef.current;

    if (!video) return;

    if (video.paused) {
      void video.play();

      setIsPlaying(true);
    } else {
      video.pause();

      setIsPlaying(false);
    }
  }

  function toggleMute() {
    const video =
      videoRef.current;

    if (!video || !isVisible) {
      return;
    }

    video.muted =
      !video.muted;

    setIsMuted(
      video.muted
    );
  }

  async function handleShare() {
    const url =
      `${window.location.origin}/post/${reel.id}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: 'Deep Signal Reel',
          text: reel.caption || 'شوف هاد الـReel',
          url,
        });
      } else {
        await navigator.clipboard.writeText(url);

        alert(
          'تم نسخ الرابط'
        );
      }
    } catch (error) {
      if (
        error instanceof DOMException &&
        error.name === 'AbortError'
      ) {
        return;
      }

      console.error(
        'Share error:',
        error
      );
    }
  }

  const username =
    reel.profile?.username ||
    'مستخدم';

  return (
    <section
      ref={containerRef}
      className="
        relative
        h-screen
        w-full
        snap-start
        bg-black
        overflow-hidden
        flex
        items-center
        justify-center
      "
    >
      <video
        ref={videoRef}
        src={reel.video_url}
        loop
        playsInline
        muted
        preload={
          isVisible
            ? 'auto'
            : 'metadata'
        }
        onClick={togglePlay}
        className="
          h-full
          w-full
          object-cover
          cursor-pointer
        "
      />

      {/* Gradient */}
      <div className="
        absolute
        inset-0
        pointer-events-none
        bg-gradient-to-b
        from-black/10
        via-transparent
        to-black/80
      " />

      {/* Play */}
      {!isPlaying && (
        <button
          type="button"
          onClick={togglePlay}
          className="
            absolute
            inset-0
            z-20
            flex
            items-center
            justify-center
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
            <Play
              className="
                w-8
                h-8
                text-white
                fill-white
              "
            />
          </div>
        </button>
      )}

      {/* معلومات صاحب الـReel */}
      <div className="
        absolute
        left-4
        right-20
        bottom-20
        z-30
        text-white
      ">
        <div
          className="
            flex
            items-center
            gap-3
            cursor-pointer
            mb-3
          "
          onClick={() =>
            navigate(
              `/profile/${reel.user_id}`
            )
          }
        >
          <Avatar
            src={
              reel.profile?.avatar_url
            }
            name={username}
            size="sm"
          />

          <span className="
            font-bold
            text-sm
          ">
            @{username}
          </span>
        </div>

        {reel.caption && (
          <p className="
            text-sm
            text-white
            mb-3
            line-clamp-3
          ">
            {reel.caption}
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
            w-4
            h-4
          " />

          <span>
            الصوت الأصلي - {username}
          </span>
        </div>
      </div>

      {/* الأزرار */}
      <div className="
        absolute
        right-4
        bottom-24
        z-30
        flex
        flex-col
        gap-5
        items-center
      ">
        {/* الصوت */}
        <button
          type="button"
          onClick={toggleMute}
          className="
            w-12
            h-12
            rounded-full
            bg-black/50
            backdrop-blur-md
            border
            border-white/10
            flex
            items-center
            justify-center
            text-white
          "
        >
          {isMuted ? (
            <VolumeX className="w-6 h-6" />
          ) : (
            <Volume2 className="w-6 h-6" />
          )}
        </button>

        {/* Like */}
        <button
          type="button"
          className="
            w-12
            h-12
            rounded-full
            bg-black/50
            backdrop-blur-md
            border
            border-white/10
            flex
            items-center
            justify-center
            text-white
          "
        >
          <Heart className="w-6 h-6" />
        </button>

        {/* Comments */}
        <button
          type="button"
          onClick={() =>
            navigate(
              `/post/${reel.id}`
            )
          }
          className="
            w-12
            h-12
            rounded-full
            bg-black/50
            backdrop-blur-md
            border
            border-white/10
            flex
            items-center
            justify-center
            text-white
          "
        >
          <MessageCircle className="w-6 h-6" />
        </button>

        {/* Share */}
        <button
          type="button"
          onClick={() =>
            void handleShare()
          }
          className="
            w-12
            h-12
            rounded-full
            bg-black/50
            backdrop-blur-md
            border
            border-white/10
            flex
            items-center
            justify-center
            text-white
          "
        >
          <Share2 className="w-6 h-6" />
        </button>
      </div>
    </section>
  );
}
