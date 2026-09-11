import React, { useEffect, useState } from 'react';
import {
  X,
  FileText,
  Image as ImageIcon,
  Video,
  ArrowLeft,
  Send,
  Loader2,
  Plus,
  Trash2,
  Check,
} from 'lucide-react';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

type ContentType = 'none' | 'text' | 'image' | 'video';

type VideoType = 'reel' | 'video';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated?: () => void;
}

interface TextBackground {
  id: string;
  className: string;
  previewClass: string;
  label: string;
}

const TEXT_BACKGROUNDS: TextBackground[] = [
  {
    id: 'sunset',
    className: 'bg-gradient-to-br from-rose-500 via-pink-500 to-orange-400',
    previewClass: 'bg-gradient-to-br from-rose-500 via-pink-500 to-orange-400',
    label: 'غروب',
  },
  {
    id: 'purple',
    className: 'bg-gradient-to-br from-purple-600 via-fuchsia-500 to-pink-500',
    previewClass: 'bg-gradient-to-br from-purple-600 via-fuchsia-500 to-pink-500',
    label: 'بنفسجي',
  },
  {
    id: 'ocean',
    className: 'bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700',
    previewClass: 'bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-700',
    label: 'بحر',
  },
  {
    id: 'fire',
    className: 'bg-gradient-to-br from-red-600 via-orange-500 to-yellow-400',
    previewClass: 'bg-gradient-to-br from-red-600 via-orange-500 to-yellow-400',
    label: 'نار',
  },
  {
    id: 'green',
    className: 'bg-gradient-to-br from-emerald-500 via-green-500 to-teal-700',
    previewClass: 'bg-gradient-to-br from-emerald-500 via-green-500 to-teal-700',
    label: 'أخضر',
  },
  {
    id: 'dark',
    className: 'bg-gradient-to-br from-neutral-800 via-neutral-900 to-black',
    previewClass: 'bg-gradient-to-br from-neutral-800 via-neutral-900 to-black',
    label: 'داكن',
  },
];

export const CreatePostModal: React.FC<CreatePostModalProps> = ({
  isOpen,
  onClose,
  onPostCreated,
}) => {
  const { user } = useAuth();

  const [contentType, setContentType] =
    useState<ContentType>('none');

  const [videoType, setVideoType] =
    useState<VideoType>('reel');

  const [content, setContent] = useState('');

  const [selectedFiles, setSelectedFiles] =
    useState<File[]>([]);

  const [previewUrls, setPreviewUrls] =
    useState<string[]>([]);

  const [selectedBackground, setSelectedBackground] =
    useState('sunset');

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      resetState();
    }
  }, [isOpen]);

  function resetState() {
    previewUrls.forEach((url) => {
      URL.revokeObjectURL(url);
    });

    setContentType('none');
    setVideoType('reel');
    setContent('');
    setSelectedFiles([]);
    setPreviewUrls([]);
    setSelectedBackground('sunset');
    setLoading(false);
  }

  function closeModal() {
    if (loading) return;

    resetState();
    onClose();
  }

  function handleSelectType(type: ContentType) {
    setContentType(type);

    setSelectedFiles([]);
    setPreviewUrls([]);

    if (type === 'text') {
      setSelectedBackground('sunset');
    }
  }

  function handleFilesChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const files = Array.from(event.target.files || []);

    if (files.length === 0) return;

    if (contentType === 'image') {
      const imageFiles = files.filter((file) =>
        file.type.startsWith('image/')
      );

      if (imageFiles.length === 0) return;

      const urls = imageFiles.map((file) =>
        URL.createObjectURL(file)
      );

      setSelectedFiles(imageFiles);
      setPreviewUrls(urls);
    }

    if (contentType === 'video') {
      const videoFile = files.find((file) =>
        file.type.startsWith('video/')
      );

      if (!videoFile) return;

      const url = URL.createObjectURL(videoFile);

      setSelectedFiles([videoFile]);
      setPreviewUrls([url]);
    }

    event.target.value = '';
  }

  function removeImage(index: number) {
    setSelectedFiles((prev) =>
      prev.filter((_, i) => i !== index)
    );

    setPreviewUrls((prev) => {
      const url = prev[index];

      if (url) {
        URL.revokeObjectURL(url);
      }

      return prev.filter((_, i) => i !== index);
    });
  }

  async function uploadFile(
    file: File,
    userId: string
  ): Promise<string> {
    const extension =
      file.name.split('.').pop()?.toLowerCase() || 'bin';

    const fileName =
      `${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 10)}.${extension}`;

    const filePath =
      `${userId}/${fileName}`;

    const { error } = await supabase.storage
      .from('posts')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
      });

    if (error) {
      throw new Error(
        `خطأ أثناء رفع الملف: ${error.message}`
      );
    }

    const { data } =
      supabase.storage
        .from('posts')
        .getPublicUrl(filePath);

    return data.publicUrl;
  }

  async function handlePublish() {
    if (!user) {
      alert('خاصك تكون مسجل الدخول أولاً.');
      return;
    }

    if (contentType === 'none') {
      alert('اختار نوع المحتوى أولاً.');
      return;
    }

    if (contentType === 'text') {
      if (!content.trim()) {
        alert('كتب شي نص قبل النشر.');
        return;
      }
    }

    if (contentType === 'image') {
      if (selectedFiles.length === 0) {
        alert('اختار صورة واحدة على الأقل.');
        return;
      }
    }

    if (contentType === 'video') {
      if (selectedFiles.length !== 1) {
        alert('اختار فيديو واحد.');
        return;
      }
    }

    setLoading(true);

    try {
      let imageUrls: string[] = [];
      let videoUrl: string | null = null;

      /*
       * TEXT POST
       */
      if (contentType === 'text') {
        const { error } = await supabase
          .from('posts')
          .insert({
            user_id: user.id,
            post_type: 'text',
            caption: content.trim(),
            background_style: selectedBackground,
            media_urls: [],
            image_url: null,
            video_url: null,
            video_type: null,
          });

        if (error) {
          throw new Error(
            `خطأ في حفظ المنشور: ${error.message}`
          );
        }
      }

      /*
       * IMAGE POST
       */
      if (contentType === 'image') {
        for (const file of selectedFiles) {
          const url = await uploadFile(
            file,
            user.id
          );

          imageUrls.push(url);
        }

        const firstImage =
          imageUrls[0] || null;

        const { error } = await supabase
          .from('posts')
          .insert({
            user_id: user.id,
            post_type: 'image',
            caption: content.trim() || null,
            background_style: null,
            media_urls: imageUrls,
            image_url: firstImage,
            video_url: null,
            video_type: null,
          });

        if (error) {
          throw new Error(
            `خطأ في حفظ الصور: ${error.message}`
          );
        }
      }

      /*
       * VIDEO / REEL
       */
      if (contentType === 'video') {
        videoUrl = await uploadFile(
          selectedFiles[0],
          user.id
        );

        const type =
          videoType === 'reel'
            ? 'reel'
            : 'video';

        const { error } = await supabase
          .from('posts')
          .insert({
            user_id: user.id,
            post_type: type,
            caption: content.trim() || null,
            background_style: null,
            media_urls: [videoUrl],
            image_url: null,
            video_url: videoUrl,
            video_type: videoType,
          });

        if (error) {
          throw new Error(
            `خطأ في حفظ الفيديو: ${error.message}`
          );
        }
      }

      alert('تم نشر المحتوى بنجاح 🎉');

      onPostCreated?.();

      resetState();
      onClose();
    } catch (error) {
      console.error('Create content error:', error);

      const message =
        error instanceof Error
          ? error.message
          : 'وقع خطأ غير معروف أثناء النشر';

      alert(message);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div
      className="
        fixed inset-0 z-[100]
        bg-black/80
        backdrop-blur-md
        flex items-end sm:items-center
        justify-center
      "
    >
      <div
        className="
          w-full sm:max-w-md
          max-h-[92vh]
          overflow-y-auto
          bg-neutral-950
          border border-white/10
          rounded-t-3xl sm:rounded-3xl
          shadow-2xl
          text-white
        "
      >

        {/* HEADER */}
        <div className="sticky top-0 z-20 bg-neutral-950/95 backdrop-blur-md px-5 py-4 border-b border-white/10">

          <div className="flex items-center justify-between">

            <div className="flex items-center gap-3">

              {contentType !== 'none' && (
                <button
                  type="button"
                  onClick={() =>
                    setContentType('none')
                  }
                  disabled={loading}
                  className="
                    w-9 h-9
                    rounded-full
                    bg-neutral-900
                    border border-white/10
                    flex items-center justify-center
                  "
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
              )}

              <div>
                <h2 className="text-lg font-bold">
                  {contentType === 'none'
                    ? 'إنشاء محتوى'
                    : contentType === 'text'
                    ? 'منشور نصي'
                    : contentType === 'image'
                    ? 'منشور صور'
                    : 'فيديو / Reels'}
                </h2>

                <p className="text-[11px] text-neutral-500">
                  شارك شيئاً مع مجتمع Deep Signal
                </p>
              </div>

            </div>

            <button
              type="button"
              onClick={closeModal}
              disabled={loading}
              className="
                w-9 h-9
                rounded-full
                bg-neutral-900
                border border-white/10
                flex items-center justify-center
              "
            >
              <X className="w-5 h-5" />
            </button>

          </div>
        </div>

        {/* TYPE SELECTOR */}
        {contentType === 'none' && (
          <div className="p-5">

            <p className="text-sm text-neutral-400 mb-4">
              اختار نوع المحتوى اللي بغيتي تنشر:
            </p>

            <div className="grid grid-cols-3 gap-3">

              {/* TEXT */}
              <button
                type="button"
                onClick={() =>
                  handleSelectType('text')
                }
                className="
                  group
                  rounded-2xl
                  p-4
                  bg-neutral-900
                  border border-white/10
                  hover:border-rose-500/50
                  transition-all
                "
              >
                <div className="
                  w-12 h-12
                  mx-auto mb-3
                  rounded-2xl
                  bg-gradient-to-br
                  from-rose-500
                  to-orange-400
                  flex items-center justify-center
                ">
                  <FileText className="w-6 h-6" />
                </div>

                <span className="text-xs font-semibold">
                  منشور نصي
                </span>
              </button>

              {/* IMAGE */}
              <button
                type="button"
                onClick={() =>
                  handleSelectType('image')
                }
                className="
                  group
                  rounded-2xl
                  p-4
                  bg-neutral-900
                  border border-white/10
                  hover:border-rose-500/50
                  transition-all
                "
              >
                <div className="
                  w-12 h-12
                  mx-auto mb-3
                  rounded-2xl
                  bg-gradient-to-br
                  from-pink-500
                  to-purple-500
                  flex items-center justify-center
                ">
                  <ImageIcon className="w-6 h-6" />
                </div>

                <span className="text-xs font-semibold">
                  صور
                </span>
              </button>

              {/* VIDEO */}
              <button
                type="button"
                onClick={() =>
                  handleSelectType('video')
                }
                className="
                  group
                  rounded-2xl
                  p-4
                  bg-neutral-900
                  border border-white/10
                  hover:border-rose-500/50
                  transition-all
                "
              >
                <div className="
                  w-12 h-12
                  mx-auto mb-3
                  rounded-2xl
                  bg-gradient-to-br
                  from-purple-500
                  to-indigo-600
                  flex items-center justify-center
                ">
                  <Video className="w-6 h-6" />
                </div>

                <span className="text-xs font-semibold">
                  فيديو
                </span>
              </button>

            </div>

          </div>
        )}

        {/* TEXT POST */}
        {contentType === 'text' && (
          <div className="p-5 space-y-5">

            {/* LIVE PREVIEW */}
            <div
              className={`
                ${TEXT_BACKGROUNDS.find(
                  (item) =>
                    item.id === selectedBackground
                )?.className || ''}
                min-h-[260px]
                rounded-3xl
                p-6
                flex items-center justify-center
                text-center
                shadow-xl
              `}
            >
              <p className="
                text-xl
                sm:text-2xl
                font-bold
                leading-relaxed
                break-words
              ">
                {content.trim()
                  ? content
                  : 'كتب هنا شنو بغيتي تقول...'}
              </p>
            </div>

            {/* TEXT */}
            <textarea
              value={content}
              onChange={(event) =>
                setContent(event.target.value)
              }
              placeholder="شنو كيدور فبالك؟"
              maxLength={500}
              className="
                w-full
                min-h-[120px]
                bg-neutral-900
                border border-white/10
                rounded-2xl
                p-4
                text-sm
                text-white
                placeholder:text-neutral-600
                resize-none
                focus:outline-none
                focus:border-rose-500/50
              "
            />

            <div className="flex justify-between text-[11px] text-neutral-500">
              <span>
                اختار الخلفية
              </span>

              <span>
                {content.length}/500
              </span>
            </div>

            {/* BACKGROUNDS */}
            <div className="grid grid-cols-6 gap-2">

              {TEXT_BACKGROUNDS.map(
                (background) => (
                  <button
                    key={background.id}
                    type="button"
                    onClick={() =>
                      setSelectedBackground(
                        background.id
                      )
                    }
                    className={`
                      relative
                      h-12
                      rounded-xl
                      ${background.previewClass}
                      border-2
                      ${
                        selectedBackground ===
                        background.id
                          ? 'border-white'
                          : 'border-transparent'
                      }
                    `}
                    aria-label={
                      background.label
                    }
                  >
                    {selectedBackground ===
                      background.id && (
                      <Check className="
                        absolute
                        inset-0
                        m-auto
                        w-5 h-5
                      " />
                    )}
                  </button>
                )
              )}

            </div>

            <button
              type="button"
              onClick={handlePublish}
              disabled={loading}
              className="
                w-full
                py-3.5
                rounded-2xl
                bg-gradient-to-r
                from-rose-500
                via-pink-500
                to-orange-500
                font-bold
                flex
                items-center
                justify-center
                gap-2
                disabled:opacity-50
              "
            >
              {loading ? (
                <Loader2 className="
                  w-5 h-5
                  animate-spin
                " />
              ) : (
                <Send className="w-5 h-5" />
              )}

              نشر المنشور
            </button>

          </div>
        )}

        {/* IMAGE POST */}
        {contentType === 'image' && (
          <div className="p-5 space-y-5">

            <textarea
              value={content}
              onChange={(event) =>
                setContent(event.target.value)
              }
              placeholder="أضف وصفاً للصور..."
              className="
                w-full
                min-h-[100px]
                bg-neutral-900
                border border-white/10
                rounded-2xl
                p-4
                text-sm
                resize-none
                focus:outline-none
                focus:border-rose-500/50
              "
            />

            {/* IMAGE PREVIEWS */}
            {previewUrls.length > 0 && (
              <div className="
                grid
                grid-cols-2
                gap-3
              ">
                {previewUrls.map(
                  (url, index) => (
                    <div
                      key={url}
                      className="
                        relative
                        aspect-square
                        rounded-2xl
                        overflow-hidden
                        bg-neutral-900
                        border border-white/10
                      "
                    >
                      <img
                        src={url}
                        alt={`صورة ${index + 1}`}
                        className="
                          w-full h-full
                          object-cover
                        "
                      />

                      <button
                        type="button"
                        onClick={() =>
                          removeImage(index)
                        }
                        className="
                          absolute
                          top-2 right-2
                          w-8 h-8
                          rounded-full
                          bg-black/70
                          flex items-center justify-center
                        "
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>

                      <div className="
                        absolute
                        bottom-2 left-2
                        px-2 py-1
                        rounded-lg
                        bg-black/60
                        text-[10px]
                      ">
                        {index + 1}
                      </div>
                    </div>
                  )
                )}
              </div>
            )}

            {/* ADD IMAGES */}
            <label className="
              flex
              flex-col
              items-center
              justify-center
              min-h-[120px]
              rounded-2xl
              border
              border-dashed
              border-white/20
              bg-neutral-900
              cursor-pointer
              hover:border-rose-500/50
              transition
            ">
              <Plus className="
                w-8 h-8
                text-rose-500
                mb-2
              " />

              <span className="text-sm font-semibold">
                إضافة صور
              </span>

              <span className="
                text-[11px]
                text-neutral-500
                mt-1
              ">
                يمكنك اختيار أكثر من صورة
              </span>

              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleFilesChange}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={handlePublish}
              disabled={loading}
              className="
                w-full
                py-3.5
                rounded-2xl
                bg-gradient-to-r
                from-rose-500
                via-pink-500
                to-orange-500
                font-bold
                flex
                items-center
                justify-center
                gap-2
                disabled:opacity-50
              "
            >
              {loading ? (
                <Loader2 className="
                  w-5 h-5
                  animate-spin
                " />
              ) : (
                <Send className="w-5 h-5" />
              )}

              نشر الصور
            </button>

          </div>
        )}

        {/* VIDEO / REELS */}
        {contentType === 'video' && (
          <div className="p-5 space-y-5">

            {/* VIDEO TYPE */}
            <div>
              <p className="
                text-sm
                font-semibold
                mb-3
              ">
                نوع الفيديو
              </p>

              <div className="
                grid
                grid-cols-2
                gap-3
              ">

                <button
                  type="button"
                  onClick={() =>
                    setVideoType('reel')
                  }
                  className={`
                    p-4
                    rounded-2xl
                    border
                    ${
                      videoType === 'reel'
                        ? 'border-rose-500 bg-rose-500/10'
                        : 'border-white/10 bg-neutral-900'
                    }
                  `}
                >
                  <div className="text-lg mb-1">
                    🎬
                  </div>

                  <div className="text-sm font-bold">
                    Reels
                  </div>

                  <div className="
                    text-[10px]
                    text-neutral-500
                    mt-1
                  ">
                    فيديو قصير
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setVideoType('video')
                  }
                  className={`
                    p-4
                    rounded-2xl
                    border
                    ${
                      videoType === 'video'
                        ? 'border-rose-500 bg-rose-500/10'
                        : 'border-white/10 bg-neutral-900'
                    }
                  `}
                >
                  <div className="text-lg mb-1">
                    📹
                  </div>

                  <div className="text-sm font-bold">
                    فيديو عادي
                  </div>

                  <div className="
                    text-[10px]
                    text-neutral-500
                    mt-1
                  ">
                    منشور فيديو
                  </div>
                </button>

              </div>
            </div>

            {/* DESCRIPTION */}
            <textarea
              value={content}
              onChange={(event) =>
                setContent(event.target.value)
              }
              placeholder="أضف وصفاً للفيديو..."
              className="
                w-full
                min-h-[100px]
                bg-neutral-900
                border border-white/10
                rounded-2xl
                p-4
                text-sm
                resize-none
                focus:outline-none
                focus:border-rose-500/50
              "
            />

            {/* VIDEO PREVIEW */}
            {previewUrls[0] && (
              <div className="
                rounded-2xl
                overflow-hidden
                bg-black
                border border-white/10
              ">
                <video
                  src={previewUrls[0]}
                  controls
                  className="
                    w-full
                    max-h-[420px]
                    object-contain
                  "
                />
              </div>
            )}

            {/* VIDEO PICKER */}
            <label className="
              flex
              flex-col
              items-center
              justify-center
              min-h-[120px]
              rounded-2xl
              border
              border-dashed
              border-white/20
              bg-neutral-900
              cursor-pointer
              hover:border-rose-500/50
              transition
            ">
              <Video className="
                w-8 h-8
                text-rose-500
                mb-2
              " />

              <span className="text-sm font-semibold">
                {selectedFiles.length
                  ? 'تغيير الفيديو'
                  : 'اختيار فيديو'}
              </span>

              <span className="
                text-[11px]
                text-neutral-500
                mt-1
              ">
                اختر فيديو من الهاتف
              </span>

              <input
                type="file"
                accept="video/*"
                onChange={handleFilesChange}
                className="hidden"
              />
            </label>

            <button
              type="button"
              onClick={handlePublish}
              disabled={loading}
              className="
                w-full
                py-3.5
                rounded-2xl
                bg-gradient-to-r
                from-rose-500
                via-pink-500
                to-orange-500
                font-bold
                flex
                items-center
                justify-center
                gap-2
                disabled:opacity-50
              "
            >
              {loading ? (
                <Loader2 className="
                  w-5 h-5
                  animate-spin
                " />
              ) : (
                <Send className="w-5 h-5" />
              )}

              نشر {videoType === 'reel'
                ? 'Reels'
                : 'الفيديو'}
            </button>

          </div>
        )}

      </div>
    </div>
  );
};
