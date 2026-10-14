// Demo sign-in, personas (person / doctor / hospital), login screen text.

/* ===== Sign-in and personas: person, doctor, hospital (local demo, no server) ===== */
const currentUser = () => session.user,
  readJson = (k, d) => {
    try {
      return JSON.parse(localStorage.getItem(k)) || d;
    } catch (e) {
      return d;
    }
  },
  sameText = (a, b) => String(a).toLowerCase() == String(b).toLowerCase();
const DEMO_ACCOUNTS = {
  "demo-patient": { role: "person", name: "Demo Patient", key: "hc_v1" },
  "DR-1001": {
    role: "doctor",
    name: "Dr. Asha Rao",
    spec: "General Medicine",
    hosp: "HOSP-2001",
    key: "hc_u_dr_1001",
  },
  "HOSP-2001": { role: "hospital", name: "City General Hospital", key: "hc_u_hosp_2001" },
};
const allAccounts = () => [
  ...readJson("hc_accts", []),
  ...Object.entries(DEMO_ACCOUNTS).map(([id, v]) => ({ id, ...v })),
];
const loginText = {
  en: {
    person: "Person",
    doctor: "Doctor",
    hospital: "Hospital",
    signin: "Sign in",
    create: "Create account",
    pw: "Password",
    out: "Sign out",
  },
  hi: {
    person: "व्यक्ति",
    doctor: "डॉक्टर",
    hospital: "अस्पताल",
    signin: "साइन इन करें",
    create: "खाता बनाएँ",
    pw: "पासवर्ड",
    out: "साइन आउट",
  },
  te: {
    person: "వ్యక్తి",
    doctor: "వైద్యుడు",
    hospital: "ఆసుపత్రి",
    signin: "సైన్ ఇన్",
    create: "ఖాతా సృష్టించండి",
    pw: "పాస్‌వర్డ్",
    out: "సైన్ అవుట్",
  },
};
const loginT = (k) => (loginText[state.lang] || loginText.en)[k] || loginText.en[k];
Object.assign(translations.en, {
  dd: "Today's overview",
  pts: "My patients",
  ref: "Lab ranges",
  hd: "Facility overview",
  stf: "Our doctors",
});
Object.assign(translations.hi, {
  dd: "अवलोकन",
  pts: "मरीज़",
  ref: "लैब संदर्भ",
  hd: "अवलोकन",
  stf: "डॉक्टर",
});
Object.assign(translations.te, {
  dd: "అవలోకనం",
  pts: "రోగులు",
  ref: "ల్యాబ్ సూచిక",
  hd: "అవలోకనం",
  stf: "వైద్యులు",
});

/* ===== More functions: vitals, refills, weekly adherence, calendar, CSV, voice ===== */
state.vits = state.vits || [];
TAB_ORDER.splice(TAB_ORDER.indexOf("lab") + 1, 0, "vit");
Object.assign(translations.en, { vit: "Vitals" });
Object.assign(translations.hi, { vit: "स्वास्थ्य रीडिंग" });
