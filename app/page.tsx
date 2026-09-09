'use client'

import { type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react'

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

type DashboardTab = 'home' | 'products' | 'discover' | 'requests' | 'account' | 'service'
type HistoryMode = 'push' | 'replace'

const GATEWAY = 'https://txknydpygsvwdhxoumcm.supabase.co/functions/v1/qr-gateway'
const ADD_RESIDENCE_RPC = 'https://txknydpygsvwdhxoumcm.supabase.co/rest/v1/rpc/edge_customer_add_residence'
const PLANNING_RPC = 'https://txknydpygsvwdhxoumcm.supabase.co/rest/v1/rpc/edge_customer_request_planning'
const PUBLIC_KEY = 'sb_publishable_Zsyau0ZEke4HzdXqpt1gww_aFuxn7ia'
const SESSION_KEY = 'eripek_gold_session'
const ACCOUNT_CACHE_KEY = 'eripek_gold_account'
const SESSION_COOKIE_KEY = 'eripek_gold_session'
const DISCOVER_CACHE_KEY = 'eripek_gold_discover_selection_v2'

const STUDIO_ROOMS = [
  { id: 'kitchen', title: 'Mutfak', sub: 'Ada • Tezgah • Kahve Köşesi', icon: 'K' },
  { id: 'bedroom', title: 'Yatak Odası', sub: 'Başlık • Baza • LED Panel', icon: 'Y' },
  { id: 'bathroom', title: 'Banyo', sub: 'Lavabo • Niş • Duvar', icon: 'B' },
  { id: 'living', title: 'Salon', sub: 'TV Ünitesi • Masa • Dresuar', icon: 'S' },
] as const

type StudioRoomId = (typeof STUDIO_ROOMS)[number]['id']

const STUDIO_MODELS: Record<StudioRoomId, string[]> = {
  kitchen: ['Şelale Ada', 'Düz Modern Ada', 'Oturma Çıkıntılı Ada'],
  bedroom: ['Düz Panel', 'LED’li Panel', 'Tavana Kadar Panel'],
  bathroom: ['Ayaklı Lavabo', 'Duvar Boyu Lavabo', 'Lavabo + Niş Seti'],
  living: ['TV Duvarı', 'Konsol + Dresuar', 'Porselen Masa'],
}

const STUDIO_MATERIALS = [
  {
    id: 'taj', name: 'Taj Mahal', note: '1/5 • Sıcak bej damar',
    slabImage: 'https://cdn.kale.com.tr/0/0/taj-mahal-parlak-kalesinterflex-porselen-plaka-162x323/379d53d5-6059-4b67-9608-4780d92c5331/650/2',
    slabMeta: 'T-ONE • Taj Mahal • Parlak • 12 mm', productCode: '310101110564', size: '162×323 cm', surface: 'Parlak', thickness: '12 mm',
    productUrl: 'https://www.kale.com.tr/int-tr/taj-mahal-parlak-kalesinterflex-porselen-plaka-162x323-310101110564',
  },
  {
    id: 'crystallus', name: 'Crystallus', note: '2/5 • Kristalimsi bej • parlak',
    slabImage: 'https://cdn.kale.com.tr/0/0/crystallus-parlak-kalesinterflex-porselen-plaka-162x323/cb8798ec-2269-4c5a-9da4-c4d8211cc268/650/2',
    slabMeta: 'T-ONE • Crystallus • Parlak • 12 mm', productCode: '310101109350', size: '162×323 cm', surface: 'Parlak', thickness: '12 mm',
    productUrl: 'https://www.kale.com.tr/crystallus-parlak-kalesinterflex-porselen-plaka-162x323-310101109350',
  },
  {
    id: 'florence', name: 'Florence', note: '3/5 • Beyaz • sıcak altın/bej damar',
    slabImage: 'https://image.architonic.com/pro2-3/20805996/florence--310101108973-2-pro-g-arcit18.jpg',
    slabMeta: 'T-ONE • Florence • Parlak • 12 mm', productCode: '310101110212', size: '162×323 cm', surface: 'Parlak', thickness: '12 mm',
    productUrl: 'https://www.kale.com.tr/tr-en/florence-polished-kalesinterflex-porcelain-slab-162x323-310101110212',
  },
  {
    id: 'uniq', name: 'Calacatta Unique', note: '4/5 • Beyaz zemin • zarif gri damar • mat',
    slabImage: '/calacatta-unique-slab.webp',
    slabMeta: 'T-ONE • Calacatta Unique • Mat • 12 mm', productCode: '310101110172', size: '162×323 cm', surface: 'Mat', thickness: '12 mm',
    productUrl: 'https://www.kale.com.tr/calacatta-unique-mat-kalesinterflex-porselen-plaka-162x323-310101110172',
  },
  { id: 'dark', name: 'Dark Modern', note: '5/5 • Koyu • güçlü kontrast', slabImage: null, slabMeta: null, productCode: null, size: null, surface: null, thickness: null, productUrl: null },
] as const

type MaterialId = (typeof STUDIO_MATERIALS)[number]['id']

const CURATED_PREVIEWS = [
  { id: 'eripek-kitchen-island-01', roomId: 'kitchen', model: 'Şelale Ada', materialId: 'taj', title: 'Mutfak Porselen Tasarımı', subtitle: 'T-ONE • Taj Mahal • 12 mm', image: '/eripek-kitchen-island-01.webp', fullImage: '/eripek-kitchen-island-01.webp' },
  { id: 'eripek-kitchen-crystallus-01', roomId: 'kitchen', model: 'Şelale Ada', materialId: 'crystallus', title: 'Mutfak Porselen Tasarımı', subtitle: 'T-ONE • Crystallus • 12 mm', image: '/eripek-kitchen-crystallus-01.webp', fullImage: '/eripek-kitchen-crystallus-01.webp' },
  { id: 'eripek-kitchen-florence-01', roomId: 'kitchen', model: 'Şelale Ada', materialId: 'florence', title: 'Mutfak Porselen Tasarımı', subtitle: 'T-ONE • Florence • Parlak • 12 mm', image: '/eripek-kitchen-florence-01.webp', fullImage: '/eripek-kitchen-florence-01-full.webp' },
  { id: 'eripek-kitchen-calacatta-uniq-01', roomId: 'kitchen', model: 'Şelale Ada', materialId: 'uniq', title: 'Mutfak Porselen Tasarımı', subtitle: 'T-ONE • Calacatta Unique • Mat • 12 mm', image: '/eripek-kitchen-calacatta-uniq-01.webp', fullImage: '/eripek-kitchen-calacatta-uniq-01-full.webp' },
] as const

const SERVICE_PRODUCTS = ['Porselen Lavabo', 'Porselen Niş', 'Mutfak Tezgahı', 'Ada Tezgahı', 'Kahve Köşesi', 'TV Ünitesi', 'Yatak Başlığı / Baza Paneli', 'Porselen Masa', 'Basamak', 'Duvar Kaplama', 'Diğer Porselen Uygulama'] as const
const PROJECT_REQUEST_TYPES = ['Keşif ve ölçü talebi', 'Fiyat teklifi istiyorum', 'Bu tasarımı evime uygula', 'Yeni proje danışmanlığı'] as const
const PROJECT_REQUEST_UI: Record<(typeof PROJECT_REQUEST_TYPES)[number], { button: string; busy: string; success: string }> = {
  'Keşif ve ölçü talebi': { button: 'Keşif ve Ölçü Talebi Gönder', busy: 'Keşif talebiniz oluşturuluyor…', success: 'Keşif ve ölçü talebiniz alındı.' },
  'Fiyat teklifi istiyorum': { button: 'Fiyat Teklifi Talebi Gönder', busy: 'Fiyat teklifi talebiniz oluşturuluyor…', success: 'Fiyat teklifi talebiniz alındı.' },
  'Bu tasarımı evime uygula': { button: 'Bu Tasarımı Evime Uygula', busy: 'Uygulama talebiniz iletiliyor…', success: 'Tasarımı evinize uygulama talebiniz alındı.' },
  'Yeni proje danışmanlığı': { button: 'Proje Danışmanlığı Talebi Gönder', busy: 'Danışmanlık talebiniz oluşturuluyor…', success: 'Proje danışmanlığı talebiniz alındı.' },
}
const SERVICE_STATUS_LABELS: Record<string, string> = { received: 'Alındı', reviewing: 'İnceleniyor', scheduled: 'Planlandı', in_progress: 'İşlemde', completed: 'Tamamlandı', cancelled: 'İptal' }
const PROJECT_STATUS_LABELS: Record<string, string> = { new: 'Yeni', contacted: 'İletişime geçildi', survey_planned: 'Keşif planlandı', quoted: 'Teklif verildi', won: 'Onaylandı', lost: 'Sonuçlanmadı', cancelled: 'İptal' }
const SERVICE_ISSUES = ['Su sızıntısı', 'Çökme / ayrılma', 'Yüzey aşınması', 'Montaj kontrolü', 'Silikon / derz yenileme', 'Çatlak / kırık', 'Bakım desteği', 'Tesisat / bağlantı kontrolü', 'Diğer'] as const

function formatDateTR(value?: string | null) {
  if (!value) return 'Kayıt bekleniyor'
  return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(`${value}T12:00:00`))
}
function warrantyEndDate(value?: string | null, months = 12) {
  if (!value) return null
  const d = new Date(`${value}T12:00:00`); d.setMonth(d.getMonth() + months)
  return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d)
}
function moneyTR(value?: number | null) {
  if (!value) return ''
  return new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY', maximumFractionDigits: 2 }).format(value)
}
function dateTimeTR(value?: string | null) {
  if (!value) return ''
  return new Intl.DateTimeFormat('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value))
}

async function gateway(body: Record<string, unknown>) {
  const res = await fetch(GATEWAY, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: PUBLIC_KEY }, body: JSON.stringify(body), cache: 'no-store' })
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
function unitNumber(unit: string) { return Number(unit.replace(/\D/g, '')) || 0 }
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
  localStorage.removeItem(SESSION_KEY); localStorage.removeItem(ACCOUNT_CACHE_KEY)
  document.cookie = `${SESSION_COOKIE_KEY}=; Max-Age=0; Path=/; SameSite=Lax; Secure`
}
function readRememberedSession() { return localStorage.getItem(SESSION_KEY) || getCookie(SESSION_COOKIE_KEY) }
function cacheAccount(customer: Customer, residence: Residence, residences: Residence[] = [residence]) { localStorage.setItem(ACCOUNT_CACHE_KEY, JSON.stringify({ customer, residence, residences })) }
function readCachedAccount(): { customer: Customer; residence: Residence; residences?: Residence[] } | null {
  try {
    const raw = localStorage.getItem(ACCOUNT_CACHE_KEY); if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed?.customer?.full_name || !parsed?.residence?.block || !parsed?.residence?.unit_no) return null
    return parsed
  } catch { return null }
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
        const max = 1400, scale = Math.min(1, max / Math.max(img.width, img.height))
        const width = Math.max(1, Math.round(img.width * scale)), height = Math.max(1, Math.round(img.height * scale))
        const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height
        const ctx = canvas.getContext('2d'); if (!ctx) return reject(new Error('canvas_failed'))
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

function modelSlug(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ı/g, 'i').replace(/İ/g, 'I').replace(/ş/gi, 's').replace(/ğ/gi, 'g').replace(/ü/gi, 'u').replace(/ö/gi, 'o').replace(/ç/gi, 'c').replace(/[’']/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}
function roomIsValid(value: string | null): value is StudioRoomId { return !!value && STUDIO_ROOMS.some(r => r.id === value) }
function materialIsValid(value: string | null): value is MaterialId { return !!value && STUDIO_MATERIALS.some(m => m.id === value) }
function resolveModel(roomId: StudioRoomId, value: string | null) {
  if (!value) return STUDIO_MODELS[roomId][0]
  return STUDIO_MODELS[roomId].find(m => m === value || modelSlug(m) === value) || STUDIO_MODELS[roomId][0]
}
type DiscoverSelection = { roomId: StudioRoomId; model: string; materialId: MaterialId }
type PortalRoute = DiscoverSelection & { tab: DashboardTab }
function readCachedDiscover(): DiscoverSelection | null {
  try {
    const raw = localStorage.getItem(DISCOVER_CACHE_KEY); if (!raw) return null
    const v = JSON.parse(raw)
    if (!roomIsValid(v?.roomId) || !materialIsValid(v?.materialId)) return null
    return { roomId: v.roomId, model: resolveModel(v.roomId, v.model), materialId: v.materialId }
  } catch { return null }
}
function cacheDiscover(selection: DiscoverSelection) { try { localStorage.setItem(DISCOVER_CACHE_KEY, JSON.stringify(selection)) } catch {} }
function readPortalRoute(): PortalRoute {
  const fallback: DiscoverSelection = { roomId: 'kitchen', model: STUDIO_MODELS.kitchen[0], materialId: 'taj' }
  if (typeof window === 'undefined') return { tab: 'home', ...fallback }
  const params = new URLSearchParams(window.location.search)
  const rawTab = params.get('tab') as DashboardTab | null
  const tab: DashboardTab = rawTab && ['home', 'products', 'discover', 'requests', 'account', 'service'].includes(rawTab) ? rawTab : 'home'
  const cached = readCachedDiscover() || fallback
  const roomId = roomIsValid(params.get('room')) ? params.get('room') as StudioRoomId : cached.roomId
  const model = resolveModel(roomId, params.get('model') || cached.model)
  const materialId = materialIsValid(params.get('material')) ? params.get('material') as MaterialId : cached.materialId
  return { tab, roomId, model, materialId }
}
function routeUrl(route: PortalRoute) {
  const url = new URL(window.location.href)
  if (route.tab === 'home') url.searchParams.delete('tab'); else url.searchParams.set('tab', route.tab)
  if (route.tab === 'discover') {
    url.searchParams.set('room', route.roomId); url.searchParams.set('model', modelSlug(route.model)); url.searchParams.set('material', route.materialId)
  } else {
    url.searchParams.delete('room'); url.searchParams.delete('model'); url.searchParams.delete('material')
  }
  return `${url.pathname}${url.search}${url.hash}`
}
function sameRoute(a: PortalRoute, b: PortalRoute) { return a.tab === b.tab && a.roomId === b.roomId && a.model === b.model && a.materialId === b.materialId }

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
        const saved = readRememberedSession(), cached = readCachedAccount()
        if (saved && cached && alive) {
          rememberSession(saved); setCustomer(cached.customer); setResidence(cached.residence); setResidences(cached.residences?.length ? cached.residences : [cached.residence]); setSessionToken(saved); setStage('dashboard')
        }
        if (saved) {
          try {
            const session: SessionResponse = await gateway({ action: 'session', session_token: saved })
            if (alive && session.customer && session.residences?.length) {
              const activeResidence = session.residences.find(r => r.id && r.id === cached?.residence?.id) || session.residences[0]
              rememberSession(saved); cacheAccount(session.customer, activeResidence, session.residences)
              setCustomer(session.customer); setResidence(activeResidence); setResidences(session.residences); setSessionToken(saved); setStage('dashboard'); return
            }
          } catch (err) {
            const code = err instanceof Error ? err.message : ''
            if (code === 'invalid_session') forgetSession()
            else if (cached) return
            else { if (alive) setStage('error'); return }
          }
        }
        const catalogData: CatalogResponse = await gateway({ action: 'catalog' })
        if (!alive) return
        setCatalog(catalogData.residences || []); setStage('register')
      } catch { if (alive) setStage('error') }
    })()
    return () => { alive = false }
  }, [])

  async function syncResidences(token: string, preferredId?: string) {
    const session: SessionResponse = await gateway({ action: 'session', session_token: token })
    if (!session.customer || !session.residences?.length) return
    const active = session.residences.find(r => r.id === preferredId) || session.residences[0]
    setCustomer(session.customer); setResidences(session.residences); setResidence(active); cacheAccount(session.customer, active, session.residences)
  }
  function selectResidence(next: Residence) { if (!customer) return; setResidence(next); cacheAccount(customer, next, residences) }
  function loggedIn(data: any) {
    rememberSession(data.session_token)
    const initialResidence = data.residence || data.residences?.[0]
    const initialResidences = data.residences?.length ? data.residences : (initialResidence ? [initialResidence] : [])
    setSessionToken(data.session_token); setCustomer(data.customer); if (initialResidence) setResidence(initialResidence); setResidences(initialResidences)
    if (initialResidence) cacheAccount(data.customer, initialResidence, initialResidences)
    setStage('dashboard'); syncResidences(data.session_token, initialResidence?.id).catch(() => {})
  }
  async function addedResidence(data: any) {
    const token = data.session_token || sessionToken
    if (data.session_token) { rememberSession(data.session_token); setSessionToken(data.session_token) }
    await syncResidences(token, data.residence?.id)
  }
  function resetDevice() { forgetSession(); location.reload() }

  if (stage === 'loading') return <Shell><div className="screen stack loading"><div className="eyebrow gold">ERİPEK GOLD</div><h2>Dijital alanınız hazırlanıyor…</h2><p className="muted small">Garanti, servis ve tasarım portalı yükleniyor.</p></div></Shell>
  if (stage === 'error') return <Shell><div className="screen stack"><div className="eyebrow gold">ERİPEK GOLD</div><h2>Bağlantı kurulamadı</h2><div className="card small muted">İnternet bağlantınızı kontrol edip sayfayı yenileyin. Sorun devam ederse Master Porcelenta ile iletişime geçin.</div><button className="btn dark" onClick={() => location.reload()}>Tekrar Dene</button></div></Shell>
  if (stage === 'dashboard' && customer && residence) return <Shell><Dashboard customer={customer} residence={residence} residences={residences.length ? residences : [residence]} sessionToken={sessionToken} onResidenceChange={selectResidence} onResidenceAdded={addedResidence} onReset={resetDevice} /></Shell>
  return <Shell><Register residences={catalog} onSuccess={loggedIn} /></Shell>
}

function Register({ residences, onSuccess }: { residences: Residence[]; onSuccess: (data: any) => void }) {
  const [mode, setMode] = useState<'register' | 'login' | 'recovery'>('register')
  const [block, setBlock] = useState(''), [floor, setFloor] = useState(''), [unit, setUnit] = useState('')
  const [name, setName] = useState(''), [phone, setPhone] = useState(''), [email, setEmail] = useState(''), [pin, setPin] = useState(''), [pinAgain, setPinAgain] = useState('')
  const [identifier, setIdentifier] = useState(''), [loginPin, setLoginPin] = useState(''), [msg, setMsg] = useState(''), [busy, setBusy] = useState(false)
  const [recoveryStep, setRecoveryStep] = useState<'form' | 'pending' | 'reset'>('form')
  const [recoveryIdentifier, setRecoveryIdentifier] = useState(''), [recoveryBlock, setRecoveryBlock] = useState(''), [recoveryFloor, setRecoveryFloor] = useState(''), [recoveryUnit, setRecoveryUnit] = useState('')
  const [recoveryAnswer, setRecoveryAnswer] = useState(''), [recoveryNote, setRecoveryNote] = useState(''), [recoveryRequestNo, setRecoveryRequestNo] = useState(''), [recoverySecret, setRecoverySecret] = useState('')
  const [recoveryStatus, setRecoveryStatus] = useState<'pending' | 'approved' | 'rejected' | 'completed' | ''>(''), [newPin, setNewPin] = useState(''), [newPinAgain, setNewPinAgain] = useState('')

  const blocks = useMemo(() => Array.from(new Set(residences.map(r => r.block))).sort(), [residences])
  const floors = useMemo(() => Array.from(new Set(residences.filter(r => r.block === block).map(r => r.floor))).sort((a, b) => a - b), [residences, block])
  const units = useMemo(() => residences.filter(r => r.block === block && String(r.floor) === floor).map(r => r.unit_no).sort((a, b) => unitNumber(a) - unitNumber(b)), [residences, block, floor])
  const recoveryFloors = useMemo(() => Array.from(new Set(residences.filter(r => r.block === recoveryBlock).map(r => r.floor))).sort((a, b) => a - b), [residences, recoveryBlock])
  const recoveryUnits = useMemo(() => residences.filter(r => r.block === recoveryBlock && String(r.floor) === recoveryFloor).map(r => r.unit_no).sort((a, b) => unitNumber(a) - unitNumber(b)), [residences, recoveryBlock, recoveryFloor])

  useEffect(() => {
    try {
      const raw = localStorage.getItem('eripek_gold_recovery_pending'); if (!raw) return
      const saved = JSON.parse(raw); if (!saved?.request_no || !saved?.recovery_secret) return
      setRecoveryRequestNo(saved.request_no); setRecoverySecret(saved.recovery_secret); setRecoveryStatus(saved.status || 'pending'); setRecoveryStep(saved.status === 'approved' ? 'reset' : 'pending')
    } catch {}
  }, [])
  const rememberRecovery = (requestNo: string, secret: string, status = 'pending') => localStorage.setItem('eripek_gold_recovery_pending', JSON.stringify({ request_no: requestNo, recovery_secret: secret, status }))
  const clearRecovery = () => localStorage.removeItem('eripek_gold_recovery_pending')

  async function submit(e: FormEvent) {
    e.preventDefault(); setMsg('')
    if (mode === 'login') {
      if (!identifier.trim()) return setMsg('Telefon numaranızı veya e-posta adresinizi girin.')
      if (!/^\d{6}$/.test(loginPin)) return setMsg('6 haneli Eripek Gold giriş kodunuzu girin.')
      setBusy(true)
      try { onSuccess(await gateway({ action: 'customer_login', identifier: identifier.trim(), pin: loginPin })) }
      catch (err) { setMsg((err instanceof Error ? err.message : '') === 'login_temporarily_locked' ? 'Çok fazla hatalı deneme yapıldı. Güvenliğiniz için 15 dakika sonra tekrar deneyin.' : 'Giriş bilgileri eşleşmedi. Giriş kodunuzu unuttuysanız “Giriş kodumu unuttum” seçeneğini kullanın.') }
      finally { setBusy(false) }
      return
    }
    if (!block || !floor || !unit) return setMsg('Önce blok, kat ve dairenizi seçin.')
    if (name.trim().length < 3) return setMsg('Ad soyad bilgisini kontrol edin.')
    if (phone.replace(/\D/g, '').length < 10) return setMsg('Telefon numarasını kontrol edin.')
    if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setMsg('E-posta adresini kontrol edin.')
    if (!/^\d{6}$/.test(pin)) return setMsg('Farklı cihazlardan giriş için 6 haneli bir giriş kodu belirleyin.')
    if (pin !== pinAgain) return setMsg('Giriş kodları aynı değil.')
    setBusy(true)
    try { onSuccess(await gateway({ action: 'claim', block, floor: Number(floor), unit_no: unit, full_name: name.trim(), phone: phone.trim(), email: email.trim(), pin })) }
    catch (err) {
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
      const data = await gateway({ action: 'recovery_create', identifier: recoveryIdentifier.trim(), block: recoveryBlock, floor: Number(recoveryFloor), unit_no: recoveryUnit, question_key: 'island_counter', answer: recoveryAnswer, note: recoveryNote.trim() })
      setRecoveryRequestNo(data.request_no); setRecoverySecret(data.recovery_secret); setRecoveryStatus('pending'); setRecoveryStep('pending'); rememberRecovery(data.request_no, data.recovery_secret, 'pending')
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
      else { setMsg('Bu kurtarma talebi daha önce tamamlanmış. Yeni giriş kodunuzla “Zaten kaydım var” bölümünden giriş yapın.'); clearRecovery() }
    } catch { setMsg('Talep durumu kontrol edilemedi. Lütfen tekrar deneyin.') }
    finally { setBusy(false) }
  }
  async function completeRecovery(e: FormEvent) {
    e.preventDefault(); setMsg('')
    if (!/^\d{6}$/.test(newPin)) return setMsg('Yeni giriş kodunuz 6 rakam olmalı.')
    if (newPin !== newPinAgain) return setMsg('Yeni giriş kodları aynı değil.')
    setBusy(true)
    try { const data = await gateway({ action: 'recovery_complete', request_no: recoveryRequestNo, recovery_secret: recoverySecret, pin: newPin }); clearRecovery(); onSuccess(data) }
    catch (err) { const code = err instanceof Error ? err.message : ''; setMsg(code === 'recovery_pending' ? 'Talep henüz onaylanmadı.' : code === 'recovery_rejected' ? 'Bu kurtarma talebi reddedilmiş.' : 'Yeni giriş kodu kaydedilemedi. Lütfen tekrar deneyin.') }
    finally { setBusy(false) }
  }

  if (mode === 'recovery') return <div className="screen stack">
    <div className="hero compactHero"><div className="heroText"><div className="eyebrow">ERİPEK GOLD</div><div className="heroTitle">Hesabınızı geri alın</div><div className="heroCopy">SMS gerekmeden, daire doğrulaması ve yönetici onayıyla yeni giriş kodunuzu oluşturun.</div></div></div>
    <button type="button" className="recoveryBack" onClick={() => { setMode('login'); setMsg('') }}>← Giriş ekranına dön</button>
    {recoveryStep === 'form' && <form className="stack" onSubmit={createRecovery}>
      <div className="existingLoginIntro"><div className="eyebrow gold">HESAP KURTARMA</div><strong>Önce hesabınızı ve dairenizi doğrulayalım.</strong><div className="small muted">Bilgiler eşleşirse talebiniz Master Porcelenta yönetim paneline düşer. Onaydan sonra yeni 6 haneli giriş kodunuzu siz belirlersiniz.</div></div>
      <div><label className="label">Kayıtlı Telefon veya E-posta</label><input className="input" value={recoveryIdentifier} onChange={e => setRecoveryIdentifier(e.target.value)} inputMode="email" autoComplete="username" placeholder="05xx xxx xx xx veya ad@eposta.com" /></div>
      <div className="grid3"><div><label className="label">Blok</label><select className="input" value={recoveryBlock} onChange={e => { setRecoveryBlock(e.target.value); setRecoveryFloor(''); setRecoveryUnit('') }}><option value="">Seçin</option>{blocks.map(b => <option key={b}>{b}</option>)}</select></div><div><label className="label">Kat</label><select className="input" value={recoveryFloor} disabled={!recoveryBlock} onChange={e => { setRecoveryFloor(e.target.value); setRecoveryUnit('') }}><option value="">Seçin</option>{recoveryFloors.map(f => <option key={f} value={f}>{f}. Kat</option>)}</select></div><div><label className="label">Daire</label><select className="input" value={recoveryUnit} disabled={!recoveryFloor} onChange={e => setRecoveryUnit(e.target.value)}><option value="">Seçin</option>{recoveryUnits.map(u => <option key={u} value={u}>{u}</option>)}</select></div></div>
      <div className="securityQuestion"><div className="eyebrow gold">GÜVENLİK SORUSU</div><strong>Dairenizde Master Porcelenta tarafından daha önce ada tezgâhı uygulaması yapıldı mı?</strong><div className="securityChoices"><button type="button" className={recoveryAnswer === 'yes' ? 'active' : ''} onClick={() => setRecoveryAnswer('yes')}>Evet</button><button type="button" className={recoveryAnswer === 'no' ? 'active' : ''} onClick={() => setRecoveryAnswer('no')}>Hayır</button><button type="button" className={recoveryAnswer === 'not_sure' ? 'active' : ''} onClick={() => setRecoveryAnswer('not_sure')}>Emin değilim</button></div></div>
      <div><label className="label">Ek doğrulama notu <span className="optionalText">(isteğe bağlı)</span></label><textarea className="input textarea" rows={3} value={recoveryNote} onChange={e => setRecoveryNote(e.target.value)} placeholder="Örn: Daireyi eşim teslim aldı / bildiğiniz başka bir detay" /></div>
      {msg && <div className="errorBox">{msg}</div>}<button className="btn dark" disabled={busy}>{busy ? 'Talep oluşturuluyor…' : 'Hesap Kurtarma Talebi Oluştur'}</button>
    </form>}
    {recoveryStep === 'pending' && <div className="stack"><div className="recoveryTicket"><div className="recoveryIcon">✓</div><div><div className="eyebrow gold">TALEBİNİZ ALINDI</div><strong>{recoveryRequestNo}</strong><div className="small muted">Güvenlik kontrolü için yönetici onayı bekleniyor.</div></div></div>{msg && <div className={recoveryStatus === 'rejected' ? 'errorBox' : 'successBox'}>{msg}</div>}<button className="btn primary" type="button" disabled={busy} onClick={checkRecovery}>{busy ? 'Kontrol ediliyor…' : 'Onay Durumunu Kontrol Et'}</button><button className="btn ghost" type="button" onClick={() => { clearRecovery(); setRecoveryRequestNo(''); setRecoverySecret(''); setRecoveryStatus(''); setRecoveryStep('form'); setMsg('') }}>Yeni bir kurtarma talebi oluştur</button></div>}
    {recoveryStep === 'reset' && <form className="stack" onSubmit={completeRecovery}><div className="successBox"><strong>Kimliğiniz doğrulandı.</strong><div className="small">Şimdi yeni Eripek Gold giriş kodunuzu belirleyin.</div></div><div className="pinGrid"><div><label className="label">Yeni 6 Haneli Kod</label><input className="input pinInput" value={newPin} onChange={e => setNewPin(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="new-password" placeholder="6 rakam" /></div><div><label className="label">Yeni Kodu Tekrar</label><input className="input pinInput" value={newPinAgain} onChange={e => setNewPinAgain(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="new-password" placeholder="6 rakam" /></div></div>{msg && <div className="errorBox">{msg}</div>}<button className="btn primary" disabled={busy}>{busy ? 'Kaydediliyor…' : 'Yeni Giriş Kodumu Kaydet ve Hesabımı Aç'}</button></form>}
  </div>

  return <form className="screen stack" onSubmit={submit}>
    {mode === 'register' ? <div className="registrationCover" aria-label="Eripek Gold güvenli dijital hizmet alanı"><img src="/eripek-gold-welcome-premium.webp" alt="Master Porcelenta Eripek Gold — garanti, servis ve özel tasarım" /></div> : <div className="hero compactHero"><div className="heroText"><div className="eyebrow">ERİPEK GOLD</div><div className="heroTitle">Evinize özel dijital alan</div><div className="heroCopy">Garanti, servis ve porselen tasarımlar tek yerde.</div></div></div>}
    <div className="accessSwitch" role="tablist" aria-label="Hesap girişi"><button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setMsg('') }}>İlk kez kullanıyorum</button><button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setMsg('') }}>Zaten kaydım var</button></div>
    {mode === 'login' ? <>
      <div className="existingLoginIntro"><div className="eyebrow gold">MEVCUT HESABIM</div><strong>Daha önce dairenizi tanımladıysanız yeniden kayıt olmanıza gerek yok.</strong><div className="small muted">Telefon numaranız veya e-posta adresiniz ve 6 haneli Eripek Gold giriş kodunuzla her cihazdan hesabınıza ulaşın.</div></div>
      <div><label className="label">Telefon veya E-posta</label><input className="input" value={identifier} onChange={e => setIdentifier(e.target.value)} autoComplete="username" placeholder="05xx xxx xx xx veya ad@eposta.com" /></div>
      <div><label className="label">6 Haneli Giriş Kodu</label><input className="input pinInput" value={loginPin} onChange={e => setLoginPin(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="••••••" /></div>
      {msg && <div className="errorBox">{msg}</div>}<button className="btn primary" disabled={busy}>{busy ? 'Hesabınız açılıyor…' : 'Hesabıma Giriş Yap'}</button><button className="forgotCodeBtn" type="button" onClick={() => { setMode('recovery'); setRecoveryStep(recoveryRequestNo ? recoveryStatus === 'approved' ? 'reset' : 'pending' : 'form'); setMsg('') }}>Giriş kodumu unuttum</button><div className="privacyLine">Aynı hesap <span>•</span> Farklı cihaz <span>•</span> 180 gün hatırlama</div>
    </> : <>
      <div className="sectionHead"><div className="stepBadge">1</div><div><strong>Dairenizi seçin</strong><div className="small muted">QR tüm Eripek Gold konutlarında ortaktır.</div></div></div>
      <div className="grid3"><div><label className="label">Blok</label><select className="input" value={block} onChange={e => { setBlock(e.target.value); setFloor(''); setUnit('') }}><option value="">Seçin</option>{blocks.map(b => <option key={b}>{b}</option>)}</select></div><div><label className="label">Kat</label><select className="input" value={floor} disabled={!block} onChange={e => { setFloor(e.target.value); setUnit('') }}><option value="">Seçin</option>{floors.map(f => <option key={f} value={f}>{f}. Kat</option>)}</select></div><div><label className="label">Daire</label><select className="input" value={unit} disabled={!floor} onChange={e => setUnit(e.target.value)}><option value="">Seçin</option>{units.map(u => <option key={u} value={u}>{u}</option>)}</select></div></div>
      {block && floor && unit && <div className="selectedResidence"><div className="small muted">Seçilen konut</div><strong>{block} Blok • {floor}. Kat • Daire {unit}</strong></div>}
      <div className="sectionHead"><div className="stepBadge">2</div><div><strong>Kişisel hesabınızı açın</strong><div className="small muted">Bir kez tanımlayın; sonrasında her cihazdan giriş yapın.</div></div></div>
      <div><label className="label">Ad Soyad</label><input className="input" value={name} onChange={e => setName(e.target.value)} autoComplete="name" placeholder="Adınız Soyadınız" /></div><div><label className="label">Telefon</label><input className="input" value={phone} onChange={e => setPhone(e.target.value)} autoComplete="tel" inputMode="tel" placeholder="05xx xxx xx xx" /></div><div><label className="label">E-posta <span className="optionalText">(isteğe bağlı)</span></label><input className="input" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" inputMode="email" placeholder="ad@eposta.com" /></div>
      <div className="pinGrid"><div><label className="label">6 Haneli Giriş Kodu</label><input className="input pinInput" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="new-password" placeholder="6 rakam" /></div><div><label className="label">Giriş Kodunu Tekrar</label><input className="input pinInput" value={pinAgain} onChange={e => setPinAgain(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" autoComplete="new-password" placeholder="6 rakam" /></div></div>
      <div className="card loginCodeNote"><strong>Bu kod ne işe yarar?</strong><div className="small muted">Telefon değiştirdiğinizde veya başka bir cihazdan girdiğinizde yeniden kayıt olmadan hesabınızı açmanızı sağlar.</div></div>
      {msg && <div className="errorBox">{msg}</div>}<button className="btn primary" disabled={busy}>{busy ? 'Hesabınız hazırlanıyor…' : 'Dairemi Tanımla'}</button><div className="privacyLine">Tek kayıt <span>•</span> Her cihazdan giriş <span>•</span> Uygulama indirme yok</div><PrivacyNotice />
    </>}
  </form>
}

function NavIcon({ name }: { name: 'home' | 'products' | 'discover' | 'requests' | 'account' }) {
  const common = { width: 21, height: 21, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, 'aria-hidden': true }
  if (name === 'home') return <svg {...common}><path d="M3.5 10.5 12 3l8.5 7.5"/><path d="M5.5 9.5V21h13V9.5"/><path d="M9.3 21v-6.4h5.4V21"/></svg>
  if (name === 'products') return <svg {...common}><rect x="3.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.6"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.6"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.6"/></svg>
  if (name === 'discover') return <svg {...common}><path d="M12 3.2 15 9l5.8 3-5.8 3-3 5.8L9 15l-5.8-3L9 9l3-5.8Z"/><circle cx="12" cy="12" r="1.2"/></svg>
  if (name === 'requests') return <svg {...common}><path d="M8.5 6h11M8.5 12h11M8.5 18h11"/><path d="m3.8 5.8.8.8 1.6-1.8M3.8 11.8l.8.8 1.6-1.8M3.8 17.8l.8.8 1.6-1.8"/></svg>
  return <svg {...common}><circle cx="12" cy="8" r="3.3"/><path d="M5 20.2c.7-4 3.3-6 7-6s6.3 2 7 6"/></svg>
}

function Dashboard({ customer, residence, residences, sessionToken, onResidenceChange, onResidenceAdded, onReset }: { customer: Customer; residence: Residence; residences: Residence[]; sessionToken: string; onResidenceChange: (residence: Residence) => void; onResidenceAdded: (data: any) => Promise<void>; onReset: () => void }) {
  const [route, setRoute] = useState<PortalRoute>(() => readPortalRoute())
  const [portal, setPortal] = useState<PortalData>({ service_requests: [], project_requests: [], installed_products: [], favorites: [], studio_variants: [], support: null })
  const [portalLoading, setPortalLoading] = useState(true)
  const depthRef = useRef(0)

  function commitRoute(next: PortalRoute, mode: HistoryMode, scrollTop = false) {
    if (typeof window === 'undefined') return
    if (next.tab === 'discover') cacheDiscover(next)
    const currentState = window.history.state || {}
    const currentDepth = typeof currentState.eripekDepth === 'number' ? currentState.eripekDepth : depthRef.current
    const nextDepth = mode === 'push' ? currentDepth + 1 : currentDepth
    depthRef.current = nextDepth
    setRoute(next)
    const state = { ...currentState, eripekPortal: true, eripekDepth: nextDepth }
    window.history[mode === 'push' ? 'pushState' : 'replaceState'](state, '', routeUrl(next))
    if (scrollTop) requestAnimationFrame(() => window.scrollTo({ top: 0, behavior: 'auto' }))
  }

  function navigate(nextTab: DashboardTab, mode: HistoryMode = 'push') {
    if (nextTab === route.tab) {
      if (mode === 'push') window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    commitRoute({ ...route, tab: nextTab }, mode, true)
  }

  function updateDiscover(nextSelection: DiscoverSelection, mode: HistoryMode = 'replace') {
    const next: PortalRoute = { tab: 'discover', ...nextSelection }
    if (sameRoute(route, next)) return
    commitRoute(next, mode, false)
  }

  function goBack() {
    if (depthRef.current > 0) window.history.back()
    else navigate('home', 'replace')
  }

  useEffect(() => {
    const parsed = readPortalRoute()
    const initialDepth = typeof window.history.state?.eripekDepth === 'number' ? window.history.state.eripekDepth : 0
    depthRef.current = initialDepth
    setRoute(parsed)
    window.history.replaceState({ ...(window.history.state || {}), eripekPortal: true, eripekDepth: initialDepth }, '', routeUrl(parsed))

    const syncFromUrl = (event?: PopStateEvent) => {
      const next = readPortalRoute()
      if (next.tab === 'discover') cacheDiscover(next)
      if (typeof event?.state?.eripekDepth === 'number') depthRef.current = event.state.eripekDepth
      else if (typeof window.history.state?.eripekDepth === 'number') depthRef.current = window.history.state.eripekDepth
      setRoute(next)
    }
    const onPageShow = () => syncFromUrl()
    window.addEventListener('popstate', syncFromUrl)
    window.addEventListener('pageshow', onPageShow)
    return () => { window.removeEventListener('popstate', syncFromUrl); window.removeEventListener('pageshow', onPageShow) }
  }, [])

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
        installed_products: data.installed_products || [], favorites: data.favorites || [], studio_variants: data.studio_variants || [], support: data.support || null,
      })
    } finally { setPortalLoading(false) }
  }
  useEffect(() => { refreshPortal().catch(() => setPortalLoading(false)) }, [sessionToken])

  const productCount = portal.installed_products.filter(p => !p.residence_id || p.residence_id === residence.id).length
  const showBack = route.tab === 'service'

  return <>
    <style jsx global>{`
      .dashboardScreen{padding-bottom:calc(108px + env(safe-area-inset-bottom))!important}
      .portalBack{align-self:flex-start;border:1px solid rgba(52,44,36,.11);background:rgba(255,253,249,.88);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border-radius:999px;padding:9px 13px;font-size:11px;font-weight:800;color:#4b4035;display:inline-flex;align-items:center;gap:7px;cursor:pointer;box-shadow:0 6px 20px rgba(35,28,22,.05)}
      .nav{position:fixed!important;left:50%!important;right:auto!important;bottom:0!important;transform:translateX(-50%)!important;z-index:9995!important;width:min(100%,760px)!important;margin:0!important;grid-template-columns:repeat(5,1fr)!important;gap:2px!important;padding:7px max(7px,env(safe-area-inset-right)) max(7px,env(safe-area-inset-bottom)) max(7px,env(safe-area-inset-left))!important;background:rgba(255,253,249,.94)!important;backdrop-filter:blur(22px) saturate(1.18)!important;-webkit-backdrop-filter:blur(22px) saturate(1.18)!important;box-shadow:0 -10px 34px rgba(35,28,22,.10)!important;border-top:1px solid rgba(55,45,36,.08)!important}
      .nav button{position:relative;display:grid!important;place-items:center!important;align-content:center!important;gap:3px!important;min-height:54px!important;border-radius:14px!important;padding:5px 2px!important;font-size:8.5px!important;font-weight:750!important;color:#786e63!important;transition:background .18s ease,color .18s ease,transform .18s ease!important}
      .nav button svg{display:block;transition:transform .18s ease}.nav button.active{background:linear-gradient(180deg,#f5ead9,#efe0ca)!important;color:#785121!important}.nav button.active svg{transform:translateY(-1px)}
      .nav button.active:after{content:"";position:absolute;bottom:3px;width:4px;height:4px;border-radius:50%;background:#a97832}.navLabel{display:block;line-height:1;white-space:nowrap}
      .dashboardWelcome{position:relative}.residenceSwitcher{z-index:60}.residenceSwitcherMenu{z-index:61!important}
      @media(max-width:760px){.nav{width:100%!important}.dashboardScreen{padding-bottom:calc(112px + env(safe-area-inset-bottom))!important}}
      @media(prefers-reduced-motion:reduce){.nav button,.nav button svg{transition:none!important}}
    `}</style>
    <div className="screen stack dashboardScreen">
      {showBack && <button type="button" className="portalBack" onClick={goBack} aria-label="Önceki ekrana dön">← Geri</button>}
      <div className="dashboardWelcome"><div><div className="eyebrow gold">HOŞ GELDİNİZ</div><h2 className="welcome">Merhaba, {customer.full_name}</h2><div className="small muted">{residence.block} Blok • {residence.floor}. Kat • Daire {residence.unit_no}</div></div>{residences.length > 1 && <ResidenceSwitcher residences={residences} residence={residence} onChange={onResidenceChange} />}</div>
      {route.tab === 'home' && <HomeTab residence={residence} portal={portal} portalLoading={portalLoading} onService={() => navigate('service')} onDiscover={() => navigate('discover')} onRequests={() => navigate('requests')} onProducts={() => navigate('products')} />}
      {route.tab === 'products' && <ProductsTab residence={residence} products={portal.installed_products.filter(p => !p.residence_id || p.residence_id === residence.id)} loading={portalLoading} onService={() => navigate('service')} />}
      {route.tab === 'discover' && <DiscoverTab residence={residence} sessionToken={sessionToken} favorites={portal.favorites} studioVariants={portal.studio_variants} selection={route} onSelectionChange={updateDiscover} onRefresh={refreshPortal} />}
      {route.tab === 'requests' && <RequestsTab residence={residence} portal={portal} loading={portalLoading} onRefresh={refreshPortal} />}
      {route.tab === 'service' && <ServiceTab residence={residence} sessionToken={sessionToken} installedProducts={portal.installed_products} onCreated={refreshPortal} />}
      {route.tab === 'account' && <AccountTab customer={customer} residence={residence} residences={residences} sessionToken={sessionToken} support={portal.support || null} productCount={productCount} onProducts={() => navigate('products')} onResidenceChange={onResidenceChange} onResidenceAdded={onResidenceAdded} onReset={onReset} />}
    </div>
    <div className="nav" aria-label="Ana gezinme">
      <button type="button" aria-label="Ana Sayfa" className={route.tab === 'home' ? 'active' : ''} onClick={() => navigate('home')}><NavIcon name="home"/><span className="navLabel">Ana Sayfa</span></button>
      <button type="button" aria-label="Ürünlerim" className={route.tab === 'products' ? 'active' : ''} onClick={() => navigate('products')}><NavIcon name="products"/><span className="navLabel">Ürünlerim</span></button>
      <button type="button" aria-label="Keşfet" className={route.tab === 'discover' ? 'active' : ''} onClick={() => navigate('discover')}><NavIcon name="discover"/><span className="navLabel">Keşfet</span></button>
      <button type="button" aria-label="Taleplerim" className={route.tab === 'requests' ? 'active' : ''} onClick={() => navigate('requests')}><NavIcon name="requests"/><span className="navLabel">Taleplerim</span></button>
      <button type="button" aria-label="Hesabım" className={route.tab === 'account' ? 'active' : ''} onClick={() => navigate('account')}><NavIcon name="account"/><span className="navLabel">Hesabım</span></button>
    </div>
  </>
}

function ResidenceSwitcher({ residences, residence, onChange }: { residences: Residence[]; residence: Residence; onChange: (residence: Residence) => void }) {
  return <details className="residenceSwitcher"><summary><span className="small muted">Aktif daire</span><strong>{residence.block}-{residence.unit_no}</strong><b>⌄</b></summary><div className="residenceSwitcherMenu">{residences.map(r => <button type="button" key={r.id || `${r.block}-${r.floor}-${r.unit_no}`} className={r.id === residence.id ? 'active' : ''} onClick={e => { onChange(r); const d = e.currentTarget.closest('details') as HTMLDetailsElement | null; if (d) d.open = false }}><span><strong>{r.block} Blok • Daire {r.unit_no}</strong><small>{r.floor}. Kat</small></span>{r.id === residence.id && <em>✓</em>}</button>)}</div></details>
}

function HomeTab({ residence, portal, portalLoading, onService, onDiscover, onRequests, onProducts }: { residence: Residence; portal: PortalData; portalLoading: boolean; onService: () => void; onDiscover: () => void; onRequests: () => void; onProducts: () => void }) {
  const months = residence.default_warranty_months || 12, warrantyEnd = warrantyEndDate(residence.delivery_date, months)
  const products = portal.installed_products.filter(p => !p.residence_id || p.residence_id === residence.id)
  const recent = [
    ...portal.service_requests.filter(x => !x.residence_id || x.residence_id === residence.id).map(x => ({ kind: 'Servis', no: x.ticket_no, status: SERVICE_STATUS_LABELS[x.status] || x.status, created_at: x.created_at })),
    ...portal.project_requests.filter(x => !x.residence_id || x.residence_id === residence.id).map(x => ({ kind: x.request_type || 'Proje', no: x.request_no, status: PROJECT_STATUS_LABELS[x.status] || x.status, created_at: x.created_at })),
  ].sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at)).slice(0, 2)
  return <>
    <div className="dashHero"><div><div className="eyebrow">SİZE ÖZEL SEÇKİ</div><h2 className="heroSubTitle">Evinizi tamamlayın</h2><div className="small">Modeli seçin, taşı değiştirin, uygulama seçeneklerini keşfedin.</div></div></div>
    <div className="grid2"><div className="card warrantyCard"><div className="iconMark">✓</div><strong>{months} Ay Uygulama Garantisi</strong><div className="small muted">Teslim ve montaj tarihinden itibaren</div>{residence.delivery_date ? <div className="warrantyDates"><span>{formatDateTR(residence.delivery_date)}</span><b>→</b><span>{warrantyEnd}</span></div> : <div className="small warrantyPending">Montaj tarihi sisteme işlendiğinde garanti takviminiz burada görünecek.</div>}</div><button className="card actionCard" onClick={onService}><div className="iconMark">↗</div><strong>Servis Merkezi</strong><div className="small muted">Talebinizi kayıt altına alın</div></button></div>
    <button className="card productsSummaryCard" onClick={onProducts}><div className="productsSummaryIcon">MP</div><div className="productsSummaryBody"><div className="eyebrow gold">ÜRÜNLERİM & GARANTİ</div><strong>{portalLoading ? 'Ürün kayıtları yükleniyor…' : products.length ? `${products.length} ürün kayıtlı` : 'Ürün kayıtlarınızı görüntüleyin'}</strong><div className="small muted">{residence.delivery_date ? `Garanti ${warrantyEnd} tarihine kadar` : 'Ürün, ölçü ve garanti detayları'}</div></div><div className="productsSummaryArrow">›</div></button>
    <button className="card latestRequestsCard" onClick={onRequests}><div className="sectionRow"><div><div className="eyebrow gold">TALEPLERİM</div><strong>Son işlemleriniz</strong></div><b>›</b></div>{portalLoading ? <div className="small muted">Talepler yükleniyor…</div> : recent.length ? <div className="latestRequestList">{recent.map(x => <div key={x.no}><span>{x.kind}</span><strong>{x.status}</strong><small>{x.no}</small></div>)}</div> : <div className="small muted">Henüz servis veya proje talebiniz bulunmuyor.</div>}</button>
    <div className="card warrantyInfo"><div className="eyebrow gold">GARANTİ KAPSAMI</div><div className="coveragePills"><span>Su sızıntısı</span><span>Çökme</span><span>Aşınma</span></div><div className="small muted">Normal kullanım koşullarında uygulamadan kaynaklanan sızdırma, çökme / ayrılma ve olağandışı aşınmalar garanti kapsamında değerlendirilir.</div><div className="warrantyDivider"/><div className="small"><strong>Garanti dışı:</strong> Darbe kaynaklı kırılmalar; tesisat, tadilat veya üçüncü kişilerce yapılan işlemlerden doğan hasarlar; sonradan delme / kesme / müdahale ve uygunsuz kimyasal ya da aşındırıcı ürün kullanımı.</div><div className="siteDamageNote small"><strong>Şantiye teslim notu:</strong> Daire teslimi öncesinde şantiye faaliyetleri veya üçüncü kişiler nedeniyle oluşan kırılma ve çizilmeler müşteri kullanım hatası sayılmaz.</div></div>
    <div className="card careCard"><div className="careIcon">◌</div><div><strong>Kolay bakım</strong><div className="small muted spaceTop">Porselen yüzeylerin günlük temizliğinde yumuşak, nemli bir bez yeterlidir. Güçlü kimyasallar ve aşındırıcı temizlik ürünleri kullanmanıza gerek yoktur.</div></div></div>
    <div><div className="sectionTitle">Eviniz için fikirler</div><div className="grid2 roomGrid"><Room title="Mutfak" sub="Ada • Tezgah • Kahve Köşesi" onClick={onDiscover}/><Room title="Yatak Odası" sub="Başlık • Panel • LED" onClick={onDiscover}/></div></div>
  </>
}

function ProductsTab({ residence, products, loading, onService }: { residence: Residence; products: InstalledProduct[]; loading: boolean; onService: () => void }) {
  const months = residence.default_warranty_months || 12, warrantyEnd = warrantyEndDate(residence.delivery_date, months)
  return <>
    <div><div className="eyebrow gold">ÜRÜNLERİM & GARANTİ</div><h2 className="welcome">Evinizdeki uygulamalar</h2><div className="small muted">{residence.block} Blok • {residence.floor}. Kat • Daire {residence.unit_no}</div></div>
    <div className="card productWarrantySummary"><div><div className="small muted">Kayıtlı ürün</div><strong>{products.length}</strong></div><div><div className="small muted">Garanti süresi</div><strong>{months} Ay</strong></div><div><div className="small muted">Garanti bitişi</div><strong>{residence.delivery_date ? warrantyEnd : 'Kayıt bekleniyor'}</strong></div></div>
    {loading ? <div className="card"><div className="small muted">Ürün kayıtları yükleniyor…</div></div> : products.length ? <div className="productDetailList">{products.map(p => { const productMonths = p.warranty_months || months; return <div className="card productDetailCard" key={p.id}><div className="productDetailTop"><div className="productIcon">MP</div><div><div className="small muted">{p.location || p.category}</div><strong>{p.name}</strong></div></div>{p.dimensions && <div className="productDimension"><span>Ölçü</span><strong>{p.dimensions}</strong></div>}<div className="productDetailMeta"><div><span>Montaj tarihi</span><strong>{formatDateTR(p.installed_at)}</strong></div><div><span>Garanti bitişi</span><strong>{p.installed_at ? warrantyEndDate(p.installed_at, productMonths) : 'Kayıt bekleniyor'}</strong></div></div><button type="button" className="productServiceLink" onClick={onService}>Bu ürün için servis talebi oluştur →</button></div> })}</div> : <div className="emptySoft"><strong>Ürün kaydı bulunamadı</strong><div className="small muted">Uygulamalarınız sisteme işlendiğinde burada görüntülenecek.</div></div>}
    <div className="card productWarrantyNote"><div className="eyebrow gold">GARANTİ NOTU</div><div className="small muted">Uygulama garantisi montaj tarihinden itibaren geçerlidir. Daire tesliminden önce şantiye faaliyetleri veya üçüncü kişiler nedeniyle oluşan kırılma ve çizilmeler müşteri kullanım hatası sayılmaz; Master Porcelenta uygulama garantisi yerine ilgili müteahhit / şantiye sorumluluğunda değerlendirilir.</div></div>
  </>
}

type ViewerTransform = { scale: number; x: number; y: number }
type ViewerGesture =
  | { kind: 'pan'; pointerId: number; startX: number; startY: number; start: ViewerTransform }
  | { kind: 'pinch'; startDistance: number; startScale: number; contentX: number; contentY: number }
  | null

function PremiumImageViewer({ open, previewSrc, src, alt, title, subtitle, onClose }: { open: boolean; previewSrc?: string | null; src?: string | null; alt: string; title: string; subtitle?: string | null; onClose: () => void }) {
  const stageRef = useRef<HTMLDivElement | null>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const labelRef = useRef<HTMLSpanElement | null>(null)
  const rafRef = useRef<number | null>(null)
  const transformRef = useRef<ViewerTransform>({ scale: 1, x: 0, y: 0 })
  const pointersRef = useRef(new Map<number, { x: number; y: number; downX: number; downY: number; pointerType: string }>())
  const gestureRef = useRef<ViewerGesture>(null)
  const lastTapRef = useRef<{ time: number; x: number; y: number } | null>(null)
  const multiTouchRef = useRef(false)
  const onCloseRef = useRef(onClose)
  const [displaySrc, setDisplaySrc] = useState(previewSrc || src || '')
  const [fullReady, setFullReady] = useState(!previewSrc || previewSrc === src)

  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  const clampScale = (value: number) => Math.max(1, Math.min(6, Number(value.toFixed(4))))

  function bounds(scale: number) {
    const stage = stageRef.current, image = imageRef.current
    if (!stage || !image) return { x: 0, y: 0 }
    const baseWidth = image.clientWidth, baseHeight = image.clientHeight
    if (!baseWidth || !baseHeight) return { x: 0, y: 0 }
    return {
      x: Math.max(0, (baseWidth * scale - stage.clientWidth) / 2),
      y: Math.max(0, (baseHeight * scale - stage.clientHeight) / 2),
    }
  }

  function clampTransform(next: ViewerTransform): ViewerTransform {
    const scale = clampScale(next.scale)
    if (scale <= 1) return { scale: 1, x: 0, y: 0 }
    const b = bounds(scale)
    return { scale, x: Math.max(-b.x, Math.min(b.x, next.x)), y: Math.max(-b.y, Math.min(b.y, next.y)) }
  }

  function paint(next: ViewerTransform) {
    const safe = clampTransform(next)
    transformRef.current = safe
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    rafRef.current = requestAnimationFrame(() => {
      const image = imageRef.current, stage = stageRef.current
      if (image) image.style.transform = `translate3d(${safe.x}px, ${safe.y}px, 0) scale(${safe.scale})`
      if (stage) stage.classList.toggle('isZoomed', safe.scale > 1.001)
      if (labelRef.current) labelRef.current.textContent = `${Math.round(safe.scale * 100)}%`
      rafRef.current = null
    })
  }

  function stagePoint(clientX: number, clientY: number) {
    const rect = stageRef.current?.getBoundingClientRect()
    if (!rect) return { x: 0, y: 0 }
    return { x: clientX - (rect.left + rect.width / 2), y: clientY - (rect.top + rect.height / 2) }
  }

  function zoomAt(nextScale: number, clientX?: number, clientY?: number) {
    const current = transformRef.current
    const stage = stageRef.current
    if (!stage) return
    const rect = stage.getBoundingClientRect()
    const focus = stagePoint(clientX ?? rect.left + rect.width / 2, clientY ?? rect.top + rect.height / 2)
    const scale = clampScale(nextScale)
    if (scale <= 1) return paint({ scale: 1, x: 0, y: 0 })
    const imageX = (focus.x - current.x) / current.scale
    const imageY = (focus.y - current.y) / current.scale
    paint({ scale, x: focus.x - imageX * scale, y: focus.y - imageY * scale })
  }

  function pointerValues() { return Array.from(pointersRef.current.values()) }
  function beginGesture() {
    const points = pointerValues(), current = transformRef.current
    if (points.length >= 2) {
      const a = points[0], b = points[1]
      const distance = Math.hypot(b.x - a.x, b.y - a.y) || 1
      const mid = stagePoint((a.x + b.x) / 2, (a.y + b.y) / 2)
      gestureRef.current = { kind: 'pinch', startDistance: distance, startScale: current.scale, contentX: (mid.x - current.x) / current.scale, contentY: (mid.y - current.y) / current.scale }
    } else if (points.length === 1 && current.scale > 1) {
      const p = points[0]
      const entry = Array.from(pointersRef.current.entries())[0]
      gestureRef.current = { kind: 'pan', pointerId: entry[0], startX: p.x, startY: p.y, start: { ...current } }
    } else gestureRef.current = null
  }

  useEffect(() => {
    if (!open || !src) return
    const first = previewSrc || src
    setDisplaySrc(first)
    setFullReady(first === src)
    transformRef.current = { scale: 1, x: 0, y: 0 }
    requestAnimationFrame(() => paint({ scale: 1, x: 0, y: 0 }))

    let cancelled = false
    if (first !== src) {
      const loader = new window.Image()
      loader.src = src
      const ready = async () => {
        try { if ('decode' in loader) await loader.decode() } catch {}
        if (!cancelled) { setDisplaySrc(src); setFullReady(true); requestAnimationFrame(() => paint(transformRef.current)) }
      }
      if (loader.complete) ready(); else loader.onload = ready
    }

    const previousOverflow = document.body.style.overflow
    const previousOverscroll = document.body.style.overscrollBehavior
    document.body.style.overflow = 'hidden'; document.body.style.overscrollBehavior = 'none'
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onCloseRef.current(); if (e.key === '0') paint({ scale: 1, x: 0, y: 0 }) }
    const reclamp = () => paint(transformRef.current)
    window.addEventListener('keydown', onKey)
    window.addEventListener('resize', reclamp)
    window.addEventListener('orientationchange', reclamp)
    window.visualViewport?.addEventListener('resize', reclamp)
    const ro = new ResizeObserver(reclamp)
    if (stageRef.current) ro.observe(stageRef.current)

    const stage = stageRef.current
    const wheel = (e: WheelEvent) => {
      e.preventDefault()
      const current = transformRef.current.scale
      const factor = Math.exp(-e.deltaY * 0.0022)
      zoomAt(current * factor, e.clientX, e.clientY)
    }
    stage?.addEventListener('wheel', wheel, { passive: false })

    return () => {
      cancelled = true
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      document.body.style.overflow = previousOverflow; document.body.style.overscrollBehavior = previousOverscroll
      window.removeEventListener('keydown', onKey); window.removeEventListener('resize', reclamp); window.removeEventListener('orientationchange', reclamp)
      window.visualViewport?.removeEventListener('resize', reclamp); ro.disconnect(); stage?.removeEventListener('wheel', wheel)
      pointersRef.current.clear(); gestureRef.current = null
    }
  }, [open, src, previewSrc])

  if (!open || !src) return null

  return <div className="premiumImageLightbox" role="dialog" aria-modal="true" aria-label={`${title} yüksek çözünürlüklü görünüm`} onClick={onClose}>
    <style jsx global>{`
      .premiumImageLightbox{position:fixed;z-index:10050;inset:0;background:#0d0c0b;display:flex;align-items:center;justify-content:center;padding:max(8px,env(safe-area-inset-top)) max(8px,env(safe-area-inset-right)) max(8px,env(safe-area-inset-bottom)) max(8px,env(safe-area-inset-left));animation:premiumViewerIn .14s ease}
      .premiumImagePanel{width:min(1480px,100%);height:min(96dvh,1080px);display:grid;grid-template-rows:auto minmax(0,1fr) auto;gap:8px;min-width:0}
      .premiumImageTopbar{display:flex;align-items:center;justify-content:space-between;gap:12px;color:#fff;padding:2px 2px 0}.premiumImageTitle{display:grid;gap:2px;min-width:0}.premiumImageTitleLine{display:flex;align-items:center;gap:8px;min-width:0}.premiumImageTitle strong{font-size:14px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.premiumImageTitle span{font-size:10px;color:rgba(255,255,255,.62);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.premiumHdBadge{flex:0 0 auto;font-style:normal;font-size:8px;font-weight:900;letter-spacing:.08em;color:#f3d9a2;border:1px solid rgba(243,217,162,.26);background:rgba(172,127,47,.14);padding:4px 6px;border-radius:999px}.premiumLoading{font-size:8px!important;color:#d4b786!important}
      .premiumImageActions{display:flex;align-items:center;gap:6px;flex:0 0 auto}.premiumImageActions button{height:38px;min-width:38px;border-radius:12px;border:1px solid rgba(255,255,255,.18);background:rgba(255,255,255,.09);color:#fff;font-size:20px;font-weight:700;display:grid;place-items:center;cursor:pointer}.premiumImageActions button:disabled{opacity:.32}.premiumImageActions>span{min-width:47px;text-align:center;font-size:10px;font-weight:850}.premiumImageActions .premiumReset{width:auto;padding:0 11px;font-size:10px}.premiumImageActions .premiumClose{font-size:26px;background:rgba(35,31,27,.72)}
      .premiumImageStage{position:relative;min-height:0;width:100%;height:100%;overflow:hidden;border-radius:16px;background:#27231f;touch-action:none;-webkit-user-select:none;user-select:none;overscroll-behavior:none;box-shadow:0 28px 90px rgba(0,0,0,.36);isolation:isolate}.premiumImageStage.isZoomed{cursor:grab}.premiumImageStage.isZoomed:active{cursor:grabbing}.premiumImageBackdrop{position:absolute;z-index:0;inset:-5%;width:110%;height:110%;object-fit:cover;filter:blur(30px) saturate(.75) brightness(.48);opacity:.52;transform:scale(1.04);pointer-events:none}.premiumZoomImage{position:absolute;z-index:1;inset:0;margin:auto;display:block;max-width:100%;max-height:100%;width:auto;height:auto;object-fit:contain;image-rendering:auto;transform-origin:center center;will-change:transform;transition:none!important;-webkit-user-drag:none;-webkit-user-select:none;user-select:none;backface-visibility:hidden;-webkit-backface-visibility:hidden}.premiumImageHelp{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:0 3px;color:rgba(255,255,255,.54);font-size:9px}
      @keyframes premiumViewerIn{from{opacity:0}to{opacity:1}}
      @media(max-width:720px){.premiumImageLightbox{padding:8px}.premiumImagePanel{height:96dvh}.premiumImageTopbar{align-items:flex-start}.premiumImageActions{gap:4px}.premiumImageActions button{height:36px;min-width:36px}.premiumImageActions .premiumReset{display:none}.premiumImageActions>span{min-width:40px}.premiumImageStage{border-radius:12px}.premiumImageHelp span:first-child{display:none}.premiumImageTitle strong{font-size:12px}}
      @media(prefers-reduced-motion:reduce){.premiumImageLightbox{animation:none}}
    `}</style>
    <div className="premiumImagePanel" onClick={e => e.stopPropagation()}>
      <div className="premiumImageTopbar"><div className="premiumImageTitle"><div className="premiumImageTitleLine"><strong>{title}</strong><em className="premiumHdBadge">YÜKSEK ÇÖZÜNÜRLÜK</em></div>{subtitle && <span>{subtitle}</span>}{!fullReady && previewSrc && previewSrc !== src && <span className="premiumLoading">HD detay hazırlanıyor…</span>}</div><div className="premiumImageActions"><button type="button" onClick={() => zoomAt(transformRef.current.scale - .5)} aria-label="Uzaklaştır">−</button><span ref={labelRef}>100%</span><button type="button" onClick={() => zoomAt(transformRef.current.scale + .5)} aria-label="Yakınlaştır">+</button><button type="button" className="premiumReset" onClick={() => paint({ scale: 1, x: 0, y: 0 })}>Sıfırla</button><button type="button" className="premiumClose" onClick={onClose} aria-label="Görseli kapat">×</button></div></div>
      <div
        ref={stageRef}
        className="premiumImageStage"
        onPointerDown={e => {
          e.currentTarget.setPointerCapture?.(e.pointerId)
          pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY, downX: e.clientX, downY: e.clientY, pointerType: e.pointerType })
          if (pointersRef.current.size >= 2) { multiTouchRef.current = true; lastTapRef.current = null }
          beginGesture()
        }}
        onPointerMove={e => {
          const p = pointersRef.current.get(e.pointerId); if (!p) return
          p.x = e.clientX; p.y = e.clientY
          const points = pointerValues(), gesture = gestureRef.current
          if (points.length >= 2) {
            e.preventDefault()
            if (!gesture || gesture.kind !== 'pinch') { beginGesture(); return }
            const a = points[0], b = points[1]
            const distance = Math.hypot(b.x - a.x, b.y - a.y) || 1
            const scale = clampScale(gesture.startScale * (distance / gesture.startDistance))
            const mid = stagePoint((a.x + b.x) / 2, (a.y + b.y) / 2)
            paint({ scale, x: mid.x - gesture.contentX * scale, y: mid.y - gesture.contentY * scale })
          } else if (points.length === 1 && gesture?.kind === 'pan' && gesture.pointerId === e.pointerId && transformRef.current.scale > 1) {
            e.preventDefault(); paint({ ...gesture.start, x: gesture.start.x + e.clientX - gesture.startX, y: gesture.start.y + e.clientY - gesture.startY })
          }
        }}
        onPointerUp={e => {
          const p = pointersRef.current.get(e.pointerId)
          const moved = p ? Math.hypot(e.clientX - p.downX, e.clientY - p.downY) : 99
          const wasSingle = pointersRef.current.size === 1
          pointersRef.current.delete(e.pointerId)
          if (wasSingle && !multiTouchRef.current && moved < 12 && e.pointerType !== 'mouse') {
            const now = performance.now(), previous = lastTapRef.current
            if (previous && now - previous.time < 310 && Math.hypot(e.clientX - previous.x, e.clientY - previous.y) < 34) {
              lastTapRef.current = null
              zoomAt(transformRef.current.scale > 1.05 ? 1 : 2.5, e.clientX, e.clientY)
            } else lastTapRef.current = { time: now, x: e.clientX, y: e.clientY }
          }
          if (pointersRef.current.size === 0) multiTouchRef.current = false
          beginGesture(); paint(transformRef.current)
        }}
        onPointerCancel={e => { pointersRef.current.delete(e.pointerId); if (pointersRef.current.size === 0) multiTouchRef.current = false; beginGesture(); paint(transformRef.current) }}
        onDoubleClick={e => {
          if ((e.nativeEvent as MouseEvent & { sourceCapabilities?: { firesTouchEvents?: boolean } }).sourceCapabilities?.firesTouchEvents) return
          zoomAt(transformRef.current.scale > 1.05 ? 1 : 2.5, e.clientX, e.clientY)
        }}
      >
        <img className="premiumImageBackdrop" src={displaySrc} alt="" aria-hidden="true" draggable={false}/>
        <img ref={imageRef} className="premiumZoomImage" src={displaySrc} alt={alt} draggable={false} loading="eager" decoding="async" fetchPriority="high" onLoad={() => requestAnimationFrame(() => paint(transformRef.current))}/>
      </div>
      <div className="premiumImageHelp"><span>Çift dokun: dokunduğun noktaya 2.5×</span><span>İki parmakla yakınlaştır • Görsel sınırlarının dışına çıkmaz</span></div>
    </div>
  </div>
}

function DiscoverTab({ residence, sessionToken, favorites, studioVariants, selection, onSelectionChange, onRefresh }: { residence: Residence; sessionToken: string; favorites: FavoriteItem[]; studioVariants: StudioVariant[]; selection: DiscoverSelection; onSelectionChange: (next: DiscoverSelection, mode?: HistoryMode) => void; onRefresh: () => Promise<void> }) {
  const { roomId, model, materialId } = selection
  const [requestType, setRequestType] = useState(PROJECT_REQUEST_TYPES[0])
  const [notes, setNotes] = useState(''), [requestNo, setRequestNo] = useState(''), [requestMsg, setRequestMsg] = useState('')
  const [favoriteBusy, setFavoriteBusy] = useState(false), [busy, setBusy] = useState(false)
  const [viewer, setViewer] = useState<'preview' | 'slab' | null>(null)

  const room = STUDIO_ROOMS.find(r => r.id === roomId) || STUDIO_ROOMS[0]
  const material = STUDIO_MATERIALS.find(m => m.id === materialId) || STUDIO_MATERIALS[0]
  const requestUi = PROJECT_REQUEST_UI[requestType]
  const saved = favorites.some(f => f.residence_id === residence.id && f.room === room.title && f.design_name === model && f.material_name === material.name)
  const realPreview = studioVariants.find(v => v.room === room.title && (v.design_name === model || v.model_code === model) && v.material_name === material.name)
  const curatedPreview = CURATED_PREVIEWS.find(v => v.roomId === roomId && v.model === model && v.materialId === materialId)
  const previewImage = curatedPreview?.image || realPreview?.preview_image_url || null
  const previewFullImage = curatedPreview?.fullImage || previewImage

  useEffect(() => { setRequestNo(''); setRequestMsg(''); setViewer(null) }, [roomId, model, materialId])

  function chooseRoom(id: StudioRoomId) { onSelectionChange({ roomId: id, model: STUDIO_MODELS[id][0], materialId }, 'push') }
  function chooseModel(nextModel: string) { onSelectionChange({ roomId, model: nextModel, materialId }, 'replace') }
  function chooseMaterial(nextMaterial: MaterialId) { onSelectionChange({ roomId, model, materialId: nextMaterial }, 'replace') }
  function openFavorite(f: FavoriteItem) {
    const targetRoom = STUDIO_ROOMS.find(r => r.title === f.room); if (!targetRoom) return
    const targetMaterial = STUDIO_MATERIALS.find(m => m.name === f.material_name)
    const nextModel = f.design_name && STUDIO_MODELS[targetRoom.id].includes(f.design_name) ? f.design_name : STUDIO_MODELS[targetRoom.id][0]
    onSelectionChange({ roomId: targetRoom.id, model: nextModel, materialId: targetMaterial?.id || materialId }, 'push')
  }
  async function toggleFavorite() {
    setFavoriteBusy(true); setRequestMsg('')
    try { await gateway({ action: 'favorite_toggle', session_token: sessionToken, residence_id: residence.id, room: room.title, design_name: model, material_name: material.name }); await onRefresh() }
    catch { setRequestMsg('Seçiminiz kaydedilemedi. Lütfen tekrar deneyin.') }
    finally { setFavoriteBusy(false) }
  }
  async function createProjectRequest() {
    setRequestMsg(''); setRequestNo(''); setBusy(true)
    try {
      const data = await gateway({ action: 'project_request_create', session_token: sessionToken, residence_id: residence.id, request_type: requestType, room: room.title, design_name: model, material_name: material.name, notes: notes.trim() })
      setRequestNo(data.request.request_no); setNotes(''); await onRefresh()
    } catch { setRequestMsg('Talebiniz oluşturulamadı. Lütfen tekrar deneyin.') }
    finally { setBusy(false) }
  }

  return <>
    <style jsx global>{`
      .previewImageButton{position:absolute;z-index:1;inset:0;width:100%;height:100%;border:0;padding:0;margin:0;background:transparent;cursor:zoom-in;overflow:hidden}.previewOpenButton{position:absolute;z-index:7;right:12px;top:12px;display:inline-flex;align-items:center;gap:6px;border:1px solid rgba(255,255,255,.34);background:rgba(24,20,16,.72);color:#fff;border-radius:999px;padding:7px 10px;font-size:9px;font-weight:850;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);cursor:zoom-in;box-shadow:0 6px 18px rgba(0,0,0,.15)}
      .materialSpecs{display:flex;flex-wrap:wrap;gap:5px;margin:4px 0}.materialSpecs span{font-size:8.5px;font-weight:800;color:#775c39;background:#f5ead9;border:1px solid #e6d3b5;border-radius:999px;padding:4px 7px}.productCodeLine{font-size:9px;color:#8c8174;margin-top:1px}.realSlabVisual{cursor:zoom-in}.realSlabCard{transition:border-color .18s ease,box-shadow .18s ease}.realSlabCard:hover{border-color:#d1b07c;box-shadow:0 10px 28px rgba(83,61,34,.07)}
      .kaleSourceLine{display:inline-flex;align-items:center;gap:6px;width:max-content;max-width:100%;color:#665f57;text-decoration:none;font-size:10px;font-weight:700;border:1px solid rgba(44,40,35,.1);background:#fff;border-radius:999px;padding:5px 8px}.kaleWordmark{display:inline-flex;align-items:center;gap:4px;color:#242228;white-space:nowrap}.kaleWordmark b{font-size:11px}.kaleCastleMark{width:13px;height:13px;display:block;fill:#e74635}.slabZoomHint{position:absolute;right:7px;bottom:7px;background:rgba(31,28,24,.78);color:#fff;border:1px solid rgba(255,255,255,.28);border-radius:999px;padding:5px 8px;font-size:8px;font-weight:800;backdrop-filter:blur(7px)}
      @media(max-width:720px){.previewOpenButton{right:10px;top:10px;padding:6px 8px;font-size:8px}}
    `}</style>
    <div><div className="eyebrow gold">DİJİTAL TASARIM SEÇİMİ</div><h2 className="welcome">Eviniz için kombinasyon oluşturun</h2><div className="small muted">Odayı, modeli ve porseleni seçin. Beğendiğiniz kombinasyonu hesabınıza kaydedin veya doğrudan talep oluşturun.</div></div>
    <div className="studioRoomTabs">{STUDIO_ROOMS.map(r => <button key={r.id} type="button" className={roomId === r.id ? 'studioRoomTab active' : 'studioRoomTab'} onClick={() => chooseRoom(r.id)}><span>{r.icon}</span>{r.title}</button>)}</div>
    <div className={`designPreview material-${material.id} room-${room.id} ${curatedPreview ? 'curatedPreview' : ''}`}>
      <div className="previewBadge">{curatedPreview ? 'ERİPEK GOLD • ÖZEL TASARIM' : 'ÖZEL ÖN İZLEME'}</div>
      {previewImage ? <><button type="button" className="previewImageButton" onClick={() => setViewer('preview')} aria-label={`${curatedPreview?.title || `${room.title} ${model}`} görselini tam ekran büyüt`}><img src={previewImage} alt={curatedPreview?.title || `${room.title} ${model} ${material.name}`} className="realPreviewImage" /></button><button type="button" className="previewOpenButton" onClick={() => setViewer('preview')}><span>⌕</span> Yakınlaştır</button></> : <><div className="scene sceneWall"/><div className="scene sceneObject"/><div className="scene sceneAccent"/></>}
      <div className="previewCopy"><div className="eyebrow">{room.title.toUpperCase()}</div><strong>{curatedPreview?.title || model}</strong><div className="small">{curatedPreview?.subtitle || material.name}</div></div>
    </div>
    <PremiumImageViewer open={viewer === 'preview'} previewSrc={previewImage} src={previewFullImage} alt={curatedPreview?.title || `${room.title} ${model} ${material.name}`} title={curatedPreview?.title || `${room.title} • ${model}`} subtitle={curatedPreview?.subtitle || material.name} onClose={() => setViewer(null)} />

    <div className="studioBlock"><div className="sectionTitle">1 • Model seçimi</div><div className="modelChips">{STUDIO_MODELS[roomId].map(item => <button type="button" key={item} className={model === item ? 'chip active' : 'chip'} onClick={() => chooseModel(item)}>{item}</button>)}</div></div>
    <div className="studioBlock"><div className="sectionTitle">2 • Porselen seçimi</div><div className="materialList">{STUDIO_MATERIALS.map(item => <button type="button" key={item.id} className={materialId === item.id ? 'materialOption active' : 'materialOption'} onClick={() => chooseMaterial(item.id)}>{item.slabImage ? <img src={item.slabImage} alt={`${item.name} porselen plaka`} loading="lazy" className="materialRealThumb"/> : <span className={`swatch material-${item.id}`}/>}<span><strong>{item.name}</strong><small>{item.note}</small></span><b>›</b></button>)}</div></div>

    {material.slabImage && <div className="realSlabCard"><button type="button" className="realSlabVisual" onClick={() => setViewer('slab')} aria-label={`${material.name} plaka görselini büyüt`}><img src={material.slabImage} alt={`${material.name} T-ONE plaka görünümü`}/><span className="slabZoomHint">⌕ Büyüt</span></button><div className="realSlabCopy"><div className="eyebrow gold">PLAKA & TEKNİK BİLGİ</div><strong>{material.slabMeta}</strong><div className="materialSpecs">{material.size && <span>{material.size}</span>}{material.thickness && <span>{material.thickness}</span>}{material.surface && <span>{material.surface}</span>}</div>{material.productCode && <div className="productCodeLine">Ürün kodu: {material.productCode}</div>}{material.productUrl && <a href={material.productUrl} target="_blank" rel="noreferrer" className="kaleSourceLine"><span className="kaleWordmark"><svg viewBox="0 0 24 24" aria-hidden="true" className="kaleCastleMark"><path d="M3 4h4v4h3V4h4v4h3V4h4v16H3V4Zm4 10v6h3v-6H7Zm7 0v6h3v-6h-3Z"/></svg><b>Kale</b></span><span>resmî ürün sayfası ↗</span></a>}<div className="small muted">Plaka görselini büyüterek damar ve yüzey karakterini inceleyebilirsiniz. Ekran renkleri fiziksel numuneden küçük farklılık gösterebilir.</div></div></div>}
    <PremiumImageViewer open={viewer === 'slab'} previewSrc={material.slabImage} src={material.slabImage} alt={`${material.name} T-ONE plaka`} title={`${material.name} • Plaka Görünümü`} subtitle={material.slabMeta || material.name} onClose={() => setViewer(null)} />

    <div className="selectionSummary"><div><div className="small muted">Seçiminiz</div><strong>{room.title} • {model}</strong><div className="small muted">{material.name}</div></div><button type="button" disabled={favoriteBusy} className={saved ? 'miniSave saved' : 'miniSave'} onClick={toggleFavorite}>{favoriteBusy ? 'Kaydediliyor…' : saved ? '✓ Kaydedildi' : '♡ Kaydet'}</button></div>
    {favorites.length > 0 && <div className="card savedDesignsCard"><div className="sectionRow"><div><div className="eyebrow gold">KAYDETTİKLERİM</div><strong>Beğendiğiniz tasarımlar</strong></div><span className="countPill">{favorites.length}</span></div><div className="savedDesignList">{favorites.map(f => <button type="button" key={f.id} onClick={() => openFavorite(f)}><span className="savedMiniVisual">MP</span><span><strong>{f.room} • {f.design_name}</strong><small>{f.material_name}</small></span><b>›</b></button>)}</div></div>}
    <div className="card projectLeadCard"><div className="eyebrow gold">PROJENİZİ BAŞLATALIM</div><strong>Bu seçimi evinizde değerlendirelim</strong><div className="small muted">Talebiniz daire bilgilerinizle birlikte Master Porcelenta ekibine iletilir. Tekrar adres veya telefon girmeniz gerekmez.</div><div><label className="label">Talep türü</label><select className="input" value={requestType} onChange={e => setRequestType(e.target.value as typeof requestType)}>{PROJECT_REQUEST_TYPES.map(t => <option key={t}>{t}</option>)}</select></div><div><label className="label">Notunuz <span className="muted">(isteğe bağlı)</span></label><textarea className="input textarea" rows={3} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Örn: Ada tezgahı için yerinde ölçü ve fiyat istiyorum." /></div>{requestMsg && <div className="errorBox">{requestMsg}</div>}{requestNo && <div className="successBox"><strong>{requestUi.success}</strong><div className="small">Talep numaranız: {requestNo}</div></div>}<button type="button" className="btn primary" disabled={busy || !residence.id} onClick={createProjectRequest}>{busy ? requestUi.busy : requestUi.button}</button></div>
  </>
}

function RequestsTab({ residence, portal, loading, onRefresh }: { residence: Residence; portal: PortalData; loading: boolean; onRefresh: () => Promise<void> }) {
  const [kind, setKind] = useState<'all' | 'service' | 'project'>('all')
  const all = [
    ...portal.service_requests.filter(x => !x.residence_id || x.residence_id === residence.id).map(x => ({ type: 'service' as const, no: x.ticket_no, title: x.issue_type, detail: x.description || '', status: SERVICE_STATUS_LABELS[x.status] || x.status, rawStatus: x.status, created_at: x.created_at, appointment_at: x.appointment_at || null, admin_note: x.admin_note || '', attachments: x.attachments || [], quote_amount: null as number | null, quote_note: '', quote_valid_until: null as string | null })),
    ...portal.project_requests.filter(x => !x.residence_id || x.residence_id === residence.id).map(x => ({ type: 'project' as const, no: x.request_no, title: x.request_type || 'Proje talebi', detail: [x.room, x.design_name, x.material_name].filter(Boolean).join(' • '), status: PROJECT_STATUS_LABELS[x.status] || x.status, rawStatus: x.status, created_at: x.created_at, appointment_at: x.appointment_at || null, admin_note: x.admin_note || '', attachments: [] as ServiceAttachment[], quote_amount: x.quote_amount || null, quote_note: x.quote_note || '', quote_valid_until: x.quote_valid_until || null })),
  ].filter(x => kind === 'all' || x.type === kind).sort((a, b) => +new Date(b.created_at) - +new Date(a.created_at))

  return <div className="stack"><div><div className="eyebrow gold">TALEPLERİM</div><h2 className="welcome">İşlemlerinizi takip edin</h2><div className="small muted">{residence.block} Blok • {residence.floor}. Kat • Daire {residence.unit_no} için servis, keşif ve teklif talepleriniz.</div></div>
    <div className="requestFilters"><button type="button" className={kind === 'all' ? 'active' : ''} onClick={() => setKind('all')}>Tümü</button><button type="button" className={kind === 'service' ? 'active' : ''} onClick={() => setKind('service')}>Servis</button><button type="button" className={kind === 'project' ? 'active' : ''} onClick={() => setKind('project')}>Proje / Teklif</button><button type="button" className="refreshRequests" onClick={() => onRefresh()} aria-label="Talepleri yenile">↻</button></div>
    {loading ? <div className="card small muted">Talepler yükleniyor…</div> : all.length ? <div className="customerRequestList">{all.map(x => <div className="card customerRequest" key={x.no}><div className="customerRequestTop"><div><div className="ticketNo">{x.no}</div><strong>{x.title}</strong></div><span className={`customerStatus st-${x.rawStatus}`}>{x.status}</span></div>{x.detail && <div className="small muted">{x.detail}</div>}{x.appointment_at && <div className="requestAppointment"><span>Planlanan tarih</span><strong>{dateTimeTR(x.appointment_at)}</strong></div>}{x.admin_note && <div className="requestAdminNote"><span>Master Porcelenta notu</span><div>{x.admin_note}</div></div>}{x.type === 'project' && x.quote_amount ? <div className="quoteCustomerBox"><div className="small muted">Master Porcelenta fiyat teklifi</div><strong>{moneyTR(x.quote_amount)}</strong>{x.quote_note && <div className="small">{x.quote_note}</div>}{x.quote_valid_until && <div className="small muted">Geçerlilik: {formatDateTR(x.quote_valid_until)}</div>}</div> : null}<div className="small requestDate">{dateTimeTR(x.created_at)}</div>{x.attachments.length > 0 && <div className="attachmentGrid">{x.attachments.map((a, i) => a.signed_url ? <a href={a.signed_url} target="_blank" rel="noreferrer" key={a.storage_path || i}><img src={a.signed_url} alt={`Servis fotoğrafı ${i + 1}`} /></a> : null)}</div>}</div>)}</div> : <div className="emptySoft"><strong>Henüz talebiniz yok</strong><div className="small muted">Servis veya proje talebi oluşturduğunuzda kayıtlarınız burada görünür.</div></div>}
  </div>
}

function ServiceTab({ residence, sessionToken, installedProducts, onCreated }: { residence: Residence; sessionToken: string; installedProducts: InstalledProduct[]; onCreated: () => Promise<void> }) {
  const [product, setProduct] = useState(''), [issue, setIssue] = useState(''), [description, setDescription] = useState('')
  const [photos, setPhotos] = useState<ServicePhoto[]>([]), [msg, setMsg] = useState(''), [ticket, setTicket] = useState('')
  const [busy, setBusy] = useState(false), [photoBusy, setPhotoBusy] = useState(false)
  const residenceProducts = installedProducts.filter(p => p.residence_id === residence.id)

  async function selectPhotos(files: FileList | null) {
    if (!files?.length) return
    setMsg('')
    const remaining = Math.max(0, 3 - photos.length)
    if (!remaining) return setMsg('En fazla 3 fotoğraf ekleyebilirsiniz.')
    setPhotoBusy(true)
    try {
      const selected = Array.from(files).slice(0, remaining), compressed: ServicePhoto[] = []
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
    } catch (err) { setMsg((err instanceof Error ? err.message : '') === 'service_photo_invalid' ? 'Fotoğraflardan biri uygun formatta değil veya çok büyük. Lütfen tekrar seçin.' : 'Servis kaydı oluşturulamadı. Lütfen tekrar deneyin.') }
    finally { setBusy(false) }
  }

  return <form className="stack" onSubmit={submit}>
    <div><div className="eyebrow gold">SERVİS MERKEZİ</div><h2 className="welcome">Nasıl yardımcı olabiliriz?</h2><div className="small muted">Sorunu anlatın ve isterseniz fotoğraf ekleyin; kayıt teknik değerlendirmeye alınsın.</div></div>
    <div className="selectedResidence"><div className="small muted">Konut</div><strong>{residence.block} Blok • {residence.floor}. Kat • Daire {residence.unit_no}</strong></div>
    <div className="serviceGuide"><div><strong>Garanti kapsamında</strong><div className="coveragePills compact"><span>Su sızıntısı</span><span>Çökme</span><span>Aşınma</span></div></div><div className="small muted">Darbe, tesisat / tadilat müdahaleleri, üçüncü kişi işlemleri ve kimyasal / aşındırıcı ürün kaynaklı hasarlar garanti dışında değerlendirilir. Daire teslimi öncesindeki şantiye kaynaklı fiziksel hasarlar müşteri kullanım hatası sayılmaz.</div></div>
    <div><label className="label">Ürün</label><select className="input" value={product} onChange={e => setProduct(e.target.value)}><option value="">Seçin</option>{residenceProducts.length ? residenceProducts.map(p => <option key={p.id} value={p.name}>{p.name}{p.dimensions ? ` • ${p.dimensions}` : ''}</option>) : SERVICE_PRODUCTS.map(item => <option key={item}>{item}</option>)}</select></div>
    <div><label className="label">Talep türü</label><select className="input" value={issue} onChange={e => setIssue(e.target.value)}><option value="">Seçin</option>{SERVICE_ISSUES.map(item => <option key={item}>{item}</option>)}</select></div>
    <div><label className="label">Açıklama</label><textarea className="input textarea" rows={4} value={description} onChange={e => setDescription(e.target.value)} placeholder="Sorunu kısaca anlatın. Örn: lavabo altından su sızıntısı var." /></div>
    <div className="photoUploadBox"><div><label className="label">Fotoğraf <span className="optionalText">(isteğe bağlı • en fazla 3)</span></label><div className="small muted">Sorunu gösteren fotoğraflar teknik değerlendirmeyi hızlandırır.</div></div><label className="photoPickBtn">{photoBusy ? 'Fotoğraf hazırlanıyor…' : '+ Fotoğraf Ekle'}<input type="file" accept="image/*" multiple disabled={photoBusy || photos.length >= 3} onChange={e => { selectPhotos(e.currentTarget.files); e.currentTarget.value = '' }} /></label>{photos.length > 0 && <div className="photoPreviewGrid">{photos.map((p, i) => <div key={`${p.name}-${i}`}><img src={p.data_url} alt={`Seçilen fotoğraf ${i + 1}`} /><button type="button" onClick={() => setPhotos(prev => prev.filter((_, idx) => idx !== i))}>×</button></div>)}</div>}</div>
    {msg && <div className="errorBox">{msg}</div>}{ticket && <div className="successBox"><strong>Servis kaydınız alındı.</strong><div className="small">Talep numaranız: {ticket} • Durumunu “Taleplerim” bölümünden takip edebilirsiniz.</div></div>}
    <button className="btn dark" disabled={busy || photoBusy} type="submit">{busy ? 'Kaydediliyor…' : 'Servis Kaydını Oluştur'}</button>
    <div className="card careMini"><strong>Porselen bakım notu</strong><div className="small muted spaceTop">Günlük temizlik için yumuşak, nemli bez yeterlidir. Güçlü kimyasallar ve aşındırıcı ürünlere ihtiyaç yoktur.</div></div>
  </form>
}

function AccountTab({ customer, residence, residences, sessionToken, support, productCount, onProducts, onResidenceChange, onResidenceAdded, onReset }: { customer: Customer; residence: Residence; residences: Residence[]; sessionToken: string; support: SupportInfo | null; productCount: number; onProducts: () => void; onResidenceChange: (residence: Residence) => void; onResidenceAdded: (data: any) => Promise<void>; onReset: () => void }) {
  const [email, setEmail] = useState(customer.email || ''), [pin, setPin] = useState(''), [pinAgain, setPinAgain] = useState('')
  const [msg, setMsg] = useState(''), [ok, setOk] = useState(false), [busy, setBusy] = useState(false)
  const [addBlock, setAddBlock] = useState(''), [addFloor, setAddFloor] = useState(''), [addUnit, setAddUnit] = useState('')
  const [addMsg, setAddMsg] = useState(''), [addOk, setAddOk] = useState(false), [addBusy, setAddBusy] = useState(false)
  const floorUnits = addFloor ? ({ '1': ['1','2','3','4'], '2': ['5','6','7','8'], '3': ['9','10','11','12'], '4': ['13','14','15','16'], '5': ['17','18','19','20'], '6': ['21','22','23','24'], '7': ['25'] } as Record<string, string[]>)[addFloor] || [] : []

  useEffect(() => { setEmail(customer.email || '') }, [customer.email])

  async function addResidence(e: FormEvent) {
    e.preventDefault(); setAddMsg(''); setAddOk(false)
    if (!addBlock || !addFloor || !addUnit) return setAddMsg('Blok, kat ve daire bilgilerini seçin.')
    setAddBusy(true)
    try {
      const data = await addResidenceToAccount(sessionToken, addBlock, addFloor, addUnit)
      await onResidenceAdded({ residence: { id: data.residence_id } }); setAddOk(true); setAddBlock(''); setAddFloor(''); setAddUnit('')
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
    try { await gateway({ action: 'login_setup', session_token: sessionToken, email: email.trim(), pin }); setOk(true); setPin(''); setPinAgain('') }
    catch { setMsg('Giriş bilgileri güncellenemedi. Tekrar deneyin.') }
    finally { setBusy(false) }
  }

  return <>
    <div><div className="eyebrow gold">KİŞİSEL HESABIM</div><h2 className="welcome">Daire bilgilerim</h2></div>
    <div className="card accountCard"><div><div className="small muted">Müşteri</div><strong>{customer.full_name}</strong></div><div><div className="small muted">Telefon</div><strong>{customer.phone}</strong></div>{customer.email && <div><div className="small muted">E-posta</div><strong>{customer.email}</strong></div>}<div><div className="small muted">Konut</div><strong>{residence.block} Blok • {residence.floor}. Kat • Daire {residence.unit_no}</strong></div><div><div className="small muted">Proje</div><strong>Eripek Gold</strong></div><div><div className="small muted">Uygulama garantisi</div><strong>{residence.default_warranty_months || 12} Ay</strong><div className="small muted">Başlangıç: {formatDateTR(residence.delivery_date)}</div></div></div>
    <div className="card residencesCard"><div className="residencesCardHead"><div><div className="eyebrow gold">DAİRELERİM</div><strong>{residences.length} kayıtlı konut</strong><div className="small muted">Daire değiştirdiğinizde ürün, garanti, servis ve talepler o konuta göre gösterilir.</div></div></div><div className="residenceList">{residences.map(r => <button type="button" key={r.id || `${r.block}-${r.floor}-${r.unit_no}`} className={r.id === residence.id ? 'active' : ''} onClick={() => onResidenceChange(r)}><span><b>{r.block} Blok • Daire {r.unit_no}</b><small>{r.floor}. Kat</small></span><em>{r.id === residence.id ? 'Aktif' : 'Seç'}</em></button>)}</div><details className="addResidenceDetails"><summary>+ Başka dairem var</summary><form className="addResidenceForm" onSubmit={addResidence}><div className="grid3"><select className="input" value={addBlock} onChange={e => setAddBlock(e.target.value)}><option value="">Blok</option>{['A','B','C','D'].map(x => <option key={x}>{x}</option>)}</select><select className="input" value={addFloor} onChange={e => { setAddFloor(e.target.value); setAddUnit('') }}><option value="">Kat</option>{['1','2','3','4','5','6','7'].map(x => <option key={x}>{x}</option>)}</select><select className="input" value={addUnit} onChange={e => setAddUnit(e.target.value)} disabled={!addFloor}><option value="">Daire</option>{floorUnits.map(x => <option key={x}>{x}</option>)}</select></div><div className="small muted">Bu işlem seçtiğiniz konutu mevcut Master Porcelenta hesabınıza bağlar. Daire başka bir hesaba tanımlıysa işlem yapılmaz.</div>{addMsg && <div className="errorBox">{addMsg}</div>}{addOk && <div className="successBox">Daire hesabınıza eklendi ve aktif konut olarak seçildi.</div>}<button className="btn dark" disabled={addBusy}>{addBusy ? 'Ekleniyor…' : 'Daireyi Hesabıma Ekle'}</button></form></details></div>
    <button type="button" className="card accountProductsLink" onClick={onProducts}><div className="productsSummaryIcon">MP</div><div><div className="eyebrow gold">ÜRÜNLERİM & GARANTİ</div><strong>{productCount} kayıtlı uygulama</strong><div className="small muted">Ölçü, montaj ve garanti detaylarını görüntüleyin</div></div><b>›</b></button>
    <form className="card accountLoginSetup" onSubmit={saveLogin}><div><div className="eyebrow gold">FARKLI CİHAZDAN GİRİŞ</div><strong>Giriş bilgilerinizi yönetin</strong><div className="small muted spaceTop">Telefon numaranız her zaman kullanılabilir. İsterseniz e-posta ekleyin ve 6 haneli giriş kodunuzu belirleyin veya değiştirin.</div></div><div><label className="label">E-posta <span className="optionalText">(isteğe bağlı)</span></label><input className="input" value={email} onChange={e => setEmail(e.target.value)} inputMode="email" autoComplete="email" placeholder="ad@eposta.com" /></div><div className="pinGrid"><div><label className="label">Yeni 6 Haneli Kod</label><input className="input pinInput" value={pin} onChange={e => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="6 rakam" /></div><div><label className="label">Kodu Tekrar</label><input className="input pinInput" value={pinAgain} onChange={e => setPinAgain(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="6 rakam" /></div></div>{msg && <div className="errorBox">{msg}</div>}{ok && <div className="successBox">Giriş bilgileriniz güncellendi. Artık farklı cihazlardan da hesabınıza girebilirsiniz.</div>}<button className="btn dark" type="submit" disabled={busy}>{busy ? 'Kaydediliyor…' : 'Giriş Bilgilerimi Kaydet'}</button></form>
    {support && <div className="card supportCard"><div><div className="eyebrow gold">MÜŞTERİ DESTEĞİ</div><strong>Master Porcelenta ile iletişim</strong></div><div className="supportActions">{support.phone && <a href={`tel:${support.phone.replace(/\D/g, '')}`}><span>Telefon</span><strong>{support.phone}</strong>{support.contact_name && <small>{support.contact_name}</small>}</a>}{support.whatsapp && <a href={`https://wa.me/90${support.whatsapp.replace(/\D/g, '').replace(/^0/, '')}`} target="_blank" rel="noreferrer"><span>WhatsApp</span><strong>{support.whatsapp}</strong><small>Master Porcelenta</small></a>}{support.email && <a href={`mailto:${support.email}`}><span>E-posta</span><strong>{support.email}</strong></a>}</div>{support.address && <div className="supportAddress small muted">İşletme adresi: {support.address}</div>}</div>}
    <PrivacyNotice />
    <button className="btn ghost" onClick={async () => { try { await gateway({ action: 'customer_logout', session_token: sessionToken }) } catch {} onReset() }}>Güvenli çıkış yap</button>
  </>
}

function PrivacyNotice() {
  return <details className="privacyNotice"><summary>KVKK Aydınlatma Metni <span>›</span></summary><div className="privacyNoticeBody"><p><strong>Veri sorumlusu:</strong> Master Porcelenta, TPAO BLV NO: 75/A Batman/Merkez.</p><p>Eripek Gold portalında ad-soyad, telefon, isteğe bağlı e-posta, konut bilgisi, ürün/garanti kayıtları, servis ve proje/teklif talepleri ile servis için yüklediğiniz ürün/hasar fotoğrafları; hesabınızın oluşturulması, garanti bilgilerinin sunulması, servis ve teklif süreçlerinin yürütülmesi, sizinle iletişim kurulması ve portal güvenliğinin sağlanması amaçlarıyla işlenir.</p><p>Veriler elektronik ortamda, tarafınızca girilen bilgiler ve portal kullanımı yoluyla elde edilir; ilgili süreç bakımından 6698 sayılı Kanun'un 5. maddesindeki sözleşmenin kurulması veya ifasıyla doğrudan ilgili olma, veri sorumlusunun hukuki yükümlülüğünü yerine getirmesi ve temel haklarınıza zarar vermemek kaydıyla meşru menfaat işleme şartlarına dayanılarak işlenir.</p><p>Veriler, hizmetin yürütülmesi için gerektiği ölçüde teknik altyapı/barındırma hizmet sağlayıcılarıyla ve kanunen talep edilmesi halinde yetkili kamu kurum ve kuruluşlarıyla paylaşılabilir.</p><p>6698 sayılı Kanun'un 11. maddesi kapsamındaki haklarınıza ilişkin başvurularınızı <a href="mailto:masterporcelenta@gmail.com">masterporcelenta@gmail.com</a> adresine veya yukarıdaki işletme adresine iletebilirsiniz.</p><p className="privacyPhotoNote"><strong>Servis fotoğrafı:</strong> Yalnızca ürün ve hasar alanını paylaşın; kişi, kimlik belgesi veya özel belge görüntüsü yüklemeyin.</p></div></details>
}

function Room({ title, sub, onClick }: { title: string; sub: string; onClick?: () => void }) {
  return <button type="button" className="room" onClick={onClick}><div className="roomVisual"><span>MP</span></div><div className="roomBody"><strong>{title}</strong><div className="small muted">{sub}</div></div></button>
}

function Shell({ children }: { children: ReactNode }) {
  return <main className="page"><section className="phone"><div className="top brandBar"><div className="brandLockup"><img className="brandMarkImg" src="/master-porcelenta-mark.png" alt="Master Porcelenta" /><div><div className="brand">MASTER PORCELENTA</div><div className="sub">Eripek Gold • Garanti • Servis • Tasarım</div></div></div><div className="goldDot" /></div>{children}</section></main>
}
