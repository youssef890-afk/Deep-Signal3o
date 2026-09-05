import React, { useState } from 'react';
import { supabase } from '../lib/supabase';

interface Props {
  profile: any;
  onClose: () => void;
  onUpdate: () => void;
}

export const EditProfileModal: React.FC<Props> = ({ profile, onClose, onUpdate }) => {
  const [username, setUsername] = useState(profile?.username || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '');
  const [uploading, setUploading] = useState(false);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      if (!e.target.files || e.target.files.length === 0) return;
      
      const file = e.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `avatars/${profile?.id || 'user'}-${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('POSTS')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('POSTS').getPublicUrl(filePath);
      setAvatarUrl(data.publicUrl);
    } catch (error: any) {
      alert('خطأ فـ رفع الصورة: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          username,
          bio,
          avatar_url: avatarUrl,
        })
        .eq('id', profile.id);

      if (error) throw error;

      onUpdate();
      onClose();
    } catch (error: any) {
      alert('خطأ فـ حفظ البيانات: ' + error.message);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl text-right dir-rtl">
        <h2 className="text-xl font-bold mb-4 text-gray-800">تعديل الملف الشخصي</h2>

        <div className="flex flex-col items-center mb-4">
          <img 
            src={avatarUrl || 'https://via.placeholder.com/150'} 
            alt="Avatar" 
            className="w-24 h-24 rounded-full object-cover border-2 border-pink-500 mb-2"
          />
          <label className="text-sm text-pink-600 font-semibold cursor-pointer">
            {uploading ? 'جاري الرفع...' : 'تغيير صورة البروفايل'}
            <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" />
          </label>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">اسم المستخدم</label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full border rounded-lg p-2 text-right"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">البايو (Bio)</label>
          <textarea
            rows={3}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="اكتب نبذة قصيرة عليك..."
            className="w-full border rounded-lg p-2 text-right"
          />
        </div>

        <div className="flex gap-2">
          <button 
            onClick={handleSave} 
            className="flex-1 bg-pink-600 text-white py-2 rounded-lg font-semibold hover:bg-pink-700"
          >
            حفظ التغييرات
          </button>
          <button 
            onClick={onClose} 
            className="px-4 bg-gray-200 text-gray-700 py-2 rounded-lg font-semibold"
          >
            إلغاء
          </button>
        </div>
      </div>
    </div>
  );
};
