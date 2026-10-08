import { useEffect, useState } from 'react'
import './App.css'
import { DietPlan, FoodAnalyzer } from './NutritionTools'
import { downloadDietPlanPdf } from './dietPlanPdf'
import AuthScreen from './AuthScreen'
import ProfileCreation from './ProfileCreation'
import { supabase, supabaseConfigured } from './supabase'

const settingsKey = 'nutriai-profile-settings-v1'
const weightGoalKey = 'nutriai-weight-goal-v1'
const streakKey = 'nutriai-streak-days-v1'
const checkInKey = 'nutriai-progress-checkins-v1'
const waterGoalLiters = 4
const waterGlassMl = 250
const waterGlassGoal = waterGoalLiters * 1000 / waterGlassMl
const defaultSettings = {
  name: 'Sam Taylor',
  focus: 'Balanced nutrition',
  goals: { calories: 2050, protein: 120, carbs: 220, fat: 68 },
}

function loadSettings() {
  try {
    const saved = JSON.parse(window.localStorage.getItem(settingsKey))
    if (!saved) return defaultSettings
    return {
      ...defaultSettings,
      ...saved,
      goals: { ...defaultSettings.goals, ...saved.goals },
    }
  } catch {
    return defaultSettings
  }
}

function toSettingsForm(settings) {
  return {
    name: settings.name,
    focus: settings.focus,
    calories: String(settings.goals.calories),
    protein: String(settings.goals.protein),
    carbs: String(settings.goals.carbs),
    fat: String(settings.goals.fat),
  }
}

function loadWeightGoal() {
  try {
    const goal = window.localStorage.getItem(weightGoalKey)
    return ['Weight loss', 'Maintain weight', 'Weight gain'].includes(goal) ? goal : 'Maintain weight'
  } catch {
    return 'Maintain weight'
  }
}

function loadStreakDays() {
  try {
    const saved = window.localStorage.getItem(streakKey)
    if (saved === null) return 7
    const days = Number(saved)
    return Number.isInteger(days) && days >= 0 ? days : 7
  } catch {
    return 7
  }
}

function getWeekDates(weekOffset = 0, dayCount = 7) {
  const today = new Date()
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  start.setDate(start.getDate() + weekOffset * 7)
  return Array.from({ length: dayCount }, (_, index) => {
    const date = new Date(start)
    date.setDate(start.getDate() + index)
    return {
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
      date,
      weekday: new Intl.DateTimeFormat('en', { weekday: 'short' }).format(date).slice(0, 1),
    }
  })
}

function getLocalDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function loadCheckInDates() {
  try {
    const saved = window.localStorage.getItem(checkInKey)
    if (saved === null) return []
    const dates = JSON.parse(saved)
    return Array.isArray(dates) ? dates.filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)) : []
  } catch {
    return []
  }
}

function getNextMealId(meals) {
  return Math.max(0, ...meals.map((meal) => Number(meal.id) || 0)) + 1
}

const initialMeals = [
  { id: 1, name: 'Berry protein bowl', type: 'Breakfast', time: '8:15 AM', calories: 380, protein: 24, carbs: 44, fat: 12, icon: '🥣', image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=600&q=85' },
  { id: 2, name: 'Green goddess bowl', type: 'Lunch', time: '12:40 PM', calories: 540, protein: 32, carbs: 62, fat: 18, icon: '🥗', image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=85' },
  { id: 3, name: 'Almonds & dark chocolate', type: 'Snack', time: '3:10 PM', calories: 190, protein: 6, carbs: 7, fat: 16, icon: '🥜', image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=600&q=85' },
]

const mealTypeImages = {
  Breakfast: 'https://images.unsplash.com/photo-1517673132405-a56a62b18caf?auto=format&fit=crop&w=600&q=85',
  Lunch: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=85',
  Dinner: 'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?auto=format&fit=crop&w=600&q=85',
  Snack: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=600&q=85',
}

const mealIdeas = [
  { name: 'Crispy chickpea nourish bowl', detail: 'Chickpeas · avocado · tahini', time: '20 min', calories: 460, protein: 18, carbs: 53, fat: 20, image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=85', tag: 'HIGH FIBER' },
  { name: 'Miso salmon & greens', detail: 'Salmon · brown rice · greens', time: '25 min', calories: 520, protein: 36, carbs: 47, fat: 18, image: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=900&q=85', tag: 'HIGH PROTEIN' },
  { name: 'Peach overnight oats', detail: 'Oats · peach · almond butter', time: '5 min', calories: 340, protein: 12, carbs: 48, fat: 11, image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=900&q=85', tag: 'MAKE AHEAD' },
  { name: 'Greek yogurt berry parfait', detail: 'Greek yogurt · berries · granola', time: '10 min', calories: 320, protein: 22, carbs: 38, fat: 8, image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=85', tag: 'HIGH PROTEIN' },
  { name: 'Avocado egg wholegrain toast', detail: 'Egg · avocado · seeded toast', time: '15 min', calories: 390, protein: 20, carbs: 34, fat: 19, image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=900&q=85', tag: 'BREAKFAST' },
  { name: 'Lentil & sweet potato curry', detail: 'Red lentils · sweet potato · spinach', time: '30 min', calories: 480, protein: 19, carbs: 72, fat: 13, image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=900&q=85', tag: 'PLANT POWER' },
  { name: 'Tofu vegetable stir-fry', detail: 'Tofu · broccoli · ginger rice', time: '25 min', calories: 430, protein: 26, carbs: 41, fat: 17, image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=900&q=85', tag: 'PLANT POWER' },
  { name: 'Quinoa black bean bowl', detail: 'Quinoa · black beans · corn · lime', time: '20 min', calories: 450, protein: 17, carbs: 73, fat: 11, image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=900&q=85', tag: 'HIGH FIBER' },
  { name: 'Tomato chickpea shakshuka', detail: 'Eggs · chickpeas · spiced tomato', time: '25 min', calories: 410, protein: 22, carbs: 38, fat: 18, image: 'https://images.unsplash.com/photo-1590412200988-a436970781fa?auto=format&fit=crop&w=900&q=85', tag: 'ONE PAN' },
  { name: 'Turkey hummus wrap', detail: 'Turkey · hummus · crunchy greens', time: '10 min', calories: 440, protein: 31, carbs: 42, fat: 14, image: 'https://images.unsplash.com/photo-1528735602780-2552fd46c7af?auto=format&fit=crop&w=900&q=85', tag: 'QUICK LUNCH' },
  { name: 'Lemon herb salmon bowl', detail: 'Salmon · quinoa · cucumber · herbs', time: '25 min', calories: 520, protein: 38, carbs: 48, fat: 17, image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=900&q=85', tag: 'HIGH PROTEIN' },
  { name: 'Cottage cheese apple bowl', detail: 'Cottage cheese · apple · walnuts', time: '5 min', calories: 290, protein: 24, carbs: 32, fat: 8, image: 'https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?auto=format&fit=crop&w=900&q=85', tag: 'QUICK SNACK' },
  { name: 'Spiced egg & chickpea salad', detail: 'Egg · chickpeas · greens · yogurt', time: '20 min', calories: 420, protein: 23, carbs: 36, fat: 22, image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=85', tag: 'HIGH FIBER' },
  { name: 'Peanut butter banana oats', detail: 'Rolled oats · banana · peanut butter', time: '10 min', calories: 390, protein: 14, carbs: 55, fat: 14, image: 'https://images.unsplash.com/photo-1571748982800-fa51082c2224?auto=format&fit=crop&w=900&q=85', tag: 'COMFORT FOOD' },
  { name: 'Paneer tikka wholegrain wrap', detail: 'Paneer · peppers · mint yogurt', time: '25 min', calories: 480, protein: 28, carbs: 49, fat: 18, image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=900&q=85', tag: 'VEGETARIAN' },
  { name: 'Roasted cauliflower tahini bowl', detail: 'Cauliflower · brown rice · tahini', time: '30 min', calories: 460, protein: 14, carbs: 52, fat: 25, image: 'https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=900&q=85', tag: 'PLANT POWER' },
  { name: 'Tuna & white bean salad', detail: 'Tuna · white beans · tomato · parsley', time: '15 min', calories: 390, protein: 30, carbs: 35, fat: 11, image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=85', tag: 'HIGH PROTEIN' },
  { name: 'Chicken pesto wholegrain pasta', detail: 'Chicken · basil pesto · spinach', time: '25 min', calories: 540, protein: 36, carbs: 57, fat: 18, image: 'https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?auto=format&fit=crop&w=900&q=85', tag: 'WEEK NIGHT' },
  { name: 'Edamame soba noodle bowl', detail: 'Soba · edamame · cabbage · sesame', time: '20 min', calories: 430, protein: 21, carbs: 64, fat: 10, image: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=900&q=85', tag: 'PLANT POWER' },
  { name: 'Mango chia yogurt pot', detail: 'Mango · chia · Greek yogurt', time: '5 min', calories: 310, protein: 15, carbs: 42, fat: 9, image: 'https://images.unsplash.com/photo-1511690743698-d9d85f2fbf38?auto=format&fit=crop&w=900&q=85', tag: 'MAKE AHEAD' },
  { name: 'Spicy tofu lettuce cups', detail: 'Crispy tofu · lettuce · sesame-lime sauce', time: '20 min', calories: 370, protein: 22, carbs: 30, fat: 19, image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=85', tag: 'PLANT POWER' },
  { name: 'Mediterranean chicken grain bowl', detail: 'Chicken · farro · cucumber · feta', time: '25 min', calories: 510, protein: 35, carbs: 55, fat: 17, image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=85', tag: 'HIGH PROTEIN' },
  { name: 'Black bean quesadilla', detail: 'Black beans · peppers · corn salsa', time: '15 min', calories: 450, protein: 18, carbs: 58, fat: 16, image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=900&q=85', tag: 'QUICK LUNCH' },
  { name: 'Herby baked cod & lentils', detail: 'Cod · lentils · lemon · parsley', time: '30 min', calories: 430, protein: 34, carbs: 42, fat: 13, image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=900&q=85', tag: 'HIGH PROTEIN' },
  { name: 'Hummus & seed snack plate', detail: 'Hummus · carrots · cucumber · seeds', time: '10 min', calories: 360, protein: 12, carbs: 38, fat: 18, image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=900&q=85', tag: 'QUICK SNACK' },
  { name: 'Mushroom spinach frittata', detail: 'Eggs · mushrooms · spinach · herbs', time: '20 min', calories: 330, protein: 23, carbs: 8, fat: 22, image: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&w=900&q=85', tag: 'LOW CARB' },
  { name: 'Coconut curry shrimp rice', detail: 'Shrimp · coconut curry · jasmine rice', time: '25 min', calories: 490, protein: 32, carbs: 56, fat: 15, image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=900&q=85', tag: 'WEEK NIGHT' },
  { name: 'Roasted beet citrus salad', detail: 'Beets · orange · arugula · walnuts', time: '25 min', calories: 350, protein: 12, carbs: 44, fat: 16, image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=900&q=85', tag: 'HIGH FIBER' },
  { name: 'Peanut soba cucumber noodles', detail: 'Soba · cucumber · edamame · peanut sauce', time: '20 min', calories: 460, protein: 21, carbs: 62, fat: 14, image: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=900&q=85', tag: 'PLANT POWER' },
  { name: 'Berry kefir breakfast smoothie', detail: 'Kefir · berries · oats · chia', time: '5 min', calories: 280, protein: 16, carbs: 44, fat: 5, image: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=900&q=85', tag: 'QUICK BREAKFAST' },
]

const navItems = [
  { id: 'overview', label: 'Overview', icon: 'grid' },
  { id: 'food', label: 'Food log', icon: 'food' },
  { id: 'scan', label: 'Food AI', icon: 'camera' },
  { id: 'ideas', label: 'Meal ideas', icon: 'spark' },
  { id: 'plan', label: 'My plan', icon: 'calendar' },
  { id: 'progress', label: 'Progress', icon: 'chart' },
]

const foodQuestions = [
  'Is my meal balanced?',
  'What is a high-protein snack?',
  'How can I eat more fiber?',
]

const iconPaths = {
  grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
  food: <><path d="M4 3v7a3 3 0 0 0 6 0V3M7 3v18M17 3v18M17 3c-2 2-3 5-3 8h6" /></>,
  spark: <><path d="m12 3 1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2L12 3Z" /><path d="m19 14 .9 2.1L22 17l-2.1.9L19 20l-.9-2.1L16 17l2.1-.9L19 14Z" /></>,
  chart: <><path d="M4 19V5M4 19h17" /><path d="m7 15 4-4 3 2 6-7" /></>,
  camera: <><path d="M14 5h-4l-2 2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2-2Z" /><circle cx="12" cy="13" r="3" /></>,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /><path d="m9 15 2 2 4-4" /></>,
  plus: <><path d="M12 5v14M5 12h14" /></>,
  minus: <path d="M5 12h14" />,
  glass: <path d="M5 4h14l-1.5 16h-11L5 4Z" />,
  chevron: <path d="m9 18 6-6-6-6" />,
  water: <><path d="M12 3.2S5.5 10 5.5 14.5a6.5 6.5 0 0 0 13 0C18.5 10 12 3.2 12 3.2Z" /><path d="M9 15.5a3 3 0 0 0 3 3" /></>,
  close: <><path d="m18 6-12 12M6 6l12 12" /></>,
  check: <path d="m5 12 4 4L19 6" />,
  trash: <><path d="M3 6h18M8 6V4h8v2m3 0-.9 14H5.9L5 6" /><path d="M10 11v5m4-5v5" /></>,
  send: <><path d="m22 2-7 20-4-9-9-4Z" /><path d="M22 2 11 13" /></>,
  download: <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><path d="m7 10 5 5 5-5M12 15V3" /></>,
}

function Icon({ name, size = 20 }) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{iconPaths[name]}</svg>
}

function App() {
  const [session, setSession] = useState(null)
  const [authReady, setAuthReady] = useState(!supabaseConfigured)

  useEffect(() => {
    if (!supabaseConfigured) return undefined
    let active = true
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return
      setSession(nextSession)
      setAuthReady(true)
    })

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      setSession(error ? null : data.session)
      setAuthReady(true)
    }).catch(() => {
      if (active) setAuthReady(true)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  if (!supabaseConfigured) return <Dashboard session={null} />
  if (!authReady) return <main className="auth-screen"><p className="auth-loading">Loading your nutrition space...</p></main>
  if (!session) return <AuthScreen />
  return <Dashboard key={session.user.id} session={session} />
}

function Dashboard({ session }) {
  const remoteMode = Boolean(supabase && session)
  const [activeView, setActiveView] = useState('overview')
  const [inspirationIndex, setInspirationIndex] = useState(0)
  const [meals, setMeals] = useState(() => remoteMode ? [] : initialMeals)
  const [selectedMealId, setSelectedMealId] = useState(null)
  const [water, setWater] = useState(() => remoteMode ? 0 : 5)
  const [showMealForm, setShowMealForm] = useState(false)
  const [mealForm, setMealForm] = useState({ name: '', type: 'Breakfast' })
  const [mealLoading, setMealLoading] = useState(false)
  const [mealError, setMealError] = useState('')
  const [notice, setNotice] = useState('')
  const [settings, setSettings] = useState(() => remoteMode ? defaultSettings : loadSettings())
  const [settingsForm, setSettingsForm] = useState(null)
  const [showSettings, setShowSettings] = useState(false)
  const [weightGoal, setWeightGoal] = useState(() => remoteMode ? 'Maintain weight' : loadWeightGoal())
  const [streakDays, setStreakDays] = useState(() => remoteMode ? 7 : loadStreakDays())
  const [checkInDates, setCheckInDates] = useState(() => remoteMode ? [] : loadCheckInDates())
  const [needsProfileCreation, setNeedsProfileCreation] = useState(false)
  const [weekOffset, setWeekOffset] = useState(0)
  const [userDataReady, setUserDataReady] = useState(!remoteMode)
  const [dataError, setDataError] = useState('')
  const [chatMessages, setChatMessages] = useState([])
  const [chatDraft, setChatDraft] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [chatError, setChatError] = useState('')
  const [pdfLoading, setPdfLoading] = useState(false)
  const { name: profileName, focus: profileFocus, goals } = settings

  useEffect(() => {
    const timer = window.setInterval(() => {
      setInspirationIndex((current) => (current + 1) % mealIdeas.length)
    }, 1500)

    return () => window.clearInterval(timer)
  }, [])

  useEffect(() => {
    if (remoteMode) {
      if (!userDataReady) return
      supabase.from('profiles').update({ streak_days: streakDays }).eq('id', session.user.id).then(({ error }) => {
        if (error) setDataError(`Could not save streak: ${error.message}`)
      })
      return
    }
    try {
      window.localStorage.setItem(streakKey, String(streakDays))
    } catch {
    }
  }, [streakDays, remoteMode, userDataReady, session])

  useEffect(() => {
    if (remoteMode) return
    try {
      window.localStorage.setItem(checkInKey, JSON.stringify(checkInDates))
    } catch {
    }
  }, [checkInDates, remoteMode])

  useEffect(() => {
    if (!remoteMode || !userDataReady) return
    supabase.from('water_logs').upsert({
      user_id: session.user.id,
      day: getLocalDateKey(),
      glasses: water,
    }, { onConflict: 'user_id,day' }).then(({ error }) => {
      if (error) setDataError(`Could not save water log: ${error.message}`)
    })
  }, [water, remoteMode, userDataReady, session])

  useEffect(() => {
    if (!remoteMode) return undefined
    let active = true
    const userId = session.user.id

    async function loadUserData() {
      setUserDataReady(false)
      setDataError('')
      const { data: existingProfile, error: profileError } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle()
      if (profileError) throw profileError

      if (!existingProfile || !existingProfile.profile_completed) {
        if (!active) return
        setNeedsProfileCreation(true)
        setUserDataReady(true)
        return
      }
      const profile = existingProfile

      const today = getLocalDateKey()
      const [mealsResult, checkInsResult, waterResult] = await Promise.all([
        supabase.from('meals').select('*').order('created_at', { ascending: true }),
        supabase.from('check_ins').select('day').order('day', { ascending: true }),
        supabase.from('water_logs').select('glasses').eq('day', today).maybeSingle(),
      ])
      for (const result of [mealsResult, checkInsResult, waterResult]) {
        if (result.error) throw result.error
      }
      if (!active) return

      setSettings({
        name: profile.name,
        focus: profile.focus,
        goals: { ...defaultSettings.goals, ...profile.goals },
      })
      setWeightGoal(profile.weight_goal)
      setStreakDays(profile.streak_days)
      setMeals((mealsResult.data || []).map((meal) => ({
        id: meal.id,
        name: meal.name,
        type: meal.type,
        time: meal.time,
        calories: meal.calories,
        protein: meal.protein,
        carbs: meal.carbs,
        fat: meal.fat,
        icon: meal.icon,
        image: meal.image,
      })))
      setCheckInDates((checkInsResult.data || []).map((checkIn) => checkIn.day))
      setWater(waterResult.data?.glasses || 0)
      setNeedsProfileCreation(false)
      setUserDataReady(true)
    }

    loadUserData().catch((error) => {
      if (!active) return
      setDataError(`Could not load Supabase data: ${error.message}`)
      setUserDataReady(true)
    })

    return () => {
      active = false
    }
  }, [remoteMode, session])

  const totals = meals.reduce((sum, meal) => ({
    calories: sum.calories + meal.calories,
    protein: sum.protein + meal.protein,
    carbs: sum.carbs + meal.carbs,
    fat: sum.fat + meal.fat,
  }), { calories: 0, protein: 0, carbs: 0, fat: 0 })
  const featuredMeal = meals.find((meal) => meal.id === selectedMealId) || meals.at(-1)
  const progressWeek = getWeekDates(weekOffset, streakDays)
  const checkedInCount = progressWeek.filter((day) => checkInDates.includes(day.key)).length
  const weekRange = progressWeek.length
    ? `${new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(progressWeek[0].date)} - ${new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(progressWeek.at(-1).date)}`
    : 'No streak days'

  async function askAgent(question) {
    const content = question.trim()
    if (!content || chatLoading) return

    const nextMessages = [...chatMessages, { role: 'user', content }].slice(-8)
    setChatMessages(nextMessages)
    setChatDraft('')
    setChatLoading(true)
    setChatError('')
    try {
      const response = await fetch('/api/food-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: nextMessages }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'NutriAI could not reply. Try again.')
      setChatMessages((current) => [...current, { role: 'assistant', content: result.reply }].slice(-8))
    } catch (error) {
      setChatError(error.message || 'NutriAI could not reply. Try again.')
    } finally {
      setChatLoading(false)
    }
  }

  async function downloadPlanner() {
    setPdfLoading(true)
    try {
      await downloadDietPlanPdf({ profileName, profileFocus, weightGoal, goals })
      setNotice('Your diet planner PDF is ready')
    } catch (error) {
      setNotice(error.message || 'Could not create the diet planner PDF')
    } finally {
      setPdfLoading(false)
      window.setTimeout(() => setNotice(''), 2600)
    }
  }

  async function saveMeal(meal) {
    if (!remoteMode) return meal
    const { data, error } = await supabase.from('meals').insert({
      user_id: session.user.id,
      name: meal.name,
      type: meal.type,
      time: meal.time,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fat: meal.fat,
      icon: meal.icon,
      image: meal.image,
    }).select('id').single()
    if (error) throw error
    return { ...meal, id: data.id }
  }

  async function addMeal(event) {
    event.preventDefault()
    setMealLoading(true)
    setMealError('')
    try {
      const response = await fetch('/api/analyze-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: mealForm.name.trim(), portions: 1 }),
      })
      const nutrition = await response.json()
      if (!response.ok) throw new Error(nutrition.error || 'Nutrition estimate failed. Try again.')
      if (!nutrition.recognized) throw new Error(nutrition.notes || 'Could not identify this meal. Add a more detailed name and try again.')

      const meal = {
        id: getNextMealId(meals),
        name: mealForm.name.trim(),
        type: mealForm.type,
        time: new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(new Date()),
        calories: nutrition.calories,
        protein: nutrition.proteinG,
        carbs: nutrition.carbsG,
        fat: nutrition.fatG,
        icon: mealForm.type === 'Breakfast' ? '🍓' : mealForm.type === 'Lunch' ? '🥑' : mealForm.type === 'Dinner' ? '🍽️' : '🍎',
        image: mealTypeImages[mealForm.type],
      }
      const savedMeal = await saveMeal(meal)
      setMeals((current) => [...current, savedMeal])
      setSelectedMealId(savedMeal.id)
      setMealForm({ name: '', type: 'Breakfast' })
      setShowMealForm(false)
      setNotice(`${meal.name} added · ${meal.calories} kcal estimated`)
      window.setTimeout(() => setNotice(''), 2600)
    } catch (error) {
      setMealError(error.message || 'Nutrition estimate failed. Try again.')
    } finally {
      setMealLoading(false)
    }
  }

  async function removeMeal(mealId) {
    if (remoteMode) {
      const { error } = await supabase.from('meals').delete().eq('id', mealId)
      if (error) {
        setDataError(`Could not remove meal: ${error.message}`)
        return
      }
    }
    setMeals((current) => current.filter((meal) => meal.id !== mealId))
    setNotice('Meal removed from your food log')
    window.setTimeout(() => setNotice(''), 2600)
  }

  async function addIdea(idea) {
    const meal = {
      id: getNextMealId(meals), name: idea.name, type: 'Lunch', time: 'Just now', calories: idea.calories,
      protein: idea.protein, carbs: idea.carbs, fat: idea.fat, icon: '🥗', image: idea.image,
    }
    try {
      const savedMeal = await saveMeal(meal)
      setMeals((current) => [...current, savedMeal])
      setSelectedMealId(savedMeal.id)
      setNotice(`${idea.name} added to your food log`)
      window.setTimeout(() => setNotice(''), 2600)
    } catch (error) {
      setDataError(`Could not save meal: ${error.message}`)
    }
  }

  async function addAnalyzedMeal(meal) {
    try {
      const savedMeal = await saveMeal(meal)
      setMeals((current) => [...current, savedMeal])
      setSelectedMealId(savedMeal.id)
      setNotice(`${meal.name} added to your food log`)
      window.setTimeout(() => setNotice(''), 2600)
    } catch (error) {
      setDataError(`Could not save meal: ${error.message}`)
    }
  }

  async function changeWeightGoal(goal) {
    setWeightGoal(goal)
    if (remoteMode) {
      const { error } = await supabase.from('profiles').update({ weight_goal: goal }).eq('id', session.user.id)
      if (error) setDataError(`Could not save weight goal: ${error.message}`)
      return
    }
    try {
      window.localStorage.setItem(weightGoalKey, goal)
    } catch {
      setNotice('Goal updated for this session')
    }
  }

  async function changeWater(nextValue) {
    const glasses = Math.max(0, Math.min(nextValue, waterGlassGoal))
    setWater(glasses)
    if (!remoteMode) return
    const { error } = await supabase.from('water_logs').upsert({
      user_id: session.user.id,
      day: getLocalDateKey(),
      glasses,
    }, { onConflict: 'user_id,day' })
    if (error) setDataError(`Could not save water log: ${error.message}`)
  }

  async function toggleCheckIn(day, checkedIn) {
    const previousDates = checkInDates
    const nextDates = checkedIn
      ? previousDates.filter((date) => date !== day)
      : [...previousDates, day]
    setCheckInDates(nextDates)
    if (!remoteMode) return

    const result = checkedIn
      ? await supabase.from('check_ins').delete().eq('day', day)
      : await supabase.from('check_ins').upsert({ user_id: session.user.id, day }, { onConflict: 'user_id,day' })
    if (result.error) {
      setCheckInDates(previousDates)
      setDataError(`Could not save check-in: ${result.error.message}`)
    }
  }

  function openSettings() {
    setSettingsForm(toSettingsForm(settings))
    setShowSettings(true)
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) setDataError(`Could not sign out: ${error.message}`)
  }

  async function createProfile(profileDetails) {
    const { error } = await supabase.from('profiles').upsert({
      id: session.user.id,
      name: profileDetails.name,
      focus: profileDetails.focus,
      goals: profileDetails.goals,
      weight_goal: profileDetails.weightGoal,
      streak_days: 0,
      profile_completed: true,
    }, { onConflict: 'id' })
    if (error) throw error

    setSettings({ name: profileDetails.name, focus: profileDetails.focus, goals: profileDetails.goals })
    setWeightGoal(profileDetails.weightGoal)
    setStreakDays(0)
    setNeedsProfileCreation(false)
    setUserDataReady(true)
  }

  async function saveSettings(event) {
    event.preventDefault()
    const nextSettings = {
      name: settingsForm.name.trim(),
      focus: settingsForm.focus,
      goals: {
        calories: Number(settingsForm.calories),
        protein: Number(settingsForm.protein),
        carbs: Number(settingsForm.carbs),
        fat: Number(settingsForm.fat),
      },
    }
    let persisted = true
    if (remoteMode) {
      const { error } = await supabase.from('profiles').update({
        name: nextSettings.name,
        focus: nextSettings.focus,
        goals: nextSettings.goals,
      }).eq('id', session.user.id)
      if (error) {
        setDataError(`Could not save profile: ${error.message}`)
        return
      }
    } else {
      try {
        window.localStorage.setItem(settingsKey, JSON.stringify(nextSettings))
      } catch {
        persisted = false
      }
    }
    setSettings(nextSettings)
    setShowSettings(false)
    setNotice(persisted ? 'Profile settings saved' : 'Settings saved for this session')
    window.setTimeout(() => setNotice(''), 2600)
  }

  const today = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(new Date())

  if (remoteMode && !userDataReady) {
    return <main className="auth-screen"><p className="auth-loading">Loading your nutrition space...</p></main>
  }
  if (remoteMode && needsProfileCreation) {
    const initialName = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || ''
    return <ProfileCreation initialName={initialName} onSave={createProfile} />
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="brand" href="#overview" onClick={() => setActiveView('overview')} aria-label="NutriAI home">
          <img className="brand-logo" src="/NutriAI%20Smart%20Nutrition%20Logo.png" alt="" />
          <span>Nutri<span className="brand-ai">Ai</span></span>
        </a>
        <div className="side-label">YOUR SPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          {navItems.map((item) => (
            <button key={item.id} type="button" className={`nav-item ${activeView === item.id ? 'active' : ''}`} onClick={() => setActiveView(item.id)}>
              <Icon name={item.icon} size={19} />
              <span>{item.label}</span>
              {item.id === 'food' && <span className="nav-count">{meals.length}</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <section className="ai-chatbox" aria-label="NutriAI food assistant">
            <div className="ai-chat-heading"><span className="ai-chat-mark"><Icon name="spark" size={15} /></span><span className="ai-chat-title"><strong>Food agent</strong><small>Ask NutriAI</small></span><span className="ai-chat-status">AI</span></div>
            <div className="food-question-list" aria-label="Suggested food questions">{foodQuestions.map((question, index) => <button className="food-question" key={question} type="button" style={{ '--question-delay': `${index * 0.4}s` }} onClick={() => askAgent(question)} disabled={chatLoading}>{question}<Icon name="chevron" size={13} /></button>)}</div>
            {chatMessages.length > 0 && <div className="ai-chat-transcript" aria-live="polite">{chatMessages.slice(-2).map((message, index) => <p className={`ai-chat-message ${message.role}`} key={`${message.role}-${chatMessages.length - 2 + index}`}>{message.content}</p>)}</div>}
            {chatLoading && <p className="ai-chat-feedback" role="status">Thinking...</p>}
            {chatError && <p className="ai-chat-error" role="alert">{chatError}</p>}
            <form className="ai-chat-form" onSubmit={(event) => { event.preventDefault(); askAgent(chatDraft) }}><input aria-label="Ask a food question" maxLength={800} placeholder="Ask a food question" value={chatDraft} onChange={(event) => setChatDraft(event.target.value)} disabled={chatLoading} /><button type="submit" aria-label="Send question" title="Send question" disabled={chatLoading || !chatDraft.trim()}><Icon name="send" size={15} /></button></form>
          </section>
          <button className="profile-button" type="button" onClick={openSettings}><span className="avatar">{profileName.charAt(0).toUpperCase()}</span><span className="profile-copy"><strong>{profileName}</strong><small>{profileFocus}</small></span><span className="profile-dots">···</span></button>
        </div>
      </aside>

      <main className="main-area">
        <header className="topbar"><div className="breadcrumb"><span>My nutrition</span><Icon name="chevron" size={14} /><strong>{navItems.find((item) => item.id === activeView)?.label}</strong></div><div className="topbar-right"><span className="today-date">{today}</span><button className="mobile-profile-button" type="button" aria-label="Open profile settings" onClick={openSettings}>{profileName.charAt(0).toUpperCase()}</button><button className="streak-pill streak-link" type="button" onClick={() => setActiveView('progress')} aria-label={`Open Progress, ${streakDays} day streak`}><span>✳</span> {streakDays} day streak</button></div></header>

        <div className="page-content">
          {dataError && <div className="database-error" role="alert">{dataError}</div>}
          {activeView === 'scan' && <FoodAnalyzer onAddMeal={addAnalyzedMeal} />}
          {activeView === 'plan' && <DietPlan goal={weightGoal} onGoalChange={changeWeightGoal} calorieGoal={goals.calories} />}
          {activeView === 'overview' && <>
            <section className="welcome-row"><div><div className="eyebrow">YOUR DAILY CHECK-IN</div><h1>A little better, <em>every day.</em></h1><p className="welcome-copy">You’re finding your rhythm. Here’s how today is looking.</p></div><button className="button button-dark" type="button" onClick={() => setShowMealForm(true)}><Icon name="plus" size={18} /> Log a meal</button></section>
            <section className="overview-grid">
              <article className="calorie-card"><div className="card-heading"><div><span className="eyebrow">ENERGY IN</span><h2>Calories</h2></div><span className="card-icon peach-icon">◒</span></div><div className="calorie-total"><strong>{totals.calories.toLocaleString()}</strong><span>kcal eaten</span></div><div className="calorie-track"><span style={{ width: `${Math.min((totals.calories / goals.calories) * 100, 100)}%` }} /></div><div className="track-labels"><span>{Math.max(goals.calories - totals.calories, 0).toLocaleString()} kcal left</span><span>Goal {goals.calories.toLocaleString()}</span></div><div className="calorie-foot"><span className="tiny-dot" /> A steady, nourishing pace</div></article>
              <article className="macro-card"><div className="card-heading"><div><span className="eyebrow">THE BUILDING BLOCKS</span><h2>Daily macros</h2></div><span className="macro-date">TODAY</span></div><div className="macro-list">{[['Protein', totals.protein, goals.protein, 'protein'], ['Carbs', totals.carbs, goals.carbs, 'carbs'], ['Healthy fats', totals.fat, goals.fat, 'fat']].map(([label, value, goal, color]) => <div className="macro-row" key={label}><div className="macro-label"><span className={`macro-dot ${color}`} />{label}<strong>{value}<small> / {goal}g</small></strong></div><div className="macro-track"><span className={color} style={{ width: `${Math.min((value / goal) * 100, 100)}%` }} /></div></div>)}</div><div className="macro-note">A balanced plate is built one meal at a time.</div></article>
              <article className="water-card"><div className="card-heading"><div><span className="eyebrow">HYDRATION</span><h2>Water</h2></div><span className="card-icon water-icon"><Icon name="water" size={20} /></span></div><div className="water-total"><strong>{(water * waterGlassMl / 1000).toFixed(1)}</strong><span>litres</span><small>of {waterGoalLiters.toFixed(1)} L</small></div><div className="water-glasses" aria-label={`${water} of ${waterGlassGoal} glasses`}>{Array.from({ length: waterGlassGoal }, (_, index) => <span key={index} className={index < water ? 'filled' : ''}><span className="glass-fill" /><Icon name="glass" size={17} /></span>)}</div><div className="water-controls"><button className="water-remove" type="button" aria-label="Remove one glass of water (250 ml)" title="Remove a glass" onClick={() => changeWater(water - 1)} disabled={water === 0}><Icon name="minus" size={16} /></button><button className="water-add" type="button" onClick={() => changeWater(water + 1)} disabled={water === waterGlassGoal}><Icon name="plus" size={16} /> Add a glass <span>{waterGlassMl} ml</span></button></div></article>
              <article className="meals-card"><div className="section-heading"><div><span className="eyebrow">ON YOUR PLATE</span><h2>Today’s food</h2></div><button className="text-link" type="button" onClick={() => setActiveView('food')}>View food log <Icon name="chevron" size={15} /></button></div>{featuredMeal && <div className="plate-feature"><div className="food-plate"><img src={featuredMeal.image || mealTypeImages[featuredMeal.type] || mealTypeImages.Lunch} alt={featuredMeal.name} /><span className="plate-emoji">{featuredMeal.icon}</span></div><div className="plate-caption"><span className="eyebrow">PLATE PREVIEW</span><strong>{featuredMeal.name}</strong><span>{featuredMeal.calories} kcal · {featuredMeal.type}</span></div></div>}<div className="meal-list">{meals.slice(-3).reverse().map((meal) => <MealRow key={meal.id} meal={meal} onRemove={removeMeal} onSelect={setSelectedMealId} isSelected={featuredMeal?.id === meal.id} />)}</div><button className="add-meal-row" type="button" onClick={() => setShowMealForm(true)}><span><Icon name="plus" size={17} /></span> Add something you ate</button></article>
              <article className="idea-card"><div className="idea-copy"><span className="eyebrow">A LITTLE INSPIRATION</span><h2>Good food, no fuss.</h2><p>Simple ideas for whatever your day needs.</p><button className="text-link" type="button" onClick={() => setActiveView('ideas')}>Explore meal ideas <Icon name="chevron" size={15} /></button></div><div key={inspirationIndex} className="idea-image" style={{ backgroundImage: `linear-gradient(0deg, rgba(24, 37, 28, .76), transparent 58%), url("${mealIdeas[inspirationIndex].image}")` }} role="img" aria-label={mealIdeas[inspirationIndex].name}><span>{inspirationIndex + 1} / {mealIdeas.length} · {mealIdeas[inspirationIndex].tag}</span><strong>{mealIdeas[inspirationIndex].name}</strong></div></article>
            </section>
            <footer className="page-footer"><span>Small steps count. You’re doing just fine.</span><span>Nutrition is personal. Listen to your body.</span></footer>
          </>}

          {activeView === 'food' && <section className="subpage"><div className="subpage-heading"><div><div className="eyebrow">A RECORD OF YOUR DAY</div><h1>Your food <em>log.</em></h1><p className="welcome-copy">Everything you’ve enjoyed today, all in one place.</p></div><button className="button button-dark" type="button" onClick={() => setShowMealForm(true)}><Icon name="plus" size={18} /> Log a meal</button></div><div className="log-summary"><div><span>ENERGY IN</span><strong>{totals.calories.toLocaleString()} <small>kcal</small></strong></div><div><span>PROTEIN</span><strong>{totals.protein}<small> g</small></strong></div><div><span>CARBS</span><strong>{totals.carbs}<small> g</small></strong></div><div><span>HEALTHY FATS</span><strong>{totals.fat}<small> g</small></strong></div></div><article className="log-panel"><div className="section-heading"><div><span className="eyebrow">{today.toUpperCase()}</span><h2>Meals & snacks</h2></div><span className="entry-count">{meals.length} {meals.length === 1 ? 'entry' : 'entries'}</span></div>{meals.length ? <div className="meal-list log-list">{[...meals].reverse().map((meal) => <MealRow key={meal.id} meal={meal} onRemove={removeMeal} />)}</div> : <div className="empty-state">Nothing logged yet. Add your first meal to get started.</div>}<button className="add-meal-row" type="button" onClick={() => setShowMealForm(true)}><span><Icon name="plus" size={17} /></span> Add something you ate</button></article></section>}

          {activeView === 'ideas' && <section className="subpage"><div className="subpage-heading"><div><div className="eyebrow">MADE FOR REAL LIFE</div><h1>Meal <em>ideas.</em></h1><p className="welcome-copy">Good-for-you inspiration that still feels like good food.</p></div></div><div className="ideas-grid">{mealIdeas.map((idea) => <article className="recipe-card" key={idea.name}><div className="recipe-photo" style={{ backgroundImage: `url("${idea.image}")` }}><span className="recipe-tag">{idea.tag}</span></div><div className="recipe-content"><h2>{idea.name}</h2><p>{idea.detail}</p><div className="recipe-meta"><span>{idea.time}</span><span>{idea.calories} kcal</span></div><button className="recipe-add" type="button" onClick={() => addIdea(idea)}><Icon name="plus" size={16} /> Add to today’s log</button></div></article>)}</div></section>}

          {activeView === 'progress' && <section className="subpage">
            <div className="subpage-heading">
              <div><div className="eyebrow">NOTICE THE LITTLE WINS</div><h1>Your <em>progress.</em></h1><p className="welcome-copy">Consistency is built from ordinary days like this one.</p></div>
              <div className="progress-heading-actions">
                <div className="streak-controls" aria-label="Adjust streak days">
                  <button className="streak-step" type="button" aria-label="Remove one streak day" title="Remove one day" onClick={() => setStreakDays((days) => Math.max(0, days - 1))} disabled={streakDays === 0}><Icon name="minus" size={14} /></button>
                  <span className="streak-pill progress-streak" aria-live="polite"><span>✳</span> {streakDays} day streak</span>
                  <button className="streak-step" type="button" aria-label="Add one streak day" title="Add one day" onClick={() => setStreakDays((days) => days + 1)}><Icon name="plus" size={14} /></button>
                </div>
                <button className="button button-dark progress-download" type="button" onClick={downloadPlanner} disabled={pdfLoading}><Icon name="download" size={16} />{pdfLoading ? 'Building PDF...' : 'Download Diet Plan PDF'}</button>
              </div>
            </div>
            <div className="progress-grid">
              <article className="progress-card">
                <div className="week-card-heading">
                  <div><span className="eyebrow">{weekOffset === 0 ? 'UPCOMING DAYS' : 'LATER DATES'}</span><span className="week-range">{weekRange}</span></div>
                  <div className="week-navigation" aria-label="Browse weeks">
                    <button className="week-nav-button previous" type="button" aria-label="Previous upcoming dates" title="Previous upcoming dates" onClick={() => setWeekOffset((offset) => Math.max(offset - 1, 0))} disabled={weekOffset === 0}><Icon name="chevron" size={15} /></button>
                    <button className="week-nav-button" type="button" aria-label="Next upcoming dates" title="Next upcoming dates" onClick={() => setWeekOffset((offset) => offset + 1)}><Icon name="chevron" size={15} /></button>
                  </div>
                </div>
                <h2>Days you checked in</h2>
                {progressWeek.length > 0 ? <div className="week-dots" aria-label={`${streakDays} streak days`}>{progressWeek.map((day) => {
                  const checkedIn = checkInDates.includes(day.key)
                  const dayLabel = new Intl.DateTimeFormat('en', { weekday: 'long', month: 'long', day: 'numeric' }).format(day.date)
                  return <button className="day-checkin" key={day.key} type="button" aria-label={`${dayLabel}, ${checkedIn ? 'checked in' : 'not checked in'}`} aria-pressed={checkedIn} title={`Toggle check-in for ${dayLabel}`} onClick={() => toggleCheckIn(day.key, checkedIn)}>
                    <span className={`day-circle ${checkedIn ? 'done' : ''}`}>{day.date.getDate()}</span><small>{day.weekday}</small>
                  </button>
                })}</div> : <p className="progress-caption">Add a streak day to start tracking check-ins.</p>}
                {streakDays > 0 && <p className="progress-caption">You checked in {checkedInCount} of {streakDays} streak days. That matters.</p>}
              </article>
              <article className="progress-card goal-card"><span className="eyebrow">TODAY’S GOALS</span><h2>Finding your balance</h2>{[['Calories', totals.calories, goals.calories], ['Protein', totals.protein, goals.protein], ['Carbs', totals.carbs, goals.carbs], ['Healthy fats', totals.fat, goals.fat]].map(([name, value, goal]) => <div className="goal-row" key={name}><div><span>{name}</span><strong>{Math.round(value / goal * 100)}%</strong></div><div className="macro-track"><span style={{ width: `${Math.min(value / goal * 100, 100)}%` }} /></div></div>)}</article>
            </div>
          </section>}
        </div>
      </main>

      {showMealForm && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget && !mealLoading) setShowMealForm(false) }}><section className="meal-modal" role="dialog" aria-modal="true" aria-labelledby="meal-modal-title"><div className="modal-heading"><div><span className="eyebrow">ADD TO YOUR DAY</span><h2 id="meal-modal-title">Log a meal</h2></div><button className="icon-button" type="button" onClick={() => setShowMealForm(false)} aria-label="Close" disabled={mealLoading}><Icon name="close" /></button></div><form onSubmit={addMeal}><label className="form-field full-field">Meal name<input autoFocus required maxLength="60" placeholder="e.g. Paneer tikka wrap" value={mealForm.name} onChange={(event) => { setMealForm({ ...mealForm, name: event.target.value }); setMealError('') }} /></label><label className="form-field full-field">Meal type<select value={mealForm.type} onChange={(event) => setMealForm({ ...mealForm, type: event.target.value })}><option>Breakfast</option><option>Lunch</option><option>Dinner</option><option>Snack</option></select></label><p className="meal-form-note">Nutrition values are AI estimates and can vary by portion and preparation.</p>{mealError && <p className="meal-form-error" role="alert">{mealError}</p>}<button className="button button-dark modal-submit" type="submit" disabled={mealLoading}>{mealLoading ? 'Estimating nutrition…' : 'Estimate & add meal'} {!mealLoading && <Icon name="plus" size={17} />}</button></form></section></div>}
      {showSettings && settingsForm && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowSettings(false) }}><section className="meal-modal settings-modal" role="dialog" aria-modal="true" aria-labelledby="settings-modal-title"><div className="modal-heading"><div><span className="eyebrow">MAKE IT YOURS</span><h2 id="settings-modal-title">Profile settings</h2></div><button className="icon-button" type="button" onClick={() => setShowSettings(false)} aria-label="Close settings"><Icon name="close" /></button></div><form onSubmit={saveSettings}><label className="form-field full-field">Your name<input autoFocus required maxLength="50" value={settingsForm.name} onChange={(event) => setSettingsForm({ ...settingsForm, name: event.target.value })} /></label><label className="form-field full-field">Nutrition focus<select value={settingsForm.focus} onChange={(event) => setSettingsForm({ ...settingsForm, focus: event.target.value })}><option>Balanced nutrition</option><option>More energy</option><option>Build strength</option><option>Plant-forward</option></select></label><div className="settings-goals"><span className="eyebrow">DAILY NUTRITION GOALS</span><div className="nutrition-inputs settings-grid"><label className="form-field">Calories<input required type="number" min="1" max="9999" value={settingsForm.calories} onChange={(event) => setSettingsForm({ ...settingsForm, calories: event.target.value })} /></label><label className="form-field">Protein (g)<input required type="number" min="1" max="999" value={settingsForm.protein} onChange={(event) => setSettingsForm({ ...settingsForm, protein: event.target.value })} /></label><label className="form-field">Carbs (g)<input required type="number" min="1" max="999" value={settingsForm.carbs} onChange={(event) => setSettingsForm({ ...settingsForm, carbs: event.target.value })} /></label><label className="form-field">Fat (g)<input required type="number" min="1" max="999" value={settingsForm.fat} onChange={(event) => setSettingsForm({ ...settingsForm, fat: event.target.value })} /></label></div></div><button className="button button-dark modal-submit" type="submit">Save settings <Icon name="check" size={17} /></button></form>{remoteMode && <button className="auth-signout" type="button" onClick={signOut}>Sign out</button>}</section></div>}
      {notice && <div className="toast" role="status"><span><Icon name="check" size={16} /></span>{notice}</div>}
    </div>
  )
}

function MealRow({ meal, onRemove, onSelect, isSelected = false }) {
  const details = <><span className="meal-emoji">{meal.icon}</span><span className="meal-main"><span className="meal-title">{meal.name}</span><span className="meal-subtitle">{meal.type} <span>·</span> {meal.time}</span></span><span className="meal-nutrition"><strong>{meal.calories}</strong><span>kcal</span></span></>

  return <div className={`meal-row ${isSelected ? 'selected' : ''}`}>{onSelect ? <button className="meal-select" type="button" aria-label={`Show ${meal.name} on plate`} aria-pressed={isSelected} onClick={() => onSelect(meal.id)}>{details}</button> : <div className="meal-static">{details}</div>}{onRemove && <button className="meal-remove" type="button" aria-label={`Remove ${meal.name} from food log`} title="Remove meal" onClick={() => onRemove(meal.id)}><Icon name="trash" size={16} /></button>}</div>
}

export default App
