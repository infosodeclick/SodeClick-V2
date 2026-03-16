"use client";
// @ts-nocheck

import React, { useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Heart,
  MessageCircle,
  Search,
  Shield,
  Crown,
  Gift,
  Bell,
  User,
  Settings,
  CreditCard,
  Wallet,
  FileText,
  Home,
  Users,
  Flag,
  Lock,
  CheckCircle2,
  Image as ImageIcon,
  Filter,
  Star,
  Sparkles,
  ThumbsUp,
  Send,
  Eye,
  MapPin,
  Calendar,
  BadgeCheck,
  Phone,
  Mail,
  MoreHorizontal,
  ShoppingBag,
  Coins,
  Check,
  Palette,
  X,
  Clock3,
  Bookmark,
  SlidersHorizontal,
  UserRound,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";

const usersSeed = [
  {
    id: 1,
    name: "Mina",
    age: 26,
    city: "Bangkok",
    goal: "หาแฟนจริงจัง",
    interests: ["คาเฟ่", "ท่องเที่ยว", "ถ่ายรูป"],
    bio: "ชอบคาเฟ่ ชอบทะเล และอยากเจอคนคุยที่จริงใจ",
    verified: true,
    vip: true,
    online: true,
    match: 94,
  },
  {
    id: 2,
    name: "James",
    age: 29,
    city: "Chiang Mai",
    goal: "หาเพื่อนคุย",
    interests: ["วิ่ง", "ถ่ายรูป", "เที่ยวภูเขา"],
    bio: "สายท่องเที่ยว ทำงานสายครีเอทีฟ ชอบคุยสบายๆ",
    verified: true,
    vip: false,
    online: false,
    match: 88,
  },
  {
    id: 3,
    name: "Praew",
    age: 24,
    city: "Khon Kaen",
    goal: "หาคนทำกิจกรรมร่วมกัน",
    interests: ["ดูหนัง", "เล่นเกม", "แมว"],
    bio: "ชอบหนัง เกม และคุยเรื่องไลฟ์สไตล์",
    verified: true,
    vip: false,
    online: true,
    match: 90,
  },
  {
    id: 4,
    name: "Ton",
    age: 31,
    city: "Pattaya",
    goal: "หาแฟนจริงจัง",
    interests: ["ฟิตเนส", "กาแฟ", "ธุรกิจ"],
    bio: "ทำงานสายธุรกิจ ตื่นเช้า เข้ายิม และชอบร้านกาแฟดีๆ",
    verified: false,
    vip: true,
    online: true,
    match: 84,
  },
  {
    id: 5,
    name: "Nook",
    age: 27,
    city: "Bangkok",
    goal: "หาเพื่อนคุย",
    interests: ["อาหาร", "คอนเสิร์ต", "ซีรีส์"],
    bio: "ชอบคุยสบายๆ และชอบลองร้านใหม่ๆ",
    verified: true,
    vip: false,
    online: true,
    match: 86,
  },
  {
    id: 6,
    name: "Beam",
    age: 30,
    city: "Chiang Mai",
    goal: "หาแฟนจริงจัง",
    interests: ["กาแฟ", "ธรรมชาติ", "วิ่ง"],
    bio: "ชอบเช้าๆ อากาศดี และคนที่มีพลังบวก",
    verified: true,
    vip: true,
    online: false,
    match: 82,
  },
];

const postsSeed = [
  {
    id: 101,
    room: "ห้องคนโสดวัยทำงาน",
    title: "คนโสดแถวอโศก มีใครชอบไปคาเฟ่วันเสาร์บ้าง",
    author: "MildWork",
    comments: 24,
    views: 312,
    tags: ["คาเฟ่", "อโศก", "วัยทำงาน"],
    pinned: true,
    liked: false,
  },
  {
    id: 102,
    room: "ห้องหาเพื่อนเที่ยว",
    title: "หาเพื่อนเที่ยวหัวหิน 2 วัน 1 คืน ช่วงปลายเดือน",
    author: "SeaSmile",
    comments: 18,
    views: 210,
    tags: ["หัวหิน", "เที่ยวทะเล"],
    pinned: false,
    liked: false,
  },
  {
    id: 103,
    room: "ห้องพูดคุยความสัมพันธ์",
    title: "เริ่มทักคนที่เพิ่งแมตช์ยังไงไม่ให้ดูฝืน",
    author: "ChatBeginner",
    comments: 57,
    views: 801,
    tags: ["ทักแชท", "คำแนะนำ"],
    pinned: false,
    liked: false,
  },
];

const initialChats = [
  {
    id: 1,
    person: "Mina",
    unread: 2,
    online: true,
    messages: [
      { from: "them", text: "สวัสดี เราชอบโปรไฟล์เธอนะ 😊" },
      { from: "me", text: "ขอบคุณนะ เราก็ชอบแนวเที่ยวคาเฟ่เหมือนกัน" },
      { from: "them", text: "คืนนี้ว่างไหม ไปคาเฟ่กันได้ 😊" },
    ],
  },
  {
    id: 2,
    person: "Praew",
    unread: 0,
    online: true,
    messages: [
      { from: "them", text: "หนังเรื่องที่คุยไว้เข้าแล้วนะ" },
      { from: "me", text: "ไว้ไปดูด้วยกันได้" },
    ],
  },
  {
    id: 3,
    person: "James",
    unread: 1,
    online: false,
    messages: [{ from: "them", text: "ถ้ามาเชียงใหม่ เดี๋ยวพาไปถ่ายรูป" }],
  },
];

const gifts = [
  { name: "Rose", price: 10, icon: "🌹" },
  { name: "Chocolate", price: 20, icon: "🍫" },
  { name: "Coffee", price: 25, icon: "☕" },
  { name: "Diamond", price: 100, icon: "💎" },
];

const vipPlans = [
  {
    id: "free",
    name: "Free",
    price: 0,
    textPrice: "฿0",
    features: ["ดูโปรไฟล์", "กดถูกใจจำกัด", "แชทหลังแมตช์"],
  },
  {
    id: "vip",
    name: "VIP",
    price: 299,
    textPrice: "฿299",
    features: ["ดูว่าใครกดถูกใจ", "กดถูกใจไม่จำกัด", "Boost โปรไฟล์"],
    highlight: true,
  },
  {
    id: "vip-plus",
    name: "VIP Plus",
    price: 699,
    textPrice: "฿699",
    features: ["ฟีเจอร์ VIP ทั้งหมด", "Boost มากขึ้น", "ตราโปรไฟล์พรีเมียม"],
  },
];

const coinPackages = [
  { id: "c100", coin: 100, price: 99 },
  { id: "c500", coin: 500, price: 399 },
  { id: "c1500", coin: 1500, price: 999 },
];

const profileFrames = [
  {
    id: "frame-classic-gold",
    name: "Classic Gold",
    price: 60,
    preview: "bg-gradient-to-br from-amber-300 via-yellow-200 to-amber-500",
    ring: "ring-4 ring-yellow-400 shadow-[0_0_0_8px_rgba(250,204,21,0.22)]",
    badge: "ทอง",
  },
  {
    id: "frame-rose-love",
    name: "Rose Love",
    price: 75,
    preview: "bg-gradient-to-br from-pink-300 via-rose-200 to-fuchsia-400",
    ring: "ring-4 ring-pink-400 shadow-[0_0_0_8px_rgba(244,114,182,0.2)]",
    badge: "ชมพู",
  },
  {
    id: "frame-ocean-blue",
    name: "Ocean Blue",
    price: 80,
    preview: "bg-gradient-to-br from-sky-300 via-cyan-200 to-blue-500",
    ring: "ring-4 ring-sky-400 shadow-[0_0_0_8px_rgba(56,189,248,0.2)]",
    badge: "ฟ้า",
  },
  {
    id: "frame-neon-purple",
    name: "Neon Purple",
    price: 95,
    preview: "bg-gradient-to-br from-violet-300 via-fuchsia-200 to-purple-500",
    ring: "ring-4 ring-violet-400 shadow-[0_0_0_8px_rgba(167,139,250,0.24)]",
    badge: "ม่วง",
  },
  {
    id: "frame-forest-green",
    name: "Forest Green",
    price: 85,
    preview: "bg-gradient-to-br from-emerald-300 via-lime-200 to-green-500",
    ring: "ring-4 ring-emerald-400 shadow-[0_0_0_8px_rgba(52,211,153,0.22)]",
    badge: "เขียว",
  },
  {
    id: "frame-black-royal",
    name: "Black Royal",
    price: 120,
    preview: "bg-gradient-to-br from-slate-500 via-zinc-300 to-black",
    ring: "ring-4 ring-slate-700 shadow-[0_0_0_8px_rgba(15,23,42,0.22)]",
    badge: "ดำพรีเมียม",
  },
];

const menuItems = [
  { key: "home", label: "หน้าแรก", icon: Home },
  { key: "signup", label: "สมัครสมาชิก", icon: User },
  { key: "discover", label: "ค้นหา/แมตช์", icon: Search },
  { key: "profile", label: "โปรไฟล์", icon: UserRound },
  { key: "chat", label: "แชท", icon: MessageCircle },
  { key: "board", label: "เว็บบอร์ด", icon: FileText },
  { key: "wallet", label: "กระเป๋าเหรียญ", icon: Wallet },
  { key: "vip", label: "แพ็กเกจ VIP", icon: Crown },
  { key: "store", label: "ร้านค้า", icon: ShoppingBag },
  { key: "admin", label: "หลังบ้าน Admin", icon: Settings },
  { key: "safety", label: "ความปลอดภัย", icon: Shield },
];

const frameLookup = Object.fromEntries(profileFrames.map((f) => [f.id, f]));

function SectionTitle({ eyebrow, title, desc, action }) {
  return (
    <div className="mb-6 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div className="text-sm font-semibold text-pink-600">{eyebrow}</div>
        <h2 className="mt-1 text-2xl font-bold tracking-tight lg:text-3xl">{title}</h2>
        {desc ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{desc}</p> : null}
      </div>
      {action}
    </div>
  );
}

function ShellCard({ children, className = "" }) {
  return <Card className={`rounded-[28px] border-0 shadow-sm ${className}`}>{children}</Card>;
}

function StatsCard({ title, value, hint, icon: Icon }) {
  return (
    <ShellCard>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm text-slate-500">{title}</div>
            <div className="mt-1 text-3xl font-bold">{value}</div>
            <div className="mt-2 text-sm text-slate-500">{hint}</div>
          </div>
          <div className="rounded-2xl bg-slate-100 p-3">
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </ShellCard>
  );
}

function ProfileAvatar({ frameId, small = false }) {
  const frame = frameId ? frameLookup[frameId] : null;
  return (
    <div className={`relative ${small ? "h-14 w-14" : "h-28 w-28"}`}>
      <div
        className={`h-full w-full rounded-full bg-gradient-to-br from-pink-100 via-rose-50 to-purple-100 ${frame ? frame.ring : "ring-2 ring-white"} flex items-center justify-center`}
      >
        <Heart className={`${small ? "h-5 w-5" : "h-8 w-8"} text-pink-500`} />
      </div>
      {frame && !small ? (
        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-white px-3 py-1 text-[10px] font-bold shadow-sm">
          {frame.badge}
        </div>
      ) : null}
    </div>
  );
}

function UserCard({ user, onLike, onOpenChat, ownedFrames, activeFrame }) {
  const appliedFrame = user.id === 1 ? activeFrame : ownedFrames[0] ?? null;
  return (
    <ShellCard className="overflow-hidden">
      <div className="relative">
        <div className="h-56 bg-gradient-to-br from-pink-100 via-rose-50 to-purple-100" />
        <div className="absolute left-4 top-4">
          <ProfileAvatar frameId={appliedFrame} />
        </div>
        {user.online ? <div className="absolute right-4 top-4 rounded-full bg-emerald-500 px-3 py-1 text-xs font-semibold text-white">ออนไลน์</div> : null}
      </div>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-lg font-bold">
              {user.name}, {user.age}
              {user.verified && <BadgeCheck className="h-4 w-4 text-sky-500" />}
              {user.vip && <Crown className="h-4 w-4 text-amber-500" />}
            </div>
            <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
              <MapPin className="h-4 w-4" />
              {user.city}
            </div>
          </div>
          <div className="rounded-full bg-pink-50 px-3 py-1 text-xs font-semibold text-pink-700">{user.match}% Match</div>
        </div>
        <div className="mt-3 text-sm leading-6 text-slate-600">{user.bio}</div>
        <div className="mt-3 flex flex-wrap gap-2">
          {user.interests.map((tag) => (
            <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium">{tag}</span>
          ))}
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Button variant="outline" className="rounded-2xl" onClick={onOpenChat}>แชท</Button>
          <Button className="rounded-2xl" onClick={onLike}>กดถูกใจ</Button>
        </div>
      </CardContent>
    </ShellCard>
  );
}

export default function DatingPlatformProductionUI() {
  const [page, setPage] = useState("home");
  const [users, setUsers] = useState(usersSeed);
  const [posts, setPosts] = useState(postsSeed);
  const [chats, setChats] = useState(initialChats);
  const [selectedChatId, setSelectedChatId] = useState(1);
  const [newMessage, setNewMessage] = useState("");
  const [walletCoins, setWalletCoins] = useState(420);
  const [activePlan, setActivePlan] = useState("free");
  const [likedCount, setLikedCount] = useState(12);
  const [matches, setMatches] = useState(28);
  const [notifications, setNotifications] = useState(3);
  const [profileCompletion] = useState(84);
  const [discoverFilters, setDiscoverFilters] = useState({ city: "ทั้งหมด", goal: "ทั้งหมด", keyword: "" });
  const [ownedFrameIds, setOwnedFrameIds] = useState(["frame-classic-gold"]);
  const [activeFrameId, setActiveFrameId] = useState("frame-classic-gold");
  const [toast, setToast] = useState("");
  const [signupForm, setSignupForm] = useState({ username: "", email: "", phone: "", password: "", city: "Bangkok", goal: "หาแฟนจริงจัง" });
  const [draftPost, setDraftPost] = useState({ room: "ห้องคนโสดวัยทำงาน", title: "", content: "" });

  const ownedFrames = useMemo(() => profileFrames.filter((f) => ownedFrameIds.includes(f.id)), [ownedFrameIds]);
  const selectedChat = chats.find((c) => c.id === selectedChatId) || chats[0];

  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const cityOk = discoverFilters.city === "ทั้งหมด" || u.city === discoverFilters.city;
      const goalOk = discoverFilters.goal === "ทั้งหมด" || u.goal === discoverFilters.goal;
      const keyword = discoverFilters.keyword.trim().toLowerCase();
      const keywordOk = !keyword || [u.name, u.city, u.bio, ...u.interests].join(" ").toLowerCase().includes(keyword);
      return cityOk && goalOk && keywordOk;
    });
  }, [users, discoverFilters]);

  const showToast = (text) => {
    setToast(text);
    window.clearTimeout(window.__loveboardToastTimer);
    window.__loveboardToastTimer = window.setTimeout(() => setToast(""), 2200);
  };

  const likeUser = (userName) => {
    setLikedCount((v) => v + 1);
    setMatches((v) => v + 1);
    showToast(`คุณกดถูกใจ ${userName} แล้ว`);
  };

  const openChatWith = (userName) => {
    const existing = chats.find((c) => c.person === userName);
    if (existing) {
      setSelectedChatId(existing.id);
    } else {
      const newChat = { id: Date.now(), person: userName, unread: 0, online: true, messages: [{ from: "them", text: `สวัสดี เราเพิ่งเห็นโปรไฟล์คุณ` }] };
      setChats((prev) => [newChat, ...prev]);
      setSelectedChatId(newChat.id);
    }
    setPage("chat");
  };

  const sendMessage = () => {
    if (!newMessage.trim()) return;
    setChats((prev) => prev.map((chat) => chat.id === selectedChatId ? { ...chat, messages: [...chat.messages, { from: "me", text: newMessage }] } : chat));
    setNewMessage("");
    showToast("ส่งข้อความแล้ว");
  };

  const sendGift = (gift) => {
    if (walletCoins < gift.price) {
      showToast("เหรียญไม่พอสำหรับส่งของขวัญ");
      return;
    }
    setWalletCoins((v) => v - gift.price);
    setChats((prev) => prev.map((chat) => chat.id === selectedChatId ? { ...chat, messages: [...chat.messages, { from: "me", text: `ส่งของขวัญ ${gift.icon} ${gift.name}` }] } : chat));
    showToast(`ส่ง ${gift.name} แล้ว`);
  };

  const togglePostLike = (id) => {
    setPosts((prev) => prev.map((post) => post.id === id ? { ...post, liked: !post.liked } : post));
  };

  const createPost = () => {
    if (!draftPost.title.trim() || !draftPost.content.trim()) {
      showToast("กรอกหัวข้อและเนื้อหากระทู้ก่อน");
      return;
    }
    const newPost = {
      id: Date.now(),
      room: draftPost.room,
      title: draftPost.title,
      author: "You",
      comments: 0,
      views: 1,
      tags: ["ใหม่"],
      pinned: false,
      liked: false,
    };
    setPosts((prev) => [newPost, ...prev]);
    setDraftPost({ room: "ห้องคนโสดวัยทำงาน", title: "", content: "" });
    showToast("โพสต์กระทู้ใหม่แล้ว");
  };

  const buyCoinPackage = (pkg) => {
    setWalletCoins((v) => v + pkg.coin);
    showToast(`เติม ${pkg.coin} coins สำเร็จ`);
  };

  const buyVip = (plan) => {
    if (plan.id === "free") {
      setActivePlan("free");
      showToast("เปลี่ยนกลับเป็นแพ็กเกจ Free แล้ว");
      return;
    }
    setActivePlan(plan.id);
    showToast(`สมัคร ${plan.name} สำเร็จ`);
  };

  const buyFrame = (frame) => {
    if (ownedFrameIds.includes(frame.id)) {
      showToast("คุณซื้อกรอบนี้ไปแล้ว ซื้อซ้ำไม่ได้");
      return;
    }
    if (walletCoins < frame.price) {
      showToast("เหรียญไม่พอสำหรับซื้อกรอบรูป");
      return;
    }
    setWalletCoins((v) => v - frame.price);
    setOwnedFrameIds((prev) => [...prev, frame.id]);
    setActiveFrameId(frame.id);
    showToast(`ซื้อ ${frame.name} สำเร็จ และตั้งเป็นกรอบปัจจุบันแล้ว`);
  };

  const applyFrame = (frameId) => {
    if (!ownedFrameIds.includes(frameId)) {
      showToast("คุณยังไม่ได้ซื้อกรอบนี้");
      return;
    }
    setActiveFrameId(frameId);
    showToast("เปลี่ยนกรอบโปรไฟล์แล้ว");
  };

  const removeFrame = () => {
    setActiveFrameId("");
    showToast("ปิดการใช้กรอบโปรไฟล์แล้ว");
  };

  const signUp = () => {
    if (!signupForm.username || !signupForm.email || !signupForm.password) {
      showToast("กรอกข้อมูลสมัครสมาชิกให้ครบ");
      return;
    }
    showToast(`สมัครสมาชิกสำเร็จ: ${signupForm.username}`);
    setPage("profile");
  };

  const nav = (
    <div className="rounded-[26px] bg-white p-3 shadow-sm">
      <div className="flex items-center gap-3 overflow-x-auto px-1 py-1">
        <div className="mr-3 flex min-w-fit items-center gap-3 px-3 py-2">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pink-600 text-white shadow-sm">
            <Heart className="h-5 w-5" />
          </div>
          <div>
            <div className="font-bold">LoveBoard</div>
            <div className="text-xs text-slate-500">Production UI Prototype</div>
          </div>
        </div>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = page === item.key;
          return (
            <button
              key={item.key}
              onClick={() => setPage(item.key)}
              className={`flex min-w-fit items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium transition ${active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100"}`}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </button>
          );
        })}
        <div className="ml-auto flex min-w-fit items-center gap-3 px-2">
          <div className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-medium">{walletCoins} coins</div>
          <button className="relative rounded-2xl bg-slate-100 p-3">
            <Bell className="h-4 w-4" />
            {notifications > 0 ? <span className="absolute -right-1 -top-1 rounded-full bg-pink-600 px-1.5 py-0.5 text-[10px] font-bold text-white">{notifications}</span> : null}
          </button>
        </div>
      </div>
    </div>
  );

  const homePage = (
    <div className="space-y-8">
      <motion.section initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <ShellCard className="bg-gradient-to-br from-rose-50 via-white to-purple-50">
          <CardContent className="p-8 md:p-10">
            <div className="inline-flex rounded-full bg-pink-100 px-3 py-1 text-sm font-medium text-pink-700">Dating + Community + Coin + VIP + Profile Frame</div>
            <h1 className="mt-5 max-w-3xl text-4xl font-bold leading-tight md:text-6xl">Layout เว็บหาคู่ทั้งระบบ แบบ Production UI</h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600 md:text-lg">ต้นแบบนี้กดใช้งานได้ทุกเมนู มีระบบหน้าหลัก สมัครสมาชิก ค้นหา แมตช์ โปรไฟล์ แชท เว็บบอร์ด เหรียญ VIP ร้านค้ากรอบรูป และหลังบ้านในไฟล์เดียว</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button className="rounded-2xl px-6" onClick={() => setPage("signup")}>เริ่มสมัครสมาชิก</Button>
              <Button variant="outline" className="rounded-2xl px-6" onClick={() => setPage("store")}>ไปยังร้านค้า</Button>
            </div>
            <div className="mt-8 grid gap-4 md:grid-cols-4">
              <StatsCard title="สมาชิก" value="25K+" hint="ผู้ใช้งานทั้งหมด" icon={Users} />
              <StatsCard title="แมตช์" value={matches} hint="อัปเดตจากการกดถูกใจ" icon={Heart} />
              <StatsCard title="กดถูกใจ" value={likedCount} hint="ผลใช้งานต้นแบบ" icon={ThumbsUp} />
              <StatsCard title="แพ็กเกจ" value={activePlan.toUpperCase()} hint="สมาชิกปัจจุบัน" icon={Crown} />
            </div>
          </CardContent>
        </ShellCard>
        <div className="space-y-6">
          <ShellCard className="bg-slate-900 text-white">
            <CardContent className="p-6">
              <div className="text-sm text-slate-300">โปรไฟล์ของฉัน</div>
              <div className="mt-4 flex items-center gap-4">
                <ProfileAvatar frameId={activeFrameId} />
                <div>
                  <div className="text-2xl font-bold">Chanapon</div>
                  <div className="mt-1 text-sm text-slate-300">Bangkok • สถานะ {activePlan === "free" ? "Free" : activePlan === "vip" ? "VIP" : "VIP Plus"}</div>
                </div>
              </div>
              <div className="mt-5 text-sm text-slate-300">กรอบที่ใช้งานอยู่: {activeFrameId ? frameLookup[activeFrameId].name : "ไม่ใช้กรอบ"}</div>
              <Progress value={profileCompletion} className="mt-4" />
              <div className="mt-3 text-sm text-slate-300">Profile Completion {profileCompletion}%</div>
            </CardContent>
          </ShellCard>
          <ShellCard>
            <CardContent className="p-6">
              <div className="text-sm text-slate-500">ลัดไปเมนูสำคัญ</div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <Button variant="outline" className="rounded-2xl justify-start" onClick={() => setPage("discover")}><Search className="mr-2 h-4 w-4" /> ค้นหา</Button>
                <Button variant="outline" className="rounded-2xl justify-start" onClick={() => setPage("chat")}><MessageCircle className="mr-2 h-4 w-4" /> แชท</Button>
                <Button variant="outline" className="rounded-2xl justify-start" onClick={() => setPage("wallet")}><Wallet className="mr-2 h-4 w-4" /> เติมเหรียญ</Button>
                <Button variant="outline" className="rounded-2xl justify-start" onClick={() => setPage("profile")}><Palette className="mr-2 h-4 w-4" /> เปลี่ยนกรอบ</Button>
              </div>
            </CardContent>
          </ShellCard>
        </div>
      </motion.section>

      <section>
        <SectionTitle
          eyebrow="สมาชิกแนะนำ"
          title="แนะนำโปรไฟล์ที่ตรงใจ"
          desc="กดถูกใจหรือเปิดแชทกับคนที่สนใจได้จากหน้านี้ทันที"
          action={<Button variant="outline" className="rounded-2xl" onClick={() => setPage("discover")}>ดูทั้งหมด</Button>}
        />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {users.slice(0, 3).map((user) => (
            <UserCard
              key={user.id}
              user={user}
              onLike={() => likeUser(user.name)}
              onOpenChat={() => openChatWith(user.name)}
              ownedFrames={ownedFrameIds}
              activeFrame={activeFrameId}
            />
          ))}
        </div>
      </section>
    </div>
  );

  const signupPage = (
    <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
      <ShellCard>
        <CardContent className="p-8">
          <SectionTitle eyebrow="สมัครสมาชิก" title="เริ่มต้นใช้งานแบบง่าย" desc="ฟอร์มนี้ออกแบบให้เก็บข้อมูลสำคัญก่อน แล้วค่อยไปตั้งค่าโปรไฟล์เต็มภายหลัง" />
          <div className="space-y-3">
            {[
              "สมัครด้วยอีเมลหรือเบอร์โทร",
              "กำหนดชื่อผู้ใช้และรหัสผ่าน",
              "ตั้งค่าเมืองและเป้าหมายความสัมพันธ์",
              "เริ่มใช้งานฟีเจอร์ค้นหา แชท และเว็บบอร์ดได้ทันที",
            ].map((step, i) => (
              <div key={step} className="flex items-start gap-3 rounded-2xl bg-slate-50 p-4">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-pink-600 text-sm font-bold text-white">{i + 1}</div>
                <div className="text-sm leading-6 text-slate-700">{step}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </ShellCard>
      <ShellCard>
        <CardContent className="p-8">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-500">Create your account</div>
              <div className="text-2xl font-bold">สมัครสมาชิก LoveBoard</div>
            </div>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">ฟรี</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">ชื่อผู้ใช้</label>
              <Input className="rounded-2xl" value={signupForm.username} onChange={(e) => setSignupForm((s) => ({ ...s, username: e.target.value }))} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">อีเมล</label>
              <Input className="rounded-2xl" value={signupForm.email} onChange={(e) => setSignupForm((s) => ({ ...s, email: e.target.value }))} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">เบอร์โทรศัพท์</label>
              <Input className="rounded-2xl" value={signupForm.phone} onChange={(e) => setSignupForm((s) => ({ ...s, phone: e.target.value }))} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">รหัสผ่าน</label>
              <Input type="password" className="rounded-2xl" value={signupForm.password} onChange={(e) => setSignupForm((s) => ({ ...s, password: e.target.value }))} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">จังหวัด</label>
              <select className="w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm" value={signupForm.city} onChange={(e) => setSignupForm((s) => ({ ...s, city: e.target.value }))}>
                <option>Bangkok</option>
                <option>Chiang Mai</option>
                <option>Khon Kaen</option>
                <option>Pattaya</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">เป้าหมาย</label>
              <select className="w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm" value={signupForm.goal} onChange={(e) => setSignupForm((s) => ({ ...s, goal: e.target.value }))}>
                <option>หาแฟนจริงจัง</option>
                <option>หาเพื่อนคุย</option>
                <option>หาคนทำกิจกรรมร่วมกัน</option>
              </select>
            </div>
          </div>
          <div className="mt-4 rounded-3xl border border-dashed p-5 text-sm text-slate-500">
            <div className="flex items-center gap-2 font-medium text-slate-700"><ImageIcon className="h-4 w-4" /> อัปโหลดรูปโปรไฟล์</div>
            <div className="mt-2">ต้นแบบนี้แสดง UI พร้อมปุ่มใช้งาน ส่วนอัปโหลดไฟล์จริงยังไม่ได้เชื่อม backend</div>
          </div>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <Button className="rounded-2xl" onClick={signUp}>สมัครสมาชิกฟรี</Button>
            <Button variant="outline" className="rounded-2xl">สมัครด้วย Google</Button>
          </div>
        </CardContent>
      </ShellCard>
    </div>
  );

  const discoverPage = (
    <div className="grid gap-6 xl:grid-cols-[0.28fr_0.72fr]">
      <ShellCard className="h-fit">
        <CardContent className="p-6">
          <SectionTitle eyebrow="ค้นหา" title="กรองโปรไฟล์" desc="เลือกจังหวัด เป้าหมาย และคำค้นหา" />
          <div className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium">จังหวัด</label>
              <select className="w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm" value={discoverFilters.city} onChange={(e) => setDiscoverFilters((s) => ({ ...s, city: e.target.value }))}>
                <option>ทั้งหมด</option>
                <option>Bangkok</option>
                <option>Chiang Mai</option>
                <option>Khon Kaen</option>
                <option>Pattaya</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">เป้าหมาย</label>
              <select className="w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm" value={discoverFilters.goal} onChange={(e) => setDiscoverFilters((s) => ({ ...s, goal: e.target.value }))}>
                <option>ทั้งหมด</option>
                <option>หาแฟนจริงจัง</option>
                <option>หาเพื่อนคุย</option>
                <option>หาคนทำกิจกรรมร่วมกัน</option>
              </select>
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">คำค้นหา</label>
              <Input className="rounded-2xl" value={discoverFilters.keyword} onChange={(e) => setDiscoverFilters((s) => ({ ...s, keyword: e.target.value }))} placeholder="เช่น คาเฟ่ ท่องเที่ยว กรุงเทพ" />
            </div>
            <Button className="w-full rounded-2xl"><SlidersHorizontal className="mr-2 h-4 w-4" /> ใช้ตัวกรอง</Button>
          </div>
        </CardContent>
      </ShellCard>
      <div className="space-y-6">
        <SectionTitle eyebrow="Discover" title="ค้นหา / แมตช์ / กดถูกใจ" desc="กดถูกใจแล้วตัวเลขสถิติด้านบนจะเปลี่ยนทันที และสามารถเปิดแชทได้จริงในต้นแบบนี้" />
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filteredUsers.map((user) => (
            <UserCard key={user.id} user={user} onLike={() => likeUser(user.name)} onOpenChat={() => openChatWith(user.name)} ownedFrames={ownedFrameIds} activeFrame={activeFrameId} />
          ))}
        </div>
      </div>
    </div>
  );

  const profilePage = (
    <div className="grid gap-6 xl:grid-cols-[0.4fr_0.6fr]">
      <ShellCard className="overflow-hidden">
        <div className="h-56 bg-gradient-to-br from-pink-100 via-rose-50 to-purple-100" />
        <CardContent className="p-6">
          <div className="-mt-16 mb-4 flex justify-center">
            <ProfileAvatar frameId={activeFrameId} />
          </div>
          <div className="text-center">
            <div className="flex justify-center gap-2 text-2xl font-bold">Chanapon <BadgeCheck className="mt-1 h-5 w-5 text-sky-500" /> {activePlan !== "free" && <Crown className="mt-1 h-5 w-5 text-amber-500" />}</div>
            <div className="mt-2 text-sm text-slate-500">Bangkok • ผู้ใช้งานต้นแบบ</div>
            <div className="mt-3 text-sm text-slate-600">กรอบที่ใช้งานอยู่: {activeFrameId ? frameLookup[activeFrameId].name : "ไม่ใช้กรอบ"}</div>
          </div>
          <div className="mt-6 space-y-3 text-sm">
            <div className="rounded-2xl bg-slate-50 p-4">Profile Completion {profileCompletion}%</div>
            <div className="rounded-2xl bg-slate-50 p-4">Owned Frames {ownedFrameIds.length} แบบ</div>
            <div className="rounded-2xl bg-slate-50 p-4">VIP Status {activePlan === "free" ? "Free" : activePlan === "vip" ? "VIP" : "VIP Plus"}</div>
          </div>
        </CardContent>
      </ShellCard>
      <div className="space-y-6">
        <ShellCard>
          <CardHeader><CardTitle>แก้ไขโปรไฟล์</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div>
              <label className="mb-2 block text-sm font-medium">ชื่อที่แสดง</label>
              <Input className="rounded-2xl" defaultValue="Chanapon" />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">อาชีพ</label>
              <Input className="rounded-2xl" defaultValue="IT Manager" />
            </div>
            <div className="md:col-span-2">
              <label className="mb-2 block text-sm font-medium">แนะนำตัว</label>
              <Textarea className="min-h-[110px] rounded-2xl" defaultValue="ชอบคุยเรื่องไอที ธุรกิจ และไลฟ์สไตล์ที่เรียบง่าย" />
            </div>
            <div className="md:col-span-2">
              <Button className="rounded-2xl">บันทึกการเปลี่ยนแปลง</Button>
            </div>
          </CardContent>
        </ShellCard>

        <ShellCard>
          <CardHeader><CardTitle>กรอบรูปโปรไฟล์ที่ซื้อแล้ว</CardTitle></CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-wrap gap-3">
              <Button variant="outline" className="rounded-2xl" onClick={removeFrame}><X className="mr-2 h-4 w-4" /> ไม่ใช้กรอบ</Button>
            </div>
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {ownedFrames.map((frame) => (
                <div key={frame.id} className="rounded-3xl border p-4">
                  <div className={`mx-auto flex h-24 w-24 items-center justify-center rounded-full ${frame.preview} ${frame.ring}`}>
                    <Heart className="h-7 w-7 text-white" />
                  </div>
                  <div className="mt-3 text-center font-semibold">{frame.name}</div>
                  <div className="mt-1 text-center text-xs text-slate-500">ซื้อแล้ว</div>
                  <Button className="mt-4 w-full rounded-2xl" variant={activeFrameId === frame.id ? "default" : "outline"} onClick={() => applyFrame(frame.id)}>
                    {activeFrameId === frame.id ? "กำลังใช้งาน" : "ใช้กรอบนี้"}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </ShellCard>
      </div>
    </div>
  );

  const chatPage = (
    <div className="grid gap-6 xl:grid-cols-[0.32fr_0.68fr]">
      <ShellCard>
        <CardHeader><CardTitle>รายการแชท</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          {chats.map((chat) => (
            <button key={chat.id} onClick={() => setSelectedChatId(chat.id)} className={`w-full rounded-2xl p-4 text-left transition ${selectedChatId === chat.id ? "bg-slate-900 text-white" : "bg-slate-50 hover:bg-slate-100"}`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="font-semibold">{chat.person}</div>
                  <div className={`mt-1 text-sm ${selectedChatId === chat.id ? "text-slate-300" : "text-slate-500"}`}>ข้อความ {chat.messages.length} รายการ</div>
                </div>
                {chat.unread > 0 ? <div className="rounded-full bg-pink-600 px-2 py-1 text-xs font-bold text-white">{chat.unread}</div> : null}
              </div>
            </button>
          ))}
        </CardContent>
      </ShellCard>
      <ShellCard>
        <CardHeader>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle>ห้องแชทกับ {selectedChat.person}</CardTitle>
              <div className="mt-1 text-sm text-slate-500">ส่งข้อความและของขวัญได้ทันที</div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="rounded-2xl"><Flag className="mr-2 h-4 w-4" /> รายงาน</Button>
              <Button variant="outline" className="rounded-2xl" onClick={() => setPage("store")}><ShoppingBag className="mr-2 h-4 w-4" /> ร้านค้า</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 rounded-3xl bg-slate-50 p-5">
            {selectedChat.messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.from === "me" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[70%] rounded-2xl px-4 py-3 text-sm shadow-sm ${msg.from === "me" ? "bg-slate-900 text-white" : "bg-white"}`}>{msg.text}</div>
              </div>
            ))}
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_auto]">
            <div className="flex gap-3">
              <Input className="rounded-2xl" value={newMessage} onChange={(e) => setNewMessage(e.target.value)} placeholder="พิมพ์ข้อความ..." />
              <Button variant="outline" className="rounded-2xl"><ImageIcon className="h-4 w-4" /></Button>
            </div>
            <Button className="rounded-2xl" onClick={sendMessage}><Send className="mr-2 h-4 w-4" /> ส่งข้อความ</Button>
          </div>
          <div className="mt-6">
            <div className="mb-3 text-sm font-semibold">ของขวัญในแชท</div>
            <div className="grid gap-3 md:grid-cols-4">
              {gifts.map((gift) => (
                <div key={gift.name} className="rounded-2xl border p-4 text-center">
                  <div className="text-3xl">{gift.icon}</div>
                  <div className="mt-2 font-semibold">{gift.name}</div>
                  <div className="text-sm text-slate-500">{gift.price} coins</div>
                  <Button size="sm" className="mt-3 w-full rounded-xl" onClick={() => sendGift(gift)}>ส่ง</Button>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </ShellCard>
    </div>
  );

  const boardPage = (
    <div className="grid gap-6 xl:grid-cols-[0.34fr_0.66fr]">
      <ShellCard className="h-fit">
        <CardHeader><CardTitle>ห้องเว็บบอร์ด</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          {[
            "ห้องคนโสดวัยทำงาน",
            "ห้องหาเพื่อนเที่ยว",
            "ห้องพูดคุยความสัมพันธ์",
            "ห้องกิจกรรมและอีเวนต์",
            "ห้องแนะนำตัว",
          ].map((room) => (
            <div key={room} className="rounded-2xl bg-slate-50 p-4 font-medium">{room}</div>
          ))}
        </CardContent>
      </ShellCard>
      <div className="space-y-6">
        <ShellCard>
          <CardHeader><CardTitle>ตั้งกระทู้ใหม่</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <Input className="rounded-2xl" placeholder="หัวข้อกระทู้" value={draftPost.title} onChange={(e) => setDraftPost((s) => ({ ...s, title: e.target.value }))} />
            <select className="w-full rounded-2xl border border-input bg-background px-3 py-2 text-sm" value={draftPost.room} onChange={(e) => setDraftPost((s) => ({ ...s, room: e.target.value }))}>
              <option>ห้องคนโสดวัยทำงาน</option>
              <option>ห้องหาเพื่อนเที่ยว</option>
              <option>ห้องพูดคุยความสัมพันธ์</option>
            </select>
            <Textarea className="min-h-[120px] rounded-2xl" placeholder="พิมพ์เนื้อหากระทู้" value={draftPost.content} onChange={(e) => setDraftPost((s) => ({ ...s, content: e.target.value }))} />
            <div className="flex gap-3">
              <Button className="rounded-2xl" onClick={createPost}>โพสต์กระทู้</Button>
              <Button variant="outline" className="rounded-2xl"><Bookmark className="mr-2 h-4 w-4" /> บันทึกร่าง</Button>
            </div>
          </CardContent>
        </ShellCard>
        <SectionTitle eyebrow="กระทู้ล่าสุด" title="เว็บบอร์ดชุมชน" desc="กดถูกใจและสร้างกระทู้ใหม่ได้จากหน้านี้" />
        <div className="space-y-4">
          {posts.map((post) => (
            <ShellCard key={post.id}>
              <CardContent className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="mb-2 flex flex-wrap gap-2">
                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{post.room}</span>
                      {post.pinned ? <span className="rounded-full bg-pink-100 px-3 py-1 text-xs font-semibold text-pink-700">ปักหมุด</span> : null}
                    </div>
                    <div className="text-xl font-bold">{post.title}</div>
                    <div className="mt-2 text-sm text-slate-500">โดย {post.author}</div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {post.tags.map((tag) => <span key={tag} className="rounded-full bg-slate-100 px-3 py-1 text-xs">#{tag}</span>)}
                    </div>
                  </div>
                  <div className="flex gap-4 text-sm text-slate-500">
                    <span className="flex items-center gap-1"><MessageCircle className="h-4 w-4" /> {post.comments}</span>
                    <span className="flex items-center gap-1"><Eye className="h-4 w-4" /> {post.views}</span>
                    <button><MoreHorizontal className="h-4 w-4" /></button>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Button variant="outline" className="rounded-2xl">อ่านกระทู้</Button>
                  <Button variant={post.liked ? "default" : "outline"} className="rounded-2xl" onClick={() => togglePostLike(post.id)}><ThumbsUp className="mr-2 h-4 w-4" /> {post.liked ? "เลิกถูกใจ" : "ถูกใจ"}</Button>
                  <Button variant="outline" className="rounded-2xl"><Flag className="mr-2 h-4 w-4" /> รายงาน</Button>
                </div>
              </CardContent>
            </ShellCard>
          ))}
        </div>
      </div>
    </div>
  );

  const walletPage = (
    <div className="grid gap-6 xl:grid-cols-[0.4fr_0.6fr]">
      <ShellCard className="bg-slate-900 text-white">
        <CardContent className="p-8">
          <div className="text-sm text-slate-300">กระเป๋าเหรียญ</div>
          <div className="mt-2 text-5xl font-bold">{walletCoins}</div>
          <div className="mt-2 text-sm text-slate-300">Coin Balance</div>
          <div className="mt-6 grid gap-3 md:grid-cols-2">
            <Button className="rounded-2xl bg-white text-slate-900 hover:bg-white" onClick={() => setPage("store")}>ไปยังร้านค้า</Button>
            <Button variant="outline" className="rounded-2xl border-white/20 bg-transparent text-white hover:bg-white/10" onClick={() => setPage("vip")}>ดู VIP</Button>
          </div>
        </CardContent>
      </ShellCard>
      <div className="space-y-6">
        <ShellCard>
          <CardHeader><CardTitle>แพ็กเกจเติมเหรียญ</CardTitle></CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            {coinPackages.map((pkg) => (
              <div key={pkg.id} className="rounded-3xl border p-5 text-center">
                <div className="text-2xl font-bold">{pkg.coin}</div>
                <div className="text-sm text-slate-500">coins</div>
                <div className="mt-3 text-xl font-semibold">฿{pkg.price}</div>
                <Button className="mt-4 w-full rounded-2xl" onClick={() => buyCoinPackage(pkg)}>ซื้อแพ็กเกจ</Button>
              </div>
            ))}
          </CardContent>
        </ShellCard>
        <ShellCard>
          <CardHeader><CardTitle>ประวัติการใช้งาน</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-2xl bg-slate-50 p-4">ซื้อแพ็กเกจ 500 coins +500</div>
            <div className="rounded-2xl bg-slate-50 p-4">ส่งของขวัญ Rose ให้ Mina -10</div>
            <div className="rounded-2xl bg-slate-50 p-4">ซื้อกรอบ Classic Gold -60</div>
            <div className="rounded-2xl bg-slate-50 p-4">สมัคร VIP Plus</div>
          </CardContent>
        </ShellCard>
      </div>
    </div>
  );

  const vipPage = (
    <div className="space-y-6">
      <SectionTitle eyebrow="VIP Membership" title="ระบบขายแพ็กเกจสมาชิก" desc="กดซื้อแพ็กเกจได้ และสถานะจะอัปเดตในหน้าแรกและหน้าโปรไฟล์ทันที" />
      <div className="grid gap-5 md:grid-cols-3">
        {vipPlans.map((plan) => (
          <ShellCard key={plan.id} className={plan.highlight ? "bg-slate-900 text-white" : ""}>
            <CardContent className="p-7">
              <div className="text-sm font-medium opacity-80">{plan.name}</div>
              <div className="mt-3 text-4xl font-bold">{plan.textPrice}<span className="text-base font-medium opacity-70"> / เดือน</span></div>
              <div className="mt-6 space-y-3 text-sm">
                {plan.features.map((item) => <div key={item} className={`rounded-2xl px-4 py-3 ${plan.highlight ? "bg-white/10" : "bg-slate-50"}`}>{item}</div>)}
              </div>
              <Button className="mt-6 w-full rounded-2xl" variant={activePlan === plan.id ? "secondary" : "default"} onClick={() => buyVip(plan)}>
                {activePlan === plan.id ? "แพ็กเกจปัจจุบัน" : "เลือกแพ็กเกจนี้"}
              </Button>
            </CardContent>
          </ShellCard>
        ))}
      </div>
    </div>
  );

  const storePage = (
    <div className="space-y-6">
      <SectionTitle
        eyebrow="ร้านค้า"
        title="สินค้า: กรอบรูปโปรไฟล์"
        desc="ซื้อได้หลายแบบ แต่ซื้อซ้ำไม่ได้ เมื่อซื้อแล้วจะไปแสดงในหน้าโปรไฟล์และสามารถสลับใช้งานได้อิสระ"
        action={<Button variant="outline" className="rounded-2xl" onClick={() => setPage("profile")}><Palette className="mr-2 h-4 w-4" /> ดูกรอบที่ซื้อแล้ว</Button>}
      />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {profileFrames.map((frame) => {
          const owned = ownedFrameIds.includes(frame.id);
          const active = activeFrameId === frame.id;
          return (
            <ShellCard key={frame.id}>
              <CardContent className="p-6">
                <div className={`mx-auto flex h-28 w-28 items-center justify-center rounded-full ${frame.preview} ${frame.ring}`}>
                  <Heart className="h-8 w-8 text-white" />
                </div>
                <div className="mt-4 flex items-center justify-between gap-2">
                  <div>
                    <div className="font-semibold">{frame.name}</div>
                    <div className="text-sm text-slate-500">{frame.badge}</div>
                  </div>
                  <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold">{frame.price} coins</div>
                </div>
                <div className="mt-4 space-y-3">
                  {!owned ? (
                    <Button className="w-full rounded-2xl" onClick={() => buyFrame(frame)}><ShoppingBag className="mr-2 h-4 w-4" /> ซื้อกรอบนี้</Button>
                  ) : (
                    <Button className="w-full rounded-2xl" variant={active ? "default" : "outline"} onClick={() => applyFrame(frame.id)}>
                      {active ? "กำลังใช้งาน" : "ใช้กรอบนี้"}
                    </Button>
                  )}
                  {owned ? <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">ซื้อแล้ว ซื้อซ้ำไม่ได้</div> : null}
                </div>
              </CardContent>
            </ShellCard>
          );
        })}
      </div>
    </div>
  );

  const adminPage = (
    <div className="space-y-6">
      <SectionTitle eyebrow="Admin Dashboard" title="หลังบ้านระบบ" desc="หน้าต้นแบบนี้ใช้ตรวจสถิติ รายงาน และการจัดการสินค้า/สมาชิก" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatsCard title="ผู้สมัครใหม่" value="124" hint="วันนี้" icon={User} />
        <StatsCard title="รายงานผู้ใช้" value="17" hint="รอพิจารณา" icon={Flag} />
        <StatsCard title="คำขอยืนยันตัวตน" value="31" hint="รอตรวจ" icon={BadgeCheck} />
        <StatsCard title="ยอดขายวันนี้" value="฿24,900" hint="VIP + Coin + Frame" icon={CreditCard} />
      </div>
      <div className="grid gap-6 xl:grid-cols-2">
        <ShellCard>
          <CardHeader><CardTitle>คิวงานผู้ดูแล</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-2xl bg-slate-50 p-4">ตรวจสอบรูปโปรไฟล์ที่ถูกรายงาน 8 รายการ</div>
            <div className="rounded-2xl bg-slate-50 p-4">อนุมัติ Selfie Verify 31 รายการ</div>
            <div className="rounded-2xl bg-slate-50 p-4">ตรวจคำร้องขอคืนเงิน 3 รายการ</div>
            <div className="rounded-2xl bg-slate-50 p-4">ลบสแปมกระทู้ 5 รายการ</div>
          </CardContent>
        </ShellCard>
        <ShellCard>
          <CardHeader><CardTitle>จัดการสินค้าในร้าน</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="rounded-2xl bg-slate-50 p-4">กรอบรูปทั้งหมด {profileFrames.length} แบบ</div>
            <div className="rounded-2xl bg-slate-50 p-4">สินค้าเปิดขาย 6 รายการ</div>
            <div className="rounded-2xl bg-slate-50 p-4">สินค้าแนะนำ Black Royal</div>
            <div className="rounded-2xl bg-slate-50 p-4">ระบบป้องกันซื้อซ้ำทำงานแล้ว</div>
          </CardContent>
        </ShellCard>
      </div>
    </div>
  );

  const safetyPage = (
    <div className="grid gap-6 xl:grid-cols-2">
      <ShellCard>
        <CardHeader><CardTitle>ระบบความปลอดภัย</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="rounded-2xl bg-slate-50 p-4">ยืนยันอีเมลและเบอร์โทรก่อนใช้งานบางฟีเจอร์</div>
          <div className="rounded-2xl bg-slate-50 p-4">Selfie Verify เพื่อลดบัญชีปลอม</div>
          <div className="rounded-2xl bg-slate-50 p-4">ระบบรายงานผู้ใช้ / บล็อก / ซ่อนแชท</div>
          <div className="rounded-2xl bg-slate-50 p-4">AI ตรวจจับข้อความสแปมและหลอกลวง</div>
          <div className="rounded-2xl bg-slate-50 p-4">Rate limit สำหรับการส่งข้อความและตั้งกระทู้</div>
          <div className="rounded-2xl bg-slate-50 p-4">ตรวจรูปภาพไม่เหมาะสมก่อนเผยแพร่</div>
        </CardContent>
      </ShellCard>
      <ShellCard>
        <CardHeader><CardTitle>Privacy Control</CardTitle></CardHeader>
        <CardContent className="space-y-4 text-sm">
          {["ซ่อนอายุจากสาธารณะ", "ให้ดูรูปเพิ่มเติมเฉพาะคนที่แมตช์แล้ว", "ปิดการแจ้งเตือนจากคนที่ยังไม่แมตช์", "กรองข้อความเสี่ยงหลอกลวงอัตโนมัติ"].map((item) => (
            <div key={item} className="flex items-center justify-between rounded-2xl bg-slate-50 p-4">
              <div className="flex items-center gap-2"><Shield className="h-4 w-4" /> {item}</div>
              <div className="h-6 w-11 rounded-full bg-slate-900" />
            </div>
          ))}
        </CardContent>
      </ShellCard>
    </div>
  );

  const pages = {
    home: homePage,
    signup: signupPage,
    discover: discoverPage,
    profile: profilePage,
    chat: chatPage,
    board: boardPage,
    wallet: walletPage,
    vip: vipPage,
    store: storePage,
    admin: adminPage,
    safety: safetyPage,
  };

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="mx-auto max-w-[1700px] p-4 md:p-6 xl:p-8">
        {nav}
        <div className="mt-6">{pages[page]}</div>
      </div>

      {toast ? (
        <div className="fixed bottom-5 right-5 z-50 rounded-2xl bg-slate-900 px-4 py-3 text-sm font-medium text-white shadow-xl">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
