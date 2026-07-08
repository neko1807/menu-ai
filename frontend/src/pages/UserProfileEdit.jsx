import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileImage,
  ImagePlus,
  KeyRound,
  Loader2,
  PencilLine,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  UserPen,
  XCircle,
} from 'lucide-react';
import TopNav from '../components/layout/TopNav';
import { useAuth } from '../auth/AuthContext';

const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function validateDisplayName(value) {
  const trimmedValue = value.trim();

  if (!trimmedValue) {
    return 'กรุณากรอกชื่อที่แสดง';
  }

  if (trimmedValue.length < 2) {
    return 'ชื่อควรมีอย่างน้อย 2 ตัวอักษร';
  }

  return '';
}

function validatePasswordFields(currentPassword, newPassword, confirmPassword) {
  const nextErrors = {};

  if (!currentPassword) {
    nextErrors.currentPassword = 'กรุณากรอกรหัสผ่านปัจจุบัน';
  }

  if (!newPassword) {
    nextErrors.newPassword = 'กรุณากรอกรหัสผ่านใหม่';
  } else if (newPassword.length < 8) {
    nextErrors.newPassword = 'รหัสผ่านใหม่ต้องมีอย่างน้อย 8 ตัวอักษร';
  }

  if (!confirmPassword) {
    nextErrors.confirmPassword = 'กรุณายืนยันรหัสผ่านใหม่';
  } else if (newPassword !== confirmPassword) {
    nextErrors.confirmPassword = 'รหัสผ่านใหม่และการยืนยันไม่ตรงกัน';
  }

  return nextErrors;
}

function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return '';

  const mb = bytes / (1024 * 1024);
  if (mb >= 1) {
    return `${mb.toFixed(1)} MB`;
  }

  const kb = bytes / 1024;
  return `${Math.max(1, Math.round(kb))} KB`;
}

export default function UserProfileEdit() {
  const { user, updateProfile, changePassword, updateAvatar } = useAuth();
  const navigate = useNavigate();
  const avatarInputRef = useRef(null);

  const [name, setName] = useState(user?.name || '');
  const [avatarPreview, setAvatarPreview] = useState(user?.avatarUrl || '');
  const [avatarDataUrl, setAvatarDataUrl] = useState('');
  const [avatarFileName, setAvatarFileName] = useState('');
  const [avatarFileSize, setAvatarFileSize] = useState(0);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [notice, setNotice] = useState(null);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setName(user?.name || '');
    setAvatarPreview(user?.avatarUrl || '');
    setAvatarDataUrl('');
    setAvatarFileName('');
    setAvatarFileSize(0);
    setErrors({});
  }, [user?.avatarUrl, user?.name]);

  const hasProfileChanges = useMemo(
    () => name.trim() !== (user?.name || ''),
    [name, user?.name],
  );

  const hasPendingAvatar = Boolean(avatarDataUrl);

  const passwordStrength = useMemo(() => {
    const value = newPassword || '';
    if (!value) return 0;

    let score = 0;
    if (value.length >= 8) score += 1;
    if (/[A-Z]/.test(value)) score += 1;
    if (/[a-z]/.test(value)) score += 1;
    if (/\d/.test(value)) score += 1;
    if (/[^A-Za-z0-9]/.test(value)) score += 1;
    return score;
  }, [newPassword]);

  async function handleProfileSubmit(event) {
    event.preventDefault();
    setNotice(null);

    const nextName = name.trim();
    const nextErrors = {};
    const nameError = validateDisplayName(nextName);

    if (nameError) {
      nextErrors.name = nameError;
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setProfileSaving(true);

    try {
      const result = await updateProfile(nextName);

      if (!result.success) {
        setErrors({ profile: result.message });
        return;
      }

      setNotice({
        tone: 'success',
        message: 'บันทึกชื่อโปรไฟล์เรียบร้อยแล้ว',
      });
    } finally {
      setProfileSaving(false);
    }
  }

  async function handleAvatarSubmit(event) {
    event.preventDefault();
    setNotice(null);

    if (!avatarDataUrl) {
      setErrors({ avatar: 'กรุณาเลือกรูปภาพก่อนอัปโหลด' });
      return;
    }

    setErrors({});
    setAvatarSaving(true);

    try {
      const result = await updateAvatar(avatarDataUrl);

      if (!result.success) {
        setErrors({ avatar: result.message });
        return;
      }

      setAvatarPreview(avatarDataUrl);
      setAvatarDataUrl('');
      setAvatarFileName('');
      setAvatarFileSize(0);

      if (avatarInputRef.current) {
        avatarInputRef.current.value = '';
      }

      setNotice({
        tone: 'success',
        message: 'อัปโหลดรูปโปรไฟล์สำเร็จแล้ว',
      });
    } finally {
      setAvatarSaving(false);
    }
  }

  async function handlePasswordSubmit(event) {
    event.preventDefault();
    setNotice(null);

    const nextErrors = validatePasswordFields(currentPassword, newPassword, confirmPassword);

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setPasswordSaving(true);

    try {
      const result = await changePassword(currentPassword, newPassword);

      if (!result.success) {
        setErrors({ password: result.message });
        return;
      }

      navigate('/login', {
        replace: true,
        state: {
          message: 'เปลี่ยนรหัสผ่านสำเร็จ กรุณาเข้าสู่ระบบใหม่อีกครั้ง',
        },
      });
    } finally {
      setPasswordSaving(false);
    }
  }

  async function handleAvatarFileChange(event) {
    const file = event.target.files?.[0];
    setNotice(null);
    setErrors({});

    if (!file) {
      return;
    }

    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
      setErrors({
        avatar: 'รองรับไฟล์ JPG, PNG และ WEBP เท่านั้น',
      });
      return;
    }

    if (file.size > MAX_AVATAR_SIZE) {
      setErrors({
        avatar: 'ขนาดไฟล์ต้องไม่เกิน 2 MB',
      });
      return;
    }

    const dataUrl = await readFileAsDataUrl(file);
    setAvatarDataUrl(dataUrl);
    setAvatarPreview(dataUrl);
    setAvatarFileName(file.name);
    setAvatarFileSize(file.size);
  }

  function clearAvatarSelection() {
    setNotice(null);
    setErrors({});
    setAvatarDataUrl('');
    setAvatarFileName('');
    setAvatarFileSize(0);
    setAvatarPreview(user?.avatarUrl || '');

    if (avatarInputRef.current) {
      avatarInputRef.current.value = '';
    }
  }

  const statusCards = [
    { label: 'ชื่อบัญชี', value: user?.name || '-' },
    { label: 'อีเมล', value: user?.email || '-' },
    { label: 'Role', value: user?.role || '-' },
    { label: 'Avatar', value: user?.avatarUrl ? 'มีรูปโปรไฟล์แล้ว' : 'ยังไม่มี' },
  ];

  return (
    <div className="min-h-full bg-[radial-gradient(circle_at_top,_rgba(251,146,60,0.18),_transparent_24%),linear-gradient(180deg,_#020617_0%,_#0f172a_45%,_#111827_100%)]">
      <TopNav />

      <div className="mx-auto max-w-[1600px] px-6 py-8 xl:px-10">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-400/20 bg-orange-400/10 px-3 py-1 text-sm text-orange-200">
              <Sparkles className="h-4 w-4" />
              Profile Settings
            </div>
            <h1 className="mt-3 text-3xl font-semibold text-white xl:text-5xl">แก้ไขโปรไฟล์</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-400 xl:text-base">
              ปรับชื่อ รูปโปรไฟล์ และรหัสผ่านได้จากหน้านี้ พร้อมแสดง error แบบอ่านง่ายและเป็นระเบียบมากขึ้น
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate('/profile')}
            className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/10 lg:inline-flex"
          >
            <ArrowLeft className="h-4 w-4" />
            กลับไปหน้าโปรไฟล์
          </button>
        </div>

        {notice ? <NoticeBanner tone={notice.tone} message={notice.message} /> : null}

        <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
          <section className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-6 shadow-glow backdrop-blur-xl">
            <SectionHeader
              icon={UserPen}
              title="เปลี่ยนชื่อผู้ใช้"
              description="อัปเดตชื่อที่แสดงบนระบบ พร้อม validation และข้อความแจ้งเตือนที่ชัดเจน"
            />

            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <FormField
                label="ชื่อใหม่"
                value={name}
                onChange={setName}
                placeholder="Your display name"
                error={errors.name}
              />

              {errors.profile ? <InlineAlert tone="error" message={errors.profile} /> : null}

              <button
                type="submit"
                disabled={profileSaving || !hasProfileChanges}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-400 to-amber-300 px-6 py-4 font-semibold text-slate-950 transition hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {profileSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <PencilLine className="h-4 w-4" />}
                {profileSaving ? 'กำลังบันทึก...' : 'บันทึกชื่อใหม่'}
              </button>
            </form>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-6 shadow-glow backdrop-blur-xl">
            <SectionHeader
              icon={ImagePlus}
              title="รูปโปรไฟล์"
              description="เลือกไฟล์ JPG, PNG หรือ WEBP ขนาดไม่เกิน 2 MB แล้วดูพรีวิวก่อนอัปโหลด"
            />

            <form onSubmit={handleAvatarSubmit} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-[112px_1fr]">
                <div className="flex justify-center">
                  <div className="relative h-28 w-28 overflow-hidden rounded-3xl border border-white/10 bg-slate-950/60">
                    {avatarPreview ? (
                      <img
                        src={avatarPreview}
                        alt="Avatar preview"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-orange-200">
                        <ImagePlus className="h-8 w-8" />
                      </div>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <input
                    ref={avatarInputRef}
                    id="avatar-upload"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={handleAvatarFileChange}
                    className="hidden"
                  />

                  <label
                    htmlFor="avatar-upload"
                    className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-dashed border-white/15 bg-slate-950/45 px-4 py-4 text-sm text-slate-300 transition hover:border-orange-400/40 hover:bg-white/5"
                  >
                    <span className="flex items-center gap-2">
                      <Upload className="h-4 w-4 text-orange-200" />
                      เลือกรูปจากเครื่อง
                    </span>
                    <span className="text-xs text-slate-500">Browse</span>
                  </label>

                  <div className="flex flex-wrap gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                      <FileImage className="h-3.5 w-3.5" />
                      รองรับ JPG / PNG / WEBP
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                      <ShieldCheck className="h-3.5 w-3.5" />
                      ไม่เกิน 2 MB
                    </span>
                  </div>

                  {avatarFileName ? (
                    <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3 text-sm text-slate-300">
                      <p className="font-medium text-white">{avatarFileName}</p>
                      <p className="mt-1 text-xs text-slate-400">{formatFileSize(avatarFileSize)}</p>
                    </div>
                  ) : null}
                </div>
              </div>

              {errors.avatar ? <InlineAlert tone="error" message={errors.avatar} /> : null}

              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={avatarSaving || !hasPendingAvatar}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 font-semibold text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {avatarSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                  {avatarSaving ? 'กำลังอัปโหลด...' : 'อัปโหลดรูปโปรไฟล์'}
                </button>

                <button
                  type="button"
                  onClick={clearAvatarSelection}
                  disabled={!hasPendingAvatar && !avatarPreview}
                  aria-label="ล้างรูปโปรไฟล์ที่เลือก"
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-4 font-semibold text-slate-200 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Trash2 className="h-4 w-4" />
                  <span className="hidden sm:inline">ล้าง</span>
                </button>
              </div>
            </form>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-6 shadow-glow backdrop-blur-xl">
            <SectionHeader
              icon={KeyRound}
              title="เปลี่ยนรหัสผ่าน"
              description="ระบบจะตรวจสอบความครบถ้วนของรหัสผ่านและแสดง error แบบแยกช่อง"
            />

            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <FormField
                label="รหัสผ่านปัจจุบัน"
                value={currentPassword}
                onChange={setCurrentPassword}
                type="password"
                placeholder="Current password"
                autoComplete="current-password"
                error={errors.currentPassword}
              />
              <FormField
                label="รหัสผ่านใหม่"
                value={newPassword}
                onChange={setNewPassword}
                type="password"
                placeholder="New password"
                autoComplete="new-password"
                error={errors.newPassword}
              />
              <FormField
                label="ยืนยันรหัสผ่านใหม่"
                value={confirmPassword}
                onChange={setConfirmPassword}
                type="password"
                placeholder="Confirm new password"
                autoComplete="new-password"
                error={errors.confirmPassword}
              />

              <PasswordStrengthBar score={passwordStrength} />

              {errors.password ? <InlineAlert tone="error" message={errors.password} /> : null}

              <div className="rounded-2xl border border-sky-400/20 bg-sky-400/10 px-4 py-3 text-sm text-sky-100">
                <div className="flex items-center gap-2 font-medium">
                  <ShieldCheck className="h-4 w-4" />
                  ความปลอดภัย
                </div>
                <p className="mt-1 text-sky-50/80">
                  เมื่อเปลี่ยนรหัสผ่าน ระบบจะยกเลิก session เดิมทั้งหมดเพื่อป้องกันการใช้งานค้างอยู่
                </p>
              </div>

              <button
                type="submit"
                disabled={passwordSaving}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-6 py-4 font-semibold text-slate-100 transition hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {passwordSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                {passwordSaving ? 'กำลังเปลี่ยนรหัสผ่าน...' : 'เปลี่ยนรหัสผ่าน'}
              </button>
            </form>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-slate-900/75 p-6 shadow-glow backdrop-blur-xl">
            <SectionHeader
              icon={AlertCircle}
              title="สถานะโปรไฟล์"
              description="สรุปข้อมูลสำคัญของบัญชีไว้ตรวจเช็กได้ง่าย"
            />

            <div className="grid gap-3 sm:grid-cols-2">
              {statusCards.map((card) => (
                <StatusCard key={card.label} label={card.label} value={card.value} />
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}

function SectionHeader({ icon: Icon, title, description }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <div className="rounded-2xl bg-orange-400/10 p-3 text-orange-200">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <h2 className="text-xl font-semibold text-white">{title}</h2>
        <p className="text-sm text-slate-400">{description}</p>
      </div>
    </div>
  );
}

function FormField({ label, value, onChange, type = 'text', placeholder, autoComplete, error }) {
  const hasError = Boolean(error);

  return (
    <div>
      <label className="mb-2 block text-sm text-slate-300">{label}</label>
      <div
        className={`rounded-2xl border px-4 py-3 transition focus-within:border-opacity-100 ${
          hasError
            ? 'border-red-500/40 bg-red-500/10 focus-within:border-red-400'
            : 'border-white/10 bg-slate-950/60 focus-within:border-orange-400/40'
        }`}
      >
        <input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full bg-transparent text-slate-100 outline-none placeholder:text-slate-500"
          placeholder={placeholder}
          autoComplete={autoComplete}
        />
      </div>
      {hasError ? (
        <p className="mt-2 flex items-center gap-2 text-sm text-red-200">
          <XCircle className="h-4 w-4" />
          {error}
        </p>
      ) : null}
    </div>
  );
}

function InlineAlert({ tone = 'error', message }) {
  if (!message) return null;

  const styles =
    tone === 'error'
      ? 'border-red-500/20 bg-red-500/10 text-red-100'
      : 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100';

  return (
    <div className={`rounded-2xl border px-4 py-3 text-sm ${styles}`}>
      {message}
    </div>
  );
}

function NoticeBanner({ tone = 'success', message }) {
  const styles =
    tone === 'success'
      ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-100'
      : 'border-amber-400/20 bg-amber-400/10 text-amber-100';

  const Icon = tone === 'success' ? CheckCircle2 : AlertCircle;

  return (
    <div className={`mb-6 flex items-start gap-3 rounded-2xl border px-4 py-3 ${styles}`}>
      <Icon className="mt-0.5 h-5 w-5 shrink-0" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

function PasswordStrengthBar({ score }) {
  const labels = ['อ่อนมาก', 'อ่อน', 'พอใช้', 'ดี', 'แข็งแรง'];
  const index = Math.max(0, Math.min(score - 1, 4));
  const width = Math.min(score, 5) * 20;

  const barClass =
    score >= 4 ? 'bg-emerald-400' : score >= 2 ? 'bg-amber-300' : 'bg-rose-400';

  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/45 px-4 py-3">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <span>ความแข็งแรงรหัสผ่าน</span>
        <span>{labels[index]}</span>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10">
        <div
          className={`h-full rounded-full transition-all duration-300 ${barClass}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

function StatusCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-2 break-all text-sm font-medium text-white">{value}</p>
    </div>
  );
}
