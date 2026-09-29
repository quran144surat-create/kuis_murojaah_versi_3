// Naikkan angka versi bila file ini berubah. Halaman/skrip: cek internet dulu (selalu terbaru),
// gambar mushaf: pakai simpanan offline dulu (hemat kuota, cepat).
const V='shell-v5', IMG='mushaf-v1';
const SHELL=['./','index.html','config.js','mushaf.html','download-juz.html','manifest.webmanifest',
  'icon-192.png','icon-512.png','icon-maskable-512.png',
  ...Array.from({length:30},(_,i)=>`juz-${i+1}.html`)];

// Simpan tiap file sendiri-sendiri: satu file yang 404 tidak lagi menggagalkan seluruh instalasi.
self.addEventListener('install',e=>{
  e.waitUntil(caches.open(V).then(c=>Promise.all(SHELL.map(u=>c.add(u).catch(()=>{})))));
  self.skipWaiting();
});

// Hapus cache shell versi lama saja; cache gambar (mushaf-v1) tidak disentuh.
self.addEventListener('activate',e=>e.waitUntil(
  caches.keys()
    .then(ks=>Promise.all(ks.filter(k=>k.startsWith('shell-')&&k!==V).map(k=>caches.delete(k))))
    .then(()=>clients.claim())));

// Cadangan saat offline dan halaman yang diminta tidak ada di cache.
async function cadangan(r,u){
  const hit=await caches.match(r,{ignoreSearch:true});
  if(hit)return hit;
  if(r.mode!=='navigate')return Response.error();
  // juz-N.html tidak tersimpan -> arahkan ke mushaf.html dengan parameter yang sama
  if(/\/juz-\d+\.html$/i.test(u.pathname)&&await caches.match('mushaf.html'))
    return Response.redirect(new URL('mushaf.html'+u.search,self.registration.scope).href,302);
  // halaman lain (mis. start_url aplikasi) -> halaman kuis
  return (await caches.match('index.html'))||(await caches.match('./'))||Response.error();
}

self.addEventListener('fetch',e=>{
  const r=e.request,u=new URL(r.url);
  if(r.method!=='GET'||u.origin!==location.origin)return;
  if(/\.(jpe?g|png|webp)$/i.test(u.pathname)){
    e.respondWith(caches.match(r).then(hit=>hit||fetch(r)));
  }else{
    e.respondWith(fetch(r).then(res=>{
      if(res.ok&&!res.redirected){const cp=res.clone();caches.open(V).then(c=>c.put(r,cp))}
      return res;
    }).catch(()=>cadangan(r,u)));
  }
});
