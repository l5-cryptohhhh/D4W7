// ============================================================
// AUTH — json-server locale (slide S7/L4)
// Login = GET /users?email=...&password=...
// Se array vuoto → credenziali errate
// Token simulato = btoa(email) salvato in localStorage
// ============================================================

const JSON_SERVER = 'http://localhost:3000';

function getToken() {
  return localStorage.getItem('auth.token');
}

function salvaAuth(utente) {
  // token simulato: in json-server non c'è JWT reale, usiamo btoa come da slide
  const token = btoa(utente.email);
  localStorage.setItem('auth.token', token);
  localStorage.setItem('auth.user', JSON.stringify(utente));
}

function rimuoviAuth() {
  localStorage.removeItem('auth.token');
  localStorage.removeItem('auth.user');
}

function getUtente() {
  const raw = localStorage.getItem('auth.user');
  if (!raw) return null;
  try { return JSON.parse(raw); } catch { return null; }
}

// Slide 29: login = GET /users?email=...&password=...
// lunghezza array 0 → credenziali errate, altrimenti utente[0]
async function login(email, password) {
  const url = `${JSON_SERVER}/users?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error('Errore server (' + r.status + ')');
  const utenti = await r.json();
  if (utenti.length === 0) throw new Error('Credenziali non valide');
  return utenti[0];
}

// Verifica sessione: il token esiste e corrisponde a un utente in localStorage
function verificaToken() {
  const token = getToken();
  const utente = getUtente();
  if (!token || !utente) return false;
  // controllo coerenza token (btoa dell'email)
  try { return btoa(utente.email) === token; }
  catch { return false; }
}

function logout() {
  rimuoviAuth();
  aggiornaMostraHeader(false);
  nascondiProfilo();
  document.getElementById('btn-esporta').style.display = 'none';
  libri = caricaLibri();
  renderLibri();
  renderRisultati(ultimiRisultati);
}

// ============================================================
// CLASSI
// ============================================================
class Libro {
  constructor(titolo, autore, anno) {
    this.titolo  = titolo;
    this.autore  = autore;
    this.anno    = anno;
    this.letto   = false;
    this.formato = 'cartaceo';
    this.id      = Date.now() + '-' + Math.floor(Math.random() * 10000);
  }
  segnaComeLetto() { this.letto = true; }
}

class LibroDigitale extends Libro {
  constructor(titolo, autore, anno, dimensioneMb) {
    super(titolo, autore, anno);
    this.formato      = 'digitale';
    this.dimensioneMb = dimensioneMb || (Math.random() * 10 + 0.5).toFixed(1);
  }
}

// ============================================================
// STORAGE — chiave per utente
// ============================================================
const QUERY_KEY = 'ultimaQuery';

function storageKey() {
  const u = getUtente();
  return u ? `libri:${u.email}` : 'libri:guest';
}

function salvaLibri() {
  try {
    localStorage.setItem(storageKey(), JSON.stringify(libri));
  } catch (e) {
    console.error('localStorage non disponibile:', e);
  }
}

function caricaLibri() {
  let raw;
  try { raw = localStorage.getItem(storageKey()); }
  catch { return []; }
  if (!raw) return [];

  return JSON.parse(raw).map(d => {
    let l;
    if (d.dimensioneMb !== undefined) {
      l = new LibroDigitale(d.titolo, d.autore, d.anno, d.dimensioneMb);
    } else {
      l = new Libro(d.titolo, d.autore, d.anno);
    }
    l.id    = d.id;
    l.letto = d.letto;
    return l;
  });
}

// ============================================================
// STATO
// ============================================================
let libri           = caricaLibri();
let ultimiRisultati = [];

// ============================================================
// HEADER — switch login / utente
// ============================================================
function aggiornaMostraHeader(loggato) {
  const headerLogin  = document.getElementById('header-login');
  const headerUtente = document.getElementById('header-utente');

  if (loggato) {
    headerLogin.style.display  = 'none';
    headerUtente.style.display = 'flex';
    const u = getUtente();
    const nome = u ? (u.firstName || u.username || u.email) : '';
    document.getElementById('benvenuto-utente').replaceChildren(
      document.createTextNode(`Ciao ${nome}`)
    );
  } else {
    headerLogin.style.display  = 'flex';
    headerUtente.style.display = 'none';
  }
}

// ============================================================
// PROFILO
// ============================================================
function mostraProfilo(utente) {
  const sezione = document.getElementById('sezione-profilo');
  sezione.style.display = 'block';

  const avatarEl = document.getElementById('profilo-avatar');
  avatarEl.replaceChildren();
  if (utente.image) {
    const img = document.createElement('img');
    img.src = utente.image;
    img.alt = utente.firstName || '';
    avatarEl.append(img);
  }

  document.getElementById('profilo-nome').replaceChildren(
    document.createTextNode(
      `${utente.firstName || ''} ${utente.lastName || ''}`.trim() || utente.email
    )
  );

  document.getElementById('profilo-meta').replaceChildren(
    document.createTextNode(
      `${utente.username ? '@' + utente.username + ' — ' : ''}${utente.email}`
    )
  );
}

function nascondiProfilo() {
  document.getElementById('sezione-profilo').style.display = 'none';
}

// ============================================================
// LIBRERIA — RENDER
// ============================================================
function renderLibri() {
  document.getElementById('titolo-lista').replaceChildren(
    document.createTextNode(`I tuoi libri (${libri.length})`)
  );
  const listaUl = document.getElementById('lista-libri');
  listaUl.replaceChildren();

  if (libri.length === 0) {
    const li = document.createElement('li');
    li.className = 'lista-vuota';
    li.append(document.createTextNode('Nessun libro nella tua libreria.'));
    listaUl.append(li);
    return;
  }

  libri.forEach(libro => {
    const badgeLabel = libro.formato === 'digitale'
      ? `digitale (${libro.dimensioneMb} MB)` : 'cartaceo';

    const li = document.createElement('li');
    li.className = libro.letto ? 'libro-item letto' : 'libro-item';
    li.dataset.id = libro.id;

    const divInfo = document.createElement('div');
    divInfo.className = 'libro-info';

    const spanTitolo = document.createElement('span');
    spanTitolo.className = 'libro-titolo';
    spanTitolo.append(document.createTextNode(libro.titolo));

    const spanBadge = document.createElement('span');
    spanBadge.className = 'badge';
    spanBadge.append(document.createTextNode(badgeLabel));

    const divDettagli = document.createElement('div');
    divDettagli.className = 'libro-dettagli';
    divDettagli.append(document.createTextNode(`${libro.autore} — ${libro.anno}`));

    divInfo.append(spanTitolo, spanBadge, divDettagli);

    const divAzioni = document.createElement('div');
    divAzioni.className = 'libro-azioni';

    if (libro.letto) {
      const spanLetto = document.createElement('span');
      spanLetto.className = 'letto-label';
      spanLetto.append(document.createTextNode('✓ letto'));
      divAzioni.append(spanLetto);
    } else {
      const btnLetto = document.createElement('button');
      btnLetto.className = 'btn-letto';
      btnLetto.dataset.azione = 'leggi';
      btnLetto.dataset.id = libro.id;
      btnLetto.append(document.createTextNode('Segna come letto'));
      divAzioni.append(btnLetto);
    }

    const btnRimuovi = document.createElement('button');
    btnRimuovi.className = 'btn-rimuovi';
    btnRimuovi.dataset.azione = 'rimuovi';
    btnRimuovi.dataset.id = libro.id;
    btnRimuovi.append(document.createTextNode('Rimuovi'));
    divAzioni.append(btnRimuovi);

    li.append(divInfo, divAzioni);
    listaUl.append(li);
  });
}

// ============================================================
// RICERCA — STATI UI
// ============================================================
function mostraSpinner() {
  const statoEl     = document.getElementById('stato-ricerca');
  const risultatiUl = document.getElementById('risultati');
  statoEl.replaceChildren();
  const wrap = document.createElement('div');
  wrap.className = 'spinner-wrap';
  const sp = document.createElement('div');
  sp.className = 'spinner';
  wrap.append(sp, document.createTextNode('Carico…'));
  statoEl.append(wrap);
  risultatiUl.replaceChildren();
}

function mostraErroreRicerca(messaggio) {
  const statoEl     = document.getElementById('stato-ricerca');
  const risultatiUl = document.getElementById('risultati');
  statoEl.replaceChildren();
  const div = document.createElement('div');
  div.className = 'alert-errore';
  div.append(document.createTextNode(messaggio));
  statoEl.append(div);
  risultatiUl.replaceChildren();
}

function pulisciStato() {
  document.getElementById('stato-ricerca').replaceChildren();
}

// ============================================================
// RICERCA — LOGICA (invariata)
// ============================================================
function cerca(query) {
  const q = query.trim();
  localStorage.setItem(QUERY_KEY, q);
  mostraSpinner();

  let fetchPromise;

  if (q === '') {
    fetchPromise = fetch('https://openlibrary.org/trending/daily.json')
      .then(res => {
        if (!res.ok) return Promise.reject(new Error('HTTP ' + res.status));
        return res.json();
      })
      .then(data => data.works || []);
  } else {
    const url = 'https://openlibrary.org/search.json?q=' +
                encodeURIComponent(q) + '&limit=12';
    fetchPromise = fetch(url)
      .then(res => {
        if (!res.ok) return Promise.reject(new Error('HTTP ' + res.status));
        return res.json();
      })
      .then(data => data.docs || []);
  }

  return fetchPromise
    .then(docs => { pulisciStato(); renderRisultati(docs); })
    .catch(err  => { mostraErroreRicerca('Errore nel caricamento. (' + err.message + ')'); });
}

function renderRisultati(docs) {
  ultimiRisultati = docs;
  const risultatiUl = document.getElementById('risultati');
  risultatiUl.replaceChildren();

  const validi = docs.filter(d => d.author_name);

  if (validi.length === 0) {
    const li = document.createElement('li');
    li.className = 'lista-vuota';
    li.append(document.createTextNode('Nessun risultato.'));
    risultatiUl.append(li);
    return;
  }

  validi.slice(0, 12).forEach(d => {
    const titolo = d.title || 'Senza titolo';
    const autore = d.author_name[0];
    const anno   = d.first_publish_year ?? '—';

    const giaInLibreria = libri.some(l =>
      l.titolo.toLowerCase() === titolo.toLowerCase() &&
      l.autore.toLowerCase() === autore.toLowerCase()
    );

    const li = document.createElement('li');
    li.className = 'risultato-item';

    const info = document.createElement('div');
    info.className = 'ris-info';

    const t = document.createElement('div');
    t.className = 'ris-titolo';
    t.append(document.createTextNode(titolo));

    const dett = document.createElement('div');
    dett.className = 'ris-dettagli';
    dett.append(document.createTextNode(`${autore} — ${anno}`));

    info.append(t, dett);

    const azioni = document.createElement('div');
    azioni.className = 'ris-azioni';

    const btnDett = document.createElement('button');
    btnDett.className = 'btn-dettagli';
    btnDett.append(document.createTextNode('Dettagli'));
    btnDett.addEventListener('click', () => mostraDettagli(d.key));

    const btnAdd = document.createElement('button');
    btnAdd.className = giaInLibreria ? 'btn-add aggiunto' : 'btn-add';
    btnAdd.disabled  = giaInLibreria;
    btnAdd.append(document.createTextNode(giaInLibreria ? '✓ Aggiunto' : 'Aggiungi'));
    if (!giaInLibreria) {
      btnAdd.addEventListener('click', () => {
        aggiungiDaRicerca(titolo, autore, anno);
        renderRisultati(ultimiRisultati);
      });
    }

    azioni.append(btnDett, btnAdd);
    li.append(info, azioni);
    risultatiUl.append(li);
  });
}

function aggiungiDaRicerca(titolo, autore, anno) {
  const nuovo = new Libro(titolo, autore, anno);
  libri.push(nuovo);
  salvaLibri();
  renderLibri();
}

function mostraDettagli(key) {
  if (!key) { alert('nessuna descrizione'); return; }
  return fetch('https://openlibrary.org' + key + '.json')
    .then(res => {
      if (!res.ok) return Promise.reject(new Error('HTTP ' + res.status));
      return res.json();
    })
    .then(data => {
      let desc = data.description;
      if (desc && typeof desc === 'object') desc = desc.value;
      alert(desc || 'nessuna descrizione');
    })
    .catch(() => alert('Errore nel recupero dei dettagli.'));
}

// ============================================================
// UTILITY
// ============================================================
function debounce(fn, ms) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}

// ============================================================
// EVENTI
// ============================================================

// Login — click su Accedi
document.getElementById('btn-login').addEventListener('click', async () => {
  const btn      = document.getElementById('btn-login');
  const errEl    = document.getElementById('login-errore');
  const email    = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;

  errEl.replaceChildren();

  if (!email || !password) {
    errEl.replaceChildren(document.createTextNode('Inserisci email e password.'));
    return;
  }

  btn.disabled = true;
  btn.replaceChildren(document.createTextNode('…'));

  const utente = await login(email, password).catch(err => {
    errEl.replaceChildren(document.createTextNode(err.message));
    return null;
  });

  btn.disabled = false;
  btn.replaceChildren(document.createTextNode('Accedi'));

  if (!utente) return;

  salvaAuth(utente);
  libri = caricaLibri();
  aggiornaMostraHeader(true);
  mostraProfilo(utente);
  document.getElementById('btn-esporta').style.display = 'inline-block';
  renderLibri();
  renderRisultati(ultimiRisultati);
});

// Enter nei campi login
['login-username', 'login-password'].forEach(id => {
  document.getElementById(id).addEventListener('keydown', e => {
    if (e.key === 'Enter') document.getElementById('btn-login').click();
  });
});

// Logout
document.getElementById('btn-logout').addEventListener('click', logout);

// Lista libri — event delegation
document.getElementById('lista-libri').addEventListener('click', e => {
  const bottone = e.target.closest('[data-azione]');
  if (!bottone) return;
  const { azione, id } = bottone.dataset;

  if (azione === 'leggi') {
    const libro = libri.find(l => l.id === id);
    if (libro) libro.segnaComeLetto();
  }
  if (azione === 'rimuovi') {
    libri = libri.filter(l => l.id !== id);
  }

  salvaLibri();
  renderLibri();
  renderRisultati(ultimiRisultati);
});

// Esporta JSON
document.getElementById('btn-esporta').addEventListener('click', () => {
  const json = JSON.stringify(libri, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = 'libri.json';
  a.click();
  URL.revokeObjectURL(url);
});

// Svuota tutto
document.getElementById('svuota-tutto').addEventListener('click', () => {
  if (!confirm('Sei sicuro? Verranno eliminati tutti i libri.')) return;
  libri = [];
  localStorage.removeItem(storageKey());
  renderLibri();
  renderRisultati(ultimiRisultati);
});

// Input ricerca
const cercaDebounced = debounce(cerca, 400);
document.getElementById('cerca').addEventListener('input', e => {
  cercaDebounced(e.target.value);
});

// ============================================================
// AVVIO
// ============================================================
(function avvia() {
  const sessioneValida = verificaToken();

  if (sessioneValida) {
    const utente = getUtente();
    libri = caricaLibri();
    aggiornaMostraHeader(true);
    mostraProfilo(utente);
    document.getElementById('btn-esporta').style.display = 'inline-block';
  } else {
    aggiornaMostraHeader(false);
  }

  renderLibri();

  const querySalvata = localStorage.getItem(QUERY_KEY);
  if (querySalvata) document.getElementById('cerca').value = querySalvata;
  cerca(document.getElementById('cerca').value);
})();