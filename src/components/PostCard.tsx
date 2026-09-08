import React, { useState } from 'react';
import { Image, Video, FileText, X, BookOpen, Hash, Send } from 'lucide-react';
import { supabase } from '../lib/supabase';

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

  const handleUploadAndPost = async () => {
    if (!content && !file) return;
    setLoading(true);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('يرجى تسجيل الدخول أولاً');

      let imageUrl = '';
      let videoUrl = '';

      // رفع الملف إلى Supabase Storage إذا كان موجوداً
      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${userData.user.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('posts')
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: publicUrlData } = supabase.storage
          .from('posts')
          .getPublicUrl(filePath);

        if (postType === 'image') imageUrl = publicUrlData.publicUrl;
        if (postType === 'video') videoUrl = publicUrlData.publicUrl;
      }

      // إضافة المنشور في قاعدة البيانات
      const { error: dbError } = await supabase.from('posts').insert([
        {
          user_id: userData.user.id,
          content: quranTrack ? `${content}\n\n📖 خلفية قرآنية: ${quranTrack}` : content,
          image_url: imageUrl || null,
          video_url: videoUrl || null,
        },
      ]);

      if (dbError) throw dbError;

      // إعادة تعيين وإغلاق
      setContent('');
      setFile(null);
      setPostType('none');
      setQuranTrack('');
      if (onPostCreated) onPostCreated();
      onClose();
    } catch (err: any) {
      alert('حدث خطأ أثناء النشر: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-neutral-900 border border-neutral-800 w-full max-w-lg rounded-t-3xl sm:rounded-2xl p-5 text-white shadow-2xl">
        
        {/* رأس النافذة */}
        <div className="flex items-center justify-between border-b border-neutral-800 pb-3 mb-4">
          <h3 className="text-lg font-bold">إنشاء منشور جديد</h3>
          <button onClick={onClose} className="text-neutral-400 hover:text-white p-1">
            <X size={22} />
          </button>
        </div>

        {/* المرحلة 1: اختيار نوع المنشور (3 اختيارات) */}
        {postType === 'none' ? (
          <div className="grid grid-cols-3 gap-3 my-6">
            <button
              onClick={() => setPostType('text')}
              className="flex flex-col items-center justify-center p-4 bg-neutral-800 hover:bg-neutral-700 rounded-2xl border border-neutral-700 transition"
            >
              <FileText size={32} className="text-blue-400 mb-2" />
              <span className="text-xs font-semibold">كتابة منشور</span>
            </button>

            <button
              onClick={() => setPostType('image')}
              className="flex flex-col items-center justify-center p-4 bg-neutral-800 hover:bg-neutral-700 rounded-2xl border border-neutral-700 transition"
            >
              <Image size={32} className="text-green-400 mb-2" />
              <span className="text-xs font-semibold">نشر صورة</span>
            </button>

            <button
              onClick={() => setPostType('video')}
              className="flex flex-col items-center justify-center p-4 bg-neutral-800 hover:bg-neutral-700 rounded-2xl border border-neutral-700 transition"
            >
              <Video size={32} className="text-purple-400 mb-2" />
              <span className="text-xs font-semibold">نشر فيديو</span>
            </button>
          </div>
        ) : (
          /* المرحلة 2: نموذج كتابة المنشور والميديا */
          <div className="space-y-4">
            
            {/* زر العودة لاختيار نوع آخر */}
            <button
              onClick={() => { setPostType('none'); setFile(null); }}
              className="text-xs text-blue-400 hover:underline mb-1 inline-block"
            >
              ← تغيير نوع المنشور
            </button>

            {/* مربع النص والهاشتاغ */}
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="اكتب شيئاً مفيداً... استخدم #هاشتاغ للمواضيع"
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-sm focus:outline-none focus:border-neutral-600 resize-none h-28"
            />

            {/* اختيار ملف صورة (يظهر فقط الصور من الهاتف) */}
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
                  {file ? file.name : 'إضغط هنا لاختيار صورة من الهاتف'}
                </label>
              </div>
            )}

            {/* اختيار ملف فيديو (يظهر فقط الفيديوهات من الهاتف) */}
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
                  {file ? file.name : 'إضغط هنا لاختيار فيديو من الهاتف'}
                </label>
              </div>
            )}

            {/* قسم إرفاق القرآن بدل الموسيقى */}
            <div className="flex items-center space-x-2 space-x-reverse bg-neutral-950 p-2.5 rounded-xl border border-neutral-800">
              <BookOpen size={18} className="text-emerald-400" />
              <input
                type="text"
                value={quranTrack}
                onChange={(e) => setQuranTrack(e.target.value)}
                placeholder="إضافة سورة أو قارئ (مثال: سورة الكهف - عبد الباسط)"
                className="bg-transparent border-none text-xs w-full text-white focus:outline-none"
              />
            </div>

            {/* زر النشر */}
            <button
              onClick={handleUploadAndPost}
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 rounded-xl transition flex items-center justify-center space-x-2 space-x-reverse disabled:opacity-50"
            >
              <Send size={18} />
              <span>{loading ? 'جاري النشر...' : 'نشر الآن'}</span>
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
