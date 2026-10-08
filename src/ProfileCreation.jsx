import { useState } from 'react'

const initialGoals = { calories: '2050', protein: '120', carbs: '220', fat: '68' }

export default function ProfileCreation({ initialName, onSave }) {
  const [form, setForm] = useState({
    name: initialName,
    focus: 'Balanced nutrition',
    weightGoal: 'Maintain weight',
    ...initialGoals,
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await onSave({
        name: form.name.trim(),
        focus: form.focus,
        weightGoal: form.weightGoal,
        goals: {
          calories: Number(form.calories),
          protein: Number(form.protein),
          carbs: Number(form.carbs),
          fat: Number(form.fat),
        },
      })
    } catch (saveError) {
      setError(saveError.message || 'Could not save your profile. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  return (
    <main className="auth-screen">
      <section className="auth-panel profile-creation-panel" aria-labelledby="profile-creation-title">
        <a className="auth-brand" href="#home" aria-label="NutriAI home">
          <img src="/NutriAI%20Smart%20Nutrition%20Logo.png" alt="" />
          <span>Nutri<span>Ai</span></span>
        </a>
        <div className="eyebrow">ONE LAST STEP</div>
        <h1 id="profile-creation-title">Create your nutrition profile.</h1>
        <p className="auth-description">Set your goals so NutriAI can personalize your dashboard.</p>
        <form className="auth-form" onSubmit={submit}>
          <label className="form-field full-field">Your name<input autoComplete="name" maxLength="80" required value={form.name} onChange={(event) => updateField('name', event.target.value)} /></label>
          <label className="form-field full-field">Nutrition focus<select value={form.focus} onChange={(event) => updateField('focus', event.target.value)}><option>Balanced nutrition</option><option>More energy</option><option>Build strength</option><option>Plant-forward</option></select></label>
          <label className="form-field full-field">Weight goal<select value={form.weightGoal} onChange={(event) => updateField('weightGoal', event.target.value)}><option>Weight loss</option><option>Maintain weight</option><option>Weight gain</option></select></label>
          <div className="profile-goal-fields">
            <label className="form-field">Calories<input required type="number" min="1" max="9999" value={form.calories} onChange={(event) => updateField('calories', event.target.value)} /></label>
            <label className="form-field">Protein (g)<input required type="number" min="1" max="999" value={form.protein} onChange={(event) => updateField('protein', event.target.value)} /></label>
            <label className="form-field">Carbs (g)<input required type="number" min="1" max="999" value={form.carbs} onChange={(event) => updateField('carbs', event.target.value)} /></label>
            <label className="form-field">Fat (g)<input required type="number" min="1" max="999" value={form.fat} onChange={(event) => updateField('fat', event.target.value)} /></label>
          </div>
          {error && <p className="auth-error" role="alert">{error}</p>}
          <button className="button button-dark auth-submit" type="submit" disabled={busy}>{busy ? 'Saving profile...' : 'Save profile & continue'}</button>
        </form>
      </section>
    </main>
  )
}