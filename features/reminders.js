// Dose and appointment reminders (runs every 20 seconds).

const firedAlerts = new Set();
// Runs every 20 seconds to fire dose and appointment reminders while the page is open.
function reminderTick() {
  const n = new Date(),
    hm = pad2(n.getHours()) + ":" + pad2(n.getMinutes()),
    day = toDateKey(n);
  const alert = (id, m, act) => {
    if (firedAlerts.has(id)) return;
    firedAlerts.add(id);
    showToast(m, act);
    try {
      if (Notification.permission == "granted")
        new Notification("MediFile AI", { body: m });
    } catch (_) {}
  };
  allDoses().forEach((x) => {
    if (x.tm == hm && !isDoseTaken(x.key))
      alert(day + x.key, `${((currentUser() && currentUser().name) || "").split(" ")[0] || "Hi"}, it is time for your ${x.m.name} ${x.m.dose} 💊`, {
        label: "Mark taken",
        fn: () => {
          if (isDoseTaken(x.key)) return;
          (state.log[day] = state.log[day] || {})[x.key] = true;
          adjustStock(x.key, -1);
          saveState();
          renderApp();
        },
      });
  });
  state.appts.forEach((a) => {
    const ms = new Date(a.dt) - n;
    if (ms > 0 && ms < 864e5)
      alert("a" + a.id, `Reminder: you are seeing ${a.doc} on ${formatDate(a.dt)}`);
  });
}
/* ===== Record intelligence, health profile, ABDM/ABHA ===== */
