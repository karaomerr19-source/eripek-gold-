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
type ServiceAttachment = { storage_path?: string; mime_type?: string; signed_url?: string; created_at?: string }
type ServiceRequestItem = { id?: string; ticket_no: string; status: string; issue_type: string; description?: string | null; appointment_at?: string | null; admin_note?: string | null; created_at: string; updated_at?: string; residence_id?: string; block?: string; floor?: string; unit_no?: string; attachments?: ServiceAttachment[] }
type ProjectRequestItem = { request_no: string; status: string; request_type?: string | null; room?: string | null; design_name?: string | null; material_name?: string | null; notes?: string | null; appointment_at?: string | null; admin_note?: string | null; quote_amount?: number | null; quote_currency?: string | null; quote_note?: string | null; quote_valid_until?: string | null; quoted_at?: string | null; created_at: string; updated_at?: string; residence_id?: string; block?: string; floor?: string; unit_no?: string }
type InstalledProduct = { id: string; residence_id: string; product_code?: string | null; category: string; name: string; location?: string | null; dimensions?: string | null; installed_at?: string | null; warranty_months?: number | null; notes?: string | null; status?: string }
type FavoriteItem = { id: string; residence_id: string; room?: string | null; design_name?: string | null; material_name?: string | null; created_at?: string }
type StudioVariant = { room?: string | null; design_name?: string | null; model_code?: string | null; material_name?: string | null; preview_image_url?: string | null }
type SupportInfo = { contact_name?: string | null; phone?: string | null; whatsapp?: string | null; email?: string | null; address?: string | null }
type PortalData = { service_requests: ServiceRequestItem[]; project_requests: ProjectRequestItem[]; installed_products: InstalledProduct[]; favorites: FavoriteItem[]; studio_variants: StudioVariant[]; support?: SupportInfo | null }
type ServicePhoto = { name: string; data_url: string }

const GATEWAY = 'https://txknydpygsvwdhxoumcm.supabase.co/functions/v1/qr-gateway'
const ADD_RESIDENCE_RPC = 'https://txknydpygsvwdhxoumcm.supabase.co/rest/v1/rpc/edge_customer_add_residence'
const PLANNING_RPC = 'https://txknydpygsvwdhxoumcm.supabase.co/rest/v1/rpc/edge_customer_request_planning'
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
  {
    id: 'taj',
    name: 'Taj Mahal',
    note: '1/5 • Sıcak bej damar',
    slabImage: 'https://cdn.kale.com.tr/0/0/taj-mahal-parlak-kalesinterflex-porselen-plaka-162x323/379d53d5-6059-4b67-9608-4780d92c5331/650/2',
    slabMeta: 'T-ONE • Taj Mahal • Parlak • 12 mm',
    productUrl: 'https://www.kale.com.tr/taj-mahal-parlak-kalesinterflex-porselen-plaka-160x320-310101110925',
  },
  {
    id: 'crystallus',
    name: 'Crystallus',
    note: '2/5 • Kristalimsi bej • parlak',
    slabImage: 'https://cdn.kale.com.tr/0/0/crystallus-parlak-kalesinterflex-porselen-plaka-162x323/cb8798ec-2269-4c5a-9da4-c4d8211cc268/650/2',
    slabMeta: 'T-ONE • Crystallus • Parlak • 12 mm',
    productUrl: 'https://www.kale.com.tr/crystallus-parlak-kalesinterflex-porselen-plaka-162x323-310101109350',
  },
  {
    id: 'florence',
    name: 'Florence',
    note: '3/5 • Beyaz • sıcak altın/bej damar',
    slabImage: 'https://cdn.kale.com.tr/0/0/florence-parlak-kalesinterflex-porselen-plaka-162x323/d61e15c0-4d5a-479e-9d9d-55b480c6fc7f/650/2',
    slabMeta: 'T-ONE • Florence • Parlak • 12 mm',
    productUrl: 'https://www.kale.com.tr/tr-en/florence-polished-kalesinterflex-porcelain-slab-162x323-310101110212',
  },
  { id: 'soft', name: 'Soft Bej', note: 'Sade • mat görünüm', slabImage: null, slabMeta: null, productUrl: null },
  { id: 'dark', name: 'Dark Modern', note: 'Koyu • güçlü kontrast', slabImage: null, slabMeta: null, productUrl: null },
] as const

const CURATED_PREVIEWS = [
  {
    id: 'eripek-kitchen-island-01',
    roomId: 'kitchen',
    model: 'Şelale Ada',
    materialId: 'taj',
    title: 'Mutfak Porselen Tasarımı',
    subtitle: 'T-ONE • Taj Mahal • 12 mm',
    image: '/eripek-kitchen-island-01.webp',
  },
  {
    id: 'eripek-kitchen-crystallus-01',
    roomId: 'kitchen',
    model: 'Şelale Ada',
    materialId: 'crystallus',
    title: 'Mutfak Porselen Tasarımı',
    subtitle: 'T-ONE • Crystallus • 12 mm',
    image: '/eripek-kitchen-crystallus-01.webp',
  },
  {
    id: 'eripek-kitchen-florence-01',
    roomId: 'kitchen',
    model: 'Şelale Ada',
    materialId: 'florence',
    title: 'Mutfak Porselen Tasarımı',
    subtitle: 'T-ONE • Florence • Parlak • 12 mm',
    image: '/eripek-kitchen-florence-01.webp',
  },
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

const PROJECT_REQUEST_UI: Record<(typeof PROJECT_REQUEST_TYPES)[number], { button: string; busy: string; success: string }> = {
  'Keşif ve ölçü talebi': {
    button: 'Keşif ve Ölçü Talebi Gönder',
    busy: 'Keşif talebiniz oluşturuluyor…',
    success: 'Keşif ve ölçü talebiniz alındı.',
  },
  'Fiyat teklifi istiyorum': {
    button: 'Fiyat Teklifi Talebi Gönder',
    busy: 'Fiyat teklifi talebiniz oluşturuluyor…',
    success: 'Fiyat teklifi talebiniz alındı.',
  },
  'Bu tasarımı evime uygula': {
    button: 'Bu Tasarımı Evime Uygula',
    busy: 'Uygulama talebiniz iletiliyor…',
    success: 'Tasarımı evinize uygulama talebiniz alındı.',
  },
  'Yeni proje danışmanlığı': {
    button: 'Proje Danışmanlığı Talebi Gönder',
    busy: 'Danışmanlık talebiniz oluşturuluyor…',
    success: 'Proje danışmanlığı talebiniz alındı.',
  },
}

const SERVICE_STATUS_LABELS: Record<string, string> = { received: 'Alındı', reviewing: 'İnceleniyor', scheduled: 'Planlandı', in_progress: 'İşlemde', completed: 'Tamamlandı', cancelled: 'İptal' }
const PROJECT_STATUS_LABELS: Record<string, string> = { new: 'Yeni', contacted: 'İletişime geçildi', survey_planned: 'Keşif planlandı', quoted: 'Teklif verildi', won: 'Onaylandı', lost: 'Sonuçlanmadı', cancelled: 'İptal' }

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

function moneyTR(value?: number | null) {
  if (!value) return ''
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 }).format(value)
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

async function sha256Hex(value: string) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return Array.from(new Uint8Array(digest)).map(v => v.toString(16).padStart(2, '0')).join('')
}

async function rpcPost(url: string, body: Record<string, unknown>) {
  const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: PUBLIC_KEY, Authorization: `Bearer ${PUBLIC_KEY}` }, body: JSON.stringify(body), cache: 'no-store' })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error('rpc_failed')
  return data
}

async function addResidenceToAccount(sessionToken: string, block: string, floor: string, unitNo: string) {
  const data = await rpcPost(ADD_RESIDENCE_RPC, { p_session_hash: await sha256Hex(sessionToken), p_block: block, p_floor: floor, p_unit_no: unitNo })
  if (data?.result !== 'ok' && data?.result !== 'already_linked') throw new Error(data?.result || 'residence_add_failed')
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

function cacheAccount(customer: Customer, residence: Residence, residences: Residence[] = [residence]) {
  localStorage.setItem(ACCOUNT_CACHE_KEY, JSON.stringify({ customer, residence, residences }))
}

function readCachedAccount(): { customer: Customer; residence: Residence; residences?: Residence[] } | null {
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

function dateTimeTR(value?: string | null) {
  if (!value) return ''
  return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

function compressServicePhoto(file: File): Promise<ServicePhoto> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith('image/')) return reject(new Error('not_image'))
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('read_failed'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('decode_failed'))
      img.onload = () => {
        const max = 1400
        const scale = Math.min(1, max / Math.max(img.width, img.height))
        const width = Math.max(1, Math.round(img.width * scale))
        const height = Math.max(1, Math.round(img.height * scale))
        const canvas = document.createElement('canvas')
        canvas.width = width; canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('canvas_failed'))
        ctx.drawImage(img, 0, 0, width, height)
        const dataUrl = canvas.toDataURL('image/jpeg', .78)
        if (dataUrl.length > 2_650_000) return reject(new Error('too_large'))
        resolve({ name: file.name || 'servis-fotografi.jpg', data_url: dataUrl })
      }
      img.src = String(reader.result || '')
    }
    reader.readAsDataURL(file)
  })
}

export default function Home() {
  const [stage, setStage] = useState<'loading' | 'register' | 'dashboard' | 'error'>('loading')
  const [catalog, setCatalog] = useState<Residence[]>([])
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [residence, setResidence] = useState<Residence | null>(null)
  const [residences, setResidences] = useState<Residence[]>([])
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
          setResidences(cached.residences?.length ? cached.residences : [cached.residence])
          setSessionToken(saved)
          setStage('dashboard')
        }

        if (saved) {
          try {
            const session: SessionResponse = await gateway({ action: 'session', session_token: saved })
            if (alive && session.customer && session.residences?.length) {
              const cachedId = cached?.residence?.id
              const activeResidence = session.residences.find(r => r.id && r.id === cachedId) || session.residences[0]
              rememberSession(saved)
              cacheAccount(session.customer, activeResidence, session.residences)
              setCustomer(session.customer)
              setResidence(activeResidence)
              setResidences(session.residences)
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

  async function syncResidences(token: string, preferredId?: string) {
    const session: SessionResponse = await gateway({ action: 'session', session_token: token })
    if (!session.customer || !session.residences?.length) return
    const active = session.residences.find(r => r.id === preferredId) || session.residences[0]
    setCustomer(session.customer)
    setResidences(session.residences)
    setResidence(active)
    cacheAccount(session.customer, active, session.residences)
  }

  function selectResidence(next: Residence) {
    if (!customer) return
    setResidence(next)
    cacheAccount(customer, next, residences)
  }

  function loggedIn(data: any) {
    rememberSession(data.session_token)
    const initialResidence = data.residence || data.residences?.[0]
    const initialResidences = data.residences?.length ? data.residences : (initialResidence ? [initialResidence] : [])
    setSessionToken(data.session_token)
    setCustomer(data.customer)
    if (initialResidence) setResidence(initialResidence)
    setResidences(initialResidences)
    if (initialResidence) cacheAccount(data.customer, initialResidence, initialResidences)
    setStage('dashboard')
    syncResidences(data.session_token, initialResidence?.id).catch(() => {})
  }

  async function addedResidence(data: any) {
    const token = data.session_token || sessionToken
    if (data.session_token) { rememberSession(data.session_token); setSessionToken(data.session_token) }
    await syncResidences(token, data.residence?.id)
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
    return <Shell><Dashboard customer={customer} residence={residence} residences={residences.length ? residences : [residence]} sessionToken={sessionToken} onResidenceChange={selectResidence} onResidenceAdded={addedResidence} onReset={resetDevice} /></Shell>
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
    {mode === 'register' ? (
      <div className="registrationCover" aria-label="Eripek Gold güvenli dijital hizmet alanı">
        <img src="/eripek-gold-welcome-premium.webp" alt="Master Porcelenta Eripek Gold — garanti, servis ve özel tasarım" />
      </div>
    ) : (
      <div className="hero compactHero"><div className="heroText"><div className="eyebrow">ERİPEK GOLD</div><div className="heroTitle">Evinize özel dijital alan</div><div className="heroCopy">Garanti, servis ve porselen tasarımlar tek yerde.</div></div></div>
    )}

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
      <PrivacyNotice />
    </>}
  </form>
}

function Dashboard({ customer, residence, residences, sessionToken, onResidenceChange, onResidenceAdded, onReset }: { customer: Customer; residence: Residence; residences: Residence[]; sessionToken: string; onResidenceChange: (residence: Residence) => void; onResidenceAdded: (data: any) => Promise<void>; onReset: () => void }) {
  const [tab, setTab] = useState<'home' | 'discover' | 'requests' | 'service' | 'account' | 'products'>('home')
  const [portal, setPortal] = useState<PortalData>({ service_requests: [], project_requests: [], installed_products: [], favorites: [], studio_variants: [], support: null })
  const [portalLoading, setPortalLoading] = useState(true)

  async function refreshPortal() {
    try {
      const [data, planning] = await Promise.all([
        gateway({ action: 'customer_portal', session_token: sessionToken }),
        rpcPost(PLANNING_RPC, { p_session_hash: await sha256Hex(sessionToken) }).catch(() => null),
      ])
      const servicePlanning = new Map<string, any>((planning?.service_requests || []).map((x: any) => [x.ticket_no, x]))
      const projectPlanning = new Map<string, any>((planning?.project_requests || []).map((x: any) => [x.request_no, x]))
      setPortal({
        service_requests: (data.service_requests || []).map((x: ServiceRequestItem) => ({ ...x, ...(servicePlanning.get(x.ticket_no) || {}) })),
        project_requests: (data.project_requests || []).map((x: ProjectRequestItem) => ({ ...x, ...(projectPlanning.get(x.request_no) || {}) })),
        installed_products: data.installed_products || [],
        favorites: data.favorites || [],
        studio_variants: data.studio_variants || [],
        support: data.support || null,
      })
    } finally { setPortalLoading(false) }
  }

  useEffect(() => { refreshPortal().catch(() => setPortalLoading(false)) }, [sessionToken])

  return <>
    <div className="screen stack dashboardScreen">
      <div className="dashboardWelcome"><div><div className="eyebrow gold">HOŞ GELDİNİZ</div><h2 className="welcome">Merhaba, {customer.full_name}</h2><div className="small muted">{residence.block} Blok • {residence.floor}. Kat • Daire {residence.unit_no}</div></div>{residences.length > 1 && <ResidenceSwitcher residences={residences} residence={residence} onChange={onResidenceChange} />}</div>
      {tab === 'home' && <HomeTab residence={residence} portal={portal} portalLoading={portalLoading} onService={() => setTab('service')} onDiscover={() => setTab('discover')} onRequests={() => setTab('requests')} onProducts={() => setTab('products')} />}
      {tab === 'discover' && <DiscoverTab residence={residence} sessionToken={sessionToken} favorites={portal.favorites} studioVariants={portal.studio_variants} onRefresh={refreshPortal} />}
      {tab === 'requests' && <RequestsTab residence={residence} portal={portal} loading={portalLoading} onRefresh={refreshPortal} />}
      {tab === 'service' && <ServiceTab residence={residence} sessionToken={sessionToken} installedProducts={portal.installed_products} onCreated={refreshPortal} />}
      {tab === 'account' && <AccountTab customer={customer} residence={residence} residences={residences} sessionToken={sessionToken} support={portal.support || null} productCount={portal.installed_products.filter(p => !p.residence_id || p.residence_id === residence.id).length} onProducts={() => setTab('products')} onResidenceChange={onResidenceChange} onResidenceAdded={onResidenceAdded} onReset={onReset} />}
      {tab === 'products' && <ProductsTab residence={residence} products={portal.installed_products.filter(p => !p.residence_id || p.residence_id === residence.id)} loading={portalLoading} onBack={() => setTab('account')} onService={() => setTab('service')} />}
    </div>
    <div className="nav"><button className={tab === 'home' ? 'active' : ''} onClick={() => setTab('home')}>⌂<br />Ana Sayfa</button><button className={tab === 'discover' ? 'active' : ''} onClick={() => setTab('discover')}>◇<br />Keşfet</button><button className={tab === 'requests' ? 'active' : ''} onClick={() => setTab('requests')}>≡<br />Taleplerim</button><button className={tab === 'service' ? 'active' : ''} onClick={() => setTab('service')}>⌁<br />Servis</button><button className={tab === 'account' || tab === 'products' ? 'active' : ''} onClick={() => setTab('account')}>○<br />Hesabım</button></div>
  </>
}

function ResidenceSwitcher({ residences, residence, onChange }: { residences: Residence[]; residence: Residence; onChange: (residence: Residence) => void }) {
  return <details className="residenceSwitcher"><summary><span className="small muted">Aktif daire</span><strong>{residence.block}-{residence.unit_no}</strong><b>⌄</b></summary><div className="residenceSwitcherMenu">{residences.map(r => <button type="button" key={r.id || `${r.block}-${r.floor}-${r.unit_no}`} className={r.id === residence.id ? 'active' : ''} onClick={e => { onChange(r); const d=(e.currentTarget.closest('details') as HTMLDetailsElement | null); if(d)d.open=false }}><span><strong>{r.block} Blok • Daire {r.unit_no}</strong><small>{r.floor}. Kat</small></span>{r.id === residence.id && <em>✓</em>}</button>)}</div></details>
}

function HomeTab({ residence, portal, portalLoading, onService, onDiscover, onRequests, onProducts }: { residence: Residence; portal: PortalData; portalLoading: boolean; onService: () => void; onDiscover: () => void; onRequests: () => void; onProducts: () => void }) {
  const months = residence.default_warranty_months || 12
  const warrantyEnd = warrantyEndDate(residence.delivery_date, months)
  const products = portal.installed_products.filter(p => !p.residence_id || p.residence_id === residence.id)
  const recent = [
    ...portal.service_requests.filter(x => !x.residence_id || x.residence_id === residence.id).map(x => ({ kind: 'Servis', no: x.ticket_no, status: SERVICE_STATUS_LABELS[x.status] || x.status, created_at: x.created_at })),
    ...portal.project_requests.filter(x => !x.residence_id || x.residence_id === residence.id).map(x => ({ kind: x.request_type || 'Proje', no: x.request_no, status: PROJECT_STATUS_LABELS[x.status] || x.status, created_at: x.created_at })),
  ].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, 2)
  return <>
    <div className="dashHero"><div><div className="eyebrow">SİZE ÖZEL SEÇKİ</div><h2 className="heroSubTitle">Evinizi tamamlayın</h2><div className="small">Modeli seçin, taşı değiştirin, uygulama seçeneklerini keşfedin.</div></div></div>
    <div className="grid2">
      <div className="card warrantyCard"><div className="iconMark">✓</div><strong>{months} Ay Uygulama Garantisi</strong><div className="small muted">Teslim ve montaj tarihinden itibaren</div>{residence.delivery_date ? <div className="warrantyDates"><span>{formatDateTR(residence.delivery_date)}</span><b>→</b><span>{warrantyEnd}</span></div> : <div className="small warrantyPending">Montaj tarihi sisteme işlendiğinde garanti takviminiz burada görünecek.</div>}</div>
      <button className="card actionCard" onClick={onService}><div className="iconMark">↗</div><strong>Servis Merkezi</strong><div className="small muted">Talebinizi kayıt altına alın</div></button>
    </div>

    <button className="card productsSummaryCard" onClick={onProducts}>
      <div className="productsSummaryIcon">MP</div>
      <div className="productsSummaryBody">
        <div className="eyebrow gold">ÜRÜNLERİM & GARANTİ</div>
        <strong>{portalLoading ? 'Ürün kayıtları yükleniyor…' : products.length ? `${products.length} ürün kayıtlı` : 'Ürün kayıtlarınızı görüntüleyin'}</strong>
        <div className="small muted">{residence.delivery_date ? `Garanti ${warrantyEnd} tarihine kadar` : 'Ürün, ölçü ve garanti detayları'}</div>
      </div>
      <div className="productsSummaryArrow">›</div>
    </button>

    <button className="card latestRequestsCard" onClick={onRequests}><div className="sectionRow"><div><div className="eyebrow gold">TALEPLERİM</div><strong>Son işlemleriniz</strong></div><b>›</b></div>{portalLoading ? <div className="small muted">Talepler yükleniyor…</div> : recent.length ? <div className="latestRequestList">{recent.map(x => <div key={x.no}><span>{x.kind}</span><strong>{x.status}</strong><small>{x.no}</small></div>)}</div> : <div className="small muted">Henüz servis veya proje talebiniz bulunmuyor.</div>}</button>

    <div className="card warrantyInfo">
      <div className="eyebrow gold">GARANTİ KAPSAMI</div>
      <div className="coveragePills"><span>Su sızıntısı</span><span>Çökme</span><span>Aşınma</span></div>
      <div className="small muted">Normal kullanım koşullarında uygulamadan kaynaklanan sızdırma, çökme / ayrılma ve olağandışı aşınmalar garanti kapsamında değerlendirilir.</div>
      <div className="warrantyDivider"></div>
      <div className="small"><strong>Garanti dışı:</strong> Darbe kaynaklı kırılmalar; tesisat, tadilat veya üçüncü kişilerce yapılan işlemlerden doğan hasarlar; sonradan delme / kesme / müdahale ve uygunsuz kimyasal ya da aşındırıcı ürün kullanımı.</div><div className="siteDamageNote small"><strong>Şantiye teslim notu:</strong> Daire teslimi öncesinde şantiye faaliyetleri veya üçüncü kişiler nedeniyle oluşan kırılma ve çizilmeler müşteri kullanım hatası sayılmaz. Bu tür fiziksel hasarlar Master Porcelenta uygulama garantisi kapsamında değil, ilgili müteahhit / şantiye sorumluluğu kapsamında değerlendirilir.</div>
    </div>
    <div className="card careCard"><div className="careIcon">◌</div><div><strong>Kolay bakım</strong><div className="small muted spaceTop">Porselen yüzeylerin günlük temizliğinde yumuşak, nemli bir bez yeterlidir. Güçlü kimyasallar ve aşındırıcı temizlik ürünleri kullanmanıza gerek yoktur.</div></div></div>
    <div><div className="sectionTitle">Eviniz için fikirler</div><div className="grid2 roomGrid"><Room title="Mutfak" sub="Ada • Tezgah • Kahve Köşesi" onClick={onDiscover} /><Room title="Yatak Odası" sub="Başlık • Panel • LED" onClick={onDiscover} /></div></div>
  </>
}


function ProductsTab({ residence, products, loading, onBack, onService }: { residence: Residence; products: InstalledProduct[]; loading: boolean; onBack: () => void; onService: () => void }) {
  const months = residence.default_warranty_months || 12
  const warrantyEnd = warrantyEndDate(residence.delivery_date, months)
  return <>
    <button type="button" className="subpageBack" onClick={onBack}>‹ Hesabım</button>
    <div><div className="eyebrow gold">ÜRÜNLERİM & GARANTİ</div><h2 className="welcome">Evinizdeki uygulamalar</h2><div className="small muted">{residence.block} Blok • {residence.floor}. Kat • Daire {residence.unit_no}</div></div>
    <div className="card productWarrantySummary">
      <div><div className="small muted">Kayıtlı ürün</div><strong>{products.length}</strong></div>
      <div><div className="small muted">Garanti süresi</div><strong>{months} Ay</strong></div>
      <div><div className="small muted">Garanti bitişi</div><strong>{residence.delivery_date ? warrantyEnd : 'Kayıt bekleniyor'}</strong></div>
    </div>
    {loading ? <div className="card"><div className="small muted">Ürün kayıtları yükleniyor…</div></div> : products.length ? <div className="productDetailList">{products.map(p => {
      const productMonths = p.warranty_months || months
      return <div className="card productDetailCard" key={p.id}>
        <div className="productDetailTop"><div className="productIcon">MP</div><div><div className="small muted">{p.location || p.category}</div><strong>{p.name}</strong></div></div>
        {p.dimensions && <div className="productDimension"><span>Ölçü</span><strong>{p.dimensions}</strong></div>}
        <div className="productDetailMeta"><div><span>Montaj tarihi</span><strong>{formatDateTR(p.installed_at)}</strong></div><div><span>Garanti bitişi</span><strong>{p.installed_at ? warrantyEndDate(p.installed_at, productMonths) : 'Kayıt bekleniyor'}</strong></div></div>
        <button type="button" className="productServiceLink" onClick={onService}>Bu ürün için servis talebi oluştur →</button>
      </div>
    })}</div> : <div className="emptySoft"><strong>Ürün kaydı bulunamadı</strong><div className="small muted">Uygulamalarınız sisteme işlendiğinde burada görüntülenecek.</div></div>}
    <div className="card productWarrantyNote"><div className="eyebrow gold">GARANTİ NOTU</div><div className="small muted">Uygulama garantisi montaj tarihinden itibaren geçerlidir. Daire tesliminden önce şantiye faaliyetleri veya üçüncü kişiler nedeniyle oluşan kırılma ve çizilmeler müşteri kullanım hatası sayılmaz; Master Porcelenta uygulama garantisi yerine ilgili müteahhit / şantiye sorumluluğunda değerlendirilir.</div></div>
  </>
}

function DiscoverTab({ residence, sessionToken, favorites, studioVariants, onRefresh }: { residence: Residence; sessionToken: string; favorites: FavoriteItem[]; studioVariants: StudioVariant[]; onRefresh: () => Promise<void> }) {
  const [roomId, setRoomId] = useState<(typeof STUDIO_ROOMS)[number]['id']>('kitchen')
  const [model, setModel] = useState(STUDIO_MODELS.kitchen[0])
  const [materialId, setMaterialId] = useState<(typeof STUDIO_MATERIALS)[number]['id']>('taj')
  const [requestType, setRequestType] = useState(PROJECT_REQUEST_TYPES[0])
  const [notes, setNotes] = useState('')
  const [requestNo, setRequestNo] = useState('')
  const [requestMsg, setRequestMsg] = useState('')
  const [favoriteBusy, setFavoriteBusy] = useState(false)
  const [busy, setBusy] = useState(false)
  const [slabZoom, setSlabZoom] = useState(false)

  const room = STUDIO_ROOMS.find(r => r.id === roomId) || STUDIO_ROOMS[0]
  const material = STUDIO_MATERIALS.find(m => m.id === materialId) || STUDIO_MATERIALS[0]
  const requestUi = PROJECT_REQUEST_UI[requestType]
  const saved = favorites.some(f => f.residence_id === residence.id && f.room === room.title && f.design_name === model && f.material_name === material.name)
  const realPreview = studioVariants.find(v => v.room === room.title && (v.design_name === model || v.model_code === model) && v.material_name === material.name)
  const curatedPreview = CURATED_PREVIEWS.find(v => v.roomId === roomId && v.model === model && v.materialId === materialId)
  const previewImage = curatedPreview?.image || realPreview?.preview_image_url || null

  useEffect(() => {
    if (!slabZoom) return
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setSlabZoom(false) }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [slabZoom])

  function chooseRoom(id: (typeof STUDIO_ROOMS)[number]['id']) {
    setRoomId(id); setModel(STUDIO_MODELS[id][0]); setRequestNo('')
  }

  function openFavorite(f: FavoriteItem) {
    const targetRoom = STUDIO_ROOMS.find(r => r.title === f.room)
    if (!targetRoom) return
    setRoomId(targetRoom.id)
    setModel(f.design_name && STUDIO_MODELS[targetRoom.id].includes(f.design_name) ? f.design_name : STUDIO_MODELS[targetRoom.id][0])
    const targetMaterial = STUDIO_MATERIALS.find(m => m.name === f.material_name)
    if (targetMaterial) setMaterialId(targetMaterial.id)
    setRequestNo('')
  }

  async function toggleFavorite() {
    setFavoriteBusy(true); setRequestMsg('')
    try {
      await gateway({ action: 'favorite_toggle', session_token: sessionToken, residence_id: residence.id, room: room.title, design_name: model, material_name: material.name })
      await onRefresh()
    } catch { setRequestMsg('Seçiminiz kaydedilemedi. Lütfen tekrar deneyin.') }
    finally { setFavoriteBusy(false) }
  }

  async function createProjectRequest() {
    setRequestMsg(''); setRequestNo(''); setBusy(true)
    try {
      const data = await gateway({
        action: 'project_request_create', session_token: sessionToken, residence_id: residence.id,
        request_type: requestType, room: room.title, design_name: model, material_name: material.name, notes: notes.trim(),
      })
      setRequestNo(data.request.request_no); setNotes(''); await onRefresh()
    } catch { setRequestMsg('Talebiniz oluşturulamadı. Lütfen tekrar deneyin.') }
    finally { setBusy(false) }
  }

  return <>
    <div><div className="eyebrow gold">DİJİTAL TASARIM SEÇİMİ</div><h2 className="welcome">Eviniz için kombinasyon oluşturun</h2><div className="small muted">Odayı, modeli ve porseleni seçin. Beğendiğiniz kombinasyonu hesabınıza kaydedin veya doğrudan talep oluşturun.</div></div>

    <div className="studioRoomTabs">{STUDIO_ROOMS.map(r => <button key={r.id} type="button" className={roomId === r.id ? 'studioRoomTab active' : 'studioRoomTab'} onClick={() => chooseRoom(r.id)}><span>{r.icon}</span>{r.title}</button>)}</div>

    <div className={`designPreview material-${material.id} room-${room.id} ${curatedPreview ? 'curatedPreview' : ''}`}>
      <div className="previewBadge">{curatedPreview ? 'ERİPEK GOLD • ÖZEL TASARIM' : 'ÖZEL ÖN İZLEME'}</div>
      {previewImage ? <img className="realPreviewImage" src={previewImage} alt={curatedPreview?.title || `${room.title} ${model} ${material.name}`} /> : <><div className="scene sceneWall"></div><div className="scene sceneObject"></div><div className="scene sceneAccent"></div></>}
      <div className="previewCopy"><div className="eyebrow">{room.title.toUpperCase()}</div><strong>{curatedPreview?.title || model}</strong><div className="small">{curatedPreview?.subtitle || material.name}</div></div>
    </div>

    <div className="studioBlock"><div className="sectionTitle">1 • Model seçimi</div><div className="modelChips">{STUDIO_MODELS[roomId].map(m => <button key={m} type="button" className={model === m ? 'chip active' : 'chip'} onClick={() => { setModel(m); setRequestNo('') }}>{m}</button>)}</div></div>
    <div className="studioBlock"><div className="sectionTitle">2 • Porselen seçimi</div><div className="materialList">{STUDIO_MATERIALS.map(m => <button key={m.id} type="button" className={materialId === m.id ? 'materialOption active' : 'materialOption'} onClick={() => { setMaterialId(m.id); setRequestNo('') }}>{m.slabImage ? <img className="materialRealThumb" src={m.slabImage} alt={`${m.name} gerçek porselen plaka`} loading="lazy" /> : <span className={`swatch material-${m.id}`}></span>}<span><strong>{m.name}</strong><small>{m.note}</small></span><b>›</b></button>)}</div></div>

    {material.slabImage && <>
      <div className="realSlabCard">
        <button type="button" className="realSlabVisual" onClick={() => setSlabZoom(true)} aria-label={`${material.name} gerçek plaka görselini büyüt`}>
          <img src={material.slabImage} alt={`${material.name} gerçek T-ONE plaka görünümü`} />
          <span className="slabZoomHint">⌕ Büyüt</span>
        </button>
        <div className="realSlabCopy">
          <div className="eyebrow gold">GERÇEK PLAKA GÖRÜNÜMÜ</div>
          <strong>{material.slabMeta}</strong>
          <a className="kaleSourceLine" href={material.productUrl || 'https://www.kale.com.tr/'} target="_blank" rel="noreferrer" aria-label={`Kale resmi ${material.name} ürün sayfasını aç`}>
            <span className="kaleWordmark">
              <svg className="kaleCastleMark" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h4v4h3V4h4v4h3V4h4v16H3V4Zm4 10v6h3v-6H7Zm7 0v6h3v-6h-3Z" /></svg>
              <b>Kale</b>
            </span>
            <span>resmî ürün görseli</span><span aria-hidden="true">↗</span>
          </a>
          <div className="small muted">Görsele dokunarak plakayı büyük inceleyebilirsiniz. Ekran renkleri fiziksel numuneden küçük farklılık gösterebilir.</div>
        </div>
      </div>
      {slabZoom && <div className="slabLightbox" role="dialog" aria-modal="true" aria-label={`${material.name} plaka büyük görünümü`} onClick={() => setSlabZoom(false)}>
        <div className="slabLightboxPanel" onClick={event => event.stopPropagation()}>
          <button type="button" className="slabLightboxClose" onClick={() => setSlabZoom(false)} aria-label="Büyük görseli kapat">×</button>
          <img src={material.slabImage} alt={`${material.name} gerçek T-ONE plaka büyük görünümü`} />
          <div className="slabLightboxCaption">
            <div><strong>{material.slabMeta}</strong><span>Gerçek plaka görünümü</span></div>
            <a className="kaleSourceLine compact" href={material.productUrl || 'https://www.kale.com.tr/'} target="_blank" rel="noreferrer">
              <span className="kaleWordmark"><svg className="kaleCastleMark" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h4v4h3V4h4v4h3V4h4v16H3V4Zm4 10v6h3v-6H7Zm7 0v6h3v-6h-3Z" /></svg><b>Kale</b></span><span>resmî ürün sayfası ↗</span>
            </a>
          </div>
        </div>
      </div>}
    </>}

    <div className="selectionSummary"><div><div className="small muted">Seçiminiz</div><strong>{room.title} • {model}</strong><div className="small muted">{material.name}</div></div><button type="button" disabled={favoriteBusy} className={saved ? 'miniSave saved' : 'miniSave'} onClick={toggleFavorite}>{favoriteBusy ? 'Kaydediliyor…' : saved ? '✓ Kaydedildi' : '♡ Kaydet'}</button></div>

    {favorites.length > 0 && <div className="card savedDesignsCard"><div className="sectionRow"><div><div className="eyebrow gold">KAYDETTİKLERİM</div><strong>Beğendiğiniz tasarımlar</strong></div><span className="countPill">{favorites.length}</span></div><div className="savedDesignList">{favorites.map(f => <button key={f.id} type="button" onClick={() => openFavorite(f)}><span className="savedMiniVisual">MP</span><span><strong>{f.room} • {f.design_name}</strong><small>{f.material_name}</small></span><b>›</b></button>)}</div></div>}

    <div className="card projectLeadCard">
      <div className="eyebrow gold">PROJENİZİ BAŞLATALIM</div>
      <strong>Bu seçimi evinizde değerlendirelim</strong>
      <div className="small muted">Talebiniz daire bilgilerinizle birlikte Master Porcelenta ekibine iletilir. Tekrar adres veya telefon girmeniz gerekmez.</div>
      <div><label className="label">Talep türü</label><select className="input" value={requestType} onChange={e => setRequestType(e.target.value as typeof requestType)}>{PROJECT_REQUEST_TYPES.map(t => <option key={t}>{t}</option>)}</select></div>
      <div><label className="label">Notunuz <span className="muted">(isteğe bağlı)</span></label><textarea className="input textarea" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Örn: Ada tezgahı için yerinde ölçü ve fiyat istiyorum." /></div>
      {requestMsg && <div className="errorBox">{requestMsg}</div>}
      {requestNo && <div className="successBox"><strong>{requestUi.success}</strong><div className="small">Talep numaranız: {requestNo}</div></div>}
      <button type="button" className="btn primary" disabled={busy || !residence.id} onClick={createProjectRequest}>{busy ? requestUi.busy : requestUi.button}</button>
    </div>
  </>
}

function RequestsTab({ residence, portal, loading, onRefresh }: { residence: Residence; portal: PortalData; loading: boolean; onRefresh: () => Promise<void> }) {
  const [kind, setKind] = useState<'all' | 'service' | 'project'>('all')
  const all = [
    ...portal.service_requests.filter(x => !x.residence_id || x.residence_id === residence.id).map(x => ({ type: 'service' as const, no: x.ticket_no, title: x.issue_type, detail: x.description || '', status: SERVICE_STATUS_LABELS[x.status] || x.status, rawStatus: x.status, created_at: x.created_at, appointment_at: x.appointment_at || null, admin_note: x.admin_note || '', attachments: x.attachments || [], quote_amount: null as number | null, quote_note: '', quote_valid_until: null as string | null })),
    ...portal.project_requests.filter(x => !x.residence_id || x.residence_id === residence.id).map(x => ({ type: 'project' as const, no: x.request_no, title: x.request_type || 'Proje talebi', detail: [x.room, x.design_name, x.material_name].filter(Boolean).join(' • '), status: PROJECT_STATUS_LABELS[x.status] || x.status, rawStatus: x.status, created_at: x.created_at, appointment_at: x.appointment_at || null, admin_note: x.admin_note || '', attachments: [] as ServiceAttachment[], quote_amount: x.quote_amount || null, quote_note: x.quote_note || '', quote_valid_until: x.quote_valid_until || null })),
  ].filter(x => kind === 'all' || x.type === kind).sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))

  return <div className="stack"><div><div className="eyebrow gold">TALEPLERİM</div><h2 className="welcome">İşlemlerinizi takip edin</h2><div className="small muted">{residence.block} Blok • {residence.floor}. Kat • Daire {residence.unit_no} için servis, keşif ve teklif talepleriniz.</div></div>
    <div className="requestFilters"><button className={kind === 'all' ? 'active' : ''} onClick={() => setKind('all')}>Tümü</button><button className={kind === 'service' ? 'active' : ''} onClick={() => setKind('service')}>Servis</button><button className={kind === 'project' ? 'active' : ''} onClick={() => setKind('project')}>Proje / Teklif</button><button className="refreshRequests" onClick={() => onRefresh()}>↻</button></div>
    {loading ? <div className="card small muted">Talepler yükleniyor…</div> : all.length ? <div className="customerRequestList">{all.map(x => <div className="card customerRequest" key={x.no}><div className="customerRequestTop"><div><div className="ticketNo">{x.no}</div><strong>{x.title}</strong></div><span className={`customerStatus st-${x.rawStatus}`}>{x.status}</span></div>{x.detail && <div className="small muted">{x.detail}</div>}{x.appointment_at && <div className="requestAppointment"><span>Planlanan tarih</span><strong>{dateTimeTR(x.appointment_at)}</strong></div>}{x.admin_note && <div className="requestAdminNote"><span>Master Porcelenta notu</span><div>{x.admin_note}</div></div>}{x.type === 'project' && x.quote_amount ? <div className="quoteCustomerBox"><div className="small muted">Master Porcelenta fiyat teklifi</div><strong>{moneyTR(x.quote_amount)}</strong>{x.quote_note && <div className="small">{x.quote_note}</div>}{x.quote_valid_until && <div className="small muted">Geçerlilik: {formatDateTR(x.quote_valid_until)}</div>}</div> : null}<div className="small requestDate">{dateTimeTR(x.created_at)}</div>{x.attachments.length > 0 && <div className="attachmentGrid">{x.attachments.map((a, i) => a.signed_url ? <a href={a.signed_url} target="_blank" rel="noreferrer" key={a.storage_path || i}><img src={a.signed_url} alt={`Servis fotoğrafı ${i + 1}`} /></a> : null)}</div>}</div>)}</div> : <div className="emptySoft"><strong>Henüz talebiniz yok</strong><div className="small muted">Servis veya proje talebi oluşturduğunuzda kayıtlarınız burada görünür.</div></div>}
  </div>
}

function ServiceTab({ residence, sessionToken, installedProducts, onCreated }: { residence: Residence; sessionToken: string; installedProducts: InstalledProduct[]; onCreated: () => Promise<void> }) {
  const [product, setProduct] = useState('')
  const [issue, setIssue] = useState('')
  const [description, setDescription] = useState('')
  const [photos, setPhotos] = useState<ServicePhoto[]>([])
  const [msg, setMsg] = useState('')
  const [ticket, setTicket] = useState('')
  const [busy, setBusy] = useState(false)
  const [photoBusy, setPhotoBusy] = useState(false)

  async function selectPhotos(files: FileList | null) {
    if (!files?.length) return
    setMsg('')
    const remaining = Math.max(0, 3 - photos.length)
    if (!remaining) return setMsg('En fazla 3 fotoğraf ekleyebilirsiniz.')
    setPhotoBusy(true)
    try {
      const selected = Array.from(files).slice(0, remaining)
      const compressed: ServicePhoto[] = []
      for (const file of selected) compressed.push(await compressServicePhoto(file))
      setPhotos(prev => [...prev, ...compressed].slice(0, 3))
      if (files.length > remaining) setMsg('En fazla 3 fotoğraf eklenebilir; ilk fotoğraflar seçildi.')
    } catch { setMsg('Fotoğraf hazırlanamadı. JPG, PNG veya telefonunuzun normal kamera fotoğrafını deneyin.') }
    finally { setPhotoBusy(false) }
  }

  async function submit(e: FormEvent) {
    e.preventDefault(); setMsg(''); setTicket('')
    if (!product || !issue || description.trim().length < 5) return setMsg('Ürün, talep türü ve kısa açıklamayı doldurun.')
    setBusy(true)
    try {
      const data = await gateway({ action: 'service_create', session_token: sessionToken, residence_id: residence.id, product, issue_type: issue, description: description.trim(), photos })
      setTicket(data.ticket.ticket_no); setProduct(''); setIssue(''); setDescription(''); setPhotos([]); await onCreated()
    } catch (err) {
      const code = err instanceof Error ? err.message : ''
      if (code === 'service_photo_invalid') setMsg('Fotoğraflardan biri uygun formatta değil veya çok büyük. Lütfen tekrar seçin.')
      else setMsg('Servis kaydı oluşturulamadı. Lütfen tekrar deneyin.')
    } finally { setBusy(false) }
  }

  return <form className="stack" onSubmit={submit}>
    <div><div className="eyebrow gold">SERVİS MERKEZİ</div><h2 className="welcome">Nasıl yardımcı olabiliriz?</h2><div className="small muted">Sorunu anlatın ve isterseniz fotoğraf ekleyin; kayıt teknik değerlendirmeye alınsın.</div></div>
    <div className="selectedResidence"><div className="small muted">Konut</div><strong>{residence.block} Blok • {residence.floor}. Kat • Daire {residence.unit_no}</strong></div>
    <div className="serviceGuide"><div><strong>Garanti kapsamında</strong><div className="coveragePills compact"><span>Su sızıntısı</span><span>Çökme</span><span>Aşınma</span></div></div><div className="small muted">Darbe, tesisat / tadilat müdahaleleri, üçüncü kişi işlemleri ve kimyasal / aşındırıcı ürün kaynaklı hasarlar garanti dışında değerlendirilir. Daire teslimi öncesindeki şantiye kaynaklı fiziksel hasarlar müşteri kullanım hatası sayılmaz.</div></div>
    <div><label className="label">Ürün</label><select className="input" value={product} onChange={e => setProduct(e.target.value)}><option value="">Seçin</option>{installedProducts.filter(p => p.residence_id === residence.id).length ? installedProducts.filter(p => p.residence_id === residence.id).map(p => <option key={p.id} value={p.name}>{p.name}{p.dimensions ? ` • ${p.dimensions}` : ''}</option>) : SERVICE_PRODUCTS.map(item => <option key={item}>{item}</option>)}</select></div>
    <div><label className="label">Talep türü</label><select className="input" value={issue} onChange={e => setIssue(e.target.value)}><option value="">Seçin</option>{SERVICE_ISSUES.map(item => <option key={item}>{item}</option>)}</select></div>
    <div><label className="label">Açıklama</label><textarea className="input textarea" rows={4} value={description} onChange={e => setDescription(e.target.value)} placeholder="Sorunu kısaca anlatın. Örn: lavabo altından su sızıntısı var." /></div>
    <div className="photoUploadBox"><div><label className="label">Fotoğraf <span className="optionalText">(isteğe bağlı • en fazla 3)</span></label><div className="small muted">Sorunu gösteren fotoğraflar teknik değerlendirmeyi hızlandırır.</div></div><label className="photoPickBtn">{photoBusy ? 'Fotoğraf hazırlanıyor…' : '+ Fotoğraf Ekle'}<input type="file" accept="image/*" multiple disabled={photoBusy || photos.length >= 3} onChange={e => { selectPhotos(e.currentTarget.files); e.currentTarget.value = '' }} /></label>{photos.length > 0 && <div className="photoPreviewGrid">{photos.map((p, i) => <div key={`${p.name}-${i}`}><img src={p.data_url} alt={`Seçilen fotoğraf ${i + 1}`} /><button type="button" onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}>×</button></div>)}</div>}</div>
    {msg && <div className="errorBox">{msg}</div>}
    {ticket && <div className="successBox"><strong>Servis kaydınız alındı.</strong><div className="small">Talep numaranız: {ticket} • Durumunu “Taleplerim” bölümünden takip edebilirsiniz.</div></div>}
    <button className="btn dark" disabled={busy || photoBusy} type="submit">{busy ? 'Kaydediliyor…' : 'Servis Kaydını Oluştur'}</button>
    <div className="card careMini"><strong>Porselen bakım notu</strong><div className="small muted spaceTop">Günlük temizlik için yumuşak, nemli bez yeterlidir. Güçlü kimyasallar ve aşındırıcı ürünlere ihtiyaç yoktur.</div></div>
  </form>
}

function AccountTab({ customer, residence, residences, sessionToken, support, productCount, onProducts, onResidenceChange, onResidenceAdded, onReset }: { customer: Customer; residence: Residence; residences: Residence[]; sessionToken: string; support: SupportInfo | null; productCount: number; onProducts: () => void; onResidenceChange: (residence: Residence) => void; onResidenceAdded: (data: any) => Promise<void>; onReset: () => void }) {
  const [email, setEmail] = useState(customer.email || '')
  const [pin, setPin] = useState('')
  const [pinAgain, setPinAgain] = useState('')
  const [msg, setMsg] = useState('')
  const [ok, setOk] = useState(false)
  const [busy, setBusy] = useState(false)
  const [addBlock, setAddBlock] = useState('')
  const [addFloor, setAddFloor] = useState('')
  const [addUnit, setAddUnit] = useState('')
  const [addMsg, setAddMsg] = useState('')
  const [addOk, setAddOk] = useState(false)
  const [addBusy, setAddBusy] = useState(false)
  const floorUnits = addFloor ? ({ '1':['1','2','3','4'], '2':['5','6','7','8'], '3':['9','10','11','12'], '4':['13','14','15','16'], '5':['17','18','19','20'], '6':['21','22','23','24'], '7':['25'] } as Record<string,string[]>)[addFloor] || [] : []

  async function addResidence(e: FormEvent) {
    e.preventDefault(); setAddMsg(''); setAddOk(false)
    if (!addBlock || !addFloor || !addUnit) return setAddMsg('Blok, kat ve daire bilgilerini seçin.')
    setAddBusy(true)
    try {
      const data = await addResidenceToAccount(sessionToken, addBlock, addFloor, addUnit)
      await onResidenceAdded({ residence: { id: data.residence_id } })
      setAddOk(true); setAddBlock(''); setAddFloor(''); setAddUnit('')
    } catch (err) {
      const code = err instanceof Error ? err.message : ''
      if (code === 'invalid_session') setAddMsg('Oturumunuz sona ermiş. Güvenli çıkış yapıp yeniden giriş yapın.')
      else if (code === 'residence_already_claimed') setAddMsg('Bu daire başka bir hesaba tanımlanmış veya daha önce aktive edilmiş. Master Porcelenta ile iletişime geçin.')
      else if (code === 'residence_not_found' || code === 'invalid_residence') setAddMsg('Daire bilgilerini kontrol edin.')
      else setAddMsg('Daire hesabınıza eklenemedi. Bilgileri kontrol edip tekrar deneyin.')
    } finally { setAddBusy(false) }
  }

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
    <div className="card residencesCard"><div className="residencesCardHead"><div><div className="eyebrow gold">DAİRELERİM</div><strong>{residences.length} kayıtlı konut</strong><div className="small muted">Daire değiştirdiğinizde ürün, garanti, servis ve talepler o konuta göre gösterilir.</div></div></div><div className="residenceList">{residences.map(r => <button type="button" key={r.id || `${r.block}-${r.floor}-${r.unit_no}`} className={r.id === residence.id ? 'active' : ''} onClick={() => onResidenceChange(r)}><span><b>{r.block} Blok • Daire {r.unit_no}</b><small>{r.floor}. Kat</small></span><em>{r.id === residence.id ? 'Aktif' : 'Seç'}</em></button>)}</div><details className="addResidenceDetails"><summary>+ Başka dairem var</summary><form className="addResidenceForm" onSubmit={addResidence}><div className="grid3"><select className="input" value={addBlock} onChange={e => setAddBlock(e.target.value)}><option value="">Blok</option>{['A','B','C','D'].map(x => <option key={x}>{x}</option>)}</select><select className="input" value={addFloor} onChange={e => { setAddFloor(e.target.value); setAddUnit('') }}><option value="">Kat</option>{['1','2','3','4','5','6','7'].map(x => <option key={x}>{x}</option>)}</select><select className="input" value={addUnit} onChange={e => setAddUnit(e.target.value)} disabled={!addFloor}><option value="">Daire</option>{floorUnits.map(x => <option key={x}>{x}</option>)}</select></div><div className="small muted">Bu işlem seçtiğiniz konutu mevcut Master Porcelenta hesabınıza bağlar. Daire başka bir hesaba tanımlıysa işlem yapılmaz.</div>{addMsg && <div className="errorBox">{addMsg}</div>}{addOk && <div className="successBox">Daire hesabınıza eklendi ve aktif konut olarak seçildi.</div>}<button className="btn dark" disabled={addBusy} type="submit">{addBusy ? 'Ekleniyor…' : 'Daireyi Hesabıma Ekle'}</button></form></details></div>
    <button type="button" className="card accountProductsLink" onClick={onProducts}><div className="productsSummaryIcon">MP</div><div><div className="eyebrow gold">ÜRÜNLERİM & GARANTİ</div><strong>{productCount} kayıtlı uygulama</strong><div className="small muted">Ölçü, montaj ve garanti detaylarını görüntüleyin</div></div><b>›</b></button>
    <form className="card accountLoginSetup" onSubmit={saveLogin}>
      <div><div className="eyebrow gold">FARKLI CİHAZDAN GİRİŞ</div><strong>Giriş bilgilerinizi yönetin</strong><div className="small muted spaceTop">Telefon numaranız her zaman kullanılabilir. İsterseniz e-posta ekleyin ve 6 haneli giriş kodunuzu belirleyin veya değiştirin.</div></div>
      <div><label className="label">E-posta <span className="optionalText">(isteğe bağlı)</span></label><input className="input" value={email} onChange={e => setEmail(e.target.value)} inputMode="email" autoComplete="email" placeholder="ad@eposta.com" /></div>
      <div className="pinGrid"><div><label className="label">Yeni 6 Haneli Kod</label><input className="input pinInput" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="6 rakam" /></div><div><label className="label">Kodu Tekrar</label><input className="input pinInput" value={pinAgain} onChange={e => setPinAgain(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="6 rakam" /></div></div>
      {msg && <div className="errorBox">{msg}</div>}{ok && <div className="successBox">Giriş bilgileriniz güncellendi. Artık farklı cihazlardan da hesabınıza girebilirsiniz.</div>}
      <button className="btn dark" type="submit" disabled={busy}>{busy ? 'Kaydediliyor…' : 'Giriş Bilgilerimi Kaydet'}</button>
    </form>
    {support && <div className="card supportCard"><div><div className="eyebrow gold">MÜŞTERİ DESTEĞİ</div><strong>Master Porcelenta ile iletişim</strong></div><div className="supportActions">{support.phone && <a href={`tel:${support.phone.replace(/\D/g, '')}`}><span>Telefon</span><strong>{support.phone}</strong>{support.contact_name && <small>{support.contact_name}</small>}</a>}{support.whatsapp && <a href={`https://wa.me/90${support.whatsapp.replace(/\D/g, '').replace(/^0/, '')}`} target="_blank" rel="noreferrer"><span>WhatsApp</span><strong>{support.whatsapp}</strong><small>Master Porcelenta</small></a>}{support.email && <a href={`mailto:${support.email}`}><span>E-posta</span><strong>{support.email}</strong></a>}</div>{support.address && <div className="supportAddress small muted">İşletme adresi: {support.address}</div>}</div>}
    <PrivacyNotice />
    <button className="btn ghost" onClick={async()=>{try{await gateway({action:'customer_logout',session_token:sessionToken})}catch{}onReset()}}>Güvenli çıkış yap</button>
  </>
}

function PrivacyNotice() {
  return <details className="privacyNotice">
    <summary>KVKK Aydınlatma Metni <span>›</span></summary>
    <div className="privacyNoticeBody">
      <p><strong>Veri sorumlusu:</strong> Master Porcelenta, TPAO BLV NO: 75/A Batman/Merkez.</p>
      <p>Eripek Gold portalında ad-soyad, telefon, isteğe bağlı e-posta, konut bilgisi, ürün/garanti kayıtları, servis ve proje/teklif talepleri ile servis için yüklediğiniz ürün/hasar fotoğrafları; hesabınızın oluşturulması, garanti bilgilerinin sunulması, servis ve teklif süreçlerinin yürütülmesi, sizinle iletişim kurulması ve portal güvenliğinin sağlanması amaçlarıyla işlenir.</p>
      <p>Veriler elektronik ortamda, tarafınızca girilen bilgiler ve portal kullanımı yoluyla elde edilir; ilgili süreç bakımından 6698 sayılı Kanun'un 5. maddesindeki sözleşmenin kurulması veya ifasıyla doğrudan ilgili olma, veri sorumlusunun hukuki yükümlülüğünü yerine getirmesi ve temel haklarınıza zarar vermemek kaydıyla meşru menfaat işleme şartlarına dayanılarak işlenir.</p>
      <p>Veriler, hizmetin yürütülmesi için gerektiği ölçüde teknik altyapı/barındırma hizmet sağlayıcılarıyla ve kanunen talep edilmesi halinde yetkili kamu kurum ve kuruluşlarıyla paylaşılabilir.</p>
      <p>6698 sayılı Kanun'un 11. maddesi kapsamındaki haklarınıza ilişkin başvurularınızı <a href="mailto:masterporcelenta@gmail.com">masterporcelenta@gmail.com</a> adresine veya yukarıdaki işletme adresine iletebilirsiniz.</p>
      <p className="privacyPhotoNote"><strong>Servis fotoğrafı:</strong> Yalnızca ürün ve hasar alanını paylaşın; kişi, kimlik belgesi veya özel belge görüntüsü yüklemeyin.</p>
    </div>
  </details>
}

function Room({ title, sub, onClick }: { title: string; sub: string; onClick?: () => void }) {
  return <button type="button" className="room" onClick={onClick}><div className="roomVisual"><span>MP</span></div><div className="roomBody"><strong>{title}</strong><div className="small muted">{sub}</div></div></button>
}

function Shell({ children }: { children: React.ReactNode }) {
  return <main className="page"><section className="phone"><div className="top brandBar"><div className="brandLockup"><img className="brandMarkImg" src="/master-porcelenta-mark.png" alt="Master Porcelenta" /><div><div className="brand">MASTER PORCELENTA</div><div className="sub">Eripek Gold • Garanti • Servis • Tasarım</div></div></div><div className="goldDot"></div></div>{children}</section></main>
}
