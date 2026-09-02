'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'

const GATEWAY = 'https://txknydpygsvwdhxoumcm.supabase.co/functions/v1/qr-gateway'
const PUBLIC_KEY = 'sb_publishable_Zsyau0ZEke4HzdXqpt1gww_aFuxn7ia'
const ADMIN_SESSION_KEY = 'eripek_gold_admin_session'

const SERVICE_STATUS: Record<string, string> = {
  received: 'Alındı', reviewing: 'İnceleniyor', scheduled: 'Planlandı', in_progress: 'İşlemde', completed: 'Tamamlandı', cancelled: 'İptal',
}
const PROJECT_STATUS: Record<string, string> = {
  new: 'Yeni', contacted: 'İletişime geçildi', survey_planned: 'Keşif planlandı', quoted: 'Teklif verildi', won: 'Kazanıldı', lost: 'Kaybedildi', cancelled: 'İptal',
}
const RECOVERY_STATUS: Record<string, string> = { pending:'Onay bekliyor', approved:'Onaylandı', rejected:'Reddedildi', completed:'Tamamlandı', cancelled:'İptal' }
const RECOVERY_ANSWER: Record<string, string> = { yes:'Evet', no:'Hayır', not_sure:'Emin değilim' }

type ServiceAttachment = { storage_path?:string; mime_type?:string; signed_url?:string; created_at?:string }
type ServiceItem = { ticket_no:string; status:string; issue_type:string; description?:string; created_at:string; customer_name:string; phone:string; block:string; floor:string; unit_no:string; attachments?:ServiceAttachment[] }
type ProjectItem = { request_no:string; status:string; request_type?:string; room?:string; design_name?:string; material_name?:string; notes?:string; quote_amount?:number|null; quote_currency?:string|null; quote_note?:string|null; quote_valid_until?:string|null; quoted_at?:string|null; created_at:string; customer_name:string; phone:string; block:string; floor:string; unit_no:string }
type RecoveryItem = { request_no:string; status:string; question_key?:string; answer:string; note?:string; created_at:string; customer_name:string; phone:string; email?:string; block:string; floor:string; unit_no:string }
type DashboardData = { service_requests: ServiceItem[]; project_requests: ProjectItem[]; recovery_requests: RecoveryItem[] }

async function gateway(body: Record<string, unknown>) {
  const res = await fetch(GATEWAY, { method:'POST', headers:{ 'Content-Type':'application/json', apikey:PUBLIC_KEY }, body:JSON.stringify(body), cache:'no-store' })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || 'request_failed')
  return data
}
function dateTR(v:string){return new Intl.DateTimeFormat('tr-TR',{day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).format(new Date(v))}

export default function AdminPage(){
  const [stage,setStage]=useState<'loading'|'login'|'dashboard'>('loading')
  const [session,setSession]=useState('')
  const [data,setData]=useState<DashboardData>({service_requests:[],project_requests:[],recovery_requests:[]})
  const [tab,setTab]=useState<'service'|'project'|'recovery'>('service')
  const [msg,setMsg]=useState('')

  async function load(token:string){
    const d=await gateway({action:'admin_dashboard',admin_session:token})
    setData({service_requests:d.service_requests||[],project_requests:d.project_requests||[],recovery_requests:d.recovery_requests||[]})
    setSession(token); setStage('dashboard')
  }
  useEffect(()=>{const saved=localStorage.getItem(ADMIN_SESSION_KEY); if(!saved){setStage('login');return} load(saved).catch(()=>{localStorage.removeItem(ADMIN_SESSION_KEY);setStage('login')})},[])
  function logout(){localStorage.removeItem(ADMIN_SESSION_KEY);setSession('');setStage('login')}

  if(stage==='loading') return <AdminShell><div className="adminCenter"><div className="eyebrow gold">MASTER PORCELENTA</div><h1>Yönetim alanı hazırlanıyor…</h1></div></AdminShell>
  if(stage==='login') return <AdminShell><AdminLogin onSuccess={async token=>{localStorage.setItem(ADMIN_SESSION_KEY,token);await load(token)}} /></AdminShell>

  const activeServices=data.service_requests.filter(x=>!['completed','cancelled'].includes(x.status)).length
  const openProjects=data.project_requests.filter(x=>!['won','lost','cancelled'].includes(x.status)).length
  const pendingRecoveries=data.recovery_requests.filter(x=>x.status==='pending').length
  return <AdminShell>
    <div className="adminHead"><div><div className="eyebrow gold">ERİPEK GOLD • YÖNETİM</div><h1>Müşteri Talepleri</h1><div className="small muted">Servis ve ek proje talepleri tek ekranda.</div></div><button className="adminLogout" onClick={logout}>Çıkış</button></div>
    <div className="adminStats"><div><span>{activeServices}</span><small>Açık servis</small></div><div><span>{openProjects}</span><small>Açık proje</small></div><div><span>{pendingRecoveries}</span><small>Kurtarma onayı</small></div><div><span>{data.service_requests.length+data.project_requests.length+data.recovery_requests.length}</span><small>Toplam kayıt</small></div></div>
    <div className="adminTabs"><button className={tab==='service'?'active':''} onClick={()=>setTab('service')}>Servis ({data.service_requests.length})</button><button className={tab==='project'?'active':''} onClick={()=>setTab('project')}>Proje / Keşif ({data.project_requests.length})</button><button className={tab==='recovery'?'active':''} onClick={()=>setTab('recovery')}>Hesap Kurtarma ({pendingRecoveries})</button></div>
    {msg&&<div className="successBox">{msg}</div>}
    {tab==='service' ? <AdminServices items={data.service_requests} session={session} onUpdated={()=>load(session)} setMsg={setMsg}/> : tab==='project' ? <AdminProjects items={data.project_requests} session={session} onUpdated={()=>load(session)} setMsg={setMsg}/> : <AdminRecoveries items={data.recovery_requests} session={session} onUpdated={()=>load(session)} setMsg={setMsg}/>} 
  </AdminShell>
}

function AdminLogin({onSuccess}:{onSuccess:(token:string)=>Promise<void>}){
  const [code,setCode]=useState('');const [busy,setBusy]=useState(false);const [msg,setMsg]=useState('')
  async function submit(e:FormEvent){e.preventDefault();setBusy(true);setMsg('');try{const d=await gateway({action:'admin_login',code});await onSuccess(d.admin_session)}catch{setMsg('Yönetici erişim kodu hatalı.')}finally{setBusy(false)}}
  return <form className="adminLogin" onSubmit={submit}><img className="adminBrandLogo" src="/master-porcelenta-logo.png" alt="Master Porcelenta" /><div className="eyebrow gold">ERİPEK GOLD • YÖNETİM</div><h1>Eripek Gold Yönetim</h1><p>Servis ve proje taleplerine erişmek için yönetici kodunu girin.</p><input className="input" type="password" autoComplete="current-password" value={code} onChange={e=>setCode(e.target.value)} placeholder="Yönetici erişim kodu" />{msg&&<div className="errorBox">{msg}</div>}<button className="btn dark" disabled={busy}>{busy?'Giriş yapılıyor…':'Yönetim Alanına Gir'}</button></form>
}

function AdminServices({items,session,onUpdated,setMsg}:{items:ServiceItem[];session:string;onUpdated:()=>Promise<void>;setMsg:(v:string)=>void}){
  if(!items.length)return <Empty text="Henüz servis kaydı yok." />
  return <div className="adminList">{items.map(x=><div className="adminTicket" key={x.ticket_no}><div className="adminTicketTop"><div><div className="ticketNo">{x.ticket_no}</div><strong>{x.customer_name}</strong><div className="small muted">{x.block} Blok • {x.floor}. Kat • Daire {x.unit_no} • {x.phone}</div></div><span className={`statusBadge st-${x.status}`}>{SERVICE_STATUS[x.status]||x.status}</span></div><div className="adminDetail"><b>{x.issue_type}</b><p>{x.description||'Açıklama yok'}</p>{x.attachments?.length ? <div className="adminPhotoGrid">{x.attachments.map((a,i)=>a.signed_url?<a href={a.signed_url} target="_blank" rel="noreferrer" key={a.storage_path||i}><img src={a.signed_url} alt={`Servis fotoğrafı ${i+1}`} /></a>:null)}</div>:null}<small>{dateTR(x.created_at)}</small></div><StatusSelect value={x.status} labels={SERVICE_STATUS} onChange={async status=>{await gateway({action:'admin_service_update',admin_session:session,ticket_no:x.ticket_no,status});setMsg(`${x.ticket_no} güncellendi.`);await onUpdated()}}/></div>)}</div>
}
function AdminProjects({items,session,onUpdated,setMsg}:{items:ProjectItem[];session:string;onUpdated:()=>Promise<void>;setMsg:(v:string)=>void}){
  if(!items.length)return <Empty text="Henüz proje / keşif talebi yok." />
  return <div className="adminList">{items.map(x=><div className="adminTicket" key={x.request_no}><div className="adminTicketTop"><div><div className="ticketNo">{x.request_no}</div><strong>{x.customer_name}</strong><div className="small muted">{x.block} Blok • {x.floor}. Kat • Daire {x.unit_no} • {x.phone}</div></div><span className={`statusBadge st-${x.status}`}>{PROJECT_STATUS[x.status]||x.status}</span></div><div className="adminDetail"><b>{x.request_type||'Proje talebi'}</b><p>{[x.room,x.design_name,x.material_name].filter(Boolean).join(' • ')}</p>{x.notes&&<p className="muted">“{x.notes}”</p>}{x.quote_amount ? <div className="adminQuoteSummary"><span>Müşteriye görünen teklif</span><strong>{new Intl.NumberFormat('tr-TR',{style:'currency',currency:'TRY'}).format(Number(x.quote_amount))}</strong>{x.quote_note&&<small>{x.quote_note}</small>}{x.quote_valid_until&&<small>Geçerlilik: {new Intl.DateTimeFormat('tr-TR').format(new Date(`${x.quote_valid_until}T12:00:00`))}</small>}</div>:null}<small>{dateTR(x.created_at)}</small></div><QuoteEditor item={x} session={session} onUpdated={onUpdated} setMsg={setMsg}/><StatusSelect value={x.status} labels={PROJECT_STATUS} onChange={async status=>{await gateway({action:'admin_project_update',admin_session:session,request_no:x.request_no,status});setMsg(`${x.request_no} güncellendi.`);await onUpdated()}}/></div>)}</div>
}

function QuoteEditor({item,session,onUpdated,setMsg}:{item:ProjectItem;session:string;onUpdated:()=>Promise<void>;setMsg:(v:string)=>void}){
  const [amount,setAmount]=useState(item.quote_amount?String(item.quote_amount):'')
  const [note,setNote]=useState(item.quote_note||'')
  const [validUntil,setValidUntil]=useState(item.quote_valid_until||'')
  const [busy,setBusy]=useState(false)
  async function save(){const numeric=Number(amount.replace(',','.'));if(!Number.isFinite(numeric)||numeric<=0){setMsg('Teklif tutarını kontrol edin.');return}setBusy(true);try{await gateway({action:'admin_project_quote',admin_session:session,request_no:item.request_no,quote_amount:numeric,quote_note:note,quote_valid_until:validUntil});setMsg(`${item.request_no} için fiyat teklifi müşteriye yayınlandı.`);await onUpdated()}catch{setMsg('Fiyat teklifi kaydedilemedi.')}finally{setBusy(false)}}
  return <div className="adminQuoteEditor"><label className="label">Müşteriye fiyat teklifi</label><div className="adminQuoteGrid"><input className="input" inputMode="decimal" value={amount} onChange={e=>setAmount(e.target.value.replace(/[^0-9.,]/g,''))} placeholder="Teklif tutarı (TL)"/><input className="input" type="date" value={validUntil} onChange={e=>setValidUntil(e.target.value)}/></div><textarea className="input textarea" rows={2} value={note} onChange={e=>setNote(e.target.value)} placeholder="Müşterinin göreceği kısa teklif notu (isteğe bağlı)"/><button className="adminQuoteBtn" type="button" disabled={busy} onClick={save}>{busy?'Yayınlanıyor…':item.quote_amount?'Teklifi Güncelle':'Teklifi Yayınla'}</button></div>
}

function AdminRecoveries({items,session,onUpdated,setMsg}:{items:RecoveryItem[];session:string;onUpdated:()=>Promise<void>;setMsg:(v:string)=>void}){
  if(!items.length)return <Empty text="Henüz hesap kurtarma talebi yok." />
  return <div className="adminList">{items.map(x=><div className="adminTicket recoveryAdminTicket" key={x.request_no}>
    <div className="adminTicketTop"><div><div className="ticketNo">{x.request_no}</div><strong>{x.customer_name}</strong><div className="small muted">{x.block} Blok • {x.floor}. Kat • Daire {x.unit_no} • {x.phone}{x.email?` • ${x.email}`:''}</div></div><span className={`statusBadge st-${x.status}`}>{RECOVERY_STATUS[x.status]||x.status}</span></div>
    <div className="adminDetail"><b>Güvenlik sorusu</b><p>Dairenizde daha önce Master Porcelenta tarafından ada tezgâhı uygulaması yapıldı mı?</p><div className="recoveryAnswerAdmin"><span>Müşteri yanıtı</span><strong>{RECOVERY_ANSWER[x.answer]||x.answer}</strong></div>{x.note&&<p className="muted">Ek not: “{x.note}”</p>}<small>{dateTR(x.created_at)}</small></div>
    {x.status==='pending' ? <div className="recoveryAdminActions"><button className="adminApprove" onClick={async()=>{await gateway({action:'admin_recovery_update',admin_session:session,request_no:x.request_no,status:'approved'});setMsg(`${x.request_no} onaylandı. Müşteri artık yeni giriş kodunu belirleyebilir.`);await onUpdated()}}>Onayla</button><button className="adminReject" onClick={async()=>{await gateway({action:'admin_recovery_update',admin_session:session,request_no:x.request_no,status:'rejected'});setMsg(`${x.request_no} reddedildi.`);await onUpdated()}}>Reddet</button></div> : <div className="small muted">{x.status==='approved'?'Müşteri yeni giriş kodunu belirleyebilir.':x.status==='completed'?'Müşteri yeni giriş kodunu oluşturdu ve hesabına erişti.':'Talep işlem dışı.'}</div>}
  </div>)}</div>
}
function StatusSelect({value,labels,onChange}:{value:string;labels:Record<string,string>;onChange:(v:string)=>Promise<void>}){const [busy,setBusy]=useState(false);return <div><label className="label">Durum</label><select className="input" value={value} disabled={busy} onChange={async e=>{setBusy(true);try{await onChange(e.target.value)}finally{setBusy(false)}}}>{Object.entries(labels).map(([k,v])=><option value={k} key={k}>{v}</option>)}</select></div>}
function Empty({text}:{text:string}){return <div className="adminEmpty">{text}</div>}
function AdminShell({children}:{children:React.ReactNode}){return <main className="adminPage"><section className="adminWrap">{children}</section></main>}
