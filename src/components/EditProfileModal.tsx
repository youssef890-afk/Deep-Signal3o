import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Loader2 } from 'lucide-react';

export default function EditProfileModal({ profile, onClose, onUpdated }: any) {
  const [username, setUsername] = useState(profile?.username || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [saving, setSaving] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);

    const { error } = await supabase
      .from('profiles')
      .update({
        username,
        bio,
        avatar_url: avatarUrl || null,
      })
      .eq('id', profile.id);

    if (!error) {
      onUpdated(); // إعادة تحميل البيانات فوراً في الصفحة الرئيسية
      onClose();
    }
    setSaving(false);
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
      <div className="bg-neutral-900 border border-white/10 w-full max-w-sm rounded-3xl p-5 relative shadow-2xl text-white">
        <button onClick={onClose} className="absolute top-4 left-4 text-neutral-400 hover:text-white">
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-sm font-bold mb-4 text-center">تعديل الملف الشخصي</h3>

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="text-[11px] text-neutral-400 block mb-1">رابط الصورة الشخصية</label>
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/photo.jpg"
              className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-rose-500"
            />
          </div>

          <div>
            <label className="text-[11px] text-neutral-400 block mb-1">اسم المستخدم</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
            />
          </div>

          <div>
            <label className="text-[11px] text-neutral-400 block mb-1">(Bio) البايو</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-500 h-20 resize-none"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-xs text-neutral-300"
            >
              إلغاء
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 py-2 bg-rose-500 hover:bg-rose-600 rounded-xl text-xs font-semibold text-white flex justify-center items-center gap-1"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'حفظ التغييرات'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
