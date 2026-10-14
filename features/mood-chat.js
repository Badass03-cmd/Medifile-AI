// Mood check-in, streaks, kinder chat replies.

state.moods = state.moods || {};
const MOODS = [
  [1, "😞", "Rough"], [2, "😕", "Low"], [3, "😐", "Okay"], [4, "🙂", "Good"], [5, "😄", "Great"],
];
const MOOD_REPLY = {
  1: "I am sorry today feels so heavy. Be gentle with yourself. If you like, note what is bothering you under How I feel. If it ever feels like too much, you can call Tele-MANAS on 14416, free and open day and night.",
  2: "Thank you for being honest. A slow day is allowed. A glass of water, a little fresh air or a short walk might help a bit.",
  3: "A steady, ordinary day. That is perfectly fine too.",
  4: "I am glad to hear that 🙂 Keep doing whatever is working for you.",
  5: "Wonderful! 😄 Soak it up, you deserve a good day.",
};
const THOUGHTS = [
  "Small steps still count. You showed up for your health today.",
  "Drink a glass of water if you have not yet. Your body will thank you.",
  "Rest is part of getting better, not a waste of time.",
  "A ten-minute walk can change the whole mood of a day.",
  "You do not have to do everything today. Just the next small thing.",
  "Sleep is medicine too. Try to wind down a little earlier tonight.",
  "Asking questions at the doctor is not a bother. It is your right.",
  "Be as kind to yourself as you would be to a friend.",
  "Stretch your shoulders and take three slow breaths right now.",
  "Eating something colourful today is a quiet little win.",
  "Good health is built from ordinary days like this one.",
  "If something worries you, writing it down often makes it feel lighter.",
  "Call someone you care about today. It helps them and it helps you.",
  "Progress is not always a straight line, and that is okay.",
];
function dailyThought() {
  const d = new Date(), n = Math.floor((d - new Date(d.getFullYear(), 0, 0)) / 864e5);
  return THOUGHTS[n % THOUGHTS.length];
}
function dayComplete(k, all) {
  return all.length > 0 && all.every((x) => isDoseTaken(x.key, k));
}
function streakDays() {
  const all = allDoses();
  if (!all.length) return 0;
  let n = 0;
  for (let i = 0; i < 90; i++) {
    const k = toDateKey(new Date(Date.now() - i * 864e5));
    if (dayComplete(k, all)) n++;
    else if (i > 0) break;
  }
  return n;
}
function streakHtml() {
  const n = streakDays();
  return n >= 2 ? ` <span class="streak">🌟 ${n} days in a row</span>` : "";
}
function celebrate() {
  const all = allDoses();
  if (all.length && all.every((x) => isDoseTaken(x.key))) {
    const n = streakDays();
    showToast(n >= 2 ? "That is everything for today 🎉 " + n + " days in a row, well done!" : "That is everything for today 🎉 Well done, you are looking after yourself.");
  }
}
function moodCard() {
  const t = toDateKey(new Date()), cur = state.moods[t];
  const strip = [];
  for (let i = 6; i >= 0; i--) {
    const dt = new Date(Date.now() - i * 864e5), v = state.moods[toDateKey(dt)], m = MOODS.find((x) => x[0] == v);
    strip.push(`<div><b>${m ? m[1] : "·"}</b>${dt.toLocaleDateString([], { weekday: "short" })}</div>`);
  }
  const recent = [0, 1, 2].map((i) => state.moods[toDateKey(new Date(Date.now() - i * 864e5))]);
  const heavy = recent.every((v) => v && v <= 2);
  return `<div class="sec"><h3>${cur ? "Thanks for checking in" : "How are you feeling today?"}</h3><div class="mood" role="group" aria-label="Pick how you feel today">${MOODS.map((m) => `<button type="button" data-a="mood" data-v="${m[0]}" class="${cur == m[0] ? "on" : ""}" aria-pressed="${cur == m[0]}"><span>${m[1]}</span>${m[2]}</button>`).join("")}</div>${cur ? `<p class="m" style="margin:8px 0 0">${MOOD_REPLY[cur]}</p>` : ""}${heavy ? '<p class="m" style="margin:8px 0 0"><b>It has been a few heavy days.</b> It may help to talk to your doctor or someone you trust. You do not have to carry it alone.</p>' : ""}<div class="moodwk np" aria-label="Your last 7 days">${strip.join("")}</div></div>`;
}
// typing indicator before each answer, like talking to a person
function chatSend(q) {
  state.chat.push({ r: "u", t: q });
  state.chat = state.chat.slice(-30);
  saveState();
  renderApp();
  const c = qs("#chat");
  if (c) {
    c.insertAdjacentHTML("beforeend", '<div class="msg typing" aria-label="MediFile AI is typing"><i></i><i></i><i></i></div>');
    c.scrollTop = c.scrollHeight;
  }
  setTimeout(() => {
    const t = assistantReply(q);
    state.chat.push({ r: "a", t, f: lastFollow.slice() });
    state.chat = state.chat.slice(-30);
    saveState();
    if (state.tab == "ai") renderApp();
  }, Math.min(1500, 600 + q.length * 14));
}
// kinder answers when someone sounds worried or low
const SOS_WORDS = /suicid|kill myself|end my life|end it all|(don'?t|do not|dont) want to (live|be here|go on)|want to die|wish i (was|were) dead|better off dead|hurt myself|self.?harm|no reason to live/;
const FEEL_WORDS = /\b(worried|worry|scared|afraid|frightened|anxious|anxiety|nervous|stress(ed)?|sad|lonely|upset|overwhelmed|hopeless|crying|can'?t sleep|cannot sleep|exhausted|in pain)\b/;
const KIND_OPENERS = [
  "I am sorry you are dealing with this. 💛 ",
  "That sounds hard, and it is okay to feel that way. 💛 ",
  "Thank you for telling me. You are not alone in this. 💛 ",
];
const baseReply2 = assistantReply;
assistantReply = (q) => {
  const s = q.toLowerCase();
  if (SOS_WORDS.test(s))
    return "I am really glad you told me, and I am taking it seriously. 💛 You deserve support right now.\n\nPlease reach out to someone you trust and stay with them. You can also call **Tele-MANAS on 14416** (free, day and night, India). If you are in danger right now, call **112** straight away.\n\nI am here to listen too, but a real person can help you best at a moment like this.";
  const r = baseReply2(q);
  if (FEEL_WORDS.test(s) && !/^\uD83D\uDEA8/.test(r)) return KIND_OPENERS[q.length % KIND_OPENERS.length] + r;
  return r;
};
document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-a]");
  if (!b) return;
  if (b.dataset.a == "mood") {
    const v = +b.dataset.v, t = toDateKey(new Date());
    state.moods[t] = v;
    saveState();
    renderApp();
  } else if (b.dataset.a == "takedue") celebrate();
});
document.addEventListener("change", (e) => {
  if (e.target.dataset && e.target.dataset.dose && e.target.checked) celebrate();
});
