const http = require('http');

const port = process.env.PORT || 3000;

function page() {
  return `<!DOCTYPE html>
<html lang="en"><head>
<meta charset="utf-8"/>
<meta content="width=device-width, initial-scale=1.0" name="viewport"/>
<script src="https://cdn.tailwindcss.com?plugins=forms,container-queries"></script>
<link href="https://fonts.googleapis.com/css2?family=Be+Vietnam+Pro:wght@400;500;700&display=swap" rel="stylesheet"/>
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap" rel="stylesheet"/>
<script>
 tailwind.config = {
   darkMode: 'class',
   theme: {
     extend: {
       colors: {
         primary: '#ffc2cc',
         'background-light': '#f8f5f6',
         'background-dark': '#230f12',
       },
       fontFamily: { display: ['Be Vietnam Pro'] },
       borderRadius: { DEFAULT: '0.5rem', lg: '1rem', xl: '1.5rem', full: '9999px' },
     },
   },
 };
</script>
<title>HeartLink Community Board</title>
</head>
<body class="bg-background-light font-display text-slate-900">
<div class="relative flex min-h-screen w-full flex-col overflow-x-hidden">
<header class="sticky top-0 z-50 flex items-center justify-between border-b border-primary/20 bg-background-light/80 backdrop-blur-md px-6 py-3 lg:px-10">
  <div class="flex items-center gap-8">
    <div class="flex items-center gap-3 text-primary">
      <div class="size-8 rounded-lg bg-primary flex items-center justify-center text-white">
        <span class="material-symbols-outlined">favorite</span>
      </div>
      <h2 class="text-slate-900 text-xl font-bold leading-tight tracking-tight">HeartLink</h2>
    </div>
    <nav class="hidden md:flex items-center gap-6">
      <a class="text-slate-600 text-sm font-medium hover:text-primary transition-colors" href="#">Discover</a>
      <a class="text-slate-600 text-sm font-medium hover:text-primary transition-colors" href="#">Messages</a>
      <a class="text-slate-600 text-sm font-medium hover:text-primary transition-colors" href="#">Matches</a>
    </nav>
  </div>
  <div class="flex flex-1 justify-end gap-4 items-center">
    <label class="hidden sm:flex flex-col min-w-40 max-w-64">
      <div class="flex w-full items-stretch rounded-xl bg-primary/10 h-10 border border-primary/20">
        <div class="text-primary flex items-center justify-center pl-4"><span class="material-symbols-outlined text-xl">search</span></div>
        <input class="w-full border-none bg-transparent focus:ring-0 text-sm placeholder:text-primary/60 px-3" placeholder="Search community..." value=""/>
      </div>
    </label>
    <div class="size-10 rounded-full border-2 border-primary bg-cover bg-center" style="background-image:url('https://images.unsplash.com/photo-1633332755192-727a05c4013d?q=80&w=200&auto=format&fit=crop')"></div>
  </div>
</header>

<main class="flex-1 flex justify-center py-6 px-4 lg:px-10">
  <div class="flex w-full max-w-[1280px] gap-8">
    <aside class="hidden lg:flex flex-col w-64 shrink-0 gap-6">
      <div class="flex flex-col gap-2">
        <p class="px-4 text-xs font-bold uppercase tracking-widest text-primary/70">Menu</p>
        <div class="flex flex-col gap-1">
          <a class="flex items-center gap-3 px-4 py-3 rounded-xl bg-primary/20 text-primary font-bold" href="#"><span class="material-symbols-outlined">home</span><span>Feed</span></a>
          <a class="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-primary/10 hover:text-primary transition-all" href="#"><span class="material-symbols-outlined">person</span><span>My Profile</span></a>
          <a class="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-primary/10 hover:text-primary transition-all" href="#"><span class="material-symbols-outlined">bookmark</span><span>Saved Posts</span></a>
          <a class="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-600 hover:bg-primary/10 hover:text-primary transition-all" href="#"><span class="material-symbols-outlined">group</span><span>Groups</span></a>
        </div>
      </div>
    </aside>

    <section class="flex-1 max-w-2xl flex flex-col gap-6">
      <div class="bg-white border border-primary/10 rounded-xl p-4 shadow-sm">
        <div class="flex gap-4">
          <div class="size-10 shrink-0 rounded-full bg-cover bg-center" style="background-image:url('https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=200&auto=format&fit=crop')"></div>
          <div class="flex-1 flex flex-col gap-3">
            <textarea class="w-full border-none bg-primary/5 rounded-xl p-3 text-sm focus:ring-1 focus:ring-primary/30 min-h-[100px] resize-none" placeholder="Share your dating journey, advice or thoughts..."></textarea>
            <div class="flex items-center justify-between pt-2 border-t border-primary/10">
              <div class="flex gap-2">
                <button class="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors"><span class="material-symbols-outlined">image</span></button>
                <button class="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors"><span class="material-symbols-outlined">mood</span></button>
                <button class="p-2 rounded-lg hover:bg-primary/10 text-primary transition-colors"><span class="material-symbols-outlined">location_on</span></button>
              </div>
              <button class="bg-primary hover:bg-primary/80 text-white font-bold py-2 px-6 rounded-lg text-sm transition-all shadow-md shadow-primary/20">Post</button>
            </div>
          </div>
        </div>
      </div>

      <article class="bg-white border border-primary/10 rounded-xl overflow-hidden shadow-sm">
        <div class="p-4 flex flex-col gap-4">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-3">
              <div class="size-10 rounded-full bg-cover bg-center" style="background-image:url('https://images.unsplash.com/photo-1438761681033-6461ffad8d80?q=80&w=200&auto=format&fit=crop')"></div>
              <div><h4 class="font-bold text-sm">Sarah Miller</h4><p class="text-xs text-slate-500">2 hours ago • New York</p></div>
            </div>
            <button class="text-slate-400 hover:text-primary"><span class="material-symbols-outlined">more_horiz</span></button>
          </div>
          <p class="text-sm leading-relaxed text-slate-700">Just had the best first date at this hidden rooftop cafe! ☕️</p>
          <div class="rounded-xl overflow-hidden bg-primary/5 aspect-video w-full">
            <div class="w-full h-full bg-cover bg-center" style="background-image:url('https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=1400&auto=format&fit=crop')"></div>
          </div>
          <div class="flex items-center justify-between pt-2 border-t border-primary/10">
            <div class="flex gap-6">
              <button class="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors"><span class="material-symbols-outlined text-lg">favorite</span><span class="text-xs font-medium">124</span></button>
              <button class="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors"><span class="material-symbols-outlined text-lg">chat_bubble</span><span class="text-xs font-medium">18</span></button>
              <button class="flex items-center gap-2 text-slate-500 hover:text-primary transition-colors"><span class="material-symbols-outlined text-lg">share</span><span class="text-xs font-medium">Share</span></button>
            </div>
            <button class="text-slate-400 hover:text-primary"><span class="material-symbols-outlined">bookmark</span></button>
          </div>
        </div>
      </article>
    </section>

    <aside class="hidden xl:flex flex-col w-72 shrink-0 gap-6">
      <div class="bg-white border border-primary/10 rounded-xl p-5 shadow-sm">
        <h3 class="font-bold text-lg mb-4 flex items-center gap-2"><span class="material-symbols-outlined text-primary">trending_up</span>Trending Topics</h3>
        <div class="flex flex-col gap-4 text-sm">
          <div><a class="font-bold hover:text-primary" href="#">#FirstDateTips</a><p class="text-xs text-slate-500">2.4k posts this week</p></div>
          <div><a class="font-bold hover:text-primary" href="#">#ValentineIdeas</a><p class="text-xs text-slate-500">1.8k posts this week</p></div>
        </div>
      </div>
    </aside>
  </div>
</main>

<nav class="lg:hidden sticky bottom-0 z-50 flex items-center justify-around bg-white border-t border-primary/10 py-3 px-6">
  <button class="text-primary"><span class="material-symbols-outlined">home</span></button>
  <button class="text-slate-400"><span class="material-symbols-outlined">explore</span></button>
  <button class="bg-primary text-white size-10 rounded-full flex items-center justify-center -mt-8 shadow-lg shadow-primary/40"><span class="material-symbols-outlined">add</span></button>
  <button class="text-slate-400"><span class="material-symbols-outlined">notifications</span></button>
  <button class="text-slate-400"><span class="material-symbols-outlined">person</span></button>
</nav>
</div>
</body></html>`;
}

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ status: 'healthy', service: 'sodeclick-v2' }));
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(page());
});

server.listen(port, () => {
  console.log(`SodeClick V2 listening on ${port}`);
});
