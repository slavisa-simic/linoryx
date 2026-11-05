import { useEffect, useState } from 'react'
import type { SubmitEvent } from 'react'
import { getMyTechnicianProfile, saveMyTechnicianProfile } from '../api/techniciansApi'
import { useUser } from '../context/UserContext'
import type { WorkspacePage } from '../models/navigation'
import type { TechnicianAvailability, TechnicianProfile, TechnicianSpecialization } from '../models/technicians'
import { availabilityLabels, specializations } from '../models/technicians'
import { coordinateError } from '../services/technicianData'
import { formatDate } from '../services/dashboardData'
import { WorkspaceNavbar } from '../components/workspace/WorkspaceNavbar'
import { FormMessage } from '../components/auth/FormMessage'
import '../Technicians.css'

export function TechnicianProfilePage({ onNavigate }: { onNavigate(page: WorkspacePage): void }) {
  const { session, onSessionExpired } = useUser()
  const [profile, setProfile] = useState<TechnicianProfile | null>(null)
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [availability, setAvailability] = useState<TechnicianAvailability | ''>('')
  const [skills, setSkills] = useState<TechnicianSpecialization[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    let active = true
    async function load() {
      setLoading(true)
      setError('')
      try {
        const item = await getMyTechnicianProfile(session)
        if (active) {
          setProfile(item)
          setLatitude(item.latitude === null ? '' : String(item.latitude))
          setLongitude(item.longitude === null ? '' : String(item.longitude))
          setAvailability(item.availability || '')
          setSkills(item.specializations)
        }
      } catch (error) {
        if (active) setError(error instanceof Error ? error.message : 'Your profile could not be loaded.')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [session, refresh])

  useEffect(() => {
    if (error === 'SESSION_EXPIRED') onSessionExpired()
  }, [error, onSessionExpired])

  function toggleSkill(skill: TechnicianSpecialization) {
    if (skills.includes(skill)) setSkills(skills.filter(value => value !== skill))
    else setSkills([...skills, skill])
  }

  async function save(event: SubmitEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    setNotice('')
    const validation = coordinateError(latitude, longitude)
    setError(validation)
    if (validation) return
    setSaving(true)
    try {
      const item = await saveMyTechnicianProfile(session, {
        latitude: latitude.trim() === '' ? null : Number(latitude),
        longitude: longitude.trim() === '' ? null : Number(longitude),
        availability: availability || null,
        specializations: skills
      })
      setProfile(item)
      setNotice('Your profile has been saved.')
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Your profile could not be saved.')
    } finally {
      setSaving(false)
    }
  }

  return <div className="workspace">
    <a className="skip-link" href="#profile-main">Skip to My Profile</a>
    <WorkspaceNavbar page="profile" onNavigate={onNavigate} />
    <main className="dashboard-main" id="profile-main">
      <div className="page-heading"><h1>My Profile<span className="heading-period">.</span></h1></div>
      <p className="incident-muted">Maintain your location, availability and self-declared skills manually.</p>
      <FormMessage message={error} />
      <FormMessage message={notice} type="success" />
      {loading && <p role="status">Loading your profile…</p>}
      {!loading && !profile && <button className="dashboard-button" onClick={() => setRefresh(refresh + 1)}>Try again</button>}
      {!loading && profile && <form className="dashboard-panel technician-profile-form" onSubmit={save}>
        <fieldset disabled={saving}>
          <legend>Operational information</legend>
          <p id="coordinate-hint" className="incident-muted">Enter both coordinates, or leave both blank. Up to 7 decimal places. Zero is valid.</p>
          <div className="incident-form-row">
            <label>Latitude<input className="field-input" type="number" min="-90" max="90" step="0.0000001" value={latitude}
              aria-describedby="coordinate-hint" onChange={event => setLatitude(event.target.value)} /></label>
            <label>Longitude<input className="field-input" type="number" min="-180" max="180" step="0.0000001" value={longitude}
              aria-describedby="coordinate-hint" onChange={event => setLongitude(event.target.value)} /></label>
          </div>
          <label>Availability<select className="field-input" value={availability}
            onChange={event => setAvailability(event.target.value as TechnicianAvailability | '')}>
            <option value="">Availability not configured</option>
            {Object.entries(availabilityLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select></label>
          <fieldset className="technician-skills"><legend>Specializations</legend>
            {specializations.map(skill => <label key={skill}><input type="checkbox" checked={skills.includes(skill)} onChange={() => toggleSkill(skill)} />{skill}</label>)}
          </fieldset>
          <label>Location Updated At<input className="field-input" readOnly value={profile.locationUpdatedAt
            ? formatDate(profile.locationUpdatedAt, { dateStyle: 'medium', timeStyle: 'medium' }) : 'Location not set'} /></label>
          <button className="dashboard-button" type="submit">{saving ? 'Saving…' : 'Save profile'}</button>
        </fieldset>
      </form>}
    </main>
  </div>
}
