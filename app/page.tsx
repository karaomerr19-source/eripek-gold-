'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'

type Residence = {
  id?: string
  block: string
  floor: number
  unit_no: string
  delivery_date?: string | null
  default_warranty_months?: number
  status?: string
}

type Customer = { id?: string; full_name: string; phone: string }
type CatalogResponse = { project: { name: string; slug: string }; residences: Residence[] }
type SessionResponse = { customer: Customer; residences: Residence[] }

const GATEWAY = 'https://txknydpygsvwdhxoumcm.supabase.co/functions/v1/qr-gateway'
const PUBLIC_KEY = 'sb_publishable_Zsyau0ZEke4HzdXqpt1gww_aFuxn7ia'
const SESSION_KEY = 'eripek_gold_session'

const STUDIO_ROOMS = [
  { id: 'kitchen', title: 'Mutfak', sub: 'Ada • Tezgah • Kahve Köşesi', icon: 'K' },
  { id: 'bedroom', title: 'Yatak Odası', sub: 'Başlık • Baza • LED Panel', icon: 'Y' },
  { id: 'bathroom', title: 'Banyo', sub: 'Lavabo • Niş • Duvar', icon: 'B' },
  { id: 'living', title: 'Salon', sub: 'TV Ünitesi • Masa • Dresuar', icon: 'S' },
] as const

const STUDIO_MODELS: Record<string, string[]> = {
  kitchen: ['Şelale Ada', 'Düz Modern Ada', 'Oturma Çıkıntılı Ada'],
  bedroom: ['Düz Panel', 'LED’li Panel', 'Tavana Kadar Panel'],
  bathroom: ['Ayaklı Lavabo', 'Duvar Boyu Lavabo', 'Lavabo + Niş Seti'],
  living: ['TV Duvarı', 'Konsol + Dresuar', 'Porselen Masa'],
}

const STUDIO_MATERIALS = [
  { id: 'taj', name: 'Taj Mahal', note: 'Sıcak bej damar' },
  { id: 'florence', name: 'Florence', note: 'Krem • altın damar' },
  { id: 'angela', name: 'Angela', note: 'Açık taş dokusu' },
  { id: 'soft', name: 'Soft Bej', note: 'Sade • mat görünüm' },
  { id: 'dark', name: 'Dark Modern', note: 'Koyu • güçlü kontrast' },
] as const


async function gateway(body: Record<string, unknown>) {
  const res = await fetch(GATEWAY, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', apikey: PUBLIC_KEY },
    body: JSON.stringify(body),
    cache: 'no-store',
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error || 'request_failed')
  return data
}

function unitNumber(unit: string) {
  return Number(unit.replace(/\D/g, '')) || 0
}

export default function Home() {
  const [stage, setStage] = useState<'loading' | 'register' | 'dashboard' | 'error'>('loading')
  const [catalog, setCatalog] = useState<Residence[]>([])
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [residence, setResidence] = useState<Residence | null>(null)
  const [sessionToken, setSessionToken] = useState('')

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const saved = localStorage.getItem(SESSION_KEY)
        if (saved) {
          try {
            const s: SessionResponse = await gateway({ action: 'session', session_token: saved })
            if (alive && s.customer && s.residences?.length) {
              setCustomer(s.customer)
              setResidence(s.residences[0])
              setSessionToken(saved)
              setStage('dashboard')
              return
            }
          } catch {
            localStorage.removeItem(SESSION_KEY)
          }
        }

        const c: CatalogResponse = await gateway({ action: 'catalog' })
        if (!alive) return
        setCatalog(c.residences || [])
        setStage('register')
      } catch {
        if (alive) setStage('error')
      }
    })()
    return () => {
      alive = false
    }
  }, [])

  function loggedIn(data: any) {
    localStorage.setItem(SESSION_KEY, data.session_token)
    setSessionToken(data.session_token)
    setCustomer(data.customer)
    setResidence(data.residence)
    setStage('dashboard')
  }

  function resetDevice() {
    localStorage.removeItem(SESSION_KEY)
    location.reload()
  }

  if (stage === 'loading') {
    return <Shell><div className="screen stack loading"><div className="eyebrow gold">ERİPEK GOLD</div><h2>Dijital alanınız hazırlanıyor…</h2><p className="muted small">Garanti, servis ve tasarım portalı yükleniyor.</p></div></Shell>
  }

  if (stage === 'error') {
    return <Shell><div className="screen stack"><div className="eyebrow gold">ERİPEK GOLD</div><h2>Bağlantı kurulamadı</h2><div className="card small muted">İnternet bağlantınızı kontrol edip sayfayı yenileyin. Sorun devam ederse Master Porcelenta ile iletişime geçin.</div><button className="btn dark" onClick={() => location.reload()}>Tekrar Dene</button></div></Shell>
  }

  if (stage === 'dashboard' && customer && residence) {
    return <Shell><Dashboard customer={customer} residence={residence} sessionToken={sessionToken} onReset={resetDevice} /></Shell>
  }

  return <Shell><Register residences={catalog} onSuccess={loggedIn} /></Shell>
}

function Register({ residences, onSuccess }: { residences: Residence[]; onSuccess: (data: any) => void }) {
  const [block, setBlock] = useState('')
  const [floor, setFloor] = useState('')
  const [unit, setUnit] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const blocks = useMemo(() => Array.from(new Set(residences.map(r => r.block))).sort(), [residences])
  const floors = useMemo(() => Array.from(new Set(residences.filter(r => r.block === block).map(r => r.floor))).sort((a, b) => a - b), [residences, block])
  const units = useMemo(() => residences.filter(r => r.block === block && String(r.floor) === floor).map(r => r.unit_no).sort((a, b) => unitNumber(a) - unitNumber(b)), [residences, block, floor])

  async function submit(e: FormEvent) {
    e.preventDefault()
    setMsg('')
    if (!block || !floor || !unit) return setMsg('Önce blok, kat ve dairenizi seçin.')
    if (name.trim().length < 3) return setMsg('Ad soyad bilgisini kontrol edin.')
    if (phone.replace(/\D/g, '').length < 10) return setMsg('Telefon numarasını kontrol edin.')
    setBusy(true)
    try {
      const data = await gateway({ action: 'claim', block, floor: Number(floor), unit_no: unit, full_name: name.trim(), phone: phone.trim() })
      onSuccess(data)
    } catch (err) {
      const code = err instanceof Error ? err.message : ''
      if (code === 'residence_already_claimed') setMsg('Bu daire daha önce farklı bir telefonla tanımlanmış. Daire sahibiyseniz Master Porcelenta ile iletişime geçin.')
      else if (code === 'invalid_phone') setMsg('Telefonu 05xx xxx xx xx şeklinde girin.')
      else setMsg('Kayıt tamamlanamadı. Bilgileri kontrol edip tekrar deneyin.')
    } finally {
      setBusy(false)
    }
  }

  return <form className="screen stack" onSubmit={submit}>
    <div className="hero compactHero"><div className="heroText"><div className="eyebrow">ERİPEK GOLD</div><div className="heroTitle">Evinize özel dijital alan</div><div className="heroCopy">Garanti, servis ve porselen tasarımlar tek yerde.</div></div></div>

    <div className="sectionHead"><div className="stepBadge">1</div><div><strong>Dairenizi seçin</strong><div className="small muted">QR tüm Eripek Gold konutlarında ortaktır.</div></div></div>
    <div className="grid3">
      <div><label className="label">Blok</label><select className="input" value={block} onChange={e => { setBlock(e.target.value); setFloor(''); setUnit('') }}><option value="">Seçin</option>{blocks.map(b => <option key={b}>{b}</option>)}</select></div>
      <div><label className="label">Kat</label><select className="input" value={floor} disabled={!block} onChange={e => { setFloor(e.target.value); setUnit('') }}><option value="">Seçin</option>{floors.map(f => <option key={f} value={f}>{f}. Kat</option>)}</select></div>
      <div><label className="label">Daire</label><select className="input" value={unit} disabled={!floor} onChange={e => setUnit(e.target.value)}><option value="">Seçin</option>{units.map(u => <option key={u} value={u}>{u}</option>)}</select></div>
    </div>

    {block && floor && unit && <div className="selectedResidence"><div className="small muted">Seçilen konut</div><strong>{block} Blok • {floor}. Kat • Daire {unit}</strong></div>}

    <div className="sectionHead"><div className="stepBadge">2</div><div><strong>Kişisel hesabınızı açın</strong><div className="small muted">Bir kez tanımlayın; bu cihaz sizi hatırlasın.</div></div></div>
    <div><label className="label">Ad Soyad</label><input className="input" value={name} onChange={e => setName(e.target.value)} autoComplete="name" placeholder="Adınız Soyadınız" /></div>
    <div><label className="label">Telefon</label><input className="input" value={phone} onChange={e => setPhone(e.target.value)} autoComplete="tel" inputMode="tel" placeholder="05xx xxx xx xx" /></div>
    {msg && <div className="errorBox">{msg}</div>}
    <button className="btn primary" disabled={busy} type="submit">{busy ? 'Hesabınız hazırlanıyor…' : 'Dairemi Tanımla'}</button>
    <div className="privacyLine">Şifre yok <span>•</span> SMS yok <span>•</span> Uygulama indirme yok</div>
  </form>
}

function Dashboard({ customer, residence, sessionToken, onReset }: { customer: Customer; residence: Residence; sessionToken: string; onReset: () => void }) {
  const [tab, setTab] = useState<'home' | 'discover' | 'service' | 'account'>('home')
  return <>
    <div className="screen stack dashboardScreen">
      <div><div className="eyebrow gold">HOŞ GELDİNİZ</div><h2 className="welcome">Merhaba, {customer.full_name}</h2><div className="small muted">{residence.block} Blok • {residence.floor}. Kat • Daire {residence.unit_no}</div></div>
      {tab === 'home' && <HomeTab residence={residence} onService={() => setTab('service')} onDiscover={() => setTab('discover')} />}
      {tab === 'discover' && <DiscoverTab />}
      {tab === 'service' && <ServiceTab residence={residence} sessionToken={sessionToken} />}
      {tab === 'account' && <AccountTab customer={customer} residence={residence} onReset={onReset} />}
    </div>
    <div className="nav"><button className={tab === 'home' ? 'active' : ''} onClick={() => setTab('home')}>⌂<br />Ana Sayfa</button><button className={tab === 'discover' ? 'active' : ''} onClick={() => setTab('discover')}>◇<br />Keşfet</button><button className={tab === 'service' ? 'active' : ''} onClick={() => setTab('service')}>⌁<br />Servis</button><button className={tab === 'account' ? 'active' : ''} onClick={() => setTab('account')}>○<br />Hesabım</button></div>
  </>
}

function HomeTab({ residence, onService, onDiscover }: { residence: Residence; onService: () => void; onDiscover: () => void }) {
  const warrantyText = residence.delivery_date ? 'Teslim tarihine göre takip ediliyor' : 'Kurulum / teslim kaydı eklendiğinde görünür'
  return <>
    <div className="dashHero"><div><div className="eyebrow">SİZE ÖZEL SEÇKİ</div><h2 className="heroSubTitle">Evinizi tamamlayın</h2><div className="small">Modeli seçin, taşı değiştirin, uygulama seçeneklerini keşfedin.</div></div></div>
    <div className="grid2">
      <div className="card warrantyCard"><div className="iconMark">✓</div><strong>Garanti Kaydı</strong><div className="small muted">{warrantyText}</div></div>
      <button className="card actionCard" onClick={onService}><div className="iconMark">↗</div><strong>Servis Merkezi</strong><div className="small muted">Talebinizi kayıt altına alın</div></button>
    </div>
    <div><div className="sectionTitle">Eviniz için fikirler</div><div className="grid2 roomGrid"><Room title="Mutfak" sub="Ada • Tezgah • Kahve Köşesi" onClick={onDiscover} /><Room title="Yatak Odası" sub="Başlık • Panel • LED" onClick={onDiscover} /></div></div>
  </>
}

function DiscoverTab() {
  const [roomId, setRoomId] = useState<(typeof STUDIO_ROOMS)[number]['id']>('kitchen')
  const [model, setModel] = useState(STUDIO_MODELS.kitchen[0])
  const [materialId, setMaterialId] = useState<(typeof STUDIO_MATERIALS)[number]['id']>('taj')
  const [saved, setSaved] = useState(false)

  const room = STUDIO_ROOMS.find(r => r.id === roomId) || STUDIO_ROOMS[0]
  const material = STUDIO_MATERIALS.find(m => m.id === materialId) || STUDIO_MATERIALS[0]

  function chooseRoom(id: (typeof STUDIO_ROOMS)[number]['id']) {
    setRoomId(id)
    setModel(STUDIO_MODELS[id][0])
    setSaved(false)
  }

  return <>
    <div><div className="eyebrow gold">DİJİTAL TASARIM STÜDYOSU</div><h2 className="welcome">Evinizi tasarlayın</h2><div className="small muted">Odayı, modeli ve porseleni seçin. Gerçek renderlar geldiğinde aynı seçim ekranında birebir ön izleme değişecek.</div></div>

    <div className="studioRoomTabs">{STUDIO_ROOMS.map(r => <button key={r.id} type="button" className={roomId === r.id ? 'studioRoomTab active' : 'studioRoomTab'} onClick={() => chooseRoom(r.id)}><span>{r.icon}</span>{r.title}</button>)}</div>

    <div className={`designPreview material-${material.id} room-${room.id}`}>
      <div className="previewBadge">CANLI TASLAK</div>
      <div className="scene sceneWall"></div>
      <div className="scene sceneObject"></div>
      <div className="scene sceneAccent"></div>
      <div className="previewCopy"><div className="eyebrow">{room.title.toUpperCase()}</div><strong>{model}</strong><div className="small">{material.name}</div></div>
    </div>

    <div className="studioBlock"><div className="sectionTitle">1 • Model seçimi</div><div className="modelChips">{STUDIO_MODELS[roomId].map(m => <button key={m} type="button" className={model === m ? 'chip active' : 'chip'} onClick={() => { setModel(m); setSaved(false) }}>{m}</button>)}</div></div>

    <div className="studioBlock"><div className="sectionTitle">2 • Porselen seçimi</div><div className="materialList">{STUDIO_MATERIALS.map(m => <button key={m.id} type="button" className={materialId === m.id ? 'materialOption active' : 'materialOption'} onClick={() => { setMaterialId(m.id); setSaved(false) }}><span className={`swatch material-${m.id}`}></span><span><strong>{m.name}</strong><small>{m.note}</small></span><b>›</b></button>)}</div></div>

    <div className="selectionSummary"><div><div className="small muted">Seçiminiz</div><strong>{room.title} • {model}</strong><div className="small muted">{material.name}</div></div><button type="button" className={saved ? 'miniSave saved' : 'miniSave'} onClick={() => setSaved(!saved)}>{saved ? '✓ Kaydedildi' : '♡ Kaydet'}</button></div>
    <div className="card studioNote"><strong>Gerçek render aşaması</strong><div className="small muted spaceTop">Senin hazırladığın veya bizim oluşturduğumuz renderları bu kombinasyonlara bağlayacağız. Sonradan yeni taş ya da model eklemek için sayfayı baştan yapmak gerekmeyecek.</div></div>
  </>
}

function ServiceTab({ residence, sessionToken }: { residence: Residence; sessionToken: string }) {
  const [product, setProduct] = useState('')
  const [issue, setIssue] = useState('')
  const [description, setDescription] = useState('')
  const [msg, setMsg] = useState('')
  const [ticket, setTicket] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault(); setMsg(''); setTicket('')
    if (!product || !issue || description.trim().length < 5) return setMsg('Ürün, talep türü ve kısa açıklamayı doldurun.')
    setBusy(true)
    try {
      const data = await gateway({ action: 'service_create', session_token: sessionToken, residence_id: residence.id, product, issue_type: issue, description: description.trim() })
      setTicket(data.ticket.ticket_no)
      setProduct(''); setIssue(''); setDescription('')
    } catch {
      setMsg('Servis kaydı oluşturulamadı. Lütfen tekrar deneyin.')
    } finally { setBusy(false) }
  }

  return <form className="stack" onSubmit={submit}>
    <div><div className="eyebrow gold">SERVİS MERKEZİ</div><h2 className="welcome">Nasıl yardımcı olabiliriz?</h2></div>
    <div className="selectedResidence"><div className="small muted">Konut</div><strong>{residence.block} Blok • {residence.floor}. Kat • Daire {residence.unit_no}</strong></div>
    <div><label className="label">Ürün</label><select className="input" value={product} onChange={e => setProduct(e.target.value)}><option value="">Seçin</option><option>Porselen Lavabo</option><option>Porselen Niş</option><option>Diğer Porselen Uygulama</option></select></div>
    <div><label className="label">Talep türü</label><select className="input" value={issue} onChange={e => setIssue(e.target.value)}><option value="">Seçin</option><option>Montaj kontrolü</option><option>Silikon / derz</option><option>Çatlak / kırık</option><option>Leke / bakım</option><option>Diğer</option></select></div>
    <div><label className="label">Açıklama</label><textarea className="input textarea" rows={4} value={description} onChange={e => setDescription(e.target.value)} placeholder="Sorunu kısaca anlatın" /></div>
    {msg && <div className="errorBox">{msg}</div>}
    {ticket && <div className="successBox"><strong>Servis kaydınız alındı.</strong><div className="small">Talep numaranız: {ticket}</div></div>}
    <button className="btn dark" disabled={busy} type="submit">{busy ? 'Kaydediliyor…' : 'Servis Kaydını Oluştur'}</button>
  </form>
}

function AccountTab({ customer, residence, onReset }: { customer: Customer; residence: Residence; onReset: () => void }) {
  return <>
    <div><div className="eyebrow gold">KİŞİSEL HESABIM</div><h2 className="welcome">Daire bilgilerim</h2></div>
    <div className="card accountCard"><div><div className="small muted">Müşteri</div><strong>{customer.full_name}</strong></div><div><div className="small muted">Telefon</div><strong>{customer.phone}</strong></div><div><div className="small muted">Konut</div><strong>{residence.block} Blok • {residence.floor}. Kat • Daire {residence.unit_no}</strong></div><div><div className="small muted">Proje</div><strong>Eripek Gold</strong></div></div>
    <button className="btn ghost" onClick={onReset}>Bu cihazdaki hesabı değiştir</button>
  </>
}

function Room({ title, sub, onClick }: { title: string; sub: string; onClick?: () => void }) {
  return <button type="button" className="room" onClick={onClick}><div className="roomVisual"><span>MP</span></div><div className="roomBody"><strong>{title}</strong><div className="small muted">{sub}</div></div></button>
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="page"><section className="phone"><div className="top brandBar"><div className="brandLockup"><div className="monogram">MP</div><div><div className="brand">MASTER PORCELENTA</div><div className="sub">Eripek Gold • Garanti • Servis • Tasarım</div></div></div><div className="goldDot"></div></div>{children}</section></main>
}
