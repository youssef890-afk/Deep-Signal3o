import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Search as SearchIcon, X, MessageSquare, Loader2 } from 'lucide-react';

interface Profile {
  id: string;
  username: string;
  full_name?: string;
  avatar_url?: string;
  display_id?: string;
}

export default function SearchPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    async function fetchUsers() {
      if (!searchTerm.trim()) {
        // جلب قائمة مقترحة عند فتح البحث بدون كتابة
        const { data } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url, display_id')
          .limit(10);
        setResults((data as Profile[]) || []);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url, display_id')
          .or(`username.ilike.%${searchTerm}%,full_name.ilike.%${searchTerm}%,display_id.ilike.%${searchTerm}%`)
          .limit(20);

        if (error) throw error;
        setResults((data as Profile[]) || []);
      } catch (err) {
        console.error('Error searching users:', err);
      } finally {
        setLoading(false);
      }
    }

    const timer = setTimeout(fetchUsers, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  return (
    <div className="max-w-xl mx-auto px-4 py-6 pb-28 text-white space-y-5">
      <h1 className="text-xl font-bold">Search</h1>

      {/* مربع البحث */}
      <div className="relative flex items-center">
        <SearchIcon className="absolute left-3 w-4 h-4 text-neutral-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="ابحث عن اسم المستخدم أو ID..."
          className="w-full bg-neutral-900 border border-white/10 rounded-xl pl-9 pr-10 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500 transition-colors"
        />
        {searchTerm && (
          <button
            onClick={() => setSearchTerm('')}
            className="absolute right-3 text-neutral-400 hover:text-white text-xs font-semibold"
          >
            Clear
          </button>
        )}
      </div>

      {/* قائمة النتائج */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
        </div>
      ) : (
        <div className="space-y-2">
          {results.length === 0 ? (
            <p className="text-center text-xs text-neutral-500 py-6">لا توجد نتائج مطابقة</p>
          ) : (
            results.map((item) => (
              <div
                key={item.id}
                onClick={() => navigate(`/profile/${item.id}`)}
                className="bg-neutral-900 hover:bg-neutral-800 border border-white/10 rounded-xl p-3 flex items-center justify-between cursor-pointer transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center font-bold text-xs text-rose-400 overflow-hidden border border-rose-500/30">
                    {item.avatar_url ? (
                      <img src={item.avatar_url} alt={item.username} className="w-full h-full object-cover" />
                    ) : (
                      item.username?.charAt(0).toUpperCase() || 'U'
                    )}
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-white">
                      {item.full_name || item.username}
                    </h3>
                    <p className="text-[10px] text-neutral-400">
                      {item.display_id ? `#${item.display_id}` : `@${item.username}`}
                    </p>
                  </div>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/chat`);
                  }}
                  className="bg-neutral-800 hover:bg-neutral-700 p-2 rounded-lg text-neutral-300 border border-white/5"
                >
                  <MessageSquare className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
