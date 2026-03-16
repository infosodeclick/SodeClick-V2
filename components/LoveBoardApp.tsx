'use client';

import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Bell,
  Crown,
  Eye,
  FileText,
  Flag,
  Heart,
  Home,
  Image as ImageIcon,
  MapPin,
  MessageCircle,
  Palette,
  Search,
  Settings,
  Shield,
  ShoppingBag,
  SlidersHorizontal,
  ThumbsUp,
  User,
  Wallet,
  X,
} from 'lucide-react';
import { Button, Card, CardContent, CardHeader, CardTitle, Input, OutlineButton, Textarea } from './ui';

type UserType = {
  id: number;
  name: string;
  age: number;
  city: string;
  goal: string;
  interests: string[];
  bio: string;
  verified: boolean;
  vip: boolean;
  online: boolean;
  match: number;
};

type FrameType = {
  id: string;
  name: string;
  price: number;
  preview: string;
  ring: string;
  badge: string;
};

type ChatType = {
  id: number;
  person: string;
  unread: number;
  online: boolean;
  messages: { from: 'me' | 'them'; text: string }[];
};

const usersSeed: UserType[] = [
  { id: 1, name: 'Mina', age: 26, city: 'Bangkok', goal: 'หาแฟนจริงจัง', interests: ['คาเฟ่', 'ท่องเที่ยว', 'ถ่ายรูป'], bio: 'ชอบคาเฟ่ ชอบทะเล และอยากเจอคนคุยที่จริงใจ', verified: true, vip: true, online: true, match: 94 },
  { id: 2, name: 'James', age: 29, city: 'Chiang Mai', goal: 'หาเพื่อนคุย', interests: ['วิ่ง', 'ถ่ายรูป', 'เที่ยวภูเขา'], bio: 'สายท่องเที่ยว ทำงานสายครีเอทีฟ ชอบคุยสบายๆ', verified: true, vip: false, online: false, match: 88 },
  { id: 3, name: 'Praew', age: 24, city: 'Khon Kaen', goal: 'หาคนทำกิจกรรมร่วมกัน', interests: ['ดูหนัง', 'เล่นเกม', 'แมว'], bio: 'ชอบหนัง เกม และคุยเรื่องไลฟ์สไตล์', verified: true, vip: false, online: true, match: 90 },
  { id: 4, name: 'Ton', age: 31, city: 'Pattaya', goal: 'หาแฟนจริงจัง', interests: ['ฟิตเนส', 'กาแฟ', 'ธุรกิจ'], bio: 'ทำงานสายธุรกิจ ตื่นเช้า เข้ายิม และชอบร้านกาแฟดีๆ', verified: false, vip: true, online: true, match: 84 },
  { id: 5, name: 'Nook', age: 27, city: 'Bangkok', goal: 'หาเพื่อนคุย', interests: ['อาหาร', 'คอนเสิร์ต', 'ซีรีส์'], bio: 'ชอบคุยสบายๆ และชอบลองร้านใหม่ๆ', verified: true, vip: false, online: true, match: 86 },
  { id: 6, name: 'Beam', age: 30, city: 'Chiang Mai', goal: 'หาแฟนจริงจัง', interests: ['กาแฟ', 'ธรรมชาติ', 'วิ่ง'], bio: 'ชอบเช้าๆ อากาศดี และคนที่มีพลังบวก', verified: true, vip: true, online: false, match: 82 },
];

const initialPosts = [
  { id: 101, room: 'ห้องคนโสดวัยทำงาน', title: 'คนโสดแถวอโศก มีใครชอบไปคาเฟ่วันเสาร์บ้าง', author: 'MildWork', comments: 24, views: 312, tags: ['คาเฟ่', 'อโศก'], liked: false },
  { id: 102, room: 'ห้องหาเพื่อนเที่ยว', title: 'หาเพื่อนเที่ยวหัวหิน 2 วัน 1 คืน ช่วงปลายเดือน', author: 'SeaSmile', comments: 18, views: 210, tags: ['หัวหิน', 'เที่ยวทะเล'], liked: false },
  { id: 103, room: 'ห้องพูดคุยความสัมพันธ์', title: 'เริ่มทักคนที่เพิ่งแมตช์ยังไงไม่ให้ดูฝืน', author: 'ChatBeginner', comments: 57, views: 801, tags: ['ทักแชท', 'คำแนะนำ'], liked: false },
];

const initialChats: ChatType[] = [
  { id: 1, person: 'Mina', unread: 2, online: true, messages: [{ from: 'them', text: 'สวัสดี เราชอบโปรไฟล์เธอนะ 😊' }, { from: 'me', text: 'ขอบคุณนะ เราก็ชอบแนวเที่ยวคาเฟ่เหมือนกัน' }, { from: 'them', text: 'คืนนี้ว่างไหม ไปคาเฟ่กันได้ 😊' }] },
  { id: 2, person: 'Praew', unread: 0, online: true, messages: [{ from: 'them', text: 'หนังเรื่องที่คุยไว้เข้าแล้วนะ' }] },
  { id: 3, person: 'James', unread: 1, online: false, messages: [{ from: 'them', text: 'ถ้ามาเชียงใหม่ เดี๋ยวพาไปถ่ายรูป' }] },
];

const gifts = [
  { name: 'Rose', price: 10, icon: '🌹' },
  { name: 'Chocolate', price: 20, icon: '🍫' },
  { name: 'Coffee', price: 25, icon: '☕' },
  { name: 'Diamond', price: 100, icon: '💎' },
];

const frames: FrameType[] = [
  { id: 'frame-classic-gold', name: 'Classic Gold', price: 60, preview: 'from-amber-300 via-yellow-200 to-amber-500', ring: 'ring-yellow-400', badge: 'ทอง' },
  { id: 'frame-rose-love', name: 'Rose Love', price: 75, preview: 'from-pink-300 via-rose-200 to-fuchsia-400', ring: 'ring-pink-400', badge: 'ชมพู' },
  { id: 'frame-ocean-blue', name: 'Ocean Blue', price: 80, preview: 'from-sky-300 via-cyan-200 to-blue-500', ring: 'ring-sky-400', badge: 'ฟ้า' },
  { id: 'frame-neon-purple', name: 'Neon Purple', price: 95, preview: 'from-violet-300 via-fuchsia-200 to-purple-500', ring: 'ring-violet-400', badge: 'ม่วง' },
  { id: 'frame-forest-green', name: 'Forest Green', price: 85, preview: 'from-emerald-300 via-lime-200 to-green-500', ring: 'ring-emerald-400', badge: 'เขียว' },
  { id: 'frame-black-royal', name: 'Black Royal', price: 120, preview: 'from-slate-500 via-zinc-300 to-black', ring: 'ring-slate-700', badge: 'ดำพรีเมียม' },
];

const plans = [
  { id: 'free', name: 'Free', price: '฿0', features: ['ดูโปรไฟล์', 'กดถูกใจจำกัด', 'แชทหลังแมตช์'] },
  { id: 'vip', name: 'VIP', price: '฿299', features: ['ดูว่าใครกดถูกใจ', 'กดถูกใจไม่จำกัด', 'Boost โปรไฟล์'] },
  { id: 'vip-plus', name: 'VIP Plus', price: '฿699', features: ['ฟีเจอร์ VIP ทั้งหมด', 'Boost มากขึ้น', 'ตราโปรไฟล์พรีเมียม'] },
];

const frameLookup = Object.fromEntries(frames.map((f) => [f.id, f]));

function ProfileAvatar({ activeFrameId, small = false }: { activeFrameId?: string; small?: boolean }) {
  const frame = activeFrameId ? frameLookup[activeFrameId] : undefined;
  return (
    <div className={`relative ${small ? 'h-14 w-14' : 'h-28 w-28'}`}>
      <div className={`flex h-full w-full items-center justify-center rounded-full bg-gradient-to-br from-pink-100 via-rose-50 to-purple-100 ${frame ? `ring-4 ${frame.ring}` : 'ring-2 ring-white'}`}>
        <Heart className={`${small ? 'h-5 w-5' : 'h-8 w-8'} text-pink-500`} />
      </div>
      {frame && !small ? <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-white px-3 py-1 text-[10px] font-bold shadow-sm">{frame.badge}</div> : null}
    </div>
  );
}

function SectionTitle({ eyebrow, title, desc, action }: { eyebrow: string; title: string; desc?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div className="text-sm font-semibold text-pink-600">{eyebrow}</div>
        <h2 className="mt-1 text-2xl font-bold lg:text-3xl">{title}</h2>
        {desc ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{desc}</p> : null}
      </div>
      {action}
    </div>
  );
}

function UserCard({ user, activeFrameId, onLike, onChat }: { user: UserType; activeFrameId?: string; onLike: () => void; onChat: () => void }) {
  return (
    <Card className="overflow-hidden">
      <div className="relative h-56 bg-gradient-to-br from-pink-100 via-rose-50 to-purple-100">
        <div className="absolute left-4 top-4"><ProfileAvatar activeFrameId={activeFrameId} /></div>
        {user.online ? <div className="absolute right-4 top-4 rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white">ออนไลน์</div> : null}
      </div>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-bold">{user.name}, {user.age}</div>
            <div className="mt-1 flex items-center gap-2 text-sm text-slate-500"><MapPin className="h-4 w-4" />{user.city}</div>
          </div>
          <div className="rounded-full bg-pink-50 px-3 py-1 text-xs font-semibold text-pink-700">{user.match}% Match</div>
        </div>
        <div className="mt-3 text-sm leading-6 text-slate-600">{user.bio}</div>
        <div className="mt-3 flex flex-wrap gap-2">{user.interests.map((tag) => <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs">{tag}</span>)}</div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <OutlineButton onClick={onChat}>แชท</OutlineButton>
          <Button onClick={onLike}>กดถูกใจ</Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function LoveBoardApp() {
  const [page, setPage] = useState('home');
  const [walletCoins, setWalletCoins] = useState(420);
  const [activePlan, setActivePlan] = useState('free');
  const [ownedFrameIds, setOwnedFrameIds] = useState<string[]>(['frame-classic-gold']);
  const [activeFrameId, setActiveFrameId] = useState<string>('frame-classic-gold');
  const [users] = useState(usersSeed);
  const [posts, setPosts] = useState(initialPosts);
  const [chats, setChats] = useState(initialChats);
  const [selectedChatId, setSelectedChatId] = useState(1);
  const [message, setMessage] = useState('');
  const [toast, setToast] = useState('');
  const [discover, setDiscover] = useState({ city: 'ทั้งหมด', goal: 'ทั้งหมด', keyword: '' });
  const [signup, setSignup] = useState({ username: '', email: '', phone: '', password: '' });
  const [draftPost, setDraftPost] = useState({ room: 'ห้องคนโสดวัยทำงาน', title: '', content: '' });
  const [likedCount, setLikedCount] = useState(12);
  const [matches, setMatches] = useState(28);

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const cityOk = discover.city === 'ทั้งหมด' || u.city === discover.city;
      const goalOk = discover.goal === 'ทั้งหมด' || u.goal === discover.goal;
      const keyword = discover.keyword.trim().toLowerCase();
      const keywordOk = !keyword || [u.name, u.city, u.bio, ...u.interests].join(' ').toLowerCase().includes(keyword);
      return cityOk && goalOk && keywordOk;
    });
  }, [discover, users]);

  const selectedChat = chats.find((c) => c.id === selectedChatId) ?? chats[0];

  const notify = (text: string) => {
    setToast(text);
    setTimeout(() => setToast(''), 2000);
  };

  const likeUser = (name: string) => {
    setLikedCount((v) => v + 1);
    setMatches((v) => v + 1);
    notify(`คุณกดถูกใจ ${name} แล้ว`);
  };

  const openChat = (name: string) => {
    const existing = chats.find((c) => c.person === name);
    if (existing) {
      setSelectedChatId(existing.id);
    }
    setPage('chat');
  };

  const sendMessage = () => {
    if (!message.trim()) return;
    setChats((prev) => prev.map((chat) => (chat.id === selectedChatId ? { ...chat, messages: [...chat.messages, { from: 'me', text: message }] } : chat)));
    setMessage('');
    notify('ส่งข้อความแล้ว');
  };

  const sendGift = (gift: { name: string; price: number; icon: string }) => {
    if (walletCoins < gift.price) return notify('เหรียญไม่พอ');
    setWalletCoins((v) => v - gift.price);
    setChats((prev) => prev.map((chat) => (chat.id === selectedChatId ? { ...chat, messages: [...chat.messages, { from: 'me', text: `ส่งของขวัญ ${gift.icon} ${gift.name}` }] } : chat)));
    notify(`ส่ง ${gift.name} แล้ว`);
  };

  const buyCoins = (amount: number) => {
    setWalletCoins((v) => v + amount);
    notify(`เติม ${amount} coins สำเร็จ`);
  };

  const buyFrame = (frame: FrameType) => {
    if (ownedFrameIds.includes(frame.id)) return notify('ซื้อกรอบนี้ไปแล้ว ซื้อซ้ำไม่ได้');
    if (walletCoins < frame.price) return notify('เหรียญไม่พอสำหรับซื้อกรอบ');
    setWalletCoins((v) => v - frame.price);
    setOwnedFrameIds((prev) => [...prev, frame.id]);
    setActiveFrameId(frame.id);
    notify(`ซื้อ ${frame.name} สำเร็จ`);
  };

  const applyFrame = (frameId: string) => {
    if (!ownedFrameIds.includes(frameId)) return notify('คุณยังไม่ได้ซื้อกรอบนี้');
    setActiveFrameId(frameId);
    notify('เปลี่ยนกรอบโปรไฟล์แล้ว');
  };

  const removeFrame = () => {
    setActiveFrameId('');
    notify('ปิดการใช้กรอบโปรไฟล์แล้ว');
  };

  const createPost = () => {
    if (!draftPost.title.trim() || !draftPost.content.trim()) return notify('กรอกหัวข้อและเนื้อหาให้ครบ');
    setPosts((prev) => [{ id: Date.now(), room: draftPost.room, title: draftPost.title, author: 'You', comments: 0, views: 1, tags: ['ใหม่'], liked: false }, ...prev]);
    setDraftPost({ room: 'ห้องคนโสดวัยทำงาน', title: '', content: '' });
    notify('โพสต์กระทู้แล้ว');
  };

  const signUp = () => {
    if (!signup.username || !signup.email || !signup.password) return notify('กรอกข้อมูลสมัครสมาชิกให้ครบ');
    notify(`สมัครสมาชิกสำเร็จ: ${signup.username}`);
    setPage('profile');
  };

  const menus = [
    ['home', 'หน้าแรก', Home],
    ['signup', 'สมัครสมาชิก', User],
    ['discover', 'ค้นหา/แมตช์', Search],
    ['profile', 'โปรไฟล์', User],
    ['chat', 'แชท', MessageCircle],
    ['board', 'เว็บบอร์ด', FileText],
    ['wallet', 'กระเป๋าเหรียญ', Wallet],
    ['vip', 'แพ็กเกจ VIP', Crown],
    ['store', 'ร้านค้า', ShoppingBag],
    ['admin', 'หลังบ้าน Admin', Settings],
    ['safety', 'ความปลอดภัย', Shield],
  ] as const;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-[1700px] p-4 md:p-6 xl:p-8">
        <div className="rounded-[26px] bg-white p-3 shadow-sm">
          <div className="flex items-center gap-3 overflow-x-auto px-1 py-1">
            <div className="mr-3 flex min-w-fit items-center gap-3 px-3 py-2">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pink-600 text-white"><Heart className="h-5 w-5" /></div>
              <div>
                <div className="font-bold">LoveBoard</div>
                <div className="text-xs text-slate-500">GitHub Ready Frontend</div>
              </div>
            </div>
            {menus.map(([key, label, Icon]) => (
              <button key={key} onClick={() => setPage(key)} className={`flex min-w-fit items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition ${page === key ? 'bg-slate-900 text-white' : 'text-slate-600 hover:bg-slate-100'}`}>
                <Icon className="h-4 w-4" />{label}
              </button>
            ))}
            <div className="ml-auto flex min-w-fit items-center gap-3 px-2">
              <div className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-medium">{walletCoins} coins</div>
              <button className="relative rounded-2xl bg-slate-100 p-3"><Bell className="h-4 w-4" /><span className="absolute -right-1 -top-1 rounded-full bg-pink-600 px-1.5 py-0.5 text-[10px] font-bold text-white">3</span></button>
            </div>
          </div>
        </div>

        <div className="mt-6 space-y-6">
          {page === 'home' && (
            <>
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
                <Card className="bg-gradient-to-br from-rose-50 via-white to-purple-50">
                  <CardContent className="p-8 md:p-10">
                    <div className="inline-flex rounded-full bg-pink-100 px-3 py-1 text-sm font-medium text-pink-700">Dating + Community + Coin + VIP + Profile Frame</div>
                    <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-tight md:text-6xl">Layout เว็บหาคู่ทั้งระบบ แบบพร้อมขึ้น GitHub</h1>
                    <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">ต้นแบบนี้กดใช้งานได้ทุกเมนู มีระบบหน้าหลัก สมัครสมาชิก ค้นหา แมตช์ โปรไฟล์ แชท เว็บบอร์ด เหรียญ VIP ร้านค้ากรอบรูป และหลังบ้าน</p>
                    <div className="mt-8 flex flex-wrap gap-3">
                      <Button onClick={() => setPage('signup')}>เริ่มสมัครสมาชิก</Button>
                      <OutlineButton onClick={() => setPage('store')}>ไปยังร้านค้า</OutlineButton>
                    </div>
                    <div className="mt-8 grid gap-4 md:grid-cols-4">
                      <Card><CardContent className="p-5"><div className="text-sm text-slate-500">สมาชิก</div><div className="mt-1 text-3xl font-bold">25K+</div></CardContent></Card>
                      <Card><CardContent className="p-5"><div className="text-sm text-slate-500">แมตช์</div><div className="mt-1 text-3xl font-bold">{matches}</div></CardContent></Card>
                      <Card><CardContent className="p-5"><div className="text-sm text-slate-500">กดถูกใจ</div><div className="mt-1 text-3xl font-bold">{likedCount}</div></CardContent></Card>
                      <Card><CardContent className="p-5"><div className="text-sm text-slate-500">แพ็กเกจ</div><div className="mt-1 text-3xl font-bold">{activePlan.toUpperCase()}</div></CardContent></Card>
                    </div>
                  </CardContent>
                </Card>
                <div className="space-y-6">
                  <Card className="bg-slate-900 text-white"><CardContent className="p-6"><div className="text-sm text-slate-300">โปรไฟล์ของฉัน</div><div className="mt-4 flex items-center gap-4"><ProfileAvatar activeFrameId={activeFrameId} /><div><div className="text-2xl font-bold">Chanapon</div><div className="mt-1 text-sm text-slate-300">Bangkok • {activePlan}</div></div></div><div className="mt-5 text-sm text-slate-300">กรอบที่ใช้งานอยู่: {activeFrameId ? frameLookup[activeFrameId]?.name : 'ไม่ใช้กรอบ'}</div></CardContent></Card>
                  <Card><CardContent className="p-6"><div className="text-sm text-slate-500">ลัดไปเมนูสำคัญ</div><div className="mt-4 grid grid-cols-2 gap-3"><OutlineButton onClick={() => setPage('discover')}>ค้นหา</OutlineButton><OutlineButton onClick={() => setPage('chat')}>แชท</OutlineButton><OutlineButton onClick={() => setPage('wallet')}>เติมเหรียญ</OutlineButton><OutlineButton onClick={() => setPage('profile')}>เปลี่ยนกรอบ</OutlineButton></div></CardContent></Card>
                </div>
              </motion.div>
              <section>
                <SectionTitle eyebrow="สมาชิกแนะนำ" title="แนะนำโปรไฟล์ที่ตรงใจ" desc="กดถูกใจหรือเปิดแชทได้ทันที" />
                <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {users.slice(0, 3).map((user) => <UserCard key={user.id} user={user} activeFrameId={activeFrameId} onLike={() => likeUser(user.name)} onChat={() => openChat(user.name)} />)}
                </div>
              </section>
            </>
          )}

          {page === 'signup' && (
            <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
              <Card><CardContent className="p-8"><SectionTitle eyebrow="สมัครสมาชิก" title="เริ่มต้นใช้งานแบบง่าย" desc="ฟอร์มนี้ออกแบบให้เก็บข้อมูลสำคัญก่อน" /><div className="space-y-3">{['สมัครด้วยอีเมลหรือเบอร์โทร','กำหนดชื่อผู้ใช้และรหัสผ่าน','ตั้งค่าเมืองและเป้าหมายความสัมพันธ์','เริ่มใช้งานฟีเจอร์ได้ทันที'].map((step, i) => <div key={step} className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4"><div className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-600 text-sm font-bold text-white">{i + 1}</div><div className="text-sm leading-6 text-slate-700">{step}</div></div>)}</div></CardContent></Card>
              <Card><CardContent className="p-8"><div className="mb-6 text-2xl font-bold">สมัครสมาชิก LoveBoard</div><div className="grid gap-4 md:grid-cols-2"><Input placeholder="ชื่อผู้ใช้" value={signup.username} onChange={(e) => setSignup((s) => ({ ...s, username: e.target.value }))} /><Input placeholder="อีเมล" value={signup.email} onChange={(e) => setSignup((s) => ({ ...s, email: e.target.value }))} /><Input placeholder="เบอร์โทรศัพท์" value={signup.phone} onChange={(e) => setSignup((s) => ({ ...s, phone: e.target.value }))} /><Input type="password" placeholder="รหัสผ่าน" value={signup.password} onChange={(e) => setSignup((s) => ({ ...s, password: e.target.value }))} /></div><div className="mt-4 rounded-3xl border border-dashed p-5 text-sm text-slate-500"><div className="flex items-center gap-2 font-medium text-slate-700"><ImageIcon className="h-4 w-4" /> อัปโหลดรูปโปรไฟล์</div></div><div className="mt-6 grid gap-3 md:grid-cols-2"><Button onClick={signUp}>สมัครสมาชิกฟรี</Button><OutlineButton>สมัครด้วย Google</OutlineButton></div></CardContent></Card>
            </div>
          )}

          {page === 'discover' && (
            <div className="grid gap-6 xl:grid-cols-[0.28fr_0.72fr]">
              <Card><CardContent className="p-6"><SectionTitle eyebrow="ค้นหา" title="กรองโปรไฟล์" desc="เลือกจังหวัด เป้าหมาย และคำค้นหา" /><div className="space-y-4"><select className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm" value={discover.city} onChange={(e) => setDiscover((s) => ({ ...s, city: e.target.value }))}><option>ทั้งหมด</option><option>Bangkok</option><option>Chiang Mai</option><option>Khon Kaen</option><option>Pattaya</option></select><select className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm" value={discover.goal} onChange={(e) => setDiscover((s) => ({ ...s, goal: e.target.value }))}><option>ทั้งหมด</option><option>หาแฟนจริงจัง</option><option>หาเพื่อนคุย</option><option>หาคนทำกิจกรรมร่วมกัน</option></select><Input placeholder="เช่น คาเฟ่ ท่องเที่ยว กรุงเทพ" value={discover.keyword} onChange={(e) => setDiscover((s) => ({ ...s, keyword: e.target.value }))} /><Button className="w-full"><SlidersHorizontal className="mr-2 h-4 w-4" />ใช้ตัวกรอง</Button></div></CardContent></Card>
              <div className="space-y-6"><SectionTitle eyebrow="Discover" title="ค้นหา / แมตช์ / กดถูกใจ" desc="กดใช้งานได้จริงในต้นแบบนี้" /><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{filteredUsers.map((user) => <UserCard key={user.id} user={user} activeFrameId={activeFrameId} onLike={() => likeUser(user.name)} onChat={() => openChat(user.name)} />)}</div></div>
            </div>
          )}

          {page === 'profile' && (
            <div className="grid gap-6 xl:grid-cols-[0.4fr_0.6fr]">
              <Card className="overflow-hidden"><div className="h-56 bg-gradient-to-br from-pink-100 via-rose-50 to-purple-100" /><CardContent className="p-6"><div className="-mt-16 mb-4 flex justify-center"><ProfileAvatar activeFrameId={activeFrameId} /></div><div className="text-center"><div className="text-2xl font-bold">Chanapon</div><div className="mt-2 text-sm text-slate-500">Bangkok • ผู้ใช้งานต้นแบบ</div><div className="mt-3 text-sm text-slate-600">กรอบที่ใช้งานอยู่: {activeFrameId ? frameLookup[activeFrameId]?.name : 'ไม่ใช้กรอบ'}</div></div></CardContent></Card>
              <div className="space-y-6"><Card><CardHeader className="p-6 pb-0"><CardTitle>แก้ไขโปรไฟล์</CardTitle></CardHeader><CardContent className="grid gap-4 p-6 md:grid-cols-2"><Input defaultValue="Chanapon" placeholder="ชื่อที่แสดง" /><Input defaultValue="IT Manager" placeholder="อาชีพ" /><Textarea className="md:col-span-2 min-h-[110px]" defaultValue="ชอบคุยเรื่องไอที ธุรกิจ และไลฟ์สไตล์ที่เรียบง่าย" /><Button className="md:col-span-2">บันทึกการเปลี่ยนแปลง</Button></CardContent></Card><Card><CardHeader className="p-6 pb-0"><CardTitle>กรอบรูปที่ซื้อแล้ว</CardTitle></CardHeader><CardContent className="p-6"><div className="mb-4"><OutlineButton onClick={removeFrame}><X className="mr-2 h-4 w-4" />ไม่ใช้กรอบ</OutlineButton></div><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{frames.filter((f) => ownedFrameIds.includes(f.id)).map((frame) => <div key={frame.id} className="rounded-3xl border p-4"><div className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br ${frame.preview} ring-4 ${frame.ring}`}><Heart className="h-7 w-7 text-white" /></div><div className="mt-3 text-center font-semibold">{frame.name}</div><Button className="mt-4 w-full" onClick={() => applyFrame(frame.id)}>{activeFrameId === frame.id ? 'กำลังใช้งาน' : 'ใช้กรอบนี้'}</Button></div>)}</div></CardContent></Card></div>
            </div>
          )}

          {page === 'chat' && (
            <div className="grid gap-6 xl:grid-cols-[0.32fr_0.68fr]">
              <Card><CardHeader className="p-6 pb-0"><CardTitle>รายการแชท</CardTitle></CardHeader><CardContent className="space-y-3 p-6">{chats.map((chat) => <button key={chat.id} onClick={() => setSelectedChatId(chat.id)} className={`w-full rounded-2xl p-4 text-left ${selectedChatId === chat.id ? 'bg-slate-900 text-white' : 'bg-slate-50'}`}><div className="font-semibold">{chat.person}</div><div className="mt-1 text-sm opacity-80">ข้อความ {chat.messages.length} รายการ</div></button>)}</CardContent></Card>
              <Card><CardHeader className="p-6 pb-0"><CardTitle>ห้องแชทกับ {selectedChat.person}</CardTitle></CardHeader><CardContent className="p-6"><div className="space-y-4 rounded-3xl bg-slate-50 p-5">{selectedChat.messages.map((msg, idx) => <div key={idx} className={`flex ${msg.from === 'me' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm ${msg.from === 'me' ? 'bg-slate-900 text-white' : 'bg-white'}`}>{msg.text}</div></div>)}</div><div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto]"><div className="flex gap-3"><Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="พิมพ์ข้อความ..." /><OutlineButton><ImageIcon className="h-4 w-4" /></OutlineButton></div><Button onClick={sendMessage}>ส่งข้อความ</Button></div><div className="mt-6"><div className="mb-3 text-sm font-semibold">ของขวัญในแชท</div><div className="grid gap-3 md:grid-cols-4">{gifts.map((gift) => <div key={gift.name} className="rounded-2xl border p-4 text-center"><div className="text-3xl">{gift.icon}</div><div className="mt-2 font-semibold">{gift.name}</div><div className="text-sm text-slate-500">{gift.price} coins</div><Button className="mt-3 w-full" onClick={() => sendGift(gift)}>ส่ง</Button></div>)}</div></div></CardContent></Card>
            </div>
          )}

          {page === 'board' && (
            <div className="grid gap-6 xl:grid-cols-[0.34fr_0.66fr]">
              <Card><CardHeader className="p-6 pb-0"><CardTitle>ห้องเว็บบอร์ด</CardTitle></CardHeader><CardContent className="space-y-3 p-6">{['ห้องคนโสดวัยทำงาน', 'ห้องหาเพื่อนเที่ยว', 'ห้องพูดคุยความสัมพันธ์', 'ห้องกิจกรรมและอีเวนต์'].map((room) => <div key={room} className="rounded-2xl bg-slate-50 p-4 font-medium">{room}</div>)}</CardContent></Card>
              <div className="space-y-6"><Card><CardHeader className="p-6 pb-0"><CardTitle>ตั้งกระทู้ใหม่</CardTitle></CardHeader><CardContent className="space-y-4 p-6"><Input placeholder="หัวข้อกระทู้" value={draftPost.title} onChange={(e) => setDraftPost((s) => ({ ...s, title: e.target.value }))} /><select className="w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm" value={draftPost.room} onChange={(e) => setDraftPost((s) => ({ ...s, room: e.target.value }))}><option>ห้องคนโสดวัยทำงาน</option><option>ห้องหาเพื่อนเที่ยว</option><option>ห้องพูดคุยความสัมพันธ์</option></select><Textarea className="min-h-[120px]" placeholder="พิมพ์เนื้อหากระทู้" value={draftPost.content} onChange={(e) => setDraftPost((s) => ({ ...s, content: e.target.value }))} /><div className="flex gap-3"><Button onClick={createPost}>โพสต์กระทู้</Button><OutlineButton>บันทึกร่าง</OutlineButton></div></CardContent></Card><div className="space-y-4">{posts.map((post) => <Card key={post.id}><CardContent className="p-5"><div className="mb-2 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold inline-flex">{post.room}</div><div className="text-xl font-bold">{post.title}</div><div className="mt-2 text-sm text-slate-500">โดย {post.author} • {post.comments} คอมเมนต์ • {post.views} วิว</div><div className="mt-3 flex flex-wrap gap-2">{post.tags.map((tag) => <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs">#{tag}</span>)}</div><div className="mt-4 flex flex-wrap gap-3"><OutlineButton onClick={() => setPosts((prev) => prev.map((p) => p.id === post.id ? { ...p, liked: !p.liked } : p))}><ThumbsUp className="mr-2 h-4 w-4" />{post.liked ? 'เลิกถูกใจ' : 'ถูกใจ'}</OutlineButton><OutlineButton><Flag className="mr-2 h-4 w-4" />รายงาน</OutlineButton></div></CardContent></Card>)}</div></div>
            </div>
          )}

          {page === 'wallet' && (
            <div className="grid gap-6 xl:grid-cols-[0.4fr_0.6fr]">
              <Card className="bg-slate-900 text-white"><CardContent className="p-8"><div className="text-sm text-slate-300">กระเป๋าเหรียญ</div><div className="mt-2 text-5xl font-bold">{walletCoins}</div><div className="mt-2 text-sm text-slate-300">Coin Balance</div><div className="mt-6 grid gap-3 md:grid-cols-2"><Button className="bg-white text-slate-900 hover:bg-white" onClick={() => setPage('store')}>ไปยังร้านค้า</Button><OutlineButton onClick={() => setPage('vip')}>ดู VIP</OutlineButton></div></CardContent></Card>
              <div className="space-y-6"><Card><CardHeader className="p-6 pb-0"><CardTitle>แพ็กเกจเติมเหรียญ</CardTitle></CardHeader><CardContent className="grid gap-4 p-6 md:grid-cols-3">{[{ coin: 100, price: 99 }, { coin: 500, price: 399 }, { coin: 1500, price: 999 }].map((pkg) => <div key={pkg.coin} className="rounded-3xl border p-5 text-center"><div className="text-2xl font-bold">{pkg.coin}</div><div className="text-sm text-slate-500">coins</div><div className="mt-3 text-xl font-semibold">฿{pkg.price}</div><Button className="mt-4 w-full" onClick={() => buyCoins(pkg.coin)}>ซื้อแพ็กเกจ</Button></div>)}</CardContent></Card></div>
            </div>
          )}

          {page === 'vip' && (
            <div className="space-y-6"><SectionTitle eyebrow="VIP Membership" title="ระบบขายแพ็กเกจสมาชิก" desc="กดซื้อแพ็กเกจได้และสถานะจะอัปเดตทันที" /><div className="grid gap-5 md:grid-cols-3">{plans.map((plan) => <Card key={plan.id} className={plan.id === 'vip' ? 'bg-slate-900 text-white' : ''}><CardContent className="p-7"><div className="text-sm font-medium opacity-80">{plan.name}</div><div className="mt-3 text-4xl font-bold">{plan.price}</div><div className="mt-6 space-y-3 text-sm">{plan.features.map((item) => <div key={item} className={`rounded-2xl px-4 py-3 ${plan.id === 'vip' ? 'bg-white/10' : 'bg-slate-50 text-slate-700'}`}>{item}</div>)}</div><Button className="mt-6 w-full" onClick={() => { setActivePlan(plan.id); notify(`เลือกแพ็กเกจ ${plan.name} แล้ว`); }}>{activePlan === plan.id ? 'แพ็กเกจปัจจุบัน' : 'เลือกแพ็กเกจนี้'}</Button></CardContent></Card>)}</div></div>
          )}

          {page === 'store' && (
            <div className="space-y-6"><SectionTitle eyebrow="ร้านค้า" title="สินค้า: กรอบรูปโปรไฟล์" desc="ซื้อได้หลายแบบ ซื้อซ้ำไม่ได้ และสลับใช้งานในหน้าโปรไฟล์ได้" action={<OutlineButton onClick={() => setPage('profile')}><Palette className="mr-2 h-4 w-4" />ดูกรอบที่ซื้อแล้ว</OutlineButton>} /><div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">{frames.map((frame) => { const owned = ownedFrameIds.includes(frame.id); const active = activeFrameId === frame.id; return <Card key={frame.id}><CardContent className="p-6"><div className={`mx-auto flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br ${frame.preview} ring-4 ${frame.ring}`}><Heart className="h-8 w-8 text-white" /></div><div className="mt-4 flex items-center justify-between gap-2"><div><div className="font-semibold">{frame.name}</div><div className="text-sm text-slate-500">{frame.badge}</div></div><div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{frame.price} coins</div></div><div className="mt-4 space-y-3">{!owned ? <Button className="w-full" onClick={() => buyFrame(frame)}><ShoppingBag className="mr-2 h-4 w-4" />ซื้อกรอบนี้</Button> : <Button className="w-full" onClick={() => applyFrame(frame.id)}>{active ? 'กำลังใช้งาน' : 'ใช้กรอบนี้'}</Button>}{owned ? <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">ซื้อแล้ว ซื้อซ้ำไม่ได้</div> : null}</div></CardContent></Card>; })}</div></div>
          )}

          {page === 'admin' && (
            <div className="space-y-6"><SectionTitle eyebrow="Admin Dashboard" title="หลังบ้านระบบ" desc="หน้าต้นแบบสำหรับตรวจสถิติและจัดการสินค้า" /><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"><Card><CardContent className="p-5"><div className="text-sm text-slate-500">ผู้สมัครใหม่</div><div className="mt-1 text-3xl font-bold">124</div></CardContent></Card><Card><CardContent className="p-5"><div className="text-sm text-slate-500">รายงานผู้ใช้</div><div className="mt-1 text-3xl font-bold">17</div></CardContent></Card><Card><CardContent className="p-5"><div className="text-sm text-slate-500">คำขอยืนยันตัวตน</div><div className="mt-1 text-3xl font-bold">31</div></CardContent></Card><Card><CardContent className="p-5"><div className="text-sm text-slate-500">ยอดขายวันนี้</div><div className="mt-1 text-3xl font-bold">฿24,900</div></CardContent></Card></div></div>
          )}

          {page === 'safety' && (
            <div className="grid gap-6 xl:grid-cols-2"><Card><CardHeader className="p-6 pb-0"><CardTitle>ระบบความปลอดภัย</CardTitle></CardHeader><CardContent className="space-y-3 p-6">{['ยืนยันอีเมลและเบอร์โทร','Selfie Verify เพื่อลดบัญชีปลอม','ระบบรายงานผู้ใช้ / บล็อก / ซ่อนแชท','AI ตรวจจับข้อความสแปมและหลอกลวง'].map((item) => <div key={item} className="rounded-2xl bg-slate-50 p-4">{item}</div>)}</CardContent></Card><Card><CardHeader className="p-6 pb-0"><CardTitle>Privacy Control</CardTitle></CardHeader><CardContent className="space-y-4 p-6">{['ซ่อนอายุจากสาธารณะ','ดูรูปเพิ่มเติมเฉพาะคนที่แมตช์แล้ว','ปิดการแจ้งเตือนจากคนที่ยังไม่แมตช์','กรองข้อความเสี่ยงหลอกลวงอัตโนมัติ'].map((item) => <div key={item} className="flex items-center justify-between rounded-2xl bg-slate-50 p-4"><div className="flex items-center gap-2"><Shield className="h-4 w-4" /> {item}</div><div className="h-6 w-11 rounded-full bg-slate-900" /></div>)}</CardContent></Card></div>
          )}
        </div>
      </div>

      {toast ? <div className="fixed bottom-5 right-5 z-50 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-xl">{toast}</div> : null}
    </div>
  );
}
