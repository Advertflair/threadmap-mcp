/**
 * ThreadMap for Claude - Content Script v1.4
 * Fixes: timeline scroll-to, fork button on each message, context pasted into new chat
 */

const COLORS = {
  blue:   { hex: '#378ADD', range: [0,  15],  label: 'On track'          },
  green:  { hex: '#5a9e3a', range: [16, 35],  label: 'Productive expand' },
  yellow: { hex: '#EF9F27', range: [36, 55],  label: 'Adjacent drift'    },
  orange: { hex: '#E8711a', range: [56, 72],  label: 'Inflection point'  },
  red:    { hex: '#E24B4A', range: [73, 88],  label: 'Context break'     },
  purple: { hex: '#9B72CF', range: [89, 95],  label: 'Meta layer'        },
  white:  { hex: '#aaaaaa', range: [96, 100], label: 'Resolution'        },
};

const STOP_WORDS = new Set([
  'the','a','an','and','or','but','in','on','at','to','for','of','with',
  'is','are','was','were','be','been','have','has','had','do','does','did',
  'will','would','could','should','this','that','these','those','i','you',
  'we','they','it','he','she','what','how','why','when','where','can',
  'just','so','get','now','let','me','from','about','if','then','not',
  'my','your','our','its','also','some','more','all','any','than'
]);

let originKeywords = [];
let messages = [];
let panelOpen = false;
let lastUrl = location.href;
let lastMsgCount = 0;

function extractKeywords(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(w=>w.length>3&&!STOP_WORDS.has(w)).slice(0,25);
}

function calcDrift(originKws, currentKws) {
  if (!originKws.length||!currentKws.length) return 0;
  const a=new Set(originKws),b=new Set(currentKws);
  const intersection=[...a].filter(k=>b.has(k)).length;
  const union=new Set([...a,...b]).size;
  return Math.min(Math.round((1-intersection/union)*100),100);
}

function scoreToColor(score) {
  for (const [,cfg] of Object.entries(COLORS)) { if (score>=cfg.range[0]&&score<=cfg.range[1]) return cfg; }
  return COLORS.blue;
}

function isInflection(prevScore, currScore) {
  const keys=Object.keys(COLORS);
  const idx=s=>keys.findIndex(k=>{const r=COLORS[k].range;return s>=r[0]&&s<=r[1];});
  return Math.abs(idx(currScore)-idx(prevScore))>=2;
}

function buildForkPrompt(upToIndex) {
  const ctx=messages.slice(0,upToIndex+1);
  const origin=ctx[0]?.text||'';
  let prompt=`[ThreadMap Fork — resuming from message #${upToIndex+1}]\n\nOriginal intent: "${origin.slice(0,200)}"\n\nContext (${ctx.length} messages):\n\n`;
  ctx.forEach(m=>{ prompt+=`${m.isUser?'User':'Claude'}: ${m.text.slice(0,400)}${m.text.length>400?'...':''}\n\n`; });
  prompt+=`---\nPlease continue helping me, keeping the original intent in mind: "${origin.slice(0,150)}"`;
  return prompt;
}

function openForkChat(upToIndex, label) {
  const prompt=buildForkPrompt(upToIndex);
  localStorage.setItem('tm_fork_prompt',prompt);
  localStorage.setItem('tm_fork_label',label);
  localStorage.setItem('tm_fork_ts',Date.now().toString());
  navigator.clipboard.writeText(prompt).catch(()=>{});
  window.open('https://claude.ai/new','_blank');
  showForkToast();
}

function showForkToast() {
  document.getElementById('tm-fork-toast')?.remove();
  const toast=document.createElement('div');
  toast.id='tm-fork-toast';
  toast.style.cssText='position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#111;border:1px solid #378ADD;border-radius:10px;padding:12px 18px;font-family:-apple-system,sans-serif;font-size:13px;color:#ddd;z-index:999999;max-width:420px;box-shadow:0 4px 20px rgba(0,0,0,0.5);';
  toast.innerHTML=`<div style="display:flex;align-items:center;gap:10px;"><span style="font-size:16px">⑂</span><div><div style="font-weight:600;color:#fff">New chat opened</div><div style="color:#888;font-size:12px">Context auto-loaded in the new tab. Just hit Send.</div></div><button onclick="this.closest('#tm-fork-toast').remove()" style="background:none;border:none;color:#555;cursor:pointer;font-size:18px;margin-left:8px;">×</button></div>`;
  document.body.appendChild(toast);
  setTimeout(()=>toast?.remove(),5000);
}

function tryAutoPaste() {
  const stored=localStorage.getItem('tm_fork_prompt');
  const ts=parseInt(localStorage.getItem('tm_fork_ts')||'0');
  if (!stored||Date.now()-ts>30000) return;
  localStorage.removeItem('tm_fork_prompt');
  localStorage.removeItem('tm_fork_label');
  localStorage.removeItem('tm_fork_ts');
  const tryInsert=(attempts=0)=>{
    if (attempts>20) return;
    const input=document.querySelector('[contenteditable="true"][data-testid="chat-input"]')||document.querySelector('[contenteditable="true"].ProseMirror')||document.querySelector('[contenteditable="true"]')||document.querySelector('textarea');
    if (input) {
      input.focus();
      if (input.contentEditable==='true') { document.execCommand('selectAll'); document.execCommand('delete'); document.execCommand('insertText',false,stored); }
      else { input.value=stored; input.dispatchEvent(new Event('input',{bubbles:true})); }
      const note=document.createElement('div');
      note.style.cssText='position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#111;border:1px solid #5a9e3a;border-radius:8px;padding:10px 16px;font-family:-apple-system,sans-serif;font-size:13px;color:#ddd;z-index:999999;';
      note.textContent='✅ ThreadMap context loaded — review and send';
      document.body.appendChild(note);
      setTimeout(()=>note?.remove(),4000);
    } else { setTimeout(()=>tryInsert(attempts+1),400); }
  };
  setTimeout(()=>tryInsert(),1500);
}

function scrollToMessage(el) {
  if (!el) return;
  el.scrollIntoView({behavior:'smooth',block:'center'});
  const orig=el.style.transition;
  el.style.transition='background 0.3s';
  el.style.background='rgba(55,138,221,0.15)';
  setTimeout(()=>{ el.style.background=''; el.style.transition=orig; },1200);
}

function injectMessageForkButton(el, msg, index) {
  if (el.dataset.tmForkBtn==='true') return;
  el.dataset.tmForkBtn='true';
  const group=el.closest('[data-testid="conversation-turn"]')||el.closest('[class*="group"]')||el.parentElement?.parentElement;
  if (!group) return;
  const btn=document.createElement('button');
  btn.className='tm-msg-fork-btn';
  btn.title=`Fork conversation here (${msg.drift}% drift)`;
  btn.style.cssText=`display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:5px;border:none;background:transparent;cursor:pointer;font-size:12px;font-family:-apple-system,sans-serif;color:${msg.color.hex};opacity:0.7;transition:opacity .15s,background .15s;margin-left:4px;`;
  btn.innerHTML=`<span style="font-size:13px">⑂</span><span>${msg.drift}%</span>`;
  btn.addEventListener('mouseenter',()=>{btn.style.opacity='1';btn.style.background='rgba(255,255,255,0.08)';});
  btn.addEventListener('mouseleave',()=>{btn.style.opacity='0.7';btn.style.background='transparent';});
  btn.addEventListener('click',e=>{e.stopPropagation();openForkChat(index,msg.text.slice(0,40)+'...');});
  const actionBar=group.querySelector('[class*="mt-1"]')||group.querySelector('[class*="flex"][class*="gap"]')||group.querySelector('[class*="actions"]');
  if (actionBar) { actionBar.appendChild(btn); }
  else { const w=document.createElement('div');w.style.cssText='display:flex;justify-content:flex-end;padding:2px 0;';w.appendChild(btn);el.insertAdjacentElement('afterend',w); }
}

function fullRescan() {
  const allEls=[...document.querySelectorAll('[data-testid="user-message"],[data-testid="assistant-message"]')];
  if (!allEls.length) return;
  document.querySelectorAll('.tm-dot-wrap').forEach(d=>d.remove());
  messages=[];originKeywords=[];
  allEls.forEach((el,i)=>{
    const text=(el.textContent||'').trim().replace(/\s+/g,' ').slice(0,600);
    if (text.length<10) return;
    const isUser=el.getAttribute('data-testid')==='user-message';
    const keywords=extractKeywords(text);
    if (messages.length===0&&isUser) originKeywords=keywords;
    const drift=originKeywords.length?calcDrift(originKeywords,keywords):0;
    const color=scoreToColor(drift);
    const prevMsg=messages[messages.length-1];
    const inflect=prevMsg?isInflection(prevMsg.drift,drift):false;
    const msg={text,isUser,drift,color,inflection:inflect,el};
    messages.push(msg);
    injectDot(el,msg,i);
    injectMessageForkButton(el,msg,i);
  });
  lastMsgCount=allEls.length;
  updateBadge();
  if (panelOpen) rebuildTimeline();
}

function injectDot(el, msg, index) {
  let container=el.parentElement;
  for (let i=0;i<6;i++) { if (!container) break; if (['relative','absolute','fixed'].includes(window.getComputedStyle(container).position)) break; container=container.parentElement; }
  if (container&&window.getComputedStyle(container).position==='static') container.style.position='relative';
  const dotWrap=document.createElement('div');
  dotWrap.className='tm-dot-wrap';
  dotWrap.dataset.tmIndex=index;
  const side=msg.isUser?'left:-28px':'right:-28px';
  dotWrap.style.cssText=`position:absolute;${side};top:8px;display:flex;flex-direction:column;align-items:center;gap:2px;z-index:9997;cursor:pointer;`;
  const dot=document.createElement('div');
  dot.className='tm-dot'+(msg.inflection?' tm-inflection':'');
  dot.style.cssText=`width:14px;height:14px;border-radius:50%;background:${msg.color.hex};flex-shrink:0;transition:transform .15s;${msg.inflection?`box-shadow:0 0 0 3px ${msg.color.hex}44;`:''}`;
  const pct=document.createElement('div');
  pct.style.cssText=`font-size:9px;font-weight:600;color:${msg.color.hex};font-family:-apple-system,sans-serif;line-height:1;`;
  pct.textContent=msg.drift+'%';
  dot.addEventListener('mouseenter',e=>{dot.style.transform='scale(1.5)';showTooltip(e,msg);});
  dot.addEventListener('mouseleave',()=>{dot.style.transform='scale(1)';hideTooltip();});
  dotWrap.appendChild(dot);dotWrap.appendChild(pct);
  if (container&&container!==document.body) { container.appendChild(dotWrap); }
  else { dotWrap.style.cssText=`position:fixed;right:8px;top:${60+index*48}px;display:flex;flex-direction:column;align-items:center;gap:2px;z-index:9997;cursor:pointer;`; document.body.appendChild(dotWrap); }
}

function scrollToTopAndScan() {
  const badge=document.getElementById('tm-badge');
  if (badge){badge.textContent='⏳ Loading...';badge.style.background='#2a2a2a';badge.style.color='#888';}
  const scroller=document.querySelector('[class*="overflow-y-auto"]')||document.querySelector('main')||document.documentElement;
  scroller.scrollTo({top:0,behavior:'smooth'});
  setTimeout(()=>{ fullRescan(); setTimeout(()=>scroller.scrollTo({top:scroller.scrollHeight,behavior:'smooth'}),500); },1200);
}

function showTooltip(e,msg) {
  const tip=document.getElementById('tm-tooltip');if(!tip)return;
  tip.innerHTML=`<strong style="color:${msg.color.hex}">${msg.color.label}</strong><br><span style="color:#888">Drift: ${msg.drift}% from origin</span>${msg.inflection?'<br><span style="color:#E24B4A;font-size:11px">⚡ Inflection point</span>':''}`;
  tip.style.left=Math.min(e.clientX+16,window.innerWidth-240)+'px';tip.style.top=(e.clientY-10)+'px';tip.classList.add('visible');
}
function hideTooltip(){document.getElementById('tm-tooltip')?.classList.remove('visible');}

function updateBadge() {
  const badge=document.getElementById('tm-badge');if(!badge||!messages.length)return;
  const last=messages[messages.length-1];
  const emoji=last.drift>88?'⚪':last.drift>72?'🔴':last.drift>55?'🟠':last.drift>35?'🟡':last.drift>15?'🟢':'🔵';
  badge.textContent=`${emoji} ${last.drift}% · ${messages.length} msgs`;
  badge.style.background=last.drift>72?'#3a0f0f':last.drift>55?'#2e1f0a':last.drift>35?'#2a2000':'#0d1f33';
  badge.style.color=last.drift>72?'#f57c7c':last.drift>55?'#f5b942':last.drift>35?'#d4b84a':'#5ab4f5';
}

function rebuildTimeline() {
  const list=document.getElementById('tm-tl-list');const originEl=document.getElementById('tm-origin-text');if(!list)return;
  if (originEl&&messages.length) originEl.textContent=messages[0].text.slice(0,50)+'...';
  list.innerHTML='';
  messages.forEach((msg,i)=>{
    const row=document.createElement('div');row.className='tm-tl-row';
    row.addEventListener('click',()=>scrollToMessage(msg.el));row.title='Click to jump to this message';
    const dot=document.createElement('div');dot.className='tm-tl-dot';dot.style.background=msg.color.hex;
    const content=document.createElement('div');content.className='tm-tl-content';
    const num=document.createElement('div');num.className='tm-tl-num';num.textContent=`#${i+1} · ${msg.isUser?'You':'Claude'} · ${msg.drift}%`;
    const text=document.createElement('div');text.className='tm-tl-text';text.textContent=msg.text.slice(0,65)+(msg.text.length>65?'…':'');
    const forkBtn=document.createElement('button');forkBtn.className='tm-fork-btn';forkBtn.textContent='⑂ fork from here';forkBtn.style.display='block';
    forkBtn.addEventListener('click',e=>{e.stopPropagation();openForkChat(i,msg.text.slice(0,40)+'...');});
    content.appendChild(num);content.appendChild(text);content.appendChild(forkBtn);
    row.appendChild(dot);row.appendChild(content);list.appendChild(row);
  });
}

function togglePanel(){const panel=document.getElementById('tm-panel');if(!panel)return;panelOpen=!panelOpen;panel.classList.toggle('open',panelOpen);if(panelOpen)rebuildTimeline();}
function watchNewMessages(){const count=document.querySelectorAll('[data-testid="user-message"],[data-testid="assistant-message"]').length;if(count>lastMsgCount){lastMsgCount=count;fullRescan();}}

function init() {
  if (document.getElementById('tm-bar')) return;
  if (location.pathname==='/new') tryAutoPaste();

  const tooltip=document.createElement('div');tooltip.className='tm-tooltip';tooltip.id='tm-tooltip';document.body.appendChild(tooltip);

  const panel=document.createElement('div');panel.className='tm-panel';panel.id='tm-panel';
  panel.innerHTML=`<div class="tm-panel-header"><span class="tm-panel-title">🗺 Conversation Timeline</span><button class="tm-close" id="tm-close">×</button></div><div class="tm-origin" style="font-size:11px;padding:8px 14px;color:#555;border-bottom:1px solid #1e1e1e;">Origin: <span id="tm-origin-text" style="color:#777">—</span></div><div style="font-size:10px;color:#444;padding:6px 14px;font-family:-apple-system,sans-serif;">Click row to jump · ⑂ to fork</div><div class="tm-tl-list" id="tm-tl-list"></div>`;
  panel.querySelector('#tm-close').addEventListener('click',togglePanel);document.body.appendChild(panel);

  const bar=document.createElement('div');bar.className='tm-bar';bar.id='tm-bar';
  bar.innerHTML=`<div class="tm-status"><span style="font-size:14px">🗺</span><span style="color:#555;font-weight:500;font-family:-apple-system,sans-serif;font-size:13px">ThreadMap</span><span class="tm-badge" id="tm-badge">Scanning...</span></div><div class="tm-actions"><button class="tm-btn" id="tm-rescan-btn" title="Scroll to top and scan all messages">↺ rescan</button><button class="tm-btn" id="tm-timeline-btn">timeline</button><button class="tm-btn" id="tm-fork-btn">⑂ fork</button></div>`;
  bar.querySelector('#tm-rescan-btn').addEventListener('click',scrollToTopAndScan);
  bar.querySelector('#tm-timeline-btn').addEventListener('click',togglePanel);
  bar.querySelector('#tm-fork-btn').addEventListener('click',()=>{
    const inflections=messages.reduce((acc,m,i)=>m.inflection?[...acc,i]:acc,[]);
    const idx=inflections.length?inflections[inflections.length-1]:messages.length-1;
    openForkChat(idx,messages[idx]?.text.slice(0,40)+'...');
  });
  document.body.insertBefore(bar,document.body.firstChild);

  setTimeout(()=>{fullRescan();lastMsgCount=document.querySelectorAll('[data-testid="user-message"],[data-testid="assistant-message"]').length;},1500);
  setInterval(watchNewMessages,2000);

  const scroller=document.querySelector('[class*="overflow-y-auto"]')||document.querySelector('main')||window;
  let scrollTimer;
  scroller.addEventListener('scroll',()=>{clearTimeout(scrollTimer);scrollTimer=setTimeout(()=>{const c=document.querySelectorAll('[data-testid="user-message"],[data-testid="assistant-message"]').length;if(c!==lastMsgCount){lastMsgCount=c;fullRescan();}},400);});
}

new MutationObserver(()=>{
  if (location.href!==lastUrl){lastUrl=location.href;messages=[];originKeywords=[];lastMsgCount=0;document.querySelectorAll('.tm-dot-wrap,#tm-bar,#tm-panel,#tm-tooltip,#tm-fork-toast,.tm-msg-fork-btn').forEach(el=>el.remove());setTimeout(init,2000);}
}).observe(document,{subtree:true,childList:true});

if (location.pathname==='/new') setTimeout(tryAutoPaste,2000);
if (document.readyState==='loading'){document.addEventListener('DOMContentLoaded',()=>setTimeout(init,1500));}else{setTimeout(init,1500);}
