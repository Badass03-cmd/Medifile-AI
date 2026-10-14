// Constants, built-in lab ranges, symptom advice and the saved app state.

const TAB_ORDER = ["dash", "ai", "rec", "med", "lab", "app", "sym", "emg"];
const session = (() => {
  let s = null;
  try {
    s = JSON.parse(localStorage.getItem("hc_sess"));
  } catch (e) {}
  return { user: s, key: (s && s.key) || "hc_v1" };
})();
let STORAGE_KEY = session.key;
// Lab tests: [name, unit, low, high, what a low value can mean, what a high value can mean]. General adult ranges only.
const LAB_TESTS = {
  hb: [
    "Hemoglobin",
    "g/dL",
    12,
    17.5,
    "Low can point to anaemia (iron, B12 or folate shortage, blood loss).",
    "High can follow dehydration, smoking or lung conditions.",
  ],
  glu: [
    "Fasting glucose",
    "mg/dL",
    70,
    99,
    "Low sugar can cause shakiness and sweating; it is often linked to diabetes medicines or long gaps between meals.",
    "100–125 is the prediabetes range; 126 or more on repeat tests suggests diabetes.",
  ],
  a1c: [
    "HbA1c",
    "%",
    4,
    5.6,
    "Rarely a concern on its own.",
    "5.7–6.4 is the prediabetes range; 6.5 or more is the diabetes range. It reflects the last ~3 months.",
  ],
  chol: [
    "Total cholesterol",
    "mg/dL",
    0,
    199,
    "",
    "Above 200 raises heart-disease risk over time; diet, activity and sometimes medicine help.",
  ],
  ldl: [
    "LDL cholesterol",
    "mg/dL",
    0,
    99,
    "",
    'The "bad" cholesterol. Higher values build up in artery walls.',
  ],
  hdl: [
    "HDL cholesterol",
    "mg/dL",
    40,
    100,
    'Low HDL (the "good" cholesterol) raises heart risk; exercise and not smoking help.',
    "",
  ],
  tg: [
    "Triglycerides",
    "mg/dL",
    0,
    149,
    "",
    "High values relate to sugar, alcohol, excess calories and low activity.",
  ],
  cr: [
    "Creatinine",
    "mg/dL",
    0.6,
    1.3,
    "Can reflect low muscle mass.",
    "High can mean the kidneys are filtering less, or dehydration. Your doctor will check trends.",
  ],
  tsh: [
    "TSH",
    "mIU/L",
    0.4,
    4,
    "Low suggests an overactive thyroid.",
    "High suggests an underactive thyroid (tiredness, weight gain, feeling cold).",
  ],
  vitd: [
    "Vitamin D",
    "ng/mL",
    30,
    100,
    "Low is very common and affects bones and muscles; sunlight, food and supplements help.",
    "Very high usually comes from over-supplementing.",
  ],
  wbc: [
    "White blood cells",
    "×10³/µL",
    4,
    11,
    "Low can follow viral illness or some medicines.",
    "High often indicates infection or inflammation.",
  ],
  plt: [
    "Platelets",
    "×10³/µL",
    150,
    450,
    "Low can cause easy bruising or bleeding; needs a doctor review.",
    "High can follow infection or iron deficiency.",
  ],
};
// Plain self-care guidance for common symptoms, matched by keyword in the assistant.
const SYMPTOM_ADVICE = [
  [
    /fever|temperature/,
    "Rest, drink fluids, dress lightly. Paracetamol can help if it is safe for you (follow the label). See a doctor if fever is above 39.4°C (103°F), lasts more than 3 days, or comes with stiff neck, rash, confusion or breathing trouble.",
  ],
  [
    /headache|migraine/,
    "Drink water, rest in a quiet dim room, reduce screen time. Get urgent care for a sudden severe headache, or one with fever and stiff neck, weakness, vision changes, or after a head injury.",
  ],
  [
    /cough|cold|sore throat|runny/,
    "Warm fluids, rest, steam and honey (not for infants) help. See a doctor if it lasts over 2–3 weeks, you cough up blood, wheeze, or have a high fever.",
  ],
  [
    /nausea|vomit|diarrh|stomach|abdom/,
    "Take small sips of oral rehydration solution and bland food when you can. Seek care for blood in vomit or stool, severe belly pain, signs of dehydration (dark urine, dizziness), or if it lasts over 2 days.",
  ],
  [
    /tired|fatigue|weak/,
    "Check sleep, hydration, meals and stress first. Ongoing tiredness deserves a checkup; ask about anaemia, thyroid, vitamin D/B12 and blood sugar tests.",
  ],
  [
    /dizz|faint/,
    "Sit or lie down and drink water. See a doctor if it keeps recurring, or comes with fainting, palpitations, or weakness on one side.",
  ],
  [
    /rash|itch/,
    "Avoid scratching and new soaps or creams. See a doctor if it spreads fast, blisters, is painful, or comes with fever or swelling of lips or face.",
  ],
  [
    /back pain|joint|muscle/,
    "Gentle movement, heat and avoiding long sitting help. See a doctor for pain after injury, numbness, leg weakness, bladder trouble or pain that lasts over 2 weeks.",
  ],
];
// Phrases that should send the person to emergency care instead of getting normal advice.
const RED_FLAGS =
  /chest pain|can'?t breathe|cannot breathe|short(ness)? of breath|severe bleeding|stroke|face droop|slurred|unconscious|seizure|overdose|suicid|self.harm/;
// App state is kept in localStorage under STORAGE_KEY (one key per signed-in account).
let state;
try {
  state = JSON.parse(localStorage.getItem(STORAGE_KEY));
} catch (e) {}
state = Object.assign(
  {
    meds: [],
    log: {},
    labs: [],
    appts: [],
    syms: [],
    recs: [],
    emg: {},
    patients: [],
    staff: [],
    lang: "en",
    theme: "system",
    size: "normal",
    chat: [],
    tab: "dash",
  },
  state || {},
);
