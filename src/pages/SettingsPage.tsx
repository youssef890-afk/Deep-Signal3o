import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Accessibility, ArrowLeft, Bell, Check, ChevronLeft, CircleHelp, Download, Eye, FileText,
  Globe, Info, Languages, Lock, LogOut, MessageCircle, Monitor, Palette, Shield, Trash2,
  User, UserRound, Volume2, X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { useTheme, type ThemeMode } from '@/context/ThemeContext';
import { supabase } from '@/lib/supabase';
import {
  directionForLanguage, getStoredLanguage, setStoredLanguage, translate,
  type Language, type TranslationKey,
} from '@/lib/i18n';

type TabId = 'account' | 'privacy' | 'security' | 'notifications' | 'appearance' | 'language' | 'content' | 'accessibility' | 'data' | 'about';
type MessageAccess = 'everyone' | 'followers' | 'nobody';

interface LocalSettings {
  privateAccount: boolean;
  messageAccess: MessageAccess;
  showEmail: boolean;
  showLastSeen: boolean;
  twoFactor: boolean;
  postNotifications: boolean;
  likes: boolean;
  comments: boolean;
  follows: boolean;
  messages: boolean;
  sound: boolean;
  vibration: boolean;
  reduceMotion: boolean;
  highContrast: boolean;
  screenReader: boolean;
  autoTranslate: boolean;
  commentFilter: 'normal' | 'strict';
  fontSize: number;
  density: 'comfortable' | 'compact';
  blockedWords: string[];
}

const defaults: LocalSettings = {
  privateAccount: false, messageAccess: 'everyone', showEmail: false, showLastSeen: true,
  twoFactor: false, postNotifications: true, likes: true, comments: true, follows: true,
  messages: true, sound: true, vibration: true, reduceMotion: false, highContrast: false,
  screenReader: false, autoTranslate: false, commentFilter: 'normal', fontSize: 16,
  density: 'comfortable', blockedWords: [],
};

const tabs: { id: TabId; key: TranslationKey; icon: LucideIcon }[] = [
  { id: 'account', key: 'account', icon: User },
  { id: 'privacy', key: 'privacy', icon: Lock },
  { id: 'security', key: 'security', icon: Shield },
  { id: 'notifications', key: 'notifications', icon: Bell },
  { id: 'appearance', key: 'appearance', icon: Palette },
  { id: 'language', key: 'language', icon: Globe },
  { id: 'content', key: 'content', icon: Eye },
  { id: 'accessibility', key: 'accessibility', icon: Accessibility },
  { id: 'data', key: 'data', icon: Download },
  { id: 'about', key: 'about', icon: Info },
];

const accentColors = ['#C1272D', '#2563EB', '#059669', '#9333EA', '#EA580C', '#DB2777', '#0891B2', '#D4A017'];
const languages: { id: Language; key: TranslationKey; flag: string }[] = [
  { id: 'ar', key: 'arabic', flag: '🇲🇦' },
  { id: 'fr', key: 'french', flag: '🇫🇷' },
  { id: 'en', key: 'english', flag: '🇬🇧' },
];

function loadLocalSettings(): LocalSettings {
  try {
    const stored = localStorage.getItem('ds-settings-v1');
    if (stored) return { ...defaults, ...JSON.parse(stored) as Partial<LocalSettings> };
  } catch {
    return defaults;
  }
  return defaults;
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={`relative h-7 w-12 shrink-0 rounded-full transition-colors duration-200 ${checked ? 'bg-[var(--accent)]' : 'bg-white/15'}`}>
      <span className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all duration-200 ${checked ? 'left-1' : 'left-6'}`} />
    </button>
  );
}

export function SettingsRow({ label, description, children }: { label: string; description?: string; children: ReactNode }) {
  return (
    <div className="flex min-h-[68px] items-center justify-between gap-4 border-b border-white/[0.07] py-3 last:border-b-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-white">{label}</p>
        {description && <p className="mt-1 text-xs leading-5 text-white/55">{description}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

export function SettingsSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="settings-card rounded-xl border border-white/10 bg-[#111] p-4 sm:p-5">
      <h2 className="mb-3 text-lg font-semibold text-white">{title}</h2>
      {children}
    </section>
  );
}

export function RadioCard({ label, selected, onClick, description }: { label: string; selected: boolean; onClick: () => void; description?: string }) {
  return (
    <button type="button" role="radio" aria-checked={selected} onClick={onClick} className={`min-h-[60px] rounded-lg border p-3 text-right transition hover:bg-white/5 ${selected ? 'border-[var(--accent)] bg-white/[0.06] ring-1 ring-[var(--accent)]/40' : 'border-white/10 bg-white/[0.02]'}`}>
      <span className="flex items-center justify-between gap-2 text-sm font-medium text-white">
        {label}<span className={`grid h-4 w-4 place-items-center rounded-full border ${selected ? 'border-[var(--accent)]' : 'border-white/35'}`}>{selected && <span className="h-2 w-2 rounded-full bg-[var(--accent)]" />}</span>
      </span>
      {description && <span className="mt-1 block text-xs text-white/50">{description}</span>}
    </button>
  );
}

export function ColorPicker({ colors, selected, onSelect, label }: { colors: string[]; selected: string; onSelect: (color: string) => void; label: string }) {
  return (
    <div className="flex flex-wrap gap-3" role="radiogroup" aria-label={label}>
      {colors.map((color) => (
        <button key={color} type="button" role="radio" aria-checked={selected.toLowerCase() === color.toLowerCase()} aria-label={`${label} ${color}`} onClick={() => onSelect(color)} className={`grid h-9 w-9 place-items-center rounded-full transition hover:scale-110 ${selected.toLowerCase() === color.toLowerCase() ? 'ring-2 ring-white ring-offset-2 ring-offset-[#111]' : 'ring-1 ring-white/15'}`} style={{ backgroundColor: color }}>
          {selected.toLowerCase() === color.toLowerCase() && <Check className="h-4 w-4 text-white drop-shadow" />}
        </button>
      ))}
    </div>
  );
}

export default function SettingsPage() {
  const navigate = useNavigate();
  const { user, profile, loading: authLoading, refreshProfile } = useAuth();
  const { mode, setMode, accentColor, setAccentColor } = useTheme();
  const [language, setLanguage] = useState<Language>(getStoredLanguage);
  const [activeTab, setActiveTab] = useState<TabId>('account');
  const [settings, setSettings] = useState<LocalSettings>(loadLocalSettings);
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [toast, setToast] = useState<{ text: string; error: boolean } | null>(null);
  const [blockedAccounts, setBlockedAccounts] = useState<{ id: string; blocked_id: string; username: string }[]>([]);
  const [blockedLoading, setBlockedLoading] = useState(false);
  const [blockedError, setBlockedError] = useState(false);
  const [wordInput, setWordInput] = useState('');
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);
  const t = (key: TranslationKey) => translate(language, key);

  useEffect(() => {
    setFullName(profile?.full_name ?? '');
    setUsername(profile?.username ?? '');
    setBio(profile?.bio ?? '');
    setAvatarUrl(profile?.avatar_url ?? null);
    setEmail(user?.email ?? '');
    const metadataPhone = user?.user_metadata?.phone;
    setPhone(typeof metadataPhone === 'string' ? metadataPhone : '');
  }, [profile, user]);

  useEffect(() => {
    document.documentElement.setAttribute('lang', language);
    document.documentElement.setAttribute('dir', directionForLanguage(language));
  }, [language]);

  useEffect(() => {
    if (activeTab !== 'content' || !user) return;
    let mounted = true;
    setBlockedLoading(true);
    setBlockedError(false);
    void supabase.from('user_blocks')
      .select('id, blocked_id, blocked_username')
      .eq('blocker_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!mounted) return;
        if (error) {
          setBlockedError(true);
          setBlockedAccounts([]);
        } else {
          setBlockedAccounts((data ?? []).map((item) => ({ id: item.id, blocked_id: item.blocked_id, username: item.blocked_username ?? item.blocked_id })));
        }
        setBlockedLoading(false);
      });
    return () => { mounted = false; };
  }, [activeTab, user]);

  const notify = (text: string, error = false) => {
    setToast({ text, error });
    window.setTimeout(() => setToast(null), 3200);
  };

  const saveLocalSettings = (next: LocalSettings) => {
    setSettings(next);
    try {
      localStorage.setItem('ds-settings-v1', JSON.stringify(next));
      localStorage.setItem('ds-font-size', String(next.fontSize));
      localStorage.setItem('ds-density', next.density);
    } catch {
      notify(t('saveError'), true);
    }
  };

  const setPreference = <Key extends keyof LocalSettings>(key: Key, value: LocalSettings[Key]) => {
    saveLocalSettings({ ...settings, [key]: value });
  };

  const handleSaveProfile = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;
    setSaving(true);
    try {
      const { error: profileError } = await supabase.from('profiles').update({
        full_name: fullName.trim() || null,
        username: username.trim(),
        bio: bio.trim() || null,
      }).eq('id', user.id);
      if (profileError) throw profileError;

      const metadataPhone = typeof user.user_metadata?.phone === 'string' ? user.user_metadata.phone : '';
      if (phone.trim() !== metadataPhone) {
        const { error: metadataError } = await supabase.auth.updateUser({ data: { phone: phone.trim() || null } });
        if (metadataError) throw metadataError;
      }
      if (email.trim() && email.trim().toLowerCase() !== user.email?.toLowerCase()) {
        const { error: emailError } = await supabase.auth.updateUser({ email: email.trim() });
        if (emailError) throw emailError;
      }
      await refreshProfile();
      notify(t('profileSaved'));
    } catch (error) {
      console.error('Settings profile save failed:', error);
      notify(t('saveError'), true);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !user) return;
    setAvatarSaving(true);
    try {
      const extension = file.name.split('.').pop() || 'jpg';
      const path = `${user.id}/${user.id}_avatar.${extension}`;
      const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { cacheControl: '3600', upsert: true });
      if (uploadError) throw uploadError;
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      const { error: updateError } = await supabase.from('profiles').update({ avatar_url: data.publicUrl }).eq('id', user.id);
      if (updateError) throw updateError;
      setAvatarUrl(data.publicUrl);
      await refreshProfile();
      notify(t('saved'));
    } catch (error) {
      console.error('Settings avatar update failed:', error);
      notify(t('avatarError'), true);
    } finally {
      setAvatarSaving(false);
      event.target.value = '';
    }
  };

  const handlePasswordChange = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user?.email) return;
    if (newPassword !== confirmPassword) {
      notify(t('passwordMismatch'), true);
      return;
    }
    setPasswordSaving(true);
    try {
      const { error: verifyError } = await supabase.auth.signInWithPassword({ email: user.email, password: currentPassword });
      if (verifyError) throw verifyError;
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordOpen(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      notify(t('passwordChanged'));
    } catch (error) {
      console.error('Password change failed:', error);
      notify(t('saveError'), true);
    } finally {
      setPasswordSaving(false);
    }
  };

  const signOutAll = async () => {
    const { error } = await supabase.auth.signOut({ scope: 'global' });
    if (error) notify(t('saveError'), true);
    else navigate('/login', { replace: true });
  };

  const exportData = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const [postsResult, commentsResult, likesResult, followsResult] = await Promise.all([
        supabase.from('posts').select('*').eq('user_id', user.id),
        supabase.from('comments').select('*').eq('user_id', user.id),
        supabase.from('likes').select('*').eq('user_id', user.id),
        supabase.from('follows').select('*').eq('follower_id', user.id),
      ]);
      const error = postsResult.error ?? commentsResult.error ?? likesResult.error ?? followsResult.error;
      if (error) throw error;
      const exportBlob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), account: { id: user.id, email: user.email, createdAt: user.created_at }, profile, posts: postsResult.data, comments: commentsResult.data, likes: likesResult.data, follows: followsResult.data }, null, 2)], { type: 'application/json' });
      const objectUrl = URL.createObjectURL(exportBlob);
      const link = document.createElement('a');
      link.href = objectUrl;
      link.download = 'youssef-account-data.json';
      link.click();
      URL.revokeObjectURL(objectUrl);
      notify(t('saved'));
    } catch (error) {
      console.error('Data export failed:', error);
      notify(t('saveError'), true);
    } finally {
      setSaving(false);
    }
  };

  const unblock = async (blockId: string) => {
    if (!user) return;
    const { error } = await supabase.from('user_blocks').delete().eq('id', blockId).eq('blocker_id', user.id);
    if (error) notify(t('saveError'), true);
    else setBlockedAccounts((current) => current.filter((account) => account.id !== blockId));
  };

  const changeLanguage = (nextLanguage: Language) => {
    setLanguage(nextLanguage);
    setStoredLanguage(nextLanguage);
    notify(t('languageSaved'));
  };

  const renderToggleRow = (key: keyof LocalSettings, label: TranslationKey, description?: TranslationKey) => (
    <SettingsRow label={t(label)} description={description ? t(description) : undefined}>
      <Toggle checked={Boolean(settings[key])} onChange={(checked) => setPreference(key, checked as LocalSettings[typeof key])} label={t(label)} />
    </SettingsRow>
  );

  const renderContent = () => {
    if (activeTab === 'account') return (
      <div className="space-y-4">
        <SettingsSection title={t('accountDetails')}>
          <form onSubmit={(event) => void handleSaveProfile(event)} className="space-y-4">
            <div className="flex items-center gap-4 border-b border-white/[0.07] pb-4">
              <div className="h-16 w-16 overflow-hidden rounded-full border border-white/15 bg-white/10">
                {avatarUrl ? <img src={avatarUrl} alt={t('changePhoto')} className="h-full w-full object-cover" /> : <div className="grid h-full w-full place-items-center"><UserRound className="h-7 w-7 text-white/60" /></div>}
              </div>
              <div>
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-xs font-semibold transition hover:bg-white/15">
                  {avatarSaving ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <UserRound className="h-4 w-4" />}
                  {t('changePhoto')}<input type="file" accept="image/*" onChange={(event) => void handleAvatarChange(event)} className="sr-only" />
                </label>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {([
                ['fullName', fullName, setFullName, 'text'],
                ['username', username, setUsername, 'text'],
                ['email', email, setEmail, 'email'],
                ['phone', phone, setPhone, 'tel'],
              ] as const).map(([key, value, setter, type]) => (
                <label key={key} className="block space-y-2 text-sm font-medium text-white/80">
                  {t(key)}<input type={type} value={value} onChange={(event) => setter(event.target.value)} className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none transition focus:border-[var(--accent)]" />
                </label>
              ))}
            </div>
            {email !== (user?.email ?? '') && <p className="text-xs text-white/50">{t('emailUpdateNote')}</p>}
            <label className="block space-y-2 text-sm font-medium text-white/80">{t('bio')}<textarea value={bio} onChange={(event) => setBio(event.target.value)} rows={4} className="w-full resize-y rounded-lg border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none transition focus:border-[var(--accent)]" /></label>
            <button disabled={saving} type="submit" className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:scale-[1.02] disabled:opacity-50">{saving && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" />}{saving ? t('saving') : t('saveChanges')}</button>
          </form>
        </SettingsSection>
      </div>
    );

    if (activeTab === 'privacy') return (
      <div className="space-y-4">
        <p className="rounded-lg border border-amber-300/15 bg-amber-300/[0.05] p-3 text-xs leading-5 text-amber-100/75">{t('localNotice')}</p>
        <SettingsSection title={t('privacy')}>
          {renderToggleRow('privateAccount', 'privateAccount', 'privateAccountDesc')}
          <div className="border-b border-white/[0.07] py-4">
            <p className="mb-3 text-sm font-medium">{t('whoCanMessage')}</p>
            <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t('whoCanMessage')}>
              {(['everyone', 'followers', 'nobody'] as const).map((value) => <RadioCard key={value} label={t(value)} selected={settings.messageAccess === value} onClick={() => setPreference('messageAccess', value)} />)}
            </div>
          </div>
          {renderToggleRow('showEmail', 'showEmail', 'showEmailDesc')}
          {renderToggleRow('showLastSeen', 'showLastSeen', 'showLastSeenDesc')}
          <SettingsRow label={t('archivedPosts')}><button type="button" onClick={() => notify(t('unavailable'))} className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-xs text-white/75 transition hover:bg-white/5">{t('manage')}<ChevronLeft className="h-4 w-4" /></button></SettingsRow>
        </SettingsSection>
      </div>
    );

    if (activeTab === 'security') return (
      <div className="space-y-4">
        <SettingsSection title={t('security')}>
          <SettingsRow label={t('changePassword')}><button type="button" onClick={() => setPasswordOpen(true)} className="rounded-lg border border-white/10 px-3 py-2 text-xs font-semibold transition hover:bg-white/5">{t('manage')}</button></SettingsRow>
          {renderToggleRow('twoFactor', 'twoFactor', 'twoFactorDesc')}
          <div className="border-b border-white/[0.07] py-4">
            <h3 className="mb-3 text-sm font-semibold">{t('activeDevices')}</h3>
            <div className="flex items-center gap-3 rounded-lg bg-white/[0.04] p-3">
              <Monitor className="h-5 w-5 shrink-0 text-white/60" />
              <div className="min-w-0"><p className="text-sm">{t('thisDevice')}</p><p className="truncate text-xs text-white/50">{navigator.userAgent}</p></div>
              <span className="mr-auto shrink-0 rounded-full bg-emerald-400/10 px-2 py-1 text-[10px] text-emerald-300">{t('currentSession')}</span>
            </div>
          </div>
          <SettingsRow label={t('signOutAll')}><button type="button" onClick={() => void signOutAll()} className="rounded-lg border border-rose-400/20 px-3 py-2 text-xs font-semibold text-rose-300 transition hover:bg-rose-400/10"><LogOut className="h-4 w-4" /></button></SettingsRow>
        </SettingsSection>
      </div>
    );

    if (activeTab === 'notifications') return (
      <SettingsSection title={t('notifications')}>
        {renderToggleRow('postNotifications', 'postNotifications')}
        {renderToggleRow('likes', 'likes')}
        {renderToggleRow('comments', 'comments')}
        {renderToggleRow('follows', 'newFollows')}
        {renderToggleRow('messages', 'messages')}
        {renderToggleRow('sound', 'sound')}
        {renderToggleRow('vibration', 'vibration')}
      </SettingsSection>
    );

    if (activeTab === 'appearance') return (
      <div className="space-y-4">
        <SettingsSection title={t('theme')}>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t('theme')}>
            {(['light', 'dark', 'auto'] as const).map((value: ThemeMode) => <RadioCard key={value} label={t(value)} selected={mode === value} onClick={() => setMode(value)} />)}
          </div>
          <div className="mt-5 border-t border-white/[0.07] pt-4">
            <p className="mb-3 text-sm font-medium">{t('accent')}</p>
            <ColorPicker colors={accentColors} selected={accentColor} onSelect={setAccentColor} label={t('accent')} />
          </div>
          <div className="mt-5 border-t border-white/[0.07] pt-4">
            <SettingsRow label={`${t('fontSize')} · ${settings.fontSize}px`}>
              <input type="range" min="14" max="22" step="1" value={settings.fontSize} aria-label={t('fontSize')} onChange={(event) => {
                const fontSize = Number(event.target.value);
                setPreference('fontSize', fontSize);
                document.documentElement.style.fontSize = `${fontSize}px`;
              }} className="w-28 accent-[var(--accent)] sm:w-40" />
            </SettingsRow>
          </div>
          <div className="mt-4">
            <p className="mb-3 text-sm font-medium">{t('density')}</p>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t('density')}>
              {(['comfortable', 'compact'] as const).map((value) => <RadioCard key={value} label={t(value)} selected={settings.density === value} onClick={() => setPreference('density', value)} />)}
            </div>
          </div>
        </SettingsSection>
      </div>
    );

    if (activeTab === 'language') return (
      <SettingsSection title={t('language')}>
        <div className="grid gap-3 sm:grid-cols-3" role="radiogroup" aria-label={t('language')}>
          {languages.map((item) => (
            <button key={item.id} type="button" role="radio" aria-checked={language === item.id} onClick={() => changeLanguage(item.id)} className={`flex min-h-20 items-center gap-3 rounded-lg border p-4 text-right transition hover:bg-white/5 ${language === item.id ? 'border-[var(--accent)] bg-white/[0.06]' : 'border-white/10 bg-white/[0.02]'}`}>
              <span className="text-2xl" aria-hidden="true">{item.flag}</span><span className="flex-1 text-sm font-semibold">{t(item.key)}</span>{language === item.id && <Check className="h-4 w-4 text-[var(--accent)]" />}
            </button>
          ))}
        </div>
      </SettingsSection>
    );

    if (activeTab === 'content') return (
      <div className="space-y-4">
        <SettingsSection title={t('blockedWords')}>
          <form onSubmit={(event) => {
            event.preventDefault();
            const word = wordInput.trim();
            if (!word) return;
            if (settings.blockedWords.includes(word)) { notify(t('wordExists'), true); return; }
            setPreference('blockedWords', [...settings.blockedWords, word]);
            setWordInput('');
          }} className="flex gap-2">
            <input value={wordInput} onChange={(event) => setWordInput(event.target.value)} placeholder={t('addWord')} className="min-w-0 flex-1 rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none focus:border-[var(--accent)]" />
            <button type="submit" className="rounded-lg bg-white/10 px-3 text-xs font-semibold transition hover:bg-white/15">{t('add')}</button>
          </form>
          <div className="mt-3 flex flex-wrap gap-2">{settings.blockedWords.map((word) => <span key={word} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs">{word}<button type="button" aria-label={`${t('remove')} ${word}`} onClick={() => setPreference('blockedWords', settings.blockedWords.filter((item) => item !== word))}><X className="h-3.5 w-3.5 text-white/50" /></button></span>)}</div>
        </SettingsSection>
        <SettingsSection title={t('blockedAccounts')}>
          {blockedLoading ? <div className="h-10 animate-pulse rounded-lg bg-white/5" /> : blockedError ? <p role="alert" className="text-sm text-rose-300">{t('saveError')}</p> : blockedAccounts.length === 0 ? <p className="py-3 text-sm text-white/50">{t('noBlockedAccounts')}</p> : blockedAccounts.map((account) => <div key={account.id} className="flex items-center justify-between border-b border-white/[0.07] py-3 last:border-0"><span className="text-sm">@{account.username}</span><button type="button" onClick={() => void unblock(account.id)} className="rounded-md px-3 py-1.5 text-xs text-white/60 transition hover:bg-white/5">{t('remove')}</button></div>)}
        </SettingsSection>
        <SettingsSection title={t('commentFilter')}>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={t('commentFilter')}>
            {(['normal', 'strict'] as const).map((value) => <RadioCard key={value} label={t(value)} selected={settings.commentFilter === value} onClick={() => setPreference('commentFilter', value)} />)}
          </div>
        </SettingsSection>
      </div>
    );

    if (activeTab === 'accessibility') return (
      <SettingsSection title={t('accessibility')}>
        {renderToggleRow('reduceMotion', 'reduceMotion')}
        {renderToggleRow('highContrast', 'highContrast')}
        {renderToggleRow('screenReader', 'screenReader')}
        {renderToggleRow('autoTranslate', 'autoTranslate')}
      </SettingsSection>
    );

    if (activeTab === 'data') return (
      <SettingsSection title={t('data')}>
        <SettingsRow label={t('downloadData')}><button type="button" disabled={saving} onClick={() => void exportData()} aria-label={t('downloadData')} className="rounded-lg bg-white/10 p-2.5 transition hover:scale-105 hover:bg-white/15 disabled:opacity-50"><Download className="h-4 w-4" /></button></SettingsRow>
        <SettingsRow label={t('deleteAccount')}><button type="button" onClick={() => setDeleteOpen(true)} aria-label={t('deleteAccount')} className="rounded-lg bg-rose-500/10 p-2.5 text-rose-300 transition hover:scale-105 hover:bg-rose-500/20"><Trash2 className="h-4 w-4" /></button></SettingsRow>
      </SettingsSection>
    );

    return (
      <SettingsSection title={t('about')}>
        <SettingsRow label={t('version')}><span className="text-xs text-white/55">1.0.0</span></SettingsRow>
        {(['terms', 'privacyPolicy', 'contact', 'rateApp'] as const).map((key) => (
          <SettingsRow key={key} label={t(key)}><button type="button" onClick={() => notify(t('unavailable'))} aria-label={t(key)} className="rounded-lg p-2 text-white/50 transition hover:bg-white/5"><ChevronLeft className="h-4 w-4" /></button></SettingsRow>
        ))}
      </SettingsSection>
    );
  };

  if (authLoading) return (
    <div className="mx-auto max-w-5xl space-y-5 px-4 py-6" dir={directionForLanguage(language)}>
      <div className="h-9 w-48 animate-pulse rounded-lg bg-white/10" />
      <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]"><div className="h-96 animate-pulse rounded-xl bg-white/[0.05]" /><div className="h-[520px] animate-pulse rounded-xl bg-white/[0.05]" /></div>
    </div>
  );

  return (
    <main className={`mx-auto min-h-[calc(100vh-72px)] max-w-5xl px-3 py-5 text-white sm:px-5 sm:py-7 ${settings.density === 'compact' ? '[&_.settings-card]:p-3' : ''}`} dir={directionForLanguage(language)}>
      <header className="mb-6 flex items-center gap-3">
        <button type="button" onClick={() => navigate(-1)} aria-label={t('back')} className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[0.03] text-white/75 transition hover:bg-white/10"><ArrowLeft className="h-5 w-5" /></button>
        <div><h1 className="text-xl font-semibold">{t('title')}</h1><p className="mt-1 text-xs text-white/45">{t(tabs.find((tab) => tab.id === activeTab)?.key ?? 'account')}</p></div>
      </header>

      {toast && <div role={toast.error ? 'alert' : 'status'} aria-live="polite" className={`fixed left-1/2 top-20 z-[120] -translate-x-1/2 rounded-lg border px-4 py-3 text-sm shadow-xl ${toast.error ? 'border-rose-400/20 bg-[#251114] text-rose-200' : 'border-emerald-300/20 bg-[#102019] text-emerald-200'}`}>{toast.text}</div>}

      <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label={t('title')} className="flex gap-1 overflow-x-auto rounded-xl border border-white/10 bg-[#111] p-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden lg:sticky lg:top-20 lg:h-fit lg:flex-col lg:overflow-visible">
          {tabs.map(({ id, key, icon: Icon }) => (
            <button key={id} type="button" onClick={() => setActiveTab(id)} aria-current={activeTab === id ? 'page' : undefined} className={`flex shrink-0 items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition hover:bg-white/5 lg:w-full ${activeTab === id ? 'bg-white/[0.08] font-semibold text-white' : 'text-white/55'}`}>
              <Icon className="h-[18px] w-[18px] shrink-0" /><span>{t(key)}</span>
            </button>
          ))}
        </nav>

        <div className="min-w-0 space-y-4">{renderContent()}</div>
      </div>

      {passwordOpen && (
        <div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setPasswordOpen(false); }} className="fixed inset-0 z-[110] grid place-items-center bg-black/75 p-4 backdrop-blur-sm">
          <section role="dialog" aria-modal="true" aria-labelledby="password-title" className="w-full max-w-md rounded-xl border border-white/10 bg-[#111] p-5 shadow-2xl">
            <div className="mb-5 flex items-center justify-between"><h2 id="password-title" className="text-lg font-semibold">{t('passwordModalTitle')}</h2><button type="button" onClick={() => setPasswordOpen(false)} aria-label={t('cancel')} className="rounded-lg p-2 text-white/55 hover:bg-white/5"><X className="h-5 w-5" /></button></div>
            <form onSubmit={(event) => void handlePasswordChange(event)} className="space-y-3">
              <input type="password" autoComplete="current-password" required value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} placeholder={t('currentPassword')} className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-3 text-sm outline-none focus:border-[var(--accent)]" />
              <input type="password" autoComplete="new-password" minLength={8} required value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder={t('newPassword')} className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-3 text-sm outline-none focus:border-[var(--accent)]" />
              <input type="password" autoComplete="new-password" minLength={8} required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder={t('confirmPassword')} className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-3 text-sm outline-none focus:border-[var(--accent)]" />
              <div className="flex justify-end gap-2 pt-2"><button type="button" onClick={() => setPasswordOpen(false)} className="rounded-lg px-4 py-2 text-sm text-white/60 hover:bg-white/5">{t('cancel')}</button><button type="submit" disabled={passwordSaving} className="rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold disabled:opacity-50">{passwordSaving ? t('saving') : t('updatePassword')}</button></div>
            </form>
          </section>
        </div>
      )}

      {deleteOpen && (
        <div role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDeleteOpen(false); }} className="fixed inset-0 z-[110] grid place-items-center bg-black/75 p-4 backdrop-blur-sm">
          <section role="dialog" aria-modal="true" aria-labelledby="delete-title" className="w-full max-w-md rounded-xl border border-rose-400/20 bg-[#111] p-5 shadow-2xl">
            <div className="mb-4 flex items-center justify-between"><h2 id="delete-title" className="text-lg font-semibold text-rose-200">{t('deleteModalTitle')}</h2><button type="button" onClick={() => setDeleteOpen(false)} aria-label={t('cancel')} className="rounded-lg p-2 text-white/55 hover:bg-white/5"><X className="h-5 w-5" /></button></div>
            <p className="mb-4 text-sm leading-6 text-white/65">{t('deleteWarning')}</p>
            <label className="mb-4 block text-sm text-white/75">{t('typeDelete')}<input value={deleteText} onChange={(event) => setDeleteText(event.target.value)} className="mt-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-3 text-sm outline-none focus:border-rose-400" /></label>
            <div className="flex justify-end gap-2"><button type="button" onClick={() => setDeleteOpen(false)} className="rounded-lg px-4 py-2 text-sm text-white/60 hover:bg-white/5">{t('cancel')}</button><button type="button" disabled={deleteText !== 'DELETE'} onClick={() => { setDeleteOpen(false); setDeleteText(''); notify(t('deleteUnavailable'), true); }} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold transition hover:bg-rose-500 disabled:cursor-not-allowed disabled:opacity-40">{t('deleteConfirm')}</button></div>
          </section>
        </div>
      )}
    </main>
  );
}