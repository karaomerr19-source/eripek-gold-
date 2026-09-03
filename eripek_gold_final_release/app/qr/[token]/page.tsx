'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

type Residence={block:string;floor:string;unit_no:string;delivery_date?:string|null;default_warranty_months?:number}
type SessionData={customer?:{full_name:string;phone:string};residences?:Residence[]}
const GATEWAY='https://txknydpygsvwdhxoumcm.supabase.co/functions/v1/qr-gateway'
const SUPABASE_PUBLIC_KEY='sb_publishable_Zsyau0ZEke4HzdXqpt1gww_aFuxn7ia'

async function gateway(body:Record<string,unknown>){
  const res=await fetch(GATEWAY,{method:'POST',headers:{'Content-Type':'application/json','apikey':SUPABASE_PUBLIC_KEY},body:JSON.stringify(body),cache:'no-store'})
  const data=await res.json().catch(()=>({}))
  if(!res.ok) throw new Error(data?.error||'request_failed')
  return data
}

export default function QRPage(){
  const {token}=useParams<{token:string}>()
  const[stage,setStage]=useState<'loading'|'register'|'dashboard'|'error'>('loading')
  const[residence,setResidence]=useState<Residence|null>(null)
  const[name,setName]=useState('')
  const[phone,setPhone]=useState('')
  const[msg,setMsg]=useState('')

  useEffect(()=>{let alive=true;(async()=>{
    try{
      const saved=localStorage.getItem('eripek_gold_session')
      if(saved){
        try{
          const s:SessionData=await gateway({action:'session',session_token:saved})
          if(alive&&s?.customer&&s?.residences?.length){
            setName(s.customer.full_name)
            setResidence(s.residences[0])
            setStage('dashboard')
            return
          }
        }catch{localStorage.removeItem('eripek_gold_session')}
      }
      const r=await gateway({action:'resolve',token})
      if(!alive)return
      setResidence(r.residence)
      setStage('register')
    }catch{if(alive)setStage('error')}
  })();return()=>{alive=false}},[token])

  async function submit(e:React.FormEvent){
    e.preventDefault();setMsg('')
    if(name.trim().length<3||phone.replace(/\D/g,'').length<10){setMsg('Ad soyad ve telefon bilgisini kontrol edin.');return}
    try{
      const a=await gateway({action:'activate',token,full_name:name.trim(),phone:phone.trim()})
      localStorage.setItem('eripek_gold_session',a.session_token)
      setResidence(a.residence)
      setStage('dashboard')
    }catch(err){
      const code=err instanceof Error?err.message:''
      setMsg(code==='invalid_phone'?'Telefon numarasını 05xx xxx xx xx şeklinde girin.':'Kayıt tamamlanamadı. Lütfen tekrar deneyin.')
    }
  }

  if(stage==='loading')return <Shell><div className="screen stack"><div className="eyebrow gold">ERİPEK GOLD</div><h2>QR doğrulanıyor…</h2><p className="muted small">Daireniz güvenli şekilde hazırlanıyor.</p></div></Shell>
  if(stage==='error')return <Shell><div className="screen stack"><h2>QR doğrulanamadı</h2><p className="muted">Bu bağlantı geçersiz, eski veya kullanım dışı olabilir.</p><div className="card small">Master Porcelenta destek ekibiyle iletişime geçerek QR kodunuzu yenileyebilirsiniz.</div></div></Shell>
  if(stage==='dashboard'&&residence)return <Shell><Dashboard name={name} residence={residence}/></Shell>

  return <Shell><form className="screen stack" onSubmit={submit}>
    <div className="hero"><div className="heroText"><div className="eyebrow">ERİPEK GOLD</div><div className="heroTitle">Kişisel alanınızı açın</div><div className="heroCopy">Daireniz QR ile tanındı. Garanti, servis ve size özel tasarımlar burada.</div></div></div>
    <div className="card"><div className="small muted">Tanımlanan konut</div><strong>{residence?.block} Blok • {residence?.floor}. Kat • Daire {residence?.unit_no}</strong></div>
    <div><label className="label">Ad Soyad</label><input className="input" value={name} onChange={e=>setName(e.target.value)} autoComplete="name" placeholder="Adınız Soyadınız"/></div>
    <div><label className="label">Telefon</label><input className="input" value={phone} onChange={e=>setPhone(e.target.value)} autoComplete="tel" inputMode="tel" placeholder="05xx xxx xx xx"/></div>
    {msg&&<div className="error">{msg}</div>}
    <button className="btn primary" type="submit">Hesabımı Aç</button>
    <div className="small muted" style={{textAlign:'center'}}>Şifre yok • SMS yok • Uygulama indirme yok</div>
  </form></Shell>
}

function Dashboard({name,residence}:{name:string,residence:Residence}){
  const[tab,setTab]=useState<'home'|'discover'|'service'|'account'>('home')
  return <>
    <div className="screen stack">
      <div><div className="eyebrow gold">HOŞ GELDİNİZ</div><h2 style={{margin:'4px 0'}}>Merhaba, {name}</h2><div className="small muted">{residence.block} Blok • {residence.floor}. Kat • Daire {residence.unit_no}</div></div>
      {tab==='home'&&<>
        <div className="dashHero"><div><div className="eyebrow">SİZE ÖZEL SEÇKİ</div><h2 style={{margin:'4px 0'}}>Evinizi tamamlayın</h2><div className="small">Modeli seçin, taşı değiştirin, bitmiş halini görün.</div></div></div>
        <div className="grid2"><div className="card status"><strong>✓ Garanti Kaydı</strong><div className="small muted">Teslim tarihine göre yönetilir</div></div><button className="card" style={{textAlign:'left'}} onClick={()=>setTab('service')}><strong>Servis Merkezi</strong><div className="small muted">Tek tıkla kayıt</div></button></div>
        <div><strong>İlham veren alanlar</strong><div className="grid2" style={{marginTop:8}}><button className="room" onClick={()=>setTab('discover')}><div className="roomVisual"/><div className="roomBody"><strong>Mutfak</strong><div className="small muted">Ada • Tezgah • Kahve Köşesi</div></div></button><button className="room" onClick={()=>setTab('discover')}><div className="roomVisual"/><div className="roomBody"><strong>Yatak Odası</strong><div className="small muted">Baza • Başlık • LED Panel</div></div></button></div></div>
      </>}
      {tab==='discover'&&<><div><div className="eyebrow gold">DİJİTAL TASARIM STÜDYOSU</div><h2 style={{margin:'4px 0'}}>Alanınızı keşfedin</h2></div><div className="grid2"><Room title="Mutfak" sub="Ada • Tezgah • Kahve Köşesi"/><Room title="Yatak Odası" sub="Baza • Başlık • LED Panel"/><Room title="Banyo" sub="Lavabo • Niş • Duvar"/><Room title="Salon" sub="TV Ünitesi • Masa • Dresuar"/></div><div className="card"><strong>Bir sonraki sürüm</strong><div className="small muted" style={{marginTop:4}}>Burada seçilen model ve porselen taşına göre gerçek mimari ön izleme değişecek.</div></div></>}
      {tab==='service'&&<Service residence={residence}/>} 
      {tab==='account'&&<><div><div className="eyebrow gold">KİŞİSEL HESABIM</div><h2 style={{margin:'4px 0'}}>Daire bilgilerim</h2></div><div className="card stack"><div><div className="small muted">Müşteri</div><strong>{name}</strong></div><div><div className="small muted">Konut</div><strong>{residence.block} Blok • {residence.floor}. Kat • Daire {residence.unit_no}</strong></div><div><div className="small muted">Proje</div><strong>Eripek Gold</strong></div></div></>}
    </div>
    <div className="nav"><button className={tab==='home'?'active':''} onClick={()=>setTab('home')}>⌂<br/>Ana Sayfa</button><button className={tab==='discover'?'active':''} onClick={()=>setTab('discover')}>◇<br/>Keşfet</button><button className={tab==='service'?'active':''} onClick={()=>setTab('service')}>⌁<br/>Servis</button><button className={tab==='account'?'active':''} onClick={()=>setTab('account')}>○<br/>Hesabım</button></div>
  </>
}
function Room({title,sub}:{title:string;sub:string}){return <button className="room"><div className="roomVisual"/><div className="roomBody"><strong>{title}</strong><div className="small muted">{sub}</div></div></button>}
function Service({residence}:{residence:Residence}){return <div className="stack"><div><div className="eyebrow gold">SERVİS MERKEZİ</div><h2 style={{margin:'4px 0'}}>Nasıl yardımcı olabiliriz?</h2></div><div className="card small">{residence.block} Blok • {residence.floor}. Kat • Daire {residence.unit_no}</div><select className="input" defaultValue=""><option value="" disabled>Ürün seçin</option><option>Porselen Lavabo</option><option>Porselen Niş</option></select><select className="input" defaultValue=""><option value="" disabled>Talep türü seçin</option><option>Montaj kontrolü</option><option>Silikon / derz</option><option>Çatlak / kırık</option><option>Leke / bakım</option><option>Diğer</option></select><textarea className="input" rows={4} placeholder="Sorunu kısaca anlatın"/><button className="btn dark" type="button">Servis Kaydını Oluştur</button><div className="small muted">Servis kayıt gönderimi bir sonraki adımda veritabanına bağlanacak.</div></div>}
function Shell({children}:{children:React.ReactNode}){return <main className="page"><section className="phone"><div className="top brandBar"><div className="brandLockup"><img className="brandMarkImg" src="/master-porcelenta-mark.png" alt="Master Porcelenta" /><div><div className="brand">MASTER PORCELENTA</div><div className="sub">Eripek Gold</div></div></div><div className="goldDot"></div></div>{children}</section></main>}
