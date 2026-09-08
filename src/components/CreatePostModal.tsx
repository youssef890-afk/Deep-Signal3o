import React, { useState } from 'react';
import { Image, Video, FileText, X, BookOpen, Send, LogOut } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { compressImage } from '../utils/compressImage';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPostCreated?: () => void;
}

export const CreatePostModal: React.FC<CreatePostModalProps> = ({ isOpen, onClose, onPostCreated }) => {
  const [postType, setPostType] = useState<'none' | 'text' | 'image' | 'video'>('none');
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [quranTrack, setQuranTrack] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleLogout = async () => {
    if (confirm('هل ترغب في تسجيل الخروج؟')) {
      await supabase.auth.signOut();
      window.location.reload();
    }
  };

  const handleUploadAndPost = async () => {
    if (!content && !file) {
      alert('يرجى كتابة نص أو اختيار ملف للنشر');
      return;
    }
    setLoading(true);

    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError || !userData.user) throw new Error('يرجى تسجيل الدخول أولاً');

      let imageUrl = '';
      let videoUrl = '';

      if (file) {
        // ضغط الصورة تلقائياً إذا كانت صوّرة قبل الرفع
        let fileToUpload = file;
        if (file.type.startsWith('image/')) {
          fileToUpload = await compressImage(file);
        }

        const fileExt = fileToUpload.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${userData.user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('posts')
          .upload(filePath, fileToUpload, { cacheControl: '3600', upsert: false });

        if (uploadError) {
          throw new Error('خطأ في رفع الملف: ' + uploadError.message);
        }

        const { data: publicUrlData } = supabase.storage
          .from('posts')
          .getPublicUrl(filePath);

        if (postType === 'image' || file.type.startsWith('image/')) {
          imageUrl = publicUrlData.publicUrl;
        } else if (postType === 'video' || file.type.startsWith('video/')) {
          videoUrl = publicUrlData.publicUrl;
        }
      }

      const finalContent = quranTrack ? `${content}\n\n📖 خلفية قرآنية: ${quranTrack}` : content;

      const { error: dbError } = await supabase.from('posts').insert([
        {
          user_id: userData.user.id,
          content: finalContent,
          image_url: imageUrl || null,
          video_url: videoUrl || null,
        },
      ]);

      if (dbError) throw new Error('خطأ في حفظ البيانات: ' + dbError.message);

      setContent('');
      setFile(null);
      setPostType('none');
      setQuranTrack('');
      if (onPostCreated) onPostCreated();
      onClose();
      alert('تم النشر بنجاح! 🎉');
    } catch (err: any) {
      alert(err.message || 'حدث خطأ غير متوقع');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 w-full max-w-lg rounded-2xl p-5 text-white shadow-2xl">
        
        {/* رأس النافذة مع زر إغلاق وزر تسجيل الخروج */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
          <div className="flex items-center space-x-2 space-x-reverse">
            <h3 className="text-lg font-bold">إنشاء منشور جديد</h3>
            <button
              onClick={handleLogout}
              className="text-red-400 hover:text-red-300 p-1 flex items-center gap-1 text-xs bg-red-950/40 border border-red-800/50 rounded-lg px-2 py-1"
              title="تسجيل الخروج"
            >
              <LogOut size={14} />
              <span>خروج</span>
            </button>
          </div>
          <button onClick={onClose} className="text-neutral-400 hover:text-white p-1">
            <X size={22} />
          </button>
        </div>

        {/* اختيارات النشر الثلاثة */}
        {postType === 'none' ? (
          <div className="grid grid-cols-3 gap-3 my-6">
            <button
              onClick={() => setPostType('text')}
              className="flex flex-col items-center justify-center p-4 bg-neutral-800 hover:bg-neutral-700 rounded-2xl border border-neutral-700 transition"
            >
              <FileText size={30} className="text-blue-400 mb-2" />
              <span className="text-xs font-semibold">كتابة منشور</span>
            </button>

            <button
              onClick={() => setPostType('image')}
              className="flex flex-col items-center justify-center p-4 bg-neutral-800 hover:bg-neutral-700 rounded-2xl border border-neutral-700 transition"
            >
              <Image size={30} className="text-green-400 mb-2" />
              <span className="text-xs font-semibold">نشر صورة</span>
            </button>

            <button
              onClick={() => setPostType('video')}
              className="flex flex-col items-center justify-center p-4 bg-neutral-800 hover:bg-neutral-700 rounded-2xl border border-neutral-700 transition"
            >
              <Video size={30} className="text-purple-400 mb-2" />
              <span className="text-xs font-semibold">نشر فيديو</span>
            </button>
          </div>
        ) : (
          /* واجهة تعديل وإرسال المنشور */
          <div className="space-y-4">
            <button
              onClick={() => { setPostType('none'); setFile(null); }}
              className="text-xs text-blue-400 hover:underline mb-1 inline-block"
            >
              ← تغيير نوع المنشور
            </button>

            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="ماذا يدور في ذهنك؟ #هاشتاغ..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-sm focus:outline-none focus:border-neutral-600 resize-none h-24"
            />

            {postType === 'image' && (
              <div className="bg-neutral-950 border border-dashed border-neutral-700 p-4 rounded-xl text-center">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  id="image-input"
                  className="hidden"
                />
                <label htmlFor="image-input" className="cursor-pointer text-sm text-neutral-300 flex flex-col items-center">
                  <Image className="mb-1 text-green-400" size={24} />
                  {file ? file.name : 'اختر صورة من المعرض'}
                </label>
              </div>
            )}

            {postType === 'video' && (
              <div className="bg-neutral-950 border border-dashed border-neutral-700 p-4 rounded-xl text-center">
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleFileChange}
                  id="video-input"
                  className="hidden"
                />
                <label htmlFor="video-input" className="cursor-pointer text-sm text-neutral-300 flex flex-col items-center">
                  <Video className="mb-1 text-purple-400" size={24} />
                  {file ? file.name : 'اختر فيديو من المعرض'}
                </label>
              </div>
            )}

            <div className="flex items-center space-x-2 space-x-reverse bg-neutral-950 p-2.5 rounded-xl border border-neutral-800">
              <BookOpen size={18} className="text-emerald-400" />
              <input
                type="text"
                value={quranTrack}
                onChange={(e) => setQuranTrack(e.target.value)}
                placeholder="اسم السورة/القارئ (بديل الموسيقى)"
                className="bg-transparent border-none text-xs w-full text-white focus:outline-none"
              />
            </div>

            <button
              onClick={handleUploadAndPost}
              disabled={loading}
              className="w-full bg-pink-600 hover:bg-pink-500 text-white font-medium py-3 rounded-xl transition flex items-center justify-center space-x-2 space-x-reverse disabled:opacity-50"
            >
              <Send size={18} />
              <span>{loading ? 'جاري الضغط والنشر...' : 'نشر الآن'}</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
