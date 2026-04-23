let history = [];
let userName = localStorage.getItem('user_name');

if (!userName) {
    userName = prompt("Sana ne dememi istersin?") || "Dostum";
    localStorage.setItem('user_name', userName);
}
document.getElementById('greet').innerText = `Merhaba ${userName}`;

// Marked yapılandırması: kod bloklarını highlight.js ile vurgula
marked.setOptions({
    breaks: true,
    gfm: true,
    highlight: function (code, lang) {
        try {
            if (lang && hljs.getLanguage(lang)) {
                return hljs.highlight(code, { language: lang }).value;
            }
            return hljs.highlightAuto(code).value;
        } catch (e) { return code; }
    }
});

function renderMarkdown(text) {
    const rawHtml = marked.parse(text || "");
    const safe = DOMPurify.sanitize(rawHtml);
    // Kod bloklarını "Kopyala" butonlu kapsayıcıya sar
    const wrapper = document.createElement('div');
    wrapper.innerHTML = safe;
    wrapper.querySelectorAll('pre').forEach(pre => {
        const codeEl = pre.querySelector('code');
        if (!codeEl) return;
        const langClass = [...codeEl.classList].find(c => c.startsWith('language-'));
        const lang = langClass ? langClass.replace('language-', '') : 'kod';
        const wrap = document.createElement('div');
        wrap.className = 'code-wrap';
        wrap.innerHTML = `
            <div class="code-head">
                <span>${lang}</span>
                <button class="copy-btn" type="button">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    <span>Kopyala</span>
                </button>
            </div>
        `;
        pre.parentNode.insertBefore(wrap, pre);
        wrap.appendChild(pre);
        const btn = wrap.querySelector('.copy-btn');
        btn.addEventListener('click', async () => {
            const text = codeEl.innerText;
            const result = await copyToClipboard(text);
            const label = btn.querySelector('span');
            if (result === true) {
                btn.classList.add('copied');
                label.textContent = 'Kopyalandı!';
            } else if (result === 'manual') {
                label.textContent = 'Manuel kopyala';
            } else {
                label.textContent = 'Kopyalanamadı';
            }
            setTimeout(() => {
                btn.classList.remove('copied');
                label.textContent = 'Kopyala';
            }, 1800);
        });
    });
    return wrapper.innerHTML;
}

const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
              (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// 1) Modern Clipboard API → 2) execCommand fallback → 3) iOS Range/Selection yöntemi
async function copyToClipboard(text) {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return true;
        }
    } catch (e) { /* sıradaki yönteme geç */ }

    // iOS için contenteditable + Range yöntemi (textarea.select iOS'ta çalışmaz)
    try {
        const el = document.createElement('div');
        el.contentEditable = 'true';
        el.textContent = text;
        el.style.position = 'fixed';
        el.style.top = '0';
        el.style.left = '0';
        el.style.opacity = '0';
        el.style.userSelect = 'text';
        el.style.webkitUserSelect = 'text';
        document.body.appendChild(el);

        const range = document.createRange();
        range.selectNodeContents(el);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
        el.setSelectionRange && el.setSelectionRange(0, text.length);

        const ok = document.execCommand('copy');
        sel.removeAllRanges();
        document.body.removeChild(el);
        if (ok) return true;
    } catch (e) { /* manuel pencereye düş */ }

    // Son çare: Kodun seçili olduğu bir pencere aç → kullanıcı uzun basıp Kopyala'ya basar
    showManualCopyModal(text);
    return 'manual';
}

function showManualCopyModal(text) {
    const old = document.getElementById('manualCopyModal');
    if (old) old.remove();

    const overlay = document.createElement('div');
    overlay.id = 'manualCopyModal';
    overlay.style.cssText = `
        position: fixed; inset: 0; background: rgba(0,0,0,0.75);
        display: flex; align-items: center; justify-content: center;
        z-index: 9999; padding: 20px;
    `;
    overlay.innerHTML = `
        <div style="background:#1e1f20; border-radius:14px; max-width:600px; width:100%; max-height:80vh; display:flex; flex-direction:column; overflow:hidden; border:1px solid #37393b;">
            <div style="padding:14px 18px; display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #37393b;">
                <strong style="color:#e3e3e3;">Kodu kopyala</strong>
                <button id="manualCopyClose" style="background:transparent; border:none; color:#aaa; font-size:22px; cursor:pointer;">×</button>
            </div>
            <p style="margin:0; padding:10px 18px; color:#9b72f7; font-size:13px;">Tarayıcı izin vermediği için otomatik kopyalanamadı. Aşağıdaki metin seçili — uzun basıp <strong>Kopyala</strong>'ya dokunabilirsin.</p>
            <textarea id="manualCopyArea" readonly style="flex:1; margin:0 18px 18px; padding:12px; background:#0d0d0e; color:#e3e3e3; border:1px solid #37393b; border-radius:8px; font-family:'Fira Code',Consolas,monospace; font-size:13px; min-height:200px; resize:none; outline:none;"></textarea>
        </div>
    `;
    document.body.appendChild(overlay);
    const ta = document.getElementById('manualCopyArea');
    ta.value = text;
    setTimeout(() => {
        ta.focus();
        ta.setSelectionRange(0, text.length);
    }, 50);

    const close = () => overlay.remove();
    document.getElementById('manualCopyClose').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
}

function showThinking() {
    const box = document.getElementById('chatBox');
    const div = document.createElement('div');
    div.id = 'thinkingIndicator';
    div.className = 'bot-msg w-full';
    div.innerHTML = `
        <div class="thinking-wrap">
            <div class="gemini-loader"></div>
            <span class="thinking-text">Düşünüyor...</span>
        </div>
    `;
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
}

function hideThinking() {
    const t = document.getElementById('thinkingIndicator');
    if (t) t.remove();
}

async function send() {
    const input = document.getElementById('userInput');
    const msg = input.value.trim();
    if (!msg) return;

    document.getElementById('welcome').classList.add('hidden');
    addMessage('user', msg);
    input.value = '';
    autoResize(input);

    showThinking();

    try {
        const res = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: msg, history: history })
        });
        const data = await res.json();

        hideThinking();

        if (data.reply) {
            await typeEffect(data.reply);
            history.push({ role: "user", content: msg }, { role: "assistant", content: data.reply });
        } else {
            addMessage('bot', data.error || "Boş cevap geldi.");
        }
    } catch (e) {
        hideThinking();
        addMessage('bot', "Bir hata oluştu, lütfen internetini kontrol et.");
    }
}

function addMessage(role, text) {
    const box = document.getElementById('chatBox');
    const div = document.createElement('div');
    if (role === 'user') {
        div.className = 'user-msg self-end max-w-[80%]';
        div.textContent = text;
    } else {
        div.className = 'bot-msg w-full';
        div.innerHTML = `<div class="flex gap-4"><span>🐋</span><div class="md flex-1">${renderMarkdown(text)}</div></div>`;
    }
    box.appendChild(div);
    box.scrollTop = box.scrollHeight;
}

async function typeEffect(text) {
    const box = document.getElementById('chatBox');
    const div = document.createElement('div');
    div.className = 'bot-msg w-full py-2 flex gap-4';
    div.innerHTML = `<span>🐋</span><div class="md flex-1"></div>`;
    box.appendChild(div);
    const target = div.querySelector('.md');

    // Kelime kelime yazıyoruz; her adımda metni Markdown olarak render ediyoruz.
    const tokens = text.match(/\s+|\S+/g) || [];
    let buffer = '';
    for (let i = 0; i < tokens.length; i++) {
        buffer += tokens[i];
        // Tüm kod bloğu (\`\`\`) tamamlanmadan render etmek görüntü atlamasına yol açabilir;
        // basit ve sağlam çözüm: her token sonrası yeniden render et.
        target.innerHTML = renderMarkdown(buffer);
        box.scrollTop = box.scrollHeight;
        if (/\S/.test(tokens[i])) await new Promise(r => setTimeout(r, 25));
    }
}

function resetChat() {
    if (confirm("Tüm sohbet geçmişi ve kayıtlı bilgiler silinsin mi?")) {
        try { localStorage.clear(); sessionStorage.clear(); } catch (e) {}
        history = [];
        location.reload();
    }
}

// Textarea otomatik yükseklik
function autoResize(el) {
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 200) + 'px';
}

const inputEl = document.getElementById('userInput');
inputEl.addEventListener('input', () => autoResize(inputEl));
inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        send();
    }
    // Shift+Enter doğal davranışı: yeni satır ekler
});
