/* Blindspot Circle — static client; persistence and access checks live in Supabase SQL. */
(() => {
'use strict';
const cfg=window.APP_CONFIG, app=document.querySelector('#app');
document.getElementById('siteTitle').textContent=cfg.title;
const configured=!cfg.supabaseUrl.startsWith('YOUR_')&&!cfg.supabaseAnonKey.startsWith('YOUR_');
const db=configured?window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseAnonKey,{auth:{detectSessionInUrl:true}}):null;
const names=cfg.members;
let mode='welcome',me='',idx=0,answers={},adminTab='overview',focusMember=names[0],filter='all',hostData={submitted:[],feedback:[]},hostPin='',working=false,message='',query='';
const $=id=>document.getElementById(id);
const esc=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const others=()=>names.filter(n=>n!==me);
const draftKey=()=>`blindspot_draft_v1_${me}`;
const blank=()=>({passCriticism:false,passPraise:false,criticisms:[''],praise:''});
const answer=n=>answers[n]??(answers[n]=blank());
const counts=(kind,exclude='')=>others().reduce((s,n)=>s+(n!==exclude&&!!answer(n)[kind]?1:0),0);
const button=(label,id,cls='')=>`<button class="btn ${cls}" id="${id}">${label}</button>`;
function showError(e){message=e?.message||String(e);render();}
function persist(){if(me&&mode!=='done')localStorage.setItem(draftKey(),JSON.stringify(answers));}
function takeDraft(){try{const a=JSON.parse(localStorage.getItem(draftKey())||'{}');answers={};others().forEach(n=>{const v=a[n];if(v&&Array.isArray(v.criticisms)) answers[n]={passCriticism:!!v.passCriticism,passPraise:!!v.passPraise,criticisms:v.criticisms.slice(0,3).map(String),praise:String(v.praise??'')};});}catch{answers={};}}
function alertBox(){return message?`<div class="error" role="alert">${esc(message)}</div>`:'';}
function render(){
 const warning=!configured?'<div class="note">尚未設定資料庫：請先編輯 config.js 並執行 schema.sql。這是可部署版本，不是離線儲存版。</div>':'';
 if(mode==='welcome'){
 app.innerHTML=`<section class="card medium center"><div class="hero">◐</div><h1>故事從你開始</h1><p class="muted">請選擇你的名字，接著依序對另外七位朋友留下匿名回饋。</p>${warning}${alertBox()}<div class="people">${names.map(n=>`<button class="person ${me===n?'active':''}" data-name="${esc(n)}">${esc(n)}</button>`).join('')}</div><p class="muted tiny">每人提出 1–3 個盲點與建議、1 個稱讚；兩種類型各可 Pass 最多三次。所有答案會在最後一次送出。</p>${button('開始填答','start')}</section>`;
 document.querySelectorAll('[data-name]').forEach(el=>el.onclick=()=>{me=el.dataset.name;render()});$('start').disabled=!me||!configured;$('start').onclick=start;
 } else if(mode==='form'){
 const n=others()[idx],a=answer(n),remainingC=3-counts('passCriticism',n),remainingP=3-counts('passPraise',n);
 app.innerHTML=`<section class="card medium"><div class="row between"><span class="muted tiny">填答者：${esc(me)}</span><span class="pill">${idx+1} / 7</span></div><div class="progress"><div style="width:${idx/7*100}%"></div></div><div class="panel center"><span class="muted tiny">這次回饋的對象</span><h1>${esc(n)}</h1></div>${alertBox()}<div class="row between"><h3>盲點與建議</h3><span class="counter">剩餘 Pass：${remainingC+(a.passCriticism?1:0)} / 3</span></div><p class="tiny muted">請具體描述你的觀察，並給出希望對方參考的建議。</p><label class="check"><input id="pc" type="checkbox" ${a.passCriticism?'checked':''} ${!a.passCriticism&&remainingC===0?'disabled':''}> 這個部分 Pass</label><div id="critFields" class="${a.passCriticism?'hidden':''}">${a.criticisms.map((v,i)=>`<label>第 ${i+1} 個盲點 ${i>0?`<button class="link" data-remove="${i}">移除</button>`:''}</label><textarea maxlength="2000" data-crit="${i}" placeholder="我觀察到……我想建議……">${esc(v)}</textarea>`).join('')}${a.criticisms.length<3?button('+ 新增建議','addCrit','secondary small'):''}</div><hr class="sep"><div class="row between"><h3>欣賞與稱讚</h3><span class="counter">剩餘 Pass：${remainingP+(a.passPraise?1:0)} / 3</span></div><label class="check"><input id="pp" type="checkbox" ${a.passPraise?'checked':''} ${!a.passPraise&&remainingP===0?'disabled':''}> 這個部分 Pass</label><div id="praiseFields" class="${a.passPraise?'hidden':''}"><textarea maxlength="2000" id="praise" placeholder="我欣賞你……因為……">${esc(a.praise)}</textarea></div><div class="actions">${idx>0?button('← 上一位','prev','secondary'):''}${button(idx===6?'查看提交總覽':'下一位 →','next')}</div><p class="muted tiny">草稿僅保留在目前裝置的瀏覽器中，尚未傳送給主持人。</p></section>`;
 $('pc').onchange=e=>{a.passCriticism=e.target.checked;persist();render()};$('pp').onchange=e=>{a.passPraise=e.target.checked;persist();render()};
 document.querySelectorAll('[data-crit]').forEach(e=>e.oninput=()=>{a.criticisms[+e.dataset.crit]=e.value;persist()});
 document.querySelectorAll('[data-remove]').forEach(e=>e.onclick=()=>{a.criticisms.splice(+e.dataset.remove,1);persist();render()});
 document.querySelectorAll('textarea').forEach(e=>e.oninput=e.oninput||(()=>{a.praise=e.value;persist()}));
 if($('addCrit'))$('addCrit').onclick=()=>{a.criticisms.push('');persist();render()};
 if($('prev'))$('prev').onclick=()=>{message='';idx--;render()};
 $('next').onclick=()=>{if(!validate(a)){return;}persist();message='';if(idx===6)mode='review';else idx++;render()};
 } else if(mode==='review'){
 const pc=counts('passCriticism'),pp=counts('passPraise');
 app.innerHTML=`<section class="card medium"><h1>確認你的回饋</h1><p class="muted">你已完成所有七位成員的填答。送出後將無法修改。</p>${alertBox()}<div class="grid"><div class="stat"><span class="muted tiny">盲點 Pass</span><strong>${pc} / 3</strong></div><div class="stat"><span class="muted tiny">稱讚 Pass</span><strong>${pp} / 3</strong></div></div>${others().map(n=>{const a=answer(n);return `<div class="listrow"><strong>${esc(n)}</strong><span class="muted tiny">建議 ${a.passCriticism?'Pass':a.criticisms.length+' 則'} · 稱讚 ${a.passPraise?'Pass':'已填'}</span></div>`}).join('')}<div class="note">提醒：因為沒有成員密碼，選擇姓名本身並不能驗證身分。每個姓名僅允許提交一次，請確認沒有選錯。</div><div class="actions">${button('← 返回修改','back','secondary')}${button(working?'提交中……':'確認，一次送出','submit')}</div></section>`;
 $('back').onclick=()=>{mode='form';idx=6;message='';render()};$('submit').disabled=working;$('submit').onclick=submit;
 } else if(mode==='done'){
 app.innerHTML=`<section class="card medium center"><div class="hero">✓</div><h1>你的回饋已送出</h1><p>感謝你真誠的分享。願我們在彼此的故事裡，看見更多可能。</p><p class="muted tiny">內容只會由主持人查看，不會顯示回饋者姓名。</p>${button('返回首頁','home','secondary')}</section>`;$('home').onclick=()=>{me='';mode='welcome';render()};
 } else if(mode==='adminLogin'){
 app.innerHTML=`<section class="card medium"><h1>主持人後台</h1><p class="muted">請輸入六位數主持人密碼。</p>${warning}${alertBox()}<label>六位數密碼</label><input type="password" id="pin" inputmode="numeric" autocomplete="off" maxlength="6" pattern="[0-9]{6}" placeholder="••••••">${button('進入後台','login')} ${button('返回','exit','secondary')}<p class="muted tiny">不需要 Email 帳號。密碼在資料庫端驗證，不會寫在網站前端程式裡。</p></section>`;
 $('login').onclick=login;$('pin').onkeydown=e=>{if(e.key==='Enter')login()};$('exit').onclick=()=>{mode='welcome';message='';render()};
 } else if(mode==='admin')renderAdmin();
}
function validate(a){if(!a.passCriticism&&(a.criticisms.length<1||a.criticisms.length>3||a.criticisms.some(x=>!x.trim()))){message='請填寫 1–3 個盲點建議，或選擇 Pass。';render();return false;}if(!a.passPraise&&!a.praise.trim()){message='請填寫稱讚，或選擇 Pass。';render();return false;}return true;}
async function start(){message='';try{const {data,error}=await db.rpc('is_submitted',{p_member:me});if(error)throw error;if(data){message='這個名字已經提交過了。如果不是你提交的，請聯絡主持人。';render();return;}takeDraft();idx=0;mode='form';render();}catch(e){showError(e)}}
async function submit(){if(working)return;working=true;render();try{const payload=others().map(n=>{const a=answer(n);return {target:n,passCriticism:a.passCriticism,passPraise:a.passPraise,criticisms:a.passCriticism?[]:a.criticisms.map(x=>x.trim()),praise:a.passPraise?'':a.praise.trim()}});const {error}=await db.rpc('submit_feedback',{p_member:me,p_answers:payload});if(error)throw error;localStorage.removeItem(draftKey());mode='done';message='';}catch(e){message='送出失敗：'+(e.message||String(e));}finally{working=false;render()}}
function renderAdmin(){const submitted=hostData.submitted||[],feed=hostData.feedback||[];let body='';
 if(adminTab==='overview')body=`<div class="grid"><div class="stat"><span class="muted tiny">已提交</span><strong>${submitted.length} / ${names.length}</strong></div><div class="stat"><span class="muted tiny">回饋總則數</span><strong>${feed.length}</strong></div></div><h3 style="margin-top:24px">填答進度</h3>${names.map(n=>`<div class="listrow"><strong>${esc(n)}</strong><span class="tiny ${submitted.includes(n)?'':'muted'}">${submitted.includes(n)?'✓ 已提交':'尚未提交'}</span></div>`).join('')}`;
 else if(adminTab==='feedback'){
 const entries=feed.filter(f=>f.target===focusMember&&(filter==='all'||filter===f.kind)&&f.content.includes(query));
 const c=feed.filter(f=>f.target===focusMember&&f.kind==='criticism').length,p=feed.filter(f=>f.target===focusMember&&f.kind==='praise').length;
 body=`<div class="filters"><select id="targetFilter">${names.map(n=>`<option ${n===focusMember?'selected':''}>${esc(n)}</option>`).join('')}</select><select id="typeFilter"><option value="all">全部類型</option><option value="criticism" ${filter==='criticism'?'selected':''}>盲點與建議</option><option value="praise" ${filter==='praise'?'selected':''}>欣賞與稱讚</option></select></div><div class="grid"><div class="stat"><span class="muted tiny">盲點</span><strong>${c}</strong></div><div class="stat"><span class="muted tiny">稱讚</span><strong>${p}</strong></div></div><label>搜尋回饋</label><input id="search" value="${esc(query)}" placeholder="輸入關鍵字"><div id="entryList">${entries.length?entries.map(f=>`<div class="entry"><small>${f.kind==='criticism'?'盲點與建議':'欣賞與稱讚'}</small>${esc(f.content)}</div>`).join(''):'<p class="muted center">沒有符合條件的回饋。</p>'}</div>${button('複製此人全部回饋','copyPerson','secondary')}`;
 } else body=`<h2>故事素材</h2><p class="muted">匯出以被評論者分類的匿名文字。沒有提供誰寫給誰的對應表。</p>${button('複製所有回饋','copyAll')}${button('下載 TXT','download','secondary')}<div class="panel tiny">故事改編時請避免保留容易辨認真實經歷的細節，也不要把 AI 虛構的內容表述成真實回饋。</div>`;
 app.innerHTML=`<section class="card wide"><div class="row between wrap"><div><h1>主持人控制台</h1><span class="muted tiny">僅授權主持人可讀取匿名回饋</span></div><div class="row">${button('更新資料','refresh','secondary small')}${button('登出','logout','secondary small')}</div></div>${alertBox()}<div class="tabs">${[['overview','總覽'],['feedback','匿名回饋'],['export','故事素材']].map(([id,title])=>`<button data-tab="${id}" class="${adminTab===id?'active':''}">${title}</button>`).join('')}</div>${body}</section>`;
 document.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{adminTab=b.dataset.tab;message='';render()});$('refresh').onclick=loadHost;$('logout').onclick=()=>{hostPin='';hostData={submitted:[],feedback:[]};mode='welcome';render()};
 if(adminTab==='feedback'){$('targetFilter').onchange=e=>{focusMember=e.target.value;query='';render()};$('typeFilter').onchange=e=>{filter=e.target.value;render()};$('search').oninput=e=>{query=e.target.value; const el=$('entryList');const rows=(hostData.feedback||[]).filter(f=>f.target===focusMember&&(filter==='all'||filter===f.kind)&&f.content.includes(query));el.innerHTML=rows.length?rows.map(f=>`<div class="entry"><small>${f.kind==='criticism'?'盲點與建議':'欣賞與稱讚'}</small>${esc(f.content)}</div>`).join(''):'<p class="muted center">沒有符合條件的回饋。</p>'};$('copyPerson').onclick=()=>copy(exportFor(focusMember));}
 if(adminTab==='export'){$('copyAll').onclick=()=>copy(names.map(exportFor).join('\n\n'));$('download').onclick=()=>{const blob=new Blob([names.map(exportFor).join('\n\n')],{type:'text/plain;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='盲點故事素材.txt';a.click();URL.revokeObjectURL(a.href);}};
}
function exportFor(name){const f=(hostData.feedback||[]).filter(x=>x.target===name);return `【${name}】\n盲點與建議：\n${f.filter(x=>x.kind==='criticism').map((x,i)=>`${i+1}. ${x.content}`).join('\n')||'（無）'}\n稱讚：\n${f.filter(x=>x.kind==='praise').map((x,i)=>`${i+1}. ${x.content}`).join('\n')||'（無）'}`}
async function copy(t){try{await navigator.clipboard.writeText(t);message='已複製到剪貼簿';}catch{message='無法複製，請使用下載功能。';}render()}
async function login(){const pin=$('pin').value.trim();if(!/^\d{6}$/.test(pin)){message='請輸入六位數字密碼';render();return;}hostPin=pin;await loadHost();}
async function loadHost(){try{if(!hostPin)throw new Error('請先輸入密碼');const {data,error}=await db.rpc('host_snapshot',{p_pin:hostPin});if(error)throw error;hostData=data;message='';mode='admin';render();}catch(e){hostPin='';message='密碼不正確或無法開啟後台。'+(e?.message||'');mode='adminLogin';render();}}
$('adminLink').onclick=()=>{message='';if(hostPin&&configured){loadHost();return;}mode='adminLogin';render();};
render();
})();
