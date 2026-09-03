import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import Avatar from '@/components/Avatar';
import { Search, Loader2, MessageCircle } from 'lucide-react';
import type { Profile } from '@/types';

export default function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = useCallback(async (q: string) => {
    if (q.trim().length < 1) {
      setResults([]);
      setSearched(false);
      return;
    }

    setLoading(true);
    setSearched(true);

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .ilike('username', `%${q.trim()}%`)
      .limit(20);

    if (error) {
      console.error('Search error:', error.message);
      setResults([]);
    } else {
      setResults((data as Profile[]) ?? []);
    }
    setLoading(false);
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <h1 className="text-2xl font-bold text-white mb-6">Search</h1>

      {/* Search bar */}
      <div className="relative mb-8">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            handleSearch(e.target.value);
          }}
          placeholder="Search for users by username..."
          autoFocus
          className="w-full bg-neutral-900 border border-white/10 rounded-xl pl-12 pr-4 py-3.5 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-rose-500/50 focus:ring-2 focus:ring-rose-500/20 transition-all"
        />
        {query && (
          <button
            onClick={() => {
              setQuery('');
              setResults([]);
              setSearched(false);
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-white text-sm transition-colors"
          >
            Clear
          </button>
        )}
      </div>

      {/* Results */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-rose-500" />
        </div>
      ) : searched && results.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="w-10 h-10 text-neutral-700 mb-3" />
          <p className="text-sm text-neutral-500">No users found for "{query}"</p>
        </div>
      ) : !searched ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Search className="w-10 h-10 text-neutral-700 mb-3" />
          <p className="text-sm text-neutral-500">Start typing to find people on Deep Signal.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {results.map((profile) => (
            <div
              key={profile.id}
              className="flex items-center gap-3 p-3 bg-neutral-900/60 border border-white/10 rounded-xl hover:bg-white/5 hover:border-white/20 transition-all animate-fade-in"
            >
              <Avatar
                src={profile.avatar_url}
                name={profile.full_name || profile.username}
                size="md"
                onClick={() => navigate(`/profile/${profile.id}`)}
              />
              <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => navigate(`/profile/${profile.id}`)}
              >
                <p className="text-sm font-semibold text-white truncate">{profile.username}</p>
                {profile.full_name && (
                  <p className="text-xs text-neutral-500 truncate">{profile.full_name}</p>
                )}
              </div>
              <button
                onClick={() => navigate(`/chat/${profile.id}`)}
                className="w-9 h-9 rounded-full bg-neutral-800 hover:bg-rose-500 flex items-center justify-center text-neutral-400 hover:text-white transition-all"
              >
                <MessageCircle className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
