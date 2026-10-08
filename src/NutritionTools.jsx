import { useState } from 'react'
import './NutritionTools.css'

const goalOptions = ['Weight loss', 'Maintain weight', 'Weight gain']

const planMeals = {
  'Weight loss': [
    { meal: 'Breakfast', name: 'Greek yogurt, oats & berries', share: 0.25, note: 'Protein + fiber' },
    { meal: 'Lunch', name: 'Grilled chicken, dal & greens', share: 0.35, note: 'Lean protein' },
    { meal: 'Snack', name: 'Apple with a spoon of peanut butter', share: 0.15, note: 'Fiber-rich snack' },
    { meal: 'Dinner', name: 'Paneer tikka & roasted vegetables', share: 0.25, note: 'Colorful, satisfying plate' },
  ],
  'Maintain weight': [
    { meal: 'Breakfast', name: 'Masala oats with egg', share: 0.25, note: 'Balanced start' },
    { meal: 'Lunch', name: 'Dal, rice & seasonal vegetables', share: 0.35, note: 'Everyday comfort' },
    { meal: 'Snack', name: 'Fruit with yogurt', share: 0.15, note: 'Simple afternoon fuel' },
    { meal: 'Dinner', name: 'Paneer or tofu with roti', share: 0.25, note: 'Protein + whole grains' },
  ],
  'Weight gain': [
    { meal: 'Breakfast', name: 'Banana oats with nuts & yogurt', share: 0.25, note: 'Energy-dense start' },
    { meal: 'Lunch', name: 'Chicken, rice & avocado bowl', share: 0.35, note: 'Protein + nourishing fats' },
    { meal: 'Snack', name: 'Trail mix and a banana', share: 0.15, note: 'Compact extra energy' },
    { meal: 'Dinner', name: 'Paneer curry, rice & vegetables', share: 0.25, note: 'A generous balanced plate' },
  ],
}

export function FoodAnalyzer({ onAddMeal }) {
  const [description, setDescription] = useState('')
  const [servings, setServings] = useState('1')
  const [photo, setPhoto] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  function choosePhoto(event) {
    const file = event.target.files?.[0]
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'].includes(file.type)) {
      setError('Choose an image file to preview.')
      return
    }
    if (file.size > 8 * 1024 * 1024) {
      setError('Choose an image smaller than 8 MB.')
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = String(reader.result)
      setPhoto({ name: file.name, url: dataUrl, mimeType: file.type, base64: dataUrl.split(',')[1] })
      setAnalysis(null)
      setError('')
    }
    reader.onerror = () => setError('This image could not be read. Try another photo.')
    reader.readAsDataURL(file)
  }

  async function analyzeMeal(event) {
    event.preventDefault()
    setLoading(true)
    setError('')
    setAnalysis(null)
    try {
      const result = await fetch('/api/analyze-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description, portions: Number(servings), image: photo?.base64, mimeType: photo?.mimeType }),
      })
      const data = await result.json()
      if (!result.ok) throw new Error(data.error || 'Food analysis failed. Try again.')
      if (!data.recognized) throw new Error(data.notes || 'No food could be identified. Add a clearer photo or description.')
      setAnalysis({
        name: data.foodName,
        portionDescription: data.portionDescription,
        calories: data.calories,
        protein: data.proteinG,
        carbs: data.carbsG,
        fat: data.fatG,
        confidence: data.confidence,
        notes: data.notes,
      })
    } catch (analysisError) {
      setError(analysisError.message || 'Food analysis failed. Try again.')
    } finally {
      setLoading(false)
    }
  }

  function addAnalyzedMeal() {
    if (!analysis) return
    onAddMeal({
      ...analysis,
      id: Date.now(),
      type: 'Meal',
      time: new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(new Date()),
      icon: photo ? '📷' : '🍽️',
    })
    setDescription('')
    setAnalysis(null)
    setPhoto(null)
  }

  return (
    <div className="subpage">
      <div className="subpage-heading">
        <div>
          <div className="eyebrow">FOOD RECOGNITION DEMO</div>
          <h1>What’s on <em>your plate?</em></h1>
          <p className="welcome-copy">Get a nutrition estimate from a meal photo or food description.</p>
        </div>
      </div>
      <div className="analyzer-layout">
        <form className="analyzer-panel" onSubmit={analyzeMeal}>
          <label className="upload-area">
            <input type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif" onChange={choosePhoto} />
            {photo ? <img src={photo.url} alt={`Meal preview: ${photo.name}`} /> : <span className="upload-placeholder"><span className="upload-icon">↑</span><strong>Add a meal photo</strong><small>JPG, PNG or WEBP · up to 8 MB</small></span>}
          </label>
          {photo && <div className="photo-caption"><span>{photo.name}</span><button type="button" onClick={() => setPhoto(null)}>Remove photo</button></div>}
          <div className="photo-disclosure">Photos are sent to the configured AI provider through the private API server for analysis.</div>
          <label className="analyzer-field">Food description <span className="optional-label">Optional with a photo</span><input value={description} onChange={(event) => { setDescription(event.target.value); setAnalysis(null) }} placeholder="e.g. 1 cup rice, dal and egg" /></label>
          <label className="analyzer-field portion-field">Portions<select value={servings} onChange={(event) => { setServings(event.target.value); setAnalysis(null) }}><option value="0.5">½ serving</option><option value="1">1 serving</option><option value="1.5">1½ servings</option><option value="2">2 servings</option><option value="3">3 servings</option></select></label>
          <button className="button button-dark analyzer-submit" type="submit" disabled={loading || (!description.trim() && !photo)}>{loading ? 'Analyzing meal…' : 'Analyze meal'} <span>→</span></button>
          {error && <p className="analyzer-error" role="alert">{error}</p>}
        </form>

        <section className="analysis-panel" aria-live="polite">
          <div className="eyebrow">NUTRITION ESTIMATE</div>
          {analysis ? <>
            <h2>{analysis.name}</h2>
            <p className="analysis-serving">{analysis.portionDescription} · {analysis.confidence} confidence estimate</p>
            <div className="estimate-calories"><strong>{analysis.calories}</strong><span>kcal</span></div>
            <div className="estimate-macros"><div><span>Protein</span><strong>{analysis.protein}g</strong></div><div><span>Carbs</span><strong>{analysis.carbs}g</strong></div><div><span>Fat</span><strong>{analysis.fat}g</strong></div></div>
            <div className="analysis-notes">{analysis.notes}</div>
            <button className="button button-dark analyzer-submit" type="button" onClick={addAnalyzedMeal}>Add estimate to food log <span>＋</span></button>
          </> : <div className="analysis-empty"><span>◌</span><strong>Your estimate will appear here</strong><p>Calories and macros are approximate and can vary by ingredients and preparation.</p></div>}
        </section>
      </div>
    </div>
  )
}

export function DietPlan({ goal, onGoalChange, calorieGoal }) {
  const meals = planMeals[goal] || planMeals['Maintain weight']

  return (
    <div className="subpage">
      <div className="subpage-heading">
        <div>
          <div className="eyebrow">A PLAN THAT FITS YOUR GOAL</div>
          <h1>Your daily <em>plan.</em></h1>
          <p className="welcome-copy">Flexible meal ideas shaped around your nutrition target.</p>
        </div>
      </div>
      <section className="plan-controls">
        <div><span className="eyebrow">YOUR HEALTH GOAL</span><strong>{calorieGoal.toLocaleString()} <small>kcal daily target</small></strong></div>
        <div className="goal-switch" role="group" aria-label="Choose health goal">
          {goalOptions.map((option) => <button key={option} type="button" className={goal === option ? 'selected' : ''} onClick={() => onGoalChange(option)}>{option}</button>)}
        </div>
      </section>
      <div className="plan-note"><span>✳</span> {goal === 'Weight loss' ? 'A modest, sustainable deficit works better than restrictive eating.' : goal === 'Weight gain' ? 'Add nourishing portions consistently and pair them with strength training.' : 'Aim for variety and steady meals that support your everyday routine.'} Targets are estimates, not medical advice.</div>
      <section className="daily-plan-list" aria-label={`${goal} meal suggestions`}>
        {meals.map((meal, index) => <article className="daily-plan-item" key={meal.meal}>
          <span className="plan-index">0{index + 1}</span>
          <div className="daily-plan-copy"><span className="eyebrow">{meal.meal}</span><h2>{meal.name}</h2><p>{meal.note}</p></div>
          <strong className="plan-calories">{Math.round(calorieGoal * meal.share)} <small>kcal</small></strong>
        </article>)}
      </section>
    </div>
  )
}