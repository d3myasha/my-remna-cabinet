import { FormEvent, useMemo, useState } from 'react';

type StoredUser = {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  createdAt: string;
};

const USERS_KEY = 'frontend_only_users';
const CURRENT_USER_KEY = 'frontend_only_current_user';

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function readUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveUsers(users: StoredUser[]) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

export default function SimpleFrontendApp() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const usersCount = useMemo(() => readUsers().length, [success]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedName) {
      setError('Введите имя.');
      return;
    }

    if (!isValidEmail(normalizedEmail)) {
      setError('Введите корректный email.');
      return;
    }

    if (password.length < 8) {
      setError('Пароль должен быть не короче 8 символов.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Пароли не совпадают.');
      return;
    }

    setIsSubmitting(true);

    try {
      const users = readUsers();
      const alreadyExists = users.some((user) => user.email === normalizedEmail);
      if (alreadyExists) {
        setError('Пользователь с таким email уже зарегистрирован.');
        return;
      }

      const passwordHash = await hashPassword(password);
      const newUser: StoredUser = {
        id: crypto.randomUUID(),
        name: normalizedName,
        email: normalizedEmail,
        passwordHash,
        createdAt: new Date().toISOString(),
      };

      const nextUsers = [...users, newUser];
      saveUsers(nextUsers);

      localStorage.setItem(
        CURRENT_USER_KEY,
        JSON.stringify({ id: newUser.id, name: newUser.name, email: newUser.email }),
      );

      setSuccess('Регистрация прошла успешно. Аккаунт сохранен в браузере.');
      setName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-10 text-slate-900">
      <div className="mx-auto w-full max-w-md rounded-2xl bg-white p-6 shadow-xl sm:p-8">
        <h1 className="text-2xl font-bold">Регистрация</h1>
        <p className="mt-2 text-sm text-slate-600">
          Фронтенд без бэкенда: данные хранятся локально.
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block">
            <span className="mb-1 block text-sm font-medium">Имя</span>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-slate-900"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Иван"
              autoComplete="name"
              required
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium">Email</span>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-slate-900"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="mail@example.com"
              type="email"
              autoComplete="email"
              required
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium">Пароль</span>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-slate-900"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Минимум 8 символов"
              type="password"
              autoComplete="new-password"
              required
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium">Повторите пароль</span>
            <input
              className="w-full rounded-lg border border-slate-300 px-3 py-2 outline-none transition focus:border-slate-900"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              type="password"
              autoComplete="new-password"
              required
            />
          </label>

          {error ? (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
          ) : null}
          {success ? (
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>
          ) : null}

          <button
            className="w-full rounded-lg bg-slate-900 px-3 py-2 font-medium text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Регистрируем...' : 'Зарегистрироваться'}
          </button>
        </form>

        <p className="mt-4 text-xs text-slate-500">Всего зарегистрировано локально: {usersCount}</p>
      </div>
    </main>
  );
}
