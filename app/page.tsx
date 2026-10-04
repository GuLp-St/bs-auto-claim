'use client';

import { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Trash2, 
  Play, 
  Power, 
  LogOut, 
  HelpCircle, 
  History, 
  Gift, 
  Sparkles, 
  Gamepad2,
  ShieldCheck,
  Users
} from 'lucide-react';

export default function Home() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [usernameInput, setUsernameInput] = useState('');
  const [authError, setAuthError] = useState('');

  // Token state
  const [scidInput, setScidInput] = useState('');
  const [sessionInput, setSessionInput] = useState('');
  const [savingTokens, setSavingTokens] = useState(false);
  const [tokenMsg, setTokenMsg] = useState<{ type: string; text: string } | null>(null);

  // Reward, History, and Admin state
  const [todayFreebie, setTodayFreebie] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [adminUsers, setAdminUsers] = useState<any[]>([]);
  const [claiming, setClaiming] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  async function loadUser() {
    setLoading(true);
    try {
      const res = await fetch('/api/auth');
      if (!res.ok) {
        setCurrentUser(null);
        return;
      }
      const data = await res.json();
      setCurrentUser(data.user);
      if (data.user) {
        setScidInput(data.user.scsso_scid || '');
        setSessionInput(data.user.session_cookie || '');
        loadUserDashboardData();
        if (data.user.is_admin) {
          loadAdminUsers();
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadUserDashboardData() {
    try {
      const res = await fetch('/api/user');
      const data = await res.json();
      setHistory(data.history || []);
      setTodayFreebie(data.todayFreebie || null);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadAdminUsers() {
    try {
      const res = await fetch('/api/admin');
      const data = await res.json();
      setAdminUsers(data.users || []);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    loadUser();
  }, []);

  async function handleAuth(action: 'signin' | 'signup') {
    setAuthError('');
    if (!usernameInput.trim()) {
      setAuthError('Please enter a username.');
      return;
    }

    const res = await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, username: usernameInput }),
    });
    const data = await res.json();

    if (data.user) {
      setCurrentUser(data.user);
      setScidInput(data.user.scsso_scid || '');
      setSessionInput(data.user.session_cookie || '');
      loadUserDashboardData();
      if (data.user.is_admin) {
        loadAdminUsers();
      }
    } else {
      setAuthError(data.error || 'Authentication failed');
    }
  }

  async function handleLogout() {
    await fetch('/api/auth', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'logout' }),
    });
    setCurrentUser(null);
    setTodayFreebie(null);
    setAdminUsers([]);
  }

  async function handleSaveTokens(e: React.FormEvent) {
    e.preventDefault();
    setSavingTokens(true);
    setTokenMsg(null);

    const res = await fetch('/api/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'save_tokens',
        scsso_scid: scidInput.trim(),
        session_cookie: sessionInput.trim(),
      }),
    });
    const data = await res.json();
    setSavingTokens(false);

    if (data.success) {
      setCurrentUser(data.user);
      setTodayFreebie(data.todayFreebie);
      setTokenMsg({ type: 'success', text: 'Tokens verified! Profile and freebie loaded.' });
    } else {
      setTokenMsg({ type: 'error', text: data.error || 'Validation failed.' });
    }
  }

  async function handleToggleAutoClaim() {
    const nextState = !currentUser.auto_claim_enabled;
    const res = await fetch('/api/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'toggle_autoclaim', enabled: nextState }),
    });
    const data = await res.json();
    if (data.user) setCurrentUser(data.user);
  }

  async function handleClaimNow() {
    setClaiming(true);
    const res = await fetch('/api/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'claim_now' }),
    });
    const data = await res.json();
    setClaiming(false);

    if (data.claimed && data.claimed.length > 0) {
      alert(`Claimed: ${data.claimed.join(', ')}`);
    } else if (data.success) {
      alert('Checked! No unclaimed rewards remaining today.');
    } else {
      alert(`Failed: ${data.reason || 'Check token validity'}`);
    }
    loadUser();
  }

  async function handleAdminAction(action: 'delete_user' | 'claim_for_user', targetUserId: string) {
    if (action === 'delete_user' && !confirm('Are you sure you want to delete this user?')) return;

    const res = await fetch('/api/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, userId: targetUserId }),
    });
    const data = await res.json();

    if (data.success || data.claimed) {
      if (action === 'claim_for_user') {
        alert(data.claimed?.length ? `Claimed: ${data.claimed.join(', ')}` : 'No items to claim.');
      }
      loadAdminUsers();
    } else {
      alert(data.error || data.reason || 'Action failed.');
    }
  }

  async function handleDeleteAccount() {
    if (!confirm('Are you sure you want to delete your account and saved tokens?')) return;
    await fetch('/api/user', { method: 'DELETE' });
    setCurrentUser(null);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-neutral-950 text-white flex items-center justify-center font-sans">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-yellow-500"></div>
      </div>
    );
  }

  // Auth Screen (Logged Out)
  if (!currentUser) {
    return (
      <main className="min-h-screen bg-neutral-950 text-white flex flex-col items-center justify-center px-4 font-sans">
        <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-2xl">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Gift className="h-8 w-8 text-yellow-400" />
            <h1 className="text-2xl font-black tracking-wide text-white">BRAWL CLAIMER</h1>
          </div>
          <p className="text-neutral-400 text-sm text-center mb-6">
            Auto-claim daily store gifts for Brawl Stars
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-1">
                Enter Username
              </label>
              <input
                type="text"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                placeholder="e.g. siangyup"
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-3 text-white placeholder-neutral-600 focus:outline-none focus:border-yellow-500"
              />
            </div>

            {authError && <p className="text-xs text-rose-400">{authError}</p>}

            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleAuth('signin')}
                className="bg-neutral-800 hover:bg-neutral-700 text-white font-bold py-3 px-4 rounded-xl transition duration-150 text-sm"
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => handleAuth('signup')}
                className="bg-yellow-500 hover:bg-yellow-400 text-black font-bold py-3 px-4 rounded-xl transition duration-150 text-sm"
              >
                Sign Up
              </button>
            </div>
          </div>
        </div>
      </main>
    );
  }

  // Dashboard Screen (Logged In)
  return (
    <main className="min-h-screen bg-neutral-950 text-white font-sans pb-16">
      {/* Top Header */}
      <header className="border-b border-neutral-800 bg-neutral-900/50 backdrop-blur sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Gift className="h-6 w-6 text-yellow-400" />
            <span className="font-black text-lg tracking-wide">BRAWL CLAIMER</span>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-neutral-400">
              Web User: <strong className="text-white">{currentUser.username}</strong>
            </span>
            <button
              onClick={handleLogout}
              className="text-neutral-400 hover:text-white p-2 rounded-lg"
              title="Logout"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 mt-8 space-y-6">
        {/* Profile Card */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="flex items-center gap-4 min-w-0">
              {currentUser.avatar_url ? (
                <img
                  src={currentUser.avatar_url}
                  alt="avatar"
                  className="w-16 h-16 sm:w-20 sm:h-20 rounded-full border-2 border-yellow-500 object-cover shrink-0"
                />
              ) : (
                <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-neutral-800 border-2 border-neutral-700 flex items-center justify-center font-bold text-2xl text-neutral-400 shrink-0">
                  {currentUser.username[0]?.toUpperCase()}
                </div>
              )}

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl sm:text-2xl font-black text-white truncate">
                    {currentUser.brawl_name || currentUser.username}
                  </h2>
                  {currentUser.brawl_tag && (
                    <span className="text-xs font-mono bg-neutral-800 text-neutral-400 px-2 py-0.5 rounded border border-neutral-700 shrink-0">
                      {currentUser.brawl_tag}
                    </span>
                  )}
                </div>

                <div className="text-xs text-neutral-400 flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                  <span className="flex items-center gap-1">
                    <Gamepad2 className="h-3.5 w-3.5 text-yellow-400" />
                    IGN: <strong className="text-neutral-200">{currentUser.brawl_name || 'N/A'}</strong>
                  </span>
                  <span className="text-neutral-600 hidden sm:inline">•</span>
                  <span>
                    User: <strong className="text-neutral-200">{currentUser.username}</strong>
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-2 mt-3">
                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1.5 ${
                      currentUser.token_status === 'VALID'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : currentUser.token_status === 'EXPIRED'
                        ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        : 'bg-neutral-800 text-neutral-400 border border-neutral-700'
                    }`}
                  >
                    {currentUser.token_status === 'VALID' && <CheckCircle2 className="h-3.5 w-3.5" />}
                    {currentUser.token_status === 'EXPIRED' && <XCircle className="h-3.5 w-3.5" />}
                    Tokens: {currentUser.token_status}
                  </span>

                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-semibold flex items-center gap-1.5 ${
                      currentUser.is_completed_today
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    <Clock className="h-3.5 w-3.5" />
                    Today: {currentUser.is_completed_today ? 'Done' : 'Pending Claim'}
                  </span>
                </div>
              </div>
            </div>

            <div className="shrink-0 pt-2 sm:pt-0">
              <button
                onClick={handleToggleAutoClaim}
                className={`w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs transition duration-150 ${
                  currentUser.auto_claim_enabled
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                    : 'bg-neutral-800 text-neutral-400 border border-neutral-700 hover:bg-neutral-700'
                }`}
              >
                <Power className="h-3.5 w-3.5" />
                Auto-Claim: {currentUser.auto_claim_enabled ? 'ON' : 'OFF'}
              </button>
            </div>
          </div>
        </div>

        {/* Freebie Preview Card */}
        <div className="bg-gradient-to-r from-neutral-900 to-neutral-900/60 border border-neutral-800 rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            {todayFreebie?.imageUrl ? (
              <img
                src={todayFreebie.imageUrl}
                alt={todayFreebie.title}
                className="w-16 h-16 object-contain bg-neutral-950/80 rounded-xl p-2 border border-neutral-800"
              />
            ) : (
              <div className="w-16 h-16 bg-neutral-950 rounded-xl flex items-center justify-center border border-neutral-800 text-neutral-500">
                <Gift className="h-8 w-8 text-yellow-400" />
              </div>
            )}
            
            <div>
              <span className="text-[11px] uppercase tracking-wider text-yellow-400 font-bold flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Today's Freebie
              </span>
              <h4 className="text-lg font-bold text-white mt-0.5">
                {todayFreebie ? todayFreebie.title : 'No Freebie Detected'}
              </h4>
              <div className="text-xs text-neutral-400 mt-0.5">
                {!currentUser.session_cookie ? (
                  <span className="text-rose-400 font-medium">Add credentials below to detect freebies</span>
                ) : todayFreebie?.isClaimed || currentUser.is_completed_today ? (
                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Claimed for today
                  </span>
                ) : todayFreebie ? (
                  <span className="text-amber-400 font-medium flex items-center gap-1">
                    <Clock className="h-3 w-3" /> Unclaimed reward waiting
                  </span>
                ) : (
                  <span className="text-neutral-500">Shop resets daily at 4:00 PM MYT</span>
                )}
              </div>
            </div>
          </div>

          <div>
            {!currentUser.session_cookie ? (
              <button
                disabled
                className="w-full sm:w-auto bg-neutral-800 text-neutral-500 font-semibold text-xs px-5 py-2.5 rounded-xl cursor-not-allowed border border-neutral-700/50"
              >
                Credentials Missing
              </button>
            ) : todayFreebie?.isClaimed || currentUser.is_completed_today ? (
              <button
                disabled
                className="w-full sm:w-auto bg-neutral-800/80 text-emerald-400 font-semibold text-xs px-5 py-2.5 rounded-xl cursor-not-allowed border border-emerald-500/20 flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Claimed
              </button>
            ) : todayFreebie ? (
              <button
                onClick={handleClaimNow}
                disabled={claiming}
                className="w-full sm:w-auto bg-yellow-500 hover:bg-yellow-400 text-black font-bold text-xs px-5 py-2.5 rounded-xl transition duration-150 disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-lg shadow-yellow-500/10"
              >
                <Play className="h-3.5 w-3.5 fill-black" />
                {claiming ? 'Claiming...' : `Claim ${todayFreebie.title}`}
              </button>
            ) : (
              <button
                disabled
                className="w-full sm:w-auto bg-neutral-800 text-neutral-500 font-semibold text-xs px-5 py-2.5 rounded-xl cursor-not-allowed border border-neutral-700/50"
              >
                All Done
              </button>
            )}
          </div>
        </div>

        {/* Credentials Form & Instructions */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg">Supercell Credentials</h3>
            <button
              onClick={() => setShowHelp(!showHelp)}
              className="text-xs text-yellow-400 hover:underline flex items-center gap-1"
            >
              <HelpCircle className="h-3.5 w-3.5" /> Where do I get these?
            </button>
          </div>

          {showHelp && (
            <div className="mb-6 bg-neutral-950 border border-neutral-800 rounded-xl p-5 text-xs text-neutral-300 space-y-4">
              <div>
                <h4 className="font-bold text-sm text-yellow-400 mb-2 flex items-center gap-1.5">
                  💻 PC / Mac (Chrome, Edge, Brave)
                </h4>
                <ol className="space-y-1.5 list-decimal list-inside pl-1 text-neutral-300">
                  <li>
                    Open{' '}
                    <a
                      href="https://store.supercell.com/brawlstars"
                      target="_blank"
                      rel="noreferrer"
                      className="text-yellow-400 underline font-mono"
                    >
                      https://store.supercell.com/brawlstars
                    </a>{' '}
                    and log into your Supercell ID.
                  </li>
                  <li>
                    Press <kbd className="bg-neutral-800 border border-neutral-700 px-1.5 py-0.5 rounded text-white">F12</kbd> (or right click → <strong>Inspect</strong>).
                  </li>
                  <li>
                    Select the <strong>Application</strong> tab at the top (click the <strong>»</strong> double arrow if hidden).
                  </li>
                  <li>
                    In the left sidebar, expand <strong>Cookies</strong> → click{' '}
                    <code className="text-yellow-400 font-mono">https://store.supercell.com</code>.
                  </li>
                  <li>
                    Copy the values of <code className="text-yellow-400 font-mono">scsso_scid</code> and{' '}
                    <code className="text-yellow-400 font-mono">SESSION_COOKIE</code>.
                  </li>
                </ol>
              </div>

              <div className="border-t border-neutral-800/80 pt-3">
                <h4 className="font-bold text-sm text-yellow-400 mb-2 flex items-center gap-1.5">
                  📱 Mobile (iOS Safari & Android Chrome)
                </h4>
                <p className="text-neutral-400 mb-2">
                  Note: Supercell flags <code className="text-yellow-400 font-mono">SESSION_COOKIE</code> as <em>HttpOnly</em>. For the cleanest mobile workflow, use Kiwi Browser / Firefox with the <em>Cookie-Editor</em> extension, or copy it directly from PC DevTools.
                </p>
                <ol className="space-y-1.5 list-decimal list-inside pl-1 text-neutral-300">
                  <li>Open Kiwi Browser or Firefox on Android (or use PC DevTools).</li>
                  <li>Log into <code className="text-yellow-400 font-mono">store.supercell.com/brawlstars</code>.</li>
                  <li>Open your Cookie extension or DevTools storage panel.</li>
                  <li>Copy both <code className="text-yellow-400 font-mono">scsso_scid</code> and <code className="text-yellow-400 font-mono">SESSION_COOKIE</code> into the fields below.</li>
                </ol>
              </div>
            </div>
          )}

          <form onSubmit={handleSaveTokens} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1">
                scsso_scid
              </label>
              <input
                type="text"
                value={scidInput}
                onChange={(e) => setScidInput(e.target.value)}
                placeholder="69-xxxx-xxxx..."
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-yellow-500 font-mono"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1">
                SESSION_COOKIE
              </label>
              <textarea
                value={sessionInput}
                onChange={(e) => setSessionInput(e.target.value)}
                placeholder="eyJhbGciOiJIUzI1Ni..."
                rows={3}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-yellow-500 font-mono"
                required
              />
            </div>

            {tokenMsg && (
              <p className={`text-xs ${tokenMsg.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {tokenMsg.text}
              </p>
            )}

            <button
              type="submit"
              disabled={savingTokens}
              className="bg-neutral-800 hover:bg-neutral-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition duration-150 disabled:opacity-50"
            >
              {savingTokens ? 'Verifying with Supercell...' : 'Verify & Save Credentials'}
            </button>
          </form>
        </div>

        {/* Admin User Management Panel (Only visible to admins) */}
        {currentUser.is_admin && (
          <div className="bg-neutral-900 border border-yellow-500/30 rounded-2xl p-6 shadow-lg shadow-yellow-500/5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-lg flex items-center gap-2 text-white">
                <ShieldCheck className="h-5 w-5 text-yellow-400" />
                User Management
                <span className="text-xs bg-yellow-500/20 text-yellow-400 px-2 py-0.5 rounded-full border border-yellow-500/30 font-semibold">
                  Admin Panel
                </span>
              </h3>
              <span className="text-xs text-neutral-400 flex items-center gap-1">
                <Users className="h-3.5 w-3.5" /> Total Accounts: {adminUsers.length}
              </span>
            </div>

            {adminUsers.length === 0 ? (
              <p className="text-neutral-500 text-xs py-4 text-center">No registered accounts found.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-neutral-800 text-neutral-400">
                      <th className="pb-3 font-semibold">User / IGN</th>
                      <th className="pb-3 font-semibold">Tokens</th>
                      <th className="pb-3 font-semibold">Today</th>
                      <th className="pb-3 font-semibold">Auto-Claim</th>
                      <th className="pb-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/50">
                    {adminUsers.map((u) => (
                      <tr key={u.id} className="text-neutral-300">
                        <td className="py-3">
                          <p className="font-bold text-white">{u.username}</p>
                          <p className="text-[11px] text-neutral-400">
                            {u.brawl_name ? `${u.brawl_name} (${u.brawl_tag || ''})` : 'No IGN linked'}
                          </p>
                        </td>
                        <td className="py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              u.token_status === 'VALID'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : u.token_status === 'EXPIRED'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : 'bg-neutral-800 text-neutral-400'
                            }`}
                          >
                            {u.token_status || 'EMPTY'}
                          </span>
                        </td>
                        <td className="py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                              u.is_completed_today
                                ? 'bg-emerald-500/10 text-emerald-400'
                                : 'bg-amber-500/10 text-amber-400'
                            }`}
                          >
                            {u.is_completed_today ? 'Done' : 'Pending'}
                          </span>
                        </td>
                        <td className="py-3">
                          <span className={u.auto_claim_enabled ? 'text-emerald-400 font-semibold' : 'text-neutral-500'}>
                            {u.auto_claim_enabled ? 'ON' : 'OFF'}
                          </span>
                        </td>
                        <td className="py-3 text-right space-x-2">
                          <button
                            onClick={() => handleAdminAction('claim_for_user', u.id)}
                            className="bg-neutral-800 hover:bg-neutral-700 text-yellow-400 px-2.5 py-1 rounded font-medium transition text-[11px]"
                            title="Force Claim for this user"
                          >
                            Claim
                          </button>
                          {u.username !== currentUser.username && (
                            <button
                              onClick={() => handleAdminAction('delete_user', u.id)}
                              className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 px-2.5 py-1 rounded font-medium transition text-[11px] border border-rose-500/20"
                              title="Delete user"
                            >
                              Delete
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Claim History Table */}
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
          <h3 className="font-bold text-lg flex items-center gap-2 mb-4">
            <History className="h-5 w-5 text-neutral-400" />
            Claim History
          </h3>
          {history.length === 0 ? (
            <p className="text-neutral-500 text-xs py-4 text-center">No rewards claimed yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-neutral-800 text-neutral-400">
                    <th className="pb-3 font-semibold">Reward</th>
                    <th className="pb-3 font-semibold">Time (MYT)</th>
                    <th className="pb-3 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/50">
                  {history.map((h) => (
                    <tr key={h.id} className="text-neutral-300">
                      <td className="py-3 font-medium text-white">{h.reward_name}</td>
                      <td className="py-3 text-neutral-400">
                        {new Date(h.claimed_at).toLocaleString('en-MY', {
                          timeZone: 'Asia/Kuala_Lumpur',
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </td>
                      <td className="py-3">
                        <span className="bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded font-semibold border border-emerald-500/20">
                          {h.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-4 flex justify-between items-center text-xs text-neutral-500">
          <span>Resets daily at 4:00 PM Malaysia Time (08:00 UTC)</span>
          <button
            onClick={handleDeleteAccount}
            className="text-rose-400 hover:text-rose-300 flex items-center gap-1"
          >
            <Trash2 className="h-3.5 w-3.5" /> Delete Account
          </button>
        </div>
      </div>
    </main>
  );
}