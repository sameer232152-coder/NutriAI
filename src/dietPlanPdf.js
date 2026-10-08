const pageWidth = 210
const margin = 16
const contentWidth = pageWidth - margin * 2
const colors = {
  ink: [38, 52, 43],
  green: [71, 122, 89],
  muted: [111, 124, 114],
  line: [226, 232, 224],
  pale: [242, 246, 238],
  gold: [191, 145, 67],
}

const meals = [
  {
    name: 'Berry protein overnight oats',
    time: '8:00 AM · Breakfast',
    portion: 'Rolled oats 40 g, Greek yogurt 170 g, berries 100 g, chia 1 tsp.',
    alternative: 'Swap: unsweetened soy yogurt and ground flaxseed.',
  },
  {
    name: 'Salmon & quinoa nourish bowl',
    time: '12:30 PM · Lunch',
    portion: 'Salmon 120 g, cooked quinoa 3/4 cup, leafy greens 2 cups, olive oil 1 tsp.',
    alternative: 'Vegetarian: baked tofu 150 g with edamame 1/2 cup.',
  },
  {
    name: 'Apple, cottage cheese & walnuts',
    time: '3:30 PM · Snack',
    portion: '1 medium apple, cottage cheese 150 g, walnuts 10 g.',
    alternative: 'Swap: unsweetened soy yogurt with almonds 12 g.',
  },
  {
    name: 'Chicken, sweet potato & greens',
    time: '7:00 PM · Dinner',
    portion: 'Chicken breast 120 g, sweet potato 200 g, mixed vegetables 1.5 cups.',
    alternative: 'Vegetarian: cooked lentils 3/4 cup with tofu 100 g.',
  },
]

const mealShares = [
  { calories: 0.25, protein: 0.25, carbs: 0.28, fat: 0.2 },
  { calories: 0.3, protein: 0.3, carbs: 0.31, fat: 0.29 },
  { calories: 0.15, protein: 0.15, carbs: 0.14, fat: 0.15 },
  { calories: 0.3, protein: 0.3, carbs: 0.27, fat: 0.36 },
]

const shoppingGroups = [
  { title: 'PRODUCE', items: ['Mixed berries', 'Apples', 'Leafy greens', 'Sweet potatoes', 'Seasonal vegetables'] },
  { title: 'PROTEIN & DAIRY', items: ['Greek yogurt', 'Cottage cheese', 'Salmon or tofu', 'Chicken or lentils', 'Edamame'] },
  { title: 'PANTRY', items: ['Rolled oats', 'Quinoa or brown rice', 'Chia or flaxseed', 'Walnuts or almonds', 'Olive oil & spices'] },
]

const recipes = [
  { title: 'Berry protein overnight oats', ingredients: 'Oats, yogurt, berries, chia, cinnamon.', steps: 'Stir oats, yogurt and chia with a splash of milk. Chill overnight; add berries before serving.' },
  { title: 'Salmon & quinoa nourish bowl', ingredients: 'Salmon, quinoa, greens, cucumber, lemon.', steps: 'Bake or pan-sear salmon until cooked through. Serve over quinoa and greens with lemon and olive oil.' },
  { title: 'Apple, cottage cheese & walnuts', ingredients: 'Apple, cottage cheese, walnuts, cinnamon.', steps: 'Slice the apple and serve with cottage cheese. Add chopped walnuts and cinnamon.' },
  { title: 'Chicken, sweet potato & greens', ingredients: 'Chicken, sweet potato, mixed vegetables, olive oil.', steps: 'Roast cubed sweet potato and vegetables. Grill seasoned chicken; serve together with leafy greens.' },
]

function loadLogo() {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 256
      canvas.height = 256
      const context = canvas.getContext('2d')
      if (!context) {
        reject(new Error('Could not prepare the NutriAI logo for the PDF.'))
        return
      }
      context.drawImage(image, 0, 0)
      resolve(canvas.toDataURL('image/png'))
    }
    image.onerror = () => reject(new Error('Could not load the NutriAI logo.'))
    image.src = '/NutriAI%20Smart%20Nutrition%20Logo.png'
  })
}

function wrapText(doc, text, x, y, width, fontSize = 10, color = colors.ink, font = 'normal') {
  doc.setFont('helvetica', font)
  doc.setFontSize(fontSize)
  doc.setTextColor(...color)
  const lines = doc.splitTextToSize(String(text), width)
  doc.text(lines, x, y)
  return y + lines.length * fontSize * 0.43
}

function addPageHeader(doc, logo, title, pageNumber) {
  doc.setFillColor(...colors.pale)
  doc.rect(0, 0, pageWidth, 31, 'F')
  doc.addImage(logo, 'PNG', margin, 6, 19, 19)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(15)
  doc.setTextColor(...colors.ink)
  doc.text(title, 41, 18)
  addFooter(doc, pageNumber)
}

function addFooter(doc, pageNumber) {
  doc.setDrawColor(...colors.line)
  doc.line(margin, 284, pageWidth - margin, 284)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8)
  doc.setTextColor(...colors.muted)
  doc.text('NutriAI - Your Diet Planner · Nutrition estimates are approximate', margin, 290)
  doc.text(`${pageNumber} / 5`, pageWidth - margin, 290, { align: 'right' })
}

function addSectionTitle(doc, title, y) {
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(13)
  doc.setTextColor(...colors.green)
  doc.text(title, margin, y)
  return y + 8
}

function getMealNutrition(goals) {
  const keys = ['calories', 'protein', 'carbs', 'fat']
  const totals = { calories: Number(goals.calories), protein: Number(goals.protein), carbs: Number(goals.carbs), fat: Number(goals.fat) }
  return meals.map((_, index) => Object.fromEntries(keys.map((key) => {
    const used = mealShares.slice(0, index).reduce((sum, share) => sum + Math.round(totals[key] * share[key]), 0)
    const amount = index === meals.length - 1
      ? totals[key] - used
      : Math.round(totals[key] * mealShares[index][key])
    return [key, amount]
  })))
}

export async function downloadDietPlanPdf({ profileName, profileFocus, weightGoal, goals }) {
  const { jsPDF } = await import('jspdf')
  const logo = await loadLogo()
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const nutrition = getMealNutrition(goals)
  const date = new Intl.DateTimeFormat('en', { month: 'long', day: 'numeric', year: 'numeric' }).format(new Date())

  doc.setProperties({
    title: 'NutriAI - Your Diet Planner',
    subject: `Personalized one-day nutrition plan for ${profileName}`,
    author: 'NutriAI',
  })

  doc.setFillColor(...colors.pale)
  doc.rect(0, 0, pageWidth, 58, 'F')
  doc.addImage(logo, 'PNG', margin, 13, 32, 32)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(25)
  doc.setTextColor(...colors.ink)
  doc.text('NutriAI - Your Diet Planner', 55, 29)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...colors.green)
  doc.text('A practical, personalized one-day guide', 56, 38)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(21)
  doc.setTextColor(...colors.ink)
  doc.text('Today Plan', margin, 78)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...colors.muted)
  doc.text(`${date}  ·  Duration: 1 day`, margin, 86)

  doc.setFillColor(255, 255, 255)
  doc.setDrawColor(...colors.line)
  doc.roundedRect(margin, 98, contentWidth, 33, 3, 3, 'FD')
  wrapText(doc, 'PREPARED FOR', margin + 7, 107, 43, 8, colors.muted, 'bold')
  wrapText(doc, profileName || 'NutriAI member', margin + 7, 116, 47, 11, colors.ink, 'bold')
  wrapText(doc, 'NUTRITION FOCUS', 78, 107, 48, 8, colors.muted, 'bold')
  wrapText(doc, profileFocus || 'Balanced nutrition', 78, 116, 48, 10, colors.ink, 'bold')
  wrapText(doc, 'GOAL', 143, 107, 35, 8, colors.muted, 'bold')
  wrapText(doc, weightGoal || 'Maintain weight', 143, 116, 48, 10, colors.ink, 'bold')

  let y = addSectionTitle(doc, 'Introduction & goals', 148)
  y = wrapText(doc, `This plan supports ${profileFocus || 'balanced nutrition'} with a ${String(weightGoal || 'maintain weight').toLowerCase()} goal. Use the portions as a flexible starting point and adjust to your appetite, schedule and clinician guidance.`, margin, y, contentWidth, 10, colors.ink)

  y += 8
  y = addSectionTitle(doc, 'Your daily nutrition targets', y)
  const targetItems = [
    ['Calories', `${goals.calories} kcal`],
    ['Protein', `${goals.protein} g`],
    ['Carbohydrates', `${goals.carbs} g`],
    ['Fat', `${goals.fat} g`],
  ]
  const targetWidth = contentWidth / targetItems.length
  targetItems.forEach(([label, value], index) => {
    const x = margin + index * targetWidth
    doc.setFillColor(...colors.pale)
    doc.roundedRect(x, y, targetWidth - 3, 20, 2, 2, 'F')
    wrapText(doc, label.toUpperCase(), x + 4, y + 7, targetWidth - 10, 7, colors.muted, 'bold')
    wrapText(doc, value, x + 4, y + 15, targetWidth - 10, 10, colors.ink, 'bold')
  })

  y += 31
  y = addSectionTitle(doc, 'Daily guidelines', y)
  const guidelines = [
    'Drink regularly through the day; individual fluid needs vary.',
    'Pair nourishing meals with movement and a consistent sleep routine.',
    'Choose mostly minimally processed foods; keep sugary drinks occasional.',
    'For medical conditions, allergies or pregnancy, confirm this plan with a clinician or dietitian.',
  ]
  guidelines.forEach((item) => {
    doc.setFillColor(...colors.gold)
    doc.circle(margin + 1.5, y - 1, 1, 'F')
    y = wrapText(doc, item, margin + 6, y, contentWidth - 6, 9, colors.ink) + 3
  })
  addFooter(doc, 1)

  doc.addPage()
  addPageHeader(doc, logo, 'Meal plan', 2)
  wrapText(doc, 'Four simple meals with portions, timing and flexible alternatives.', margin, 43, contentWidth, 9, colors.muted)
  const cardY = 53
  const cardHeight = 52
  meals.forEach((meal, index) => {
    const yPosition = cardY + index * 54
    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(...colors.line)
    doc.roundedRect(margin, yPosition, contentWidth, cardHeight, 2.5, 2.5, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(...colors.ink)
    doc.text(meal.name, margin + 5, yPosition + 8)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...colors.green)
    doc.text(meal.time, pageWidth - margin - 5, yPosition + 8, { align: 'right' })
    wrapText(doc, `Portion: ${meal.portion}`, margin + 5, yPosition + 16, contentWidth - 10, 8, colors.ink)
    wrapText(doc, meal.alternative, margin + 5, yPosition + 27, contentWidth - 10, 8, colors.muted)
    const values = nutrition[index]
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(8)
    doc.setTextColor(...colors.green)
    doc.text(`${values.calories} kcal   ·   P ${values.protein} g   ·   C ${values.carbs} g   ·   F ${values.fat} g`, margin + 5, yPosition + 45)
  })
  wrapText(doc, 'Portions and meal nutrition are estimates allocated to your saved daily targets; ingredients and preparation change actual values.', margin, 276, contentWidth, 8, colors.muted)

  doc.addPage()
  addPageHeader(doc, logo, 'Nutrition & shopping', 3)
  let tableY = addSectionTitle(doc, 'Nutritional breakdown', 43)
  const columns = [margin, 83, 111, 139, 167]
  doc.setFillColor(...colors.pale)
  doc.roundedRect(margin, tableY - 5, contentWidth, 10, 1.5, 1.5, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(7.5)
  doc.setTextColor(...colors.muted)
  ;['MEAL', 'KCAL', 'PROTEIN', 'CARBS', 'FAT'].forEach((label, index) => doc.text(label, columns[index], tableY + 1))
  tableY += 13
  meals.forEach((meal, index) => {
    const values = nutrition[index]
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...colors.ink)
    doc.text(meal.name, columns[0], tableY)
    doc.text(String(values.calories), columns[1], tableY)
    doc.text(`${values.protein} g`, columns[2], tableY)
    doc.text(`${values.carbs} g`, columns[3], tableY)
    doc.text(`${values.fat} g`, columns[4], tableY)
    doc.setDrawColor(...colors.line)
    doc.line(margin, tableY + 3, pageWidth - margin, tableY + 3)
    tableY += 10
  })
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...colors.green)
  doc.text('DAILY TARGET', columns[0], tableY)
  doc.text(`${goals.calories}`, columns[1], tableY)
  doc.text(`${goals.protein} g`, columns[2], tableY)
  doc.text(`${goals.carbs} g`, columns[3], tableY)
  doc.text(`${goals.fat} g`, columns[4], tableY)

  let shoppingY = addSectionTitle(doc, 'Shopping list', tableY + 20)
  const columnWidth = contentWidth / shoppingGroups.length
  shoppingGroups.forEach((group, index) => {
    const x = margin + index * columnWidth
    wrapText(doc, group.title, x, shoppingY, columnWidth - 5, 8, colors.green, 'bold')
    let itemY = shoppingY + 8
    group.items.forEach((item) => {
      itemY = wrapText(doc, `• ${item}`, x, itemY, columnWidth - 6, 8, colors.ink) + 3
    })
  })

  const substituteY = shoppingY + 60
  addSectionTitle(doc, 'Easy-to-find substitutes', substituteY)
  wrapText(doc, 'Quinoa → brown rice  ·  Salmon → tofu or chickpeas  ·  Greek yogurt → unsweetened soy yogurt  ·  Chia → ground flaxseed  ·  Sweet potato → potato or squash', margin, substituteY + 9, contentWidth, 8.5, colors.ink)

  doc.addPage()
  addPageHeader(doc, logo, 'Simple recipes', 4)
  wrapText(doc, 'Healthy preparation: bake, steam or grill; season with herbs, citrus and spices.', margin, 43, contentWidth, 9, colors.muted)
  recipes.forEach((recipe, index) => {
    const yPosition = 54 + index * 53
    doc.setFillColor(255, 255, 255)
    doc.setDrawColor(...colors.line)
    doc.roundedRect(margin, yPosition, contentWidth, 47, 2.5, 2.5, 'FD')
    wrapText(doc, recipe.title, margin + 5, yPosition + 9, contentWidth - 10, 10, colors.green, 'bold')
    wrapText(doc, `Ingredients: ${recipe.ingredients}`, margin + 5, yPosition + 18, contentWidth - 10, 8.5, colors.muted)
    wrapText(doc, recipe.steps, margin + 5, yPosition + 29, contentWidth - 10, 8.5, colors.ink)
  })
  wrapText(doc, 'Adjust seasoning and portions to taste. Cook proteins thoroughly and refrigerate leftovers promptly.', margin, 274, contentWidth, 8, colors.muted)

  doc.addPage()
  addPageHeader(doc, logo, 'Tracking & reminders', 5)
  let trackingY = addSectionTitle(doc, '7-day progress tracker', 43)
  wrapText(doc, 'Use this space to notice patterns, not to judge daily fluctuations.', margin, trackingY, contentWidth, 8.5, colors.muted)
  const trackerTop = 62
  const dayWidth = 24
  const weightWidth = 33
  const energyWidth = 38
  const noteX = margin + dayWidth + weightWidth + energyWidth
  doc.setFillColor(...colors.pale)
  doc.rect(margin, trackerTop, contentWidth, 9, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(...colors.muted)
  doc.text('DAY', margin + 3, trackerTop + 6)
  doc.text('WEIGHT', margin + dayWidth + 3, trackerTop + 6)
  doc.text('ENERGY / MOOD', margin + dayWidth + weightWidth + 3, trackerTop + 6)
  doc.text('NOTES', noteX + 3, trackerTop + 6)
  for (let index = 0; index < 7; index += 1) {
    const rowY = trackerTop + 9 + index * 11
    doc.setDrawColor(...colors.line)
    doc.line(margin, rowY + 10, pageWidth - margin, rowY + 10)
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(...colors.ink)
    doc.text(`Day ${index + 1}`, margin + 3, rowY + 7)
  }

  let noteY = addSectionTitle(doc, 'Personal notes', 155)
  doc.setDrawColor(...colors.line)
  for (let index = 0; index < 3; index += 1) {
    const lineY = noteY + 8 + index * 10
    doc.line(margin, lineY, pageWidth - margin, lineY)
  }

  let tipsY = addSectionTitle(doc, 'Tips & reminders', 201)
  const tips = [
    'Keep water nearby and drink regularly; follow your own fluid needs.',
    'Choose mostly whole foods; keep highly processed snacks and sugary drinks occasional.',
    'Use a comfortable portion, eat slowly, and pause to notice fullness.',
    'Rest and regular movement support wellbeing alongside nourishing meals.',
  ]
  tips.forEach((tip) => {
    doc.setFillColor(...colors.gold)
    doc.circle(margin + 1.5, tipsY - 1, 1, 'F')
    tipsY = wrapText(doc, tip, margin + 6, tipsY, contentWidth - 6, 8.5, colors.ink) + 4
  })
  wrapText(doc, 'This general wellness plan is not medical advice. For diabetes, allergies, pregnancy or other medical needs, consult a qualified clinician or dietitian.', margin, 271, contentWidth, 7.5, colors.muted)

  doc.save('NutriAI-Your-Diet-Planner.pdf')
}