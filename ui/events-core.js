// Click / change / input / submit handlers for the core tabs.

document.addEventListener("click", (e) => {
  const b = e.target.closest("[data-a]");
  if (!b) return;
  const a = b.dataset.a;
  if (a == "tab") {
    qs("#main").classList.add("enter");
    setTimeout(() => qs("#main").classList.remove("enter"), 700);
    state.tab = b.dataset.t;
    saveState();
    renderApp();
    qs("#main").scrollTo(0, 0);
    window.scrollTo(0, 0);
  } else if (a == "del") {
    const c = b.dataset.c, prev = state[c].slice();
    state[c] = prev.filter((x) => x.id != b.dataset.i);
    saveState();
    renderApp();
    showToast("Removed", { label: "Undo", fn: () => { state[c] = prev; saveState(); renderApp(); } });
  } else if (a == "home") {
    if (!currentUser()) return;
    state.tab = TAB_ORDER[0];
    saveState();
    renderApp();
    qs("#main").scrollTo(0, 0);
    window.scrollTo(0, 0);
  } else if (a == "takedue") {
    const d = toDateKey(new Date());
    state.log[d] = state.log[d] || {};
    const n = dueDoses();
    n.forEach((x) => {
      state.log[d][x.key] = true;
      adjustStock(x.key, -1);
    });
    saveState();
    renderApp();
    showToast(n.length + " dose" + (n.length > 1 ? "s" : "") + " marked as taken");
  } else if (a == "rfilter") {
    const i = qs("input[data-q]");
    if (i) {
      i.value = b.dataset.v;
      i.dispatchEvent(new Event("input", { bubbles: true }));
    }
  } else if (a == "clearchat") {
    const prev = state.chat.slice();
    state.chat = [];
    saveState();
    renderApp();
    showToast("Chat cleared", { label: "Undo", fn: () => { state.chat = prev; saveState(); renderApp(); } });
  } else if (a == "ask") {
    chatSend(b.dataset.q);
  } else if (a == "prep") {
    qs("#dp").textContent = visitPrepText(state.appts.find((x) => x.id == b.dataset.i));
    qs("#dlg").showModal();
  } else if (a == "copy") {
    navigator.clipboard.writeText(qs("#dp").textContent).then(
      () => showToast("Copied!"),
      () => showToast("Could not copy. Please select the text and copy it yourself."),
    );
  } else if (a == "close") qs("#dlg").close();
  else if (a == "print") window.print();
  else if (a == "notif") {
    if (!("Notification" in window))
      return showToast("This browser does not support notifications.");
    Notification.requestPermission().then((r) => showToast("Notifications: " + r));
  } else if (a == "export") {
    const l = document.createElement("a");
    l.href = URL.createObjectURL(
      new Blob([JSON.stringify(state)], { type: "application/json" }),
    );
    l.download = "medifile-ai-backup.json";
    l.click();
  } else if (a == "wipe") {
    if (confirm("Erase everything saved in this browser? This cannot be undone.")) {
      localStorage.removeItem(STORAGE_KEY);
      location.reload();
    }
  }
});
document.addEventListener("change", (e) => {
  const x = e.target;
  if (x.dataset.dose) {
    const d = toDateKey(new Date());
    (state.log[d] = state.log[d] || {})[x.dataset.dose] = x.checked;
    adjustStock(x.dataset.dose, x.checked ? -1 : 1);
    saveState();
    renderApp();
  } else if (x.id == "lang") {
    state.lang = x.value;
    saveState();
    renderApp();
  } else if ("imp" in x.dataset) {
    const f = x.files[0];
    if (!f) return;
    f.text().then((j) => {
      try {
        state = Object.assign(state, JSON.parse(j));
        saveState();
        renderApp();
        showToast("Backup restored");
      } catch (_) {
        showToast("That does not look like a valid backup file.");
      }
    });
  }
});
document.addEventListener("input", (e) => {
  if ("q" in e.target.dataset) {
    const v = e.target.value.toLowerCase();
    document
      .querySelectorAll("[data-s]")
      .forEach((r) => (r.style.display = r.dataset.s.includes(v) ? "" : "none"));
  }
});
document.addEventListener("submit", (e) => {
  e.preventDefault();
  const f = e.target,
    k = f.dataset.f,
    d = Object.fromEntries(new FormData(f)),
    done = () => {
      saveState();
      renderApp();
      const ok = { med: "Added 💊 I will remind you when it is time.", lab: "Saved 🧪 Thanks for keeping track.", app: "Visit saved 📅 I can help you get ready for it.", sym: "Noted 💛 Thank you for telling me.", rec: "Safely stored 🗂️" }[k];
      if (ok) showToast(ok);
    };
  if (k == "chat") {
    return chatSend(d.q);
  }
  if (k == "med") {
    const tm = (d.times.match(/\d{1,2}:\d{2}/g) || []).map((x) => {
      const [h, m] = x.split(":");
      return pad2(h) + ":" + m;
    });
    if (!tm.length) return showToast("Please enter times like 08:00, 20:00");
    state.meds.push({ id: newId(), name: d.name, dose: d.dose, note: d.note, times: tm, stock: d.stock === "" || d.stock == null ? null : +d.stock });
    return done();
  }
  if (k == "lab") {
    state.labs.push({ id: newId(), k: d.k, v: +d.v, d: d.d });
    return done();
  }
  if (k == "app") {
    state.appts.push({ id: newId(), ...d });
    return done();
  }
  if (k == "sym") {
    state.syms.push({ id: newId(), ...d });
    return done();
  }
  if (k == "emg") {
    state.emg = d;
    showToast("Saved");
    return done();
  }
  if (k == "rec") {
    const fi = d.file,
      r = { id: newId(), title: d.title, type: d.type, d: d.d, doc: d.doc, n: d.n };
    if (fi && fi.size) {
      if (fi.size > 4e5)
        return showToast(
          "File is over 400 KB. Save the record without it or use a smaller file.",
        );
      const fr = new FileReader();
      fr.onload = () => {
        r.f = fr.result;
        r.fn = fi.name;
        state.recs.push(r);
        done();
      };
      fr.readAsDataURL(fi);
    } else {
      state.recs.push(r);
      done();
    }
  }
});
