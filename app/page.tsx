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

type Customer = { id?: string; full_name: string; phone: string; email?: string | null }
type CatalogResponse = { project: { name: string; slug: string }; residences: Residence[] }
type SessionResponse = { customer: Customer; residences: Residence[] }

const GATEWAY = 'https://txknydpygsvwdhxoumcm.supabase.co/functions/v1/qr-gateway'
const PUBLIC_KEY = 'sb_publishable_Zsyau0ZEke4HzdXqpt1gww_aFuxn7ia'
const SESSION_KEY = 'eripek_gold_session'
const ACCOUNT_CACHE_KEY = 'eripek_gold_account'
const SESSION_COOKIE_KEY = 'eripek_gold_session'

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


const SERVICE_PRODUCTS = [
  'Porselen Lavabo',
  'Porselen Niş',
  'Mutfak Tezgahı',
  'Ada Tezgahı',
  'Kahve Köşesi',
  'TV Ünitesi',
  'Yatak Başlığı / Baza Paneli',
  'Porselen Masa',
  'Basamak',
  'Duvar Kaplama',
  'Diğer Porselen Uygulama',
] as const

const PROJECT_REQUEST_TYPES = [
  'Keşif ve ölçü talebi',
  'Fiyat teklifi istiyorum',
  'Bu tasarımı evime uygula',
  'Yeni proje danışmanlığı',
] as const

const SERVICE_ISSUES = [
  'Su sızıntısı',
  'Çökme / ayrılma',
  'Yüzey aşınması',
  'Montaj kontrolü',
  'Silikon / derz yenileme',
  'Çatlak / kırık',
  'Bakım desteği',
  'Tesisat / bağlantı kontrolü',
  'Diğer',
] as const

function formatDateTR(value?: string | null) {
  if (!value) return 'Kayıt bekleniyor'
  return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(`${value}T12:00:00`))
}

function warrantyEndDate(value?: string | null, months = 12) {
  if (!value) return null
  const d = new Date(`${value}T12:00:00`)
  d.setMonth(d.getMonth() + months)
  return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d)
}


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

function getCookie(name: string) {
  if (typeof document === 'undefined') return ''
  const prefix = `${name}=`
  const part = document.cookie.split(';').map(v => v.trim()).find(v => v.startsWith(prefix))
  return part ? decodeURIComponent(part.slice(prefix.length)) : ''
}

function rememberSession(token: string) {
  localStorage.setItem(SESSION_KEY, token)
  document.cookie = `${SESSION_COOKIE_KEY}=${encodeURIComponent(token)}; Max-Age=${180 * 24 * 60 * 60}; Path=/; SameSite=Lax; Secure`
}

function forgetSession() {
  localStorage.removeItem(SESSION_KEY)
  localStorage.removeItem(ACCOUNT_CACHE_KEY)
  document.cookie = `${SESSION_COOKIE_KEY}=; Max-Age=0; Path=/; SameSite=Lax; Secure`
}

function readRememberedSession() {
  return localStorage.getItem(SESSION_KEY) || getCookie(SESSION_COOKIE_KEY)
}

function cacheAccount(customer: Customer, residence: Residence) {
  localStorage.setItem(ACCOUNT_CACHE_KEY, JSON.stringify({ customer, residence }))
}

function readCachedAccount(): { customer: Customer; residence: Residence } | null {
  try {
    const raw = localStorage.getItem(ACCOUNT_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.customer?.full_name || !parsed?.residence?.block || !parsed?.residence?.unit_no) return null
    return parsed
  } catch {
    return null
  }
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
        const saved = readRememberedSession()
        const cached = readCachedAccount()

        // Aynı cihazda daha önce tanımlanmış müşteri formu yeniden görmez.
        // Önbellekteki hesabı anında aç, oturumu arka planda doğrula.
        if (saved && cached && alive) {
          rememberSession(saved)
          setCustomer(cached.customer)
          setResidence(cached.residence)
          setSessionToken(saved)
          setStage('dashboard')
        }

        if (saved) {
          try {
            const session: SessionResponse = await gateway({ action: 'session', session_token: saved })
            if (alive && session.customer && session.residences?.length) {
              const activeResidence = session.residences[0]
              rememberSession(saved)
              cacheAccount(session.customer, activeResidence)
              setCustomer(session.customer)
              setResidence(activeResidence)
              setSessionToken(saved)
              setStage('dashboard')
              return
            }
          } catch (err) {
            const code = err instanceof Error ? err.message : ''
            if (code === 'invalid_session') {
              forgetSession()
            } else if (cached) {
              // Geçici ağ / sunucu hatasında müşteriyi tekrar kayıt ekranına atma.
              return
            } else {
              if (alive) setStage('error')
              return
            }
          }
        }

        const catalogData: CatalogResponse = await gateway({ action: 'catalog' })
        if (!alive) return
        setCatalog(catalogData.residences || [])
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
    rememberSession(data.session_token)
    cacheAccount(data.customer, data.residence)
    setSessionToken(data.session_token)
    setCustomer(data.customer)
    setResidence(data.residence)
    setStage('dashboard')
  }

  function resetDevice() {
    forgetSession()
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
  const [mode, setMode] = useState<'register' | 'login' | 'recovery'>('register')
  const [block, setBlock] = useState('')
  const [floor, setFloor] = useState('')
  const [unit, setUnit] = useState('')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [email, setEmail] = useState('')
  const [pin, setPin] = useState('')
  const [pinAgain, setPinAgain] = useState('')
  const [identifier, setIdentifier] = useState('')
  const [loginPin, setLoginPin] = useState('')
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const [recoveryStep, setRecoveryStep] = useState<'form' | 'pending' | 'reset'>('form')
  const [recoveryIdentifier, setRecoveryIdentifier] = useState('')
  const [recoveryBlock, setRecoveryBlock] = useState('')
  const [recoveryFloor, setRecoveryFloor] = useState('')
  const [recoveryUnit, setRecoveryUnit] = useState('')
  const [recoveryAnswer, setRecoveryAnswer] = useState('')
  const [recoveryNote, setRecoveryNote] = useState('')
  const [recoveryRequestNo, setRecoveryRequestNo] = useState('')
  const [recoverySecret, setRecoverySecret] = useState('')
  const [recoveryStatus, setRecoveryStatus] = useState<'pending' | 'approved' | 'rejected' | 'completed' | ''>('')
  const [newPin, setNewPin] = useState('')
  const [newPinAgain, setNewPinAgain] = useState('')

  const blocks = useMemo(() => Array.from(new Set(residences.map(r => r.block))).sort(), [residences])
  const floors = useMemo(() => Array.from(new Set(residences.filter(r => r.block === block).map(r => r.floor))).sort((a, b) => a - b), [residences, block])
  const units = useMemo(() => residences.filter(r => r.block === block && String(r.floor) === floor).map(r => r.unit_no).sort((a, b) => unitNumber(a) - unitNumber(b)), [residences, block, floor])
  const recoveryFloors = useMemo(() => Array.from(new Set(residences.filter(r => r.block === recoveryBlock).map(r => r.floor))).sort((a, b) => a - b), [residences, recoveryBlock])
  const recoveryUnits = useMemo(() => residences.filter(r => r.block === recoveryBlock && String(r.floor) === recoveryFloor).map(r => r.unit_no).sort((a, b) => unitNumber(a) - unitNumber(b)), [residences, recoveryBlock, recoveryFloor])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('eripek_gold_recovery_pending')
      if (!raw) return
      const saved = JSON.parse(raw)
      if (!saved?.request_no || !saved?.recovery_secret) return
      setRecoveryRequestNo(saved.request_no)
      setRecoverySecret(saved.recovery_secret)
      setRecoveryStatus(saved.status || 'pending')
      setRecoveryStep(saved.status === 'approved' ? 'reset' : 'pending')
    } catch {}
  }, [])

  function rememberRecovery(requestNo: string, secret: string, status = 'pending') {
    localStorage.setItem('eripek_gold_recovery_pending', JSON.stringify({ request_no: requestNo, recovery_secret: secret, status }))
  }
  function clearRecovery() {
    localStorage.removeItem('eripek_gold_recovery_pending')
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setMsg('')
    if (mode === 'login') {
      if (!identifier.trim()) return setMsg('Telefon numaranızı veya e-posta adresinizi girin.')
      if (!/^\d{6}$/.test(loginPin)) return setMsg('6 haneli Eripek Gold giriş kodunuzu girin.')
      setBusy(true)
      try {
        const data = await gateway({ action: 'customer_login', identifier: identifier.trim(), pin: loginPin })
        onSuccess(data)
      } catch (err) {
        const code = err instanceof Error ? err.message : ''
        if (code === 'login_temporarily_locked') setMsg('Çok fazla hatalı deneme yapıldı. Güvenliğiniz için 15 dakika sonra tekrar deneyin.')
        else setMsg('Giriş bilgileri eşleşmedi. Giriş kodunuzu unuttuysanız “Giriş kodumu unuttum” seçeneğini kullanın.')
      } finally { setBusy(false) }
      return
    }

    if (!block || !floor || !unit) return setMsg('Önce blok, kat ve dairenizi seçin.')
    if (name.trim().length < 3) return setMsg('Ad soyad bilgisini kontrol edin.')
    if (phone.replace(/\D/g, '').length < 10) return setMsg('Telefon numarasını kontrol edin.')
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setMsg('E-posta adresini kontrol edin.')
    if (!/^\d{6}$/.test(pin)) return setMsg('Farklı cihazlardan giriş için 6 haneli bir giriş kodu belirleyin.')
    if (pin !== pinAgain) return setMsg('Giriş kodları aynı değil.')
    setBusy(true)
    try {
      const data = await gateway({ action: 'claim', block, floor: Number(floor), unit_no: unit, full_name: name.trim(), phone: phone.trim(), email: email.trim(), pin })
      onSuccess(data)
    } catch (err) {
      const code = err instanceof Error ? err.message : ''
      if (code === 'residence_already_claimed') setMsg('Bu daire daha önce tanımlanmış. “Zaten kaydım var” seçeneğinden giriş yapın.')
      else if (code === 'invalid_phone') setMsg('Telefonu 05xx xxx xx xx şeklinde girin.')
      else if (code === 'invalid_email') setMsg('E-posta adresini kontrol edin.')
      else if (code === 'email_in_use') setMsg('Bu e-posta başka bir hesaba bağlı görünüyor.')
      else setMsg('Kayıt tamamlanamadı. Bilgileri kontrol edip tekrar deneyin.')
    } finally { setBusy(false) }
  }

  async function createRecovery(e: FormEvent) {
    e.preventDefault(); setMsg('')
    if (!recoveryIdentifier.trim()) return setMsg('Kayıtlı telefon numaranızı veya e-posta adresinizi girin.')
    if (!recoveryBlock || !recoveryFloor || !recoveryUnit) return setMsg('Dairenizin blok, kat ve daire bilgisini seçin.')
    if (!recoveryAnswer) return setMsg('Güvenlik sorusunu yanıtlayın.')
    setBusy(true)
    try {
      const data = await gateway({
        action: 'recovery_create', identifier: recoveryIdentifier.trim(), block: recoveryBlock,
        floor: Number(recoveryFloor), unit_no: recoveryUnit, question_key: 'island_counter',
        answer: recoveryAnswer, note: recoveryNote.trim(),
      })
      setRecoveryRequestNo(data.request_no); setRecoverySecret(data.recovery_secret); setRecoveryStatus('pending'); setRecoveryStep('pending')
      rememberRecovery(data.request_no, data.recovery_secret, 'pending')
    } catch (err) {
      const code = err instanceof Error ? err.message : ''
      if (code === 'recovery_rate_limited') setMsg('Kısa sürede çok fazla kurtarma talebi oluşturuldu. Bir süre sonra tekrar deneyin.')
      else if (code === 'recovery_information_not_matched') setMsg('Telefon / e-posta ile daire bilgileri eşleşmedi. Bilgileri kontrol edin.')
      else setMsg('Hesap kurtarma talebi oluşturulamadı. Lütfen tekrar deneyin.')
    } finally { setBusy(false) }
  }

  async function checkRecovery() {
    setMsg(''); setBusy(true)
    try {
      const data = await gateway({ action: 'recovery_status', request_no: recoveryRequestNo, recovery_secret: recoverySecret })
      const status = data.recovery.status as 'pending' | 'approved' | 'rejected' | 'completed'
      setRecoveryStatus(status); rememberRecovery(recoveryRequestNo, recoverySecret, status)
      if (status === 'approved') setRecoveryStep('reset')
      else if (status === 'pending') setMsg('Talebiniz henüz yönetici onayında. Onaylandıktan sonra yeni giriş kodunuzu belirleyebilirsiniz.')
      else if (status === 'rejected') { setMsg('Kurtarma talebi onaylanmadı. Bilgilerinizi kontrol edip yeni bir talep oluşturabilirsiniz.'); clearRecovery() }
      else if (status === 'completed') { setMsg('Bu kurtarma talebi daha önce tamamlanmış. Yeni giriş kodunuzla “Zaten kaydım var” bölümünden giriş yapın.'); clearRecovery() }
    } catch { setMsg('Talep durumu kontrol edilemedi. Lütfen tekrar deneyin.') }
    finally { setBusy(false) }
  }

  async function completeRecovery(e: FormEvent) {
    e.preventDefault(); setMsg('')
    if (!/^\d{6}$/.test(newPin)) return setMsg('Yeni giriş kodunuz 6 rakam olmalı.')
    if (newPin !== newPinAgain) return setMsg('Yeni giriş kodları aynı değil.')
    setBusy(true)
    try {
      const data = await gateway({ action: 'recovery_complete', request_no: recoveryRequestNo, recovery_secret: recoverySecret, pin: newPin })
      clearRecovery(); onSuccess(data)
    } catch (err) {
      const code = err instanceof Error ? err.message : ''
      if (code === 'recovery_pending') setMsg('Talep henüz onaylanmadı.')
      else if (code === 'recovery_rejected') setMsg('Bu kurtarma talebi reddedilmiş.')
      else setMsg('Yeni giriş kodu kaydedilemedi. Lütfen tekrar deneyin.')
    } finally { setBusy(false) }
  }

  if (mode === 'recovery') {
    return <div className="screen stack">
      <div className="hero compactHero"><div className="heroText"><div className="eyebrow">ERİPEK GOLD</div><div className="heroTitle">Hesabınızı geri alın</div><div className="heroCopy">SMS gerekmeden, daire doğrulaması ve yönetici onayıyla yeni giriş kodunuzu oluşturun.</div></div></div>
      <button type="button" className="recoveryBack" onClick={() => { setMode('login'); setMsg('') }}>← Giriş ekranına dön</button>

      {recoveryStep === 'form' && <form className="stack" onSubmit={createRecovery}>
        <div className="existingLoginIntro"><div className="eyebrow gold">HESAP KURTARMA</div><strong>Önce hesabınızı ve dairenizi doğrulayalım.</strong><div className="small muted">Bilgiler eşleşirse talebiniz Master Porcelenta yönetim paneline düşer. Onaydan sonra yeni 6 haneli giriş kodunuzu siz belirlersiniz.</div></div>
        <div><label className="label">Kayıtlı Telefon veya E-posta</label><input className="input" value={recoveryIdentifier} onChange={e => setRecoveryIdentifier(e.target.value)} inputMode="email" autoComplete="username" placeholder="05xx xxx xx xx veya ad@eposta.com" /></div>
        <div className="grid3">
          <div><label className="label">Blok</label><select className="input" value={recoveryBlock} onChange={e => { setRecoveryBlock(e.target.value); setRecoveryFloor(''); setRecoveryUnit('') }}><option value="">Seçin</option>{blocks.map(b => <option key={b}>{b}</option>)}</select></div>
          <div><label className="label">Kat</label><select className="input" value={recoveryFloor} disabled={!recoveryBlock} onChange={e => { setRecoveryFloor(e.target.value); setRecoveryUnit('') }}><option value="">Seçin</option>{recoveryFloors.map(f => <option key={f} value={f}>{f}. Kat</option>)}</select></div>
          <div><label className="label">Daire</label><select className="input" value={recoveryUnit} disabled={!recoveryFloor} onChange={e => setRecoveryUnit(e.target.value)}><option value="">Seçin</option>{recoveryUnits.map(u => <option key={u} value={u}>{u}</option>)}</select></div>
        </div>
        <div className="securityQuestion"><div className="eyebrow gold">GÜVENLİK SORUSU</div><strong>Dairenizde Master Porcelenta tarafından daha önce ada tezgâhı uygulaması yapıldı mı?</strong><div className="securityChoices"><button type="button" className={recoveryAnswer === 'yes' ? 'active' : ''} onClick={() => setRecoveryAnswer('yes')}>Evet</button><button type="button" className={recoveryAnswer === 'no' ? 'active' : ''} onClick={() => setRecoveryAnswer('no')}>Hayır</button><button type="button" className={recoveryAnswer === 'not_sure' ? 'active' : ''} onClick={() => setRecoveryAnswer('not_sure')}>Emin değilim</button></div></div>
        <div><label className="label">Ek doğrulama notu <span className="optionalText">(isteğe bağlı)</span></label><textarea className="input textarea" rows={3} value={recoveryNote} onChange={e => setRecoveryNote(e.target.value)} placeholder="Örn: Daireyi eşim teslim aldı / lavaboda özel uygulama vardı / bildiğiniz başka bir detay" /></div>
        {msg && <div className="errorBox">{msg}</div>}
        <button className="btn dark" disabled={busy}>{busy ? 'Talep oluşturuluyor…' : 'Hesap Kurtarma Talebi Oluştur'}</button>
      </form>}

      {recoveryStep === 'pending' && <div className="stack">
        <div className="recoveryTicket"><div className="recoveryIcon">✓</div><div><div className="eyebrow gold">TALEBİNİZ ALINDI</div><strong>{recoveryRequestNo}</strong><div className="small muted">Güvenlik kontrolü için yönetici onayı bekleniyor.</div></div></div>
        <div className="card"><strong>Şimdi ne olacak?</strong><div className="small muted spaceTop">Master Porcelenta talebinizi admin panelinden kontrol edip onaylayacak. Bu sayfayı kapatsanız bile aynı cihaz talebinizi hatırlar.</div></div>
        {msg && <div className={recoveryStatus === 'rejected' ? 'errorBox' : 'successBox'}>{msg}</div>}
        <button className="btn primary" type="button" disabled={busy} onClick={checkRecovery}>{busy ? 'Kontrol ediliyor…' : 'Onay Durumunu Kontrol Et'}</button>
        <button className="btn ghost" type="button" onClick={() => { clearRecovery(); setRecoveryRequestNo(''); setRecoverySecret(''); setRecoveryStatus(''); setRecoveryStep('form'); setMsg('') }}>Yeni bir kurtarma talebi oluştur</button>
      </div>}

      {recoveryStep === 'reset' && <form className="stack" onSubmit={completeRecovery}>
        <div className="successBox"><strong>Kimliğiniz doğrulandı.</strong><div className="small">Talebiniz onaylandı. Şimdi yeni Eripek Gold giriş kodunuzu belirleyin.</div></div>
        <div className="pinGrid"><div><label className="label">Yeni 6 Haneli Kod</label><input className="input pinInput" value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="new-password" placeholder="6 rakam" /></div><div><label className="label">Yeni Kodu Tekrar</label><input className="input pinInput" value={newPinAgain} onChange={e => setNewPinAgain(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="new-password" placeholder="6 rakam" /></div></div>
        {msg && <div className="errorBox">{msg}</div>}
        <button className="btn primary" disabled={busy}>{busy ? 'Kaydediliyor…' : 'Yeni Giriş Kodumu Kaydet ve Hesabımı Aç'}</button>
      </form>}
    </div>
  }

  return <form className="screen stack" onSubmit={submit}>
    <div className="hero compactHero"><div className="heroText"><div className="eyebrow">ERİPEK GOLD</div><div className="heroTitle">Evinize özel dijital alan</div><div className="heroCopy">Garanti, servis ve porselen tasarımlar tek yerde.</div></div></div>

    <div className="accessSwitch" role="tablist" aria-label="Hesap girişi">
      <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setMsg('') }}>İlk kez kullanıyorum</button>
      <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setMsg('') }}>Zaten kaydım var</button>
    </div>

    {mode === 'login' ? <>
      <div className="existingLoginIntro"><div className="eyebrow gold">MEVCUT HESABIM</div><strong>Daha önce dairenizi tanımladıysanız yeniden kayıt olmanıza gerek yok.</strong><div className="small muted">Telefon numaranız veya e-posta adresiniz ve 6 haneli Eripek Gold giriş kodunuzla her cihazdan hesabınıza ulaşın.</div></div>
      <div><label className="label">Telefon veya E-posta</label><input className="input" value={identifier} onChange={e => setIdentifier(e.target.value)} autoComplete="username" placeholder="05xx xxx xx xx veya ad@eposta.com" /></div>
      <div><label className="label">6 Haneli Giriş Kodu</label><input className="input pinInput" value={loginPin} onChange={e => setLoginPin(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="••••••" /></div>
      {msg && <div className="errorBox">{msg}</div>}
      <button className="btn primary" disabled={busy} type="submit">{busy ? 'Hesabınız açılıyor…' : 'Hesabıma Giriş Yap'}</button>
      <button className="forgotCodeBtn" type="button" onClick={() => { setMode('recovery'); setRecoveryStep(recoveryRequestNo ? (recoveryStatus === 'approved' ? 'reset' : 'pending') : 'form'); setMsg('') }}>Giriş kodumu unuttum</button>
      <div className="privacyLine">Aynı hesap <span>•</span> Farklı cihaz <span>•</span> 180 gün hatırlama</div>
    </> : <>
      <div className="sectionHead"><div className="stepBadge">1</div><div><strong>Dairenizi seçin</strong><div className="small muted">QR tüm Eripek Gold konutlarında ortaktır.</div></div></div>
      <div className="grid3">
        <div><label className="label">Blok</label><select className="input" value={block} onChange={e => { setBlock(e.target.value); setFloor(''); setUnit('') }}><option value="">Seçin</option>{blocks.map(b => <option key={b}>{b}</option>)}</select></div>
        <div><label className="label">Kat</label><select className="input" value={floor} disabled={!block} onChange={e => { setFloor(e.target.value); setUnit('') }}><option value="">Seçin</option>{floors.map(f => <option key={f} value={f}>{f}. Kat</option>)}</select></div>
        <div><label className="label">Daire</label><select className="input" value={unit} disabled={!floor} onChange={e => setUnit(e.target.value)}><option value="">Seçin</option>{units.map(u => <option key={u} value={u}>{u}</option>)}</select></div>
      </div>

      {block && floor && unit && <div className="selectedResidence"><div className="small muted">Seçilen konut</div><strong>{block} Blok • {floor}. Kat • Daire {unit}</strong></div>}

      <div className="sectionHead"><div className="stepBadge">2</div><div><strong>Kişisel hesabınızı açın</strong><div className="small muted">Bir kez tanımlayın; sonrasında her cihazdan giriş yapın.</div></div></div>
      <div><label className="label">Ad Soyad</label><input className="input" value={name} onChange={e => setName(e.target.value)} autoComplete="name" placeholder="Adınız Soyadınız" /></div>
      <div><label className="label">Telefon</label><input className="input" value={phone} onChange={e => setPhone(e.target.value)} autoComplete="tel" inputMode="tel" placeholder="05xx xxx xx xx" /></div>
      <div><label className="label">E-posta <span className="optionalText">(isteğe bağlı)</span></label><input className="input" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" inputMode="email" placeholder="ad@eposta.com" /></div>
      <div className="pinGrid"><div><label className="label">6 Haneli Giriş Kodu</label><input className="input pinInput" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="new-password" placeholder="6 rakam" /></div><div><label className="label">Giriş Kodunu Tekrar</label><input className="input pinInput" value={pinAgain} onChange={e => setPinAgain(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="new-password" placeholder="6 rakam" /></div></div>
      <div className="card loginCodeNote"><strong>Bu kod ne işe yarar?</strong><div className="small muted">Telefon değiştirdiğinizde veya başka bir cihazdan girdiğinizde yeniden kayıt olmadan hesabınızı açmanızı sağlar.</div></div>
      {msg && <div className="errorBox">{msg}</div>}
      <button className="btn primary" disabled={busy} type="submit">{busy ? 'Hesabınız hazırlanıyor…' : 'Dairemi Tanımla'}</button>
      <div className="privacyLine">Tek kayıt <span>•</span> Her cihazdan giriş <span>•</span> Uygulama indirme yok</div>
    </>}
  </form>
}

function Dashboard({ customer, residence, sessionToken, onReset }: { customer: Customer; residence: Residence; sessionToken: string; onReset: () => void }) {
  const [tab, setTab] = useState<'home' | 'discover' | 'service' | 'account'>('home')
  return <>
    <div className="screen stack dashboardScreen">
      <div><div className="eyebrow gold">HOŞ GELDİNİZ</div><h2 className="welcome">Merhaba, {customer.full_name}</h2><div className="small muted">{residence.block} Blok • {residence.floor}. Kat • Daire {residence.unit_no}</div></div>
      {tab === 'home' && <HomeTab residence={residence} onService={() => setTab('service')} onDiscover={() => setTab('discover')} />}
      {tab === 'discover' && <DiscoverTab residence={residence} sessionToken={sessionToken} />}
      {tab === 'service' && <ServiceTab residence={residence} sessionToken={sessionToken} />}
      {tab === 'account' && <AccountTab customer={customer} residence={residence} sessionToken={sessionToken} onReset={onReset} />}
    </div>
    <div className="nav"><button className={tab === 'home' ? 'active' : ''} onClick={() => setTab('home')}>⌂<br />Ana Sayfa</button><button className={tab === 'discover' ? 'active' : ''} onClick={() => setTab('discover')}>◇<br />Keşfet</button><button className={tab === 'service' ? 'active' : ''} onClick={() => setTab('service')}>⌁<br />Servis</button><button className={tab === 'account' ? 'active' : ''} onClick={() => setTab('account')}>○<br />Hesabım</button></div>
  </>
}

function HomeTab({ residence, onService, onDiscover }: { residence: Residence; onService: () => void; onDiscover: () => void }) {
  const months = residence.default_warranty_months || 12
  const warrantyEnd = warrantyEndDate(residence.delivery_date, months)
  return <>
    <div className="dashHero"><div><div className="eyebrow">SİZE ÖZEL SEÇKİ</div><h2 className="heroSubTitle">Evinizi tamamlayın</h2><div className="small">Modeli seçin, taşı değiştirin, uygulama seçeneklerini keşfedin.</div></div></div>
    <div className="grid2">
      <div className="card warrantyCard"><div className="iconMark">✓</div><strong>{months} Ay Uygulama Garantisi</strong><div className="small muted">Teslim ve montaj tarihinden itibaren</div>{residence.delivery_date && <div className="warrantyDates"><span>{formatDateTR(residence.delivery_date)}</span><b>→</b><span>{warrantyEnd}</span></div>}</div>
      <button className="card actionCard" onClick={onService}><div className="iconMark">↗</div><strong>Servis Merkezi</strong><div className="small muted">Talebinizi kayıt altına alın</div></button>
    </div>
    <div className="card warrantyInfo">
      <div className="eyebrow gold">GARANTİ KAPSAMI</div>
      <div className="coveragePills"><span>Su sızıntısı</span><span>Çökme</span><span>Aşınma</span></div>
      <div className="small muted">Normal kullanım koşullarında uygulamadan kaynaklanan sızdırma, çökme / ayrılma ve olağandışı aşınmalar garanti kapsamında değerlendirilir.</div>
      <div className="warrantyDivider"></div>
      <div className="small"><strong>Garanti dışı:</strong> Darbe kaynaklı kırılmalar; tesisat, tadilat veya üçüncü kişilerce yapılan işlemlerden doğan hasarlar; sonradan delme / kesme / müdahale ve uygunsuz kimyasal ya da aşındırıcı ürün kullanımı.</div>
    </div>
    <div className="card careCard"><div className="careIcon">◌</div><div><strong>Kolay bakım</strong><div className="small muted spaceTop">Porselen yüzeylerin günlük temizliğinde yumuşak, nemli bir bez yeterlidir. Güçlü kimyasallar ve aşındırıcı temizlik ürünleri kullanmanıza gerek yoktur.</div></div></div>
    <div><div className="sectionTitle">Eviniz için fikirler</div><div className="grid2 roomGrid"><Room title="Mutfak" sub="Ada • Tezgah • Kahve Köşesi" onClick={onDiscover} /><Room title="Yatak Odası" sub="Başlık • Panel • LED" onClick={onDiscover} /></div></div>
  </>
}

function DiscoverTab({ residence, sessionToken }: { residence: Residence; sessionToken: string }) {
  const [roomId, setRoomId] = useState<(typeof STUDIO_ROOMS)[number]['id']>('kitchen')
  const [model, setModel] = useState(STUDIO_MODELS.kitchen[0])
  const [materialId, setMaterialId] = useState<(typeof STUDIO_MATERIALS)[number]['id']>('taj')
  const [saved, setSaved] = useState(false)
  const [requestType, setRequestType] = useState(PROJECT_REQUEST_TYPES[0])
  const [notes, setNotes] = useState('')
  const [requestNo, setRequestNo] = useState('')
  const [requestMsg, setRequestMsg] = useState('')
  const [busy, setBusy] = useState(false)

  const room = STUDIO_ROOMS.find(r => r.id === roomId) || STUDIO_ROOMS[0]
  const material = STUDIO_MATERIALS.find(m => m.id === materialId) || STUDIO_MATERIALS[0]

  function chooseRoom(id: (typeof STUDIO_ROOMS)[number]['id']) {
    setRoomId(id)
    setModel(STUDIO_MODELS[id][0])
    setSaved(false)
    setRequestNo('')
  }

  async function createProjectRequest() {
    setRequestMsg(''); setRequestNo(''); setBusy(true)
    try {
      const data = await gateway({
        action: 'project_request_create',
        session_token: sessionToken,
        residence_id: residence.id,
        request_type: requestType,
        room: room.title,
        design_name: model,
        material_name: material.name,
        notes: notes.trim(),
      })
      setRequestNo(data.request.request_no)
      setNotes('')
    } catch {
      setRequestMsg('Talebiniz oluşturulamadı. Lütfen tekrar deneyin.')
    } finally { setBusy(false) }
  }

  return <>
    <div><div className="eyebrow gold">DİJİTAL TASARIM STÜDYOSU</div><h2 className="welcome">Evinizi tasarlayın</h2><div className="small muted">Odayı, modeli ve porseleni seçin. Gerçek renderlar geldiğinde aynı seçim ekranında birebir ön izleme değişecek.</div></div>

    <div className="studioRoomTabs">{STUDIO_ROOMS.map(r => <button key={r.id} type="button" className={roomId === r.id ? 'studioRoomTab active' : 'studioRoomTab'} onClick={() => chooseRoom(r.id)}><span>{r.icon}</span>{r.title}</button>)}</div>

    <div className={`designPreview material-${material.id} room-${room.id}`}>
      <div className="previewBadge">CANLI TASLAK</div>
      <div className="scene sceneWall"></div><div className="scene sceneObject"></div><div className="scene sceneAccent"></div>
      <div className="previewCopy"><div className="eyebrow">{room.title.toUpperCase()}</div><strong>{model}</strong><div className="small">{material.name}</div></div>
    </div>

    <div className="studioBlock"><div className="sectionTitle">1 • Model seçimi</div><div className="modelChips">{STUDIO_MODELS[roomId].map(m => <button key={m} type="button" className={model === m ? 'chip active' : 'chip'} onClick={() => { setModel(m); setSaved(false); setRequestNo('') }}>{m}</button>)}</div></div>
    <div className="studioBlock"><div className="sectionTitle">2 • Porselen seçimi</div><div className="materialList">{STUDIO_MATERIALS.map(m => <button key={m.id} type="button" className={materialId === m.id ? 'materialOption active' : 'materialOption'} onClick={() => { setMaterialId(m.id); setSaved(false); setRequestNo('') }}><span className={`swatch material-${m.id}`}></span><span><strong>{m.name}</strong><small>{m.note}</small></span><b>›</b></button>)}</div></div>

    <div className="selectionSummary"><div><div className="small muted">Seçiminiz</div><strong>{room.title} • {model}</strong><div className="small muted">{material.name}</div></div><button type="button" className={saved ? 'miniSave saved' : 'miniSave'} onClick={() => setSaved(!saved)}>{saved ? '✓ Kaydedildi' : '♡ Kaydet'}</button></div>

    <div className="card projectLeadCard">
      <div className="eyebrow gold">PROJENİZİ BAŞLATALIM</div>
      <strong>Bu tasarımı evinizde değerlendirelim</strong>
      <div className="small muted">Talebiniz daire bilgilerinizle birlikte Master Porcelenta ekibine iletilir. Tekrar adres veya telefon girmeniz gerekmez.</div>
      <div><label className="label">Talep türü</label><select className="input" value={requestType} onChange={e => setRequestType(e.target.value as typeof requestType)}>{PROJECT_REQUEST_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
      <div><label className="label">Notunuz <span className="muted">(isteğe bağlı)</span></label><textarea className="input textarea" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Örn: Ada tezgahı için yerinde ölçü ve fiyat istiyorum." /></div>
      {requestMsg && <div className="errorBox">{requestMsg}</div>}
      {requestNo && <div className="successBox"><strong>Talebiniz alındı.</strong><div className="small">Proje talep numaranız: {requestNo}</div></div>}
      <button type="button" className="btn primary" disabled={busy || !residence.id} onClick={createProjectRequest}>{busy ? 'Talep oluşturuluyor…' : 'Keşif Talebi Oluştur'}</button>
    </div>

    <div className="card studioNote"><strong>Gerçek render aşaması</strong><div className="small muted spaceTop">Daire fotoğrafları ve gerçek porselen görselleri geldiğinde bu alanları birebir projeye dönüştüreceğiz. Yeni model veya taş eklemek için sistemi yeniden kurmak gerekmeyecek.</div></div>
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
    <div><div className="eyebrow gold">SERVİS MERKEZİ</div><h2 className="welcome">Nasıl yardımcı olabiliriz?</h2><div className="small muted">Talebinizi seçin; kayıt teknik değerlendirmeye alınsın.</div></div>
    <div className="selectedResidence"><div className="small muted">Konut</div><strong>{residence.block} Blok • {residence.floor}. Kat • Daire {residence.unit_no}</strong></div>
    <div className="serviceGuide">
      <div><strong>Garanti kapsamında</strong><div className="coveragePills compact"><span>Su sızıntısı</span><span>Çökme</span><span>Aşınma</span></div></div>
      <div className="small muted">Darbe, tesisat / tadilat müdahaleleri, üçüncü kişi işlemleri ve kimyasal / aşındırıcı ürün kaynaklı hasarlar garanti dışında değerlendirilir.</div>
    </div>
    <div><label className="label">Ürün</label><select className="input" value={product} onChange={e => setProduct(e.target.value)}><option value="">Seçin</option>{SERVICE_PRODUCTS.map(item => <option key={item}>{item}</option>)}</select></div>
    <div><label className="label">Talep türü</label><select className="input" value={issue} onChange={e => setIssue(e.target.value)}><option value="">Seçin</option>{SERVICE_ISSUES.map(item => <option key={item}>{item}</option>)}</select></div>
    <div><label className="label">Açıklama</label><textarea className="input textarea" rows={4} value={description} onChange={e => setDescription(e.target.value)} placeholder="Sorunu kısaca anlatın. Örn: lavabo altından su sızıntısı var." /></div>
    {msg && <div className="errorBox">{msg}</div>}
    {ticket && <div className="successBox"><strong>Servis kaydınız alındı.</strong><div className="small">Talep numaranız: {ticket}</div></div>}
    <button className="btn dark" disabled={busy} type="submit">{busy ? 'Kaydediliyor…' : 'Servis Kaydını Oluştur'}</button>
    <div className="card careMini"><strong>Porselen bakım notu</strong><div className="small muted spaceTop">Günlük temizlik için yumuşak, nemli bez yeterlidir. Güçlü kimyasallar ve aşındırıcı ürünlere ihtiyaç yoktur.</div></div>
  </form>
}

function AccountTab({ customer, residence, sessionToken, onReset }: { customer: Customer; residence: Residence; sessionToken: string; onReset: () => void }) {
  const [email, setEmail] = useState(customer.email || '')
  const [pin, setPin] = useState('')
  const [pinAgain, setPinAgain] = useState('')
  const [msg, setMsg] = useState('')
  const [ok, setOk] = useState(false)
  const [busy, setBusy] = useState(false)

  async function saveLogin(e: FormEvent) {
    e.preventDefault(); setMsg(''); setOk(false)
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setMsg('E-posta adresini kontrol edin.')
    if (!/^\d{6}$/.test(pin)) return setMsg('6 haneli bir giriş kodu belirleyin.')
    if (pin !== pinAgain) return setMsg('Giriş kodları aynı değil.')
    setBusy(true)
    try {
      await gateway({ action: 'login_setup', session_token: sessionToken, email: email.trim(), pin })
      setOk(true); setPin(''); setPinAgain('')
    } catch { setMsg('Giriş bilgileri güncellenemedi. Tekrar deneyin.') }
    finally { setBusy(false) }
  }

  return <>
    <div><div className="eyebrow gold">KİŞİSEL HESABIM</div><h2 className="welcome">Daire bilgilerim</h2></div>
    <div className="card accountCard"><div><div className="small muted">Müşteri</div><strong>{customer.full_name}</strong></div><div><div className="small muted">Telefon</div><strong>{customer.phone}</strong></div>{customer.email && <div><div className="small muted">E-posta</div><strong>{customer.email}</strong></div>}<div><div className="small muted">Konut</div><strong>{residence.block} Blok • {residence.floor}. Kat • Daire {residence.unit_no}</strong></div><div><div className="small muted">Proje</div><strong>Eripek Gold</strong></div><div><div className="small muted">Uygulama garantisi</div><strong>{residence.default_warranty_months || 12} Ay</strong><div className="small muted">Başlangıç: {formatDateTR(residence.delivery_date)}</div></div></div>
    <form className="card accountLoginSetup" onSubmit={saveLogin}>
      <div><div className="eyebrow gold">FARKLI CİHAZDAN GİRİŞ</div><strong>Giriş bilgilerinizi yönetin</strong><div className="small muted spaceTop">Telefon numaranız her zaman kullanılabilir. İsterseniz e-posta ekleyin ve 6 haneli giriş kodunuzu belirleyin veya değiştirin.</div></div>
      <div><label className="label">E-posta <span className="optionalText">(isteğe bağlı)</span></label><input className="input" value={email} onChange={e => setEmail(e.target.value)} inputMode="email" autoComplete="email" placeholder="ad@eposta.com" /></div>
      <div className="pinGrid"><div><label className="label">Yeni 6 Haneli Kod</label><input className="input pinInput" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="6 rakam" /></div><div><label className="label">Kodu Tekrar</label><input className="input pinInput" value={pinAgain} onChange={e => setPinAgain(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="6 rakam" /></div></div>
      {msg && <div className="errorBox">{msg}</div>}{ok && <div className="successBox">Giriş bilgileriniz güncellendi. Artık farklı cihazlardan da hesabınıza girebilirsiniz.</div>}
      <button className="btn dark" type="submit" disabled={busy}>{busy ? 'Kaydediliyor…' : 'Giriş Bilgilerimi Kaydet'}</button>
    </form>
    <button className="btn ghost" onClick={onReset}>Bu cihazdaki hesabı değiştir</button>
  </>
}

function Room({ title, sub, onClick }: { title: string; sub: string; onClick?: () => void }) {
  return <button type="button" className="room" onClick={onClick}><div className="roomVisual"><span>MP</span></div><div className="roomBody"><strong>{title}</strong><div className="small muted">{sub}</div></div></button>
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="page"><section className="phone"><div className="top brandBar"><div className="brandLockup"><div className="monogram">MP</div><div><div className="brand">MASTER PORCELENTA</div><div className="sub">Eripek Gold • Garanti • Servis • Tasarım</div></div></div><div className="goldDot"></div></div>{children}</section></main>
}
