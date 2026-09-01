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

type ServiceItem = { ticket_no:string; status:string; issue_type:string; description?:string; created_at:string; customer_name:string; phone:string; block:string; floor:string; unit_no:string }
type ProjectItem = { request_no:string; status:string; request_type?:string; room?:string; design_name?:string; material_name?:string; notes?:string; created_at:string; customer_name:string; phone:string; block:string; floor:string; unit_no:string }
type DashboardData = { service_requests: ServiceItem[]; project_requests: ProjectItem[] }

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
  const [data,setData]=useState<DashboardData>({service_requests:[],project_requests:[]})
  const [tab,setTab]=useState<'service'|'project'>('service')
  const [msg,setMsg]=useState('')

  async function load(token:string){
    const d=await gateway({action:'admin_dashboard',admin_session:token})
    setData({service_requests:d.service_requests||[],project_requests:d.project_requests||[]})
    setSession(token); setStage('dashboard')
  }
  useEffect(()=>{const saved=localStorage.getItem(ADMIN_SESSION_KEY); if(!saved){setStage('login');return} load(saved).catch(()=>{localStorage.removeItem(ADMIN_SESSION_KEY);setStage('login')})},[])
  function logout(){localStorage.removeItem(ADMIN_SESSION_KEY);setSession('');setStage('login')}

  if(stage==='loading') return <AdminShell><div className="adminCenter"><div className="eyebrow gold">MASTER PORCELENTA</div><h1>Yönetim alanı hazırlanıyor…</h1></div></AdminShell>
  if(stage==='login') return <AdminShell><AdminLogin onSuccess={async token=>{localStorage.setItem(ADMIN_SESSION_KEY,token);await load(token)}} /></AdminShell>

  const activeServices=data.service_requests.filter(x=>!['completed','cancelled'].includes(x.status)).length
  const openProjects=data.project_requests.filter(x=>!['won','lost','cancelled'].includes(x.status)).length
  return <AdminShell>
    <div className="adminHead"><div><div className="eyebrow gold">ERİPEK GOLD • YÖNETİM</div><h1>Müşteri Talepleri</h1><div className="small muted">Servis ve ek proje talepleri tek ekranda.</div></div><button className="adminLogout" onClick={logout}>Çıkış</button></div>
    <div className="adminStats"><div><span>{activeServices}</span><small>Açık servis</small></div><div><span>{openProjects}</span><small>Açık proje</small></div><div><span>{data.service_requests.length+data.project_requests.length}</span><small>Toplam kayıt</small></div></div>
    <div className="adminTabs"><button className={tab==='service'?'active':''} onClick={()=>setTab('service')}>Servis ({data.service_requests.length})</button><button className={tab==='project'?'active':''} onClick={()=>setTab('project')}>Proje / Keşif ({data.project_requests.length})</button></div>
    {msg&&<div className="successBox">{msg}</div>}
    {tab==='service' ? <AdminServices items={data.service_requests} session={session} onUpdated={()=>load(session)} setMsg={setMsg}/> : <AdminProjects items={data.project_requests} session={session} onUpdated={()=>load(session)} setMsg={setMsg}/>} 
  </AdminShell>
}

function AdminLogin({onSuccess}:{onSuccess:(token:string)=>Promise<void>}){
  const [code,setCode]=useState('');const [busy,setBusy]=useState(false);const [msg,setMsg]=useState('')
  async function submit(e:FormEvent){e.preventDefault();setBusy(true);setMsg('');try{const d=await gateway({action:'admin_login',code});await onSuccess(d.admin_session)}catch{setMsg('Yönetici erişim kodu hatalı.')}finally{setBusy(false)}}
  return <form className="adminLogin" onSubmit={submit}><div className="adminMark">MP</div><div className="eyebrow gold">MASTER PORCELENTA</div><h1>Eripek Gold Yönetim</h1><p>Servis ve proje taleplerine erişmek için yönetici kodunu girin.</p><input className="input" type="password" autoComplete="current-password" value={code} onChange={e=>setCode(e.target.value)} placeholder="Yönetici erişim kodu" />{msg&&<div className="errorBox">{msg}</div>}<button className="btn dark" disabled={busy}>{busy?'Giriş yapılıyor…':'Yönetim Alanına Gir'}</button></form>
}

function AdminServices({items,session,onUpdated,setMsg}:{items:ServiceItem[];session:string;onUpdated:()=>Promise<void>;setMsg:(v:string)=>void}){
  if(!items.length)return <Empty text="Henüz servis kaydı yok." />
  return <div className="adminList">{items.map(x=><div className="adminTicket" key={x.ticket_no}><div className="adminTicketTop"><div><div className="ticketNo">{x.ticket_no}</div><strong>{x.customer_name}</strong><div className="small muted">{x.block} Blok • {x.floor}. Kat • Daire {x.unit_no} • {x.phone}</div></div><span className={`statusBadge st-${x.status}`}>{SERVICE_STATUS[x.status]||x.status}</span></div><div className="adminDetail"><b>{x.issue_type}</b><p>{x.description||'Açıklama yok'}</p><small>{dateTR(x.created_at)}</small></div><StatusSelect value={x.status} labels={SERVICE_STATUS} onChange={async status=>{await gateway({action:'admin_service_update',admin_session:session,ticket_no:x.ticket_no,status});setMsg(`${x.ticket_no} güncellendi.`);await onUpdated()}}/></div>)}</div>
}
function AdminProjects({items,session,onUpdated,setMsg}:{items:ProjectItem[];session:string;onUpdated:()=>Promise<void>;setMsg:(v:string)=>void}){
  if(!items.length)return <Empty text="Henüz proje / keşif talebi yok." />
  return <div className="adminList">{items.map(x=><div className="adminTicket" key={x.request_no}><div className="adminTicketTop"><div><div className="ticketNo">{x.request_no}</div><strong>{x.customer_name}</strong><div className="small muted">{x.block} Blok • {x.floor}. Kat • Daire {x.unit_no} • {x.phone}</div></div><span className={`statusBadge st-${x.status}`}>{PROJECT_STATUS[x.status]||x.status}</span></div><div className="adminDetail"><b>{x.request_type||'Proje talebi'}</b><p>{[x.room,x.design_name,x.material_name].filter(Boolean).join(' • ')}</p>{x.notes&&<p className="muted">“{x.notes}”</p>}<small>{dateTR(x.created_at)}</small></div><StatusSelect value={x.status} labels={PROJECT_STATUS} onChange={async status=>{await gateway({action:'admin_project_update',admin_session:session,request_no:x.request_no,status});setMsg(`${x.request_no} güncellendi.`);await onUpdated()}}/></div>)}</div>
}
function StatusSelect({value,labels,onChange}:{value:string;labels:Record<string,string>;onChange:(v:string)=>Promise<void>}){const [busy,setBusy]=useState(false);return <div><label className="label">Durum</label><select className="input" value={value} disabled={busy} onChange={async e=>{setBusy(true);try{await onChange(e.target.value)}finally{setBusy(false)}}}>{Object.entries(labels).map(([k,v])=><option value={k} key={k}>{v}</option>)}</select></div>}
function Empty({text}:{text:string}){return <div className="adminEmpty">{text}</div>}
function AdminShell({children}:{children:React.ReactNode}){return <main className="adminPage"><section className="adminWrap">{children}</section></main>}
