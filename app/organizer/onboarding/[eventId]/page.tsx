'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase'

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA',
  'KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ',
  'NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT',
  'VA','WA','WV','WI','WY',
]

type Step = 'personal' | 'address' | 'bank' | 'tos' | 'done'

interface FormData {
  firstName: string; lastName: string
  dobMonth: string; dobDay: string; dobYear: string
  ssnLast4: string
  phone: string
  addressLine1: string; city: string; state: string; postalCode: string
  website: string
  accountHolderName: string; routingNumber: string
  accountNumber: string; accountNumberConfirm: string
  accountType: 'checking' | 'savings'
  tosAccepted: boolean
}

const INITIAL: FormData = {
  firstName: '', lastName: '',
  dobMonth: '', dobDay: '', dobYear: '',
  ssnLast4: '',
  phone: '',
  addressLine1: '', city: '', state: '', postalCode: '',
  website: '',
  accountHolderName: '', routingNumber: '',
  accountNumber: '', accountNumberConfirm: '',
  accountType: 'checking',
  tosAccepted: false,
}

const STEPS: Step[] = ['personal', 'address', 'bank', 'tos']
const STEP_LABELS = ['Personal', 'Address', 'Bank', 'Review']

export default function CustomOnboardingPage() {
  const { user, loading } = useAuth()
  const params = useParams()
  const router = useRouter()
  const eventId = Array.isArray(params.eventId) ? params.eventId[0] : params.eventId

  const [step, setStep] = useState<Step>('personal')
  const [form, setForm] = useState<FormData>(INITIAL)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [checking, setChecking] = useState(true)

  // If already onboarded, skip straight to ticket tiers
  useEffect(() => {
    if (!user || loading) return
    async function checkOnboarded() {
      const supabase = createClient()
      if (!supabase) { setChecking(false); return }
      const { data } = await supabase
        .from('organizer_profiles')
        .select('stripe_onboarding_complete')
        .eq('id', user!.id)
        .single()
      if (data?.stripe_onboarding_complete) {
        router.replace(`/organizer/events/${eventId}/tickets`)
      } else {
        setChecking(false)
      }
    }
    checkOnboarded()
  }, [user, loading, eventId, router])

  if (loading || checking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-[#C8FF00]/30 border-t-[#C8FF00] rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    if (typeof window !== 'undefined') router.replace('/login')
    return null
  }

  const set = (field: keyof FormData, value: string | boolean) =>
    setForm(f => ({ ...f, [field]: value }))

  const inputClass = 'w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 border border-white/10 outline-none focus:border-[#C8FF00]/50 transition-colors'
  const inputStyle = { background: 'rgba(255,255,255,0.05)' }

  const stepIndex = STEPS.indexOf(step as Step)

  async function handleSubmit() {
    setSubmitting(true)
    setError(null)
    try {
      const supabase = createClient()
      if (!supabase) throw new Error('Not initialized')
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token
      if (!token) throw new Error('Not logged in')

      const res = await fetch('/api/stripe/connect/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Submission failed')
      setStep('done')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  if (step === 'done') {
    return (
      <div className="px-4 py-16 max-w-lg mx-auto text-center">
        <div className="glass p-10">
          <div className="text-5xl mb-4">{'✅'}</div>
          <h2 className="text-2xl font-black text-white mb-2">{"You're set up!"}</h2>
          <p className="text-white/50 mb-6">
            Your bank account is connected. Now add ticket tiers to start selling.
          </p>
          <a
            href={`/organizer/events/${eventId}/tickets`}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm"
            style={{ background: '#C8FF00', color: '#000' }}
          >
            Set up ticket tiers
          </a>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 py-6 max-w-lg mx-auto pb-24">
      {/* Header */}
      <div className="mb-6">
        <button onClick={() => step === 'personal' ? router.back() : setStep(STEPS[stepIndex - 1])}
          className="text-white/40 text-sm hover:text-white/70 transition-colors mb-4">
          Back
        </button>
        <h1 className="text-2xl font-black text-white">Set up payouts</h1>
        <p className="text-white/40 mt-1 text-sm">Connect your bank to receive ticket revenue.</p>
      </div>

      {/* Step indicator */}
      <div className="flex gap-2 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex-1">
            <div className="h-1 rounded-full transition-all duration-300"
              style={{ background: i <= stepIndex ? '#C8FF00' : 'rgba(255,255,255,0.1)' }} />
            <p className="text-[10px] mt-1 font-medium"
              style={{ color: i === stepIndex ? '#C8FF00' : 'rgba(255,255,255,0.25)' }}>
              {STEP_LABELS[i]}
            </p>
          </div>
        ))}
      </div>

      {/* Step 1: Personal */}
      {step === 'personal' && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/50 font-medium uppercase tracking-wider mb-1.5 block">First Name</label>
              <input value={form.firstName} onChange={e => set('firstName', e.target.value)}
                placeholder="Jane" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className="text-xs text-white/50 font-medium uppercase tracking-wider mb-1.5 block">Last Name</label>
              <input value={form.lastName} onChange={e => set('lastName', e.target.value)}
                placeholder="Smith" className={inputClass} style={inputStyle} />
            </div>
          </div>

          <div>
            <label className="text-xs text-white/50 font-medium uppercase tracking-wider mb-1.5 block">Date of Birth</label>
            <div className="grid grid-cols-3 gap-2">
              <input value={form.dobMonth} onChange={e => set('dobMonth', e.target.value)}
                placeholder="MM" maxLength={2} className={inputClass} style={inputStyle} />
              <input value={form.dobDay} onChange={e => set('dobDay', e.target.value)}
                placeholder="DD" maxLength={2} className={inputClass} style={inputStyle} />
              <input value={form.dobYear} onChange={e => set('dobYear', e.target.value)}
                placeholder="YYYY" maxLength={4} className={inputClass} style={inputStyle} />
            </div>
          </div>

          <div>
            <label className="text-xs text-white/50 font-medium uppercase tracking-wider mb-1.5 block">
              Last 4 of SSN
            </label>
            <input value={form.ssnLast4} onChange={e => set('ssnLast4', e.target.value.replace(/\D/g, '').slice(0, 4))}
              placeholder="1234" maxLength={4} type="password" autoComplete="off"
              className={inputClass} style={inputStyle} />
            <p className="text-white/20 text-xs mt-1">Used only for identity verification. Never stored by us.</p>
          </div>

          <div>
            <label className="text-xs text-white/50 font-medium uppercase tracking-wider mb-1.5 block">Phone Number</label>
            <input value={form.phone} onChange={e => set('phone', e.target.value)}
              placeholder="+1 (555) 000-0000" type="tel" autoComplete="tel"
              className={inputClass} style={inputStyle} />
          </div>

          <button
            onClick={() => {
              if (!form.firstName || !form.lastName || !form.dobMonth || !form.dobDay || !form.dobYear || form.ssnLast4.length !== 4 || !form.phone) {
                setError('Please fill in all fields')
                return
              }
              setError(null)
              setStep('address')
            }}
            className="w-full py-4 rounded-xl font-bold text-sm mt-2"
            style={{ background: '#C8FF00', color: '#000' }}
          >
            Continue
          </button>
        </div>
      )}

      {/* Step 2: Address */}
      {step === 'address' && (
        <div className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-white/50 font-medium uppercase tracking-wider mb-1.5 block">Street Address</label>
            <input value={form.addressLine1} onChange={e => set('addressLine1', e.target.value)}
              placeholder="123 Main St" className={inputClass} style={inputStyle} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/50 font-medium uppercase tracking-wider mb-1.5 block">City</label>
              <input value={form.city} onChange={e => set('city', e.target.value)}
                placeholder="Los Angeles" className={inputClass} style={inputStyle} />
            </div>
            <div>
              <label className="text-xs text-white/50 font-medium uppercase tracking-wider mb-1.5 block">State</label>
              <select value={form.state} onChange={e => set('state', e.target.value)}
                className={inputClass} style={inputStyle}>
                <option value="">State</option>
                {US_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs text-white/50 font-medium uppercase tracking-wider mb-1.5 block">ZIP Code</label>
            <input value={form.postalCode} onChange={e => set('postalCode', e.target.value.replace(/\D/g, '').slice(0, 5))}
              placeholder="90001" maxLength={5} className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className="text-xs text-white/50 font-medium uppercase tracking-wider mb-1.5 block">Website or Social Link</label>
            <input value={form.website} onChange={e => set('website', e.target.value)}
              placeholder="https://instagram.com/yourpage" type="url"
              className={inputClass} style={inputStyle} />
            <p className="text-white/20 text-xs mt-1">Instagram, SoundCloud, or any public link</p>
          </div>
          <button
            onClick={() => {
              if (!form.addressLine1 || !form.city || !form.state || form.postalCode.length < 5) {
                setError('Please fill in all address fields')
                return
              }
              setError(null)
              setStep('bank')
            }}
            className="w-full py-4 rounded-xl font-bold text-sm mt-2"
            style={{ background: '#C8FF00', color: '#000' }}
          >
            Continue
          </button>
        </div>
      )}

      {/* Step 3: Bank Account */}
      {step === 'bank' && (
        <div className="flex flex-col gap-4">
          <div className="p-4 rounded-xl mb-2" style={{ background: 'rgba(200,255,0,0.06)', border: '1px solid rgba(200,255,0,0.2)' }}>
            <p className="text-[#C8FF00] text-xs font-bold mb-1">Bank-level security</p>
            <p className="text-white/50 text-xs leading-relaxed">
              Your banking details are sent directly to Stripe over an encrypted connection and never stored on our servers.
            </p>
          </div>

          {/* Account type toggle */}
          <div>
            <label className="text-xs text-white/50 font-medium uppercase tracking-wider mb-1.5 block">Account Type</label>
            <div className="grid grid-cols-2 gap-2">
              {(['checking', 'savings'] as const).map(type => (
                <button key={type} type="button" onClick={() => set('accountType', type)}
                  className="py-3 rounded-xl text-sm font-bold capitalize transition-all border"
                  style={{
                    background: form.accountType === type ? '#C8FF00' : 'rgba(255,255,255,0.05)',
                    color: form.accountType === type ? '#000' : 'rgba(255,255,255,0.5)',
                    borderColor: form.accountType === type ? '#C8FF00' : 'rgba(255,255,255,0.1)',
                  }}>
                  {type}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-xs text-white/50 font-medium uppercase tracking-wider mb-1.5 block">Account Holder Name</label>
            <input value={form.accountHolderName} onChange={e => set('accountHolderName', e.target.value)}
              placeholder={`${form.firstName} ${form.lastName}`.trim() || 'Full name on account'}
              className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className="text-xs text-white/50 font-medium uppercase tracking-wider mb-1.5 block">Routing Number</label>
            <input value={form.routingNumber} onChange={e => set('routingNumber', e.target.value.replace(/\D/g, '').slice(0, 9))}
              placeholder="110000000" maxLength={9} inputMode="numeric"
              className={inputClass} style={inputStyle} />
            <p className="text-white/20 text-xs mt-1">9-digit number on the bottom left of your check</p>
          </div>
          <div>
            <label className="text-xs text-white/50 font-medium uppercase tracking-wider mb-1.5 block">Account Number</label>
            <input value={form.accountNumber} onChange={e => set('accountNumber', e.target.value.replace(/\D/g, ''))}
              placeholder="000123456789" type="password" autoComplete="off" inputMode="numeric"
              className={inputClass} style={inputStyle} />
          </div>
          <div>
            <label className="text-xs text-white/50 font-medium uppercase tracking-wider mb-1.5 block">Confirm Account Number</label>
            <input value={form.accountNumberConfirm} onChange={e => set('accountNumberConfirm', e.target.value.replace(/\D/g, ''))}
              placeholder="000123456789" type="password" autoComplete="off" inputMode="numeric"
              className={inputClass} style={inputStyle} />
          </div>
          <button
            onClick={() => {
              if (!form.routingNumber || form.routingNumber.length !== 9) { setError('Routing number must be 9 digits'); return }
              if (!form.accountNumber) { setError('Account number is required'); return }
              if (form.accountNumber !== form.accountNumberConfirm) { setError('Account numbers do not match'); return }
              setError(null)
              setStep('tos')
            }}
            className="w-full py-4 rounded-xl font-bold text-sm mt-2"
            style={{ background: '#C8FF00', color: '#000' }}
          >
            Continue
          </button>
        </div>
      )}

      {/* Step 4: TOS + Submit */}
      {step === 'tos' && (
        <div className="flex flex-col gap-4">
          <div className="glass p-5 rounded-xl text-sm text-white/60 leading-relaxed">
            <h3 className="text-white font-bold mb-3">Before you continue</h3>
            <p className="mb-3">
              By connecting your bank account, you agree to the{' '}
              <a href="https://stripe.com/connect-account/legal" target="_blank" rel="noopener noreferrer"
                className="text-[#C8FF00] underline">Stripe Connected Account Agreement</a>,
              which includes the{' '}
              <a href="https://stripe.com/legal" target="_blank" rel="noopener noreferrer"
                className="text-[#C8FF00] underline">Stripe Services Agreement</a>.
            </p>
            <p>
              Electric State will collect a platform fee on each ticket sale. Remaining funds will be transferred to your connected bank account within 2-7 business days of each event.
            </p>
          </div>

          <button
            type="button"
            onClick={() => set('tosAccepted', !form.tosAccepted)}
            className="flex items-start gap-3 text-left w-full"
          >
            <div className="mt-0.5 w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center transition-all"
              style={{
                background: form.tosAccepted ? '#C8FF00' : 'transparent',
                border: form.tosAccepted ? '2px solid #C8FF00' : '2px solid rgba(255,255,255,0.2)',
              }}>
              {form.tosAccepted && <span className="text-black text-xs font-black">✓</span>}
            </div>
            <span className="text-white/60 text-sm leading-relaxed">
              I agree to the Stripe Connected Account Agreement and authorize Electric State to submit information on my behalf.
            </span>
          </button>

          {error && (
            <div className="px-4 py-3 rounded-xl text-sm text-red-400 border border-red-500/30"
              style={{ background: 'rgba(239,68,68,0.08)' }}>
              {error}
            </div>
          )}

          <button
            onClick={() => {
              if (!form.tosAccepted) { setError('You must agree to the terms to continue'); return }
              handleSubmit()
            }}
            disabled={submitting}
            className="w-full py-4 rounded-xl font-bold text-sm mt-2 disabled:opacity-60 disabled:cursor-wait transition-all"
            style={{ background: '#C8FF00', color: '#000' }}
          >
            {submitting ? 'Connecting your account...' : 'Connect bank account'}
          </button>
        </div>
      )}

      {/* Inline error for non-TOS steps */}
      {error && step !== 'tos' && (
        <div className="mt-4 px-4 py-3 rounded-xl text-sm text-red-400 border border-red-500/30"
          style={{ background: 'rgba(239,68,68,0.08)' }}>
          {error}
        </div>
      )}
    </div>
  )
}
