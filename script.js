/* =========================================================
   STILLWILD — script.js
   Discord Webhook integration. No database needed.
   =========================================================

   НАСТРОЙКА:
   1. Discord → Настройки сервера → Интеграции → Вебхуки
   2. Создай отдельный вебхук для каждого канала
   3. Вставь URL ниже

   КАК РАБОТАЮТ КНОПКИ ПРИНЯТЬ/ОТКЛОНИТЬ:
   - При подаче заявки в Discord приходит эмбед с данными
   - В эмбеде две ссылки: "✅ Принять" и "❌ Отклонить"
   - Ссылки ведут на страницу action.html на вашем сайте
   - Там admin нажимает кнопку → в Discord уходит итог
   ========================================================= */

const CFG = {
    // Вебхук куда приходят заявки на вайтлист
    whitelistWebhook: 'https://discord.com/api/webhooks/1485673479108825200/u-4c3tWlytKwt5xBnPZmHKktNAWPINVlpgV9Hzoko1N6wuk8zCemni_qqxATG8nlVpkq',

    // Вебхук куда приходят заявки в администрацию
    adminWebhook: 'https://discord.com/api/webhooks/1485673691768426658/KzxrndykHeNUI4KU8IzCYj6gPzc5JrgKEc6rwmftCIZtcfcPw7V4GaUIhdxkv18mH-DL',

    // Вебхук куда приходит быстрое сообщение из раздела "Связь"
    contactWebhook: 'https://discord.com/api/webhooks/1485673870794162388/tFSkQrS4B_G2xvQRTTG_p82oigBMG1tANtLzLkrN-A6xcfta8IVnNeZLMPKIgUhaTXsH',

    // Вебхук куда приходит итог (принят / отклонён) после action.html
    // Можно использовать тот же канал что и для заявок
    resultWebhook: 'https://discord.com/api/webhooks/1486082871897882715/YlOqsT3G43-UUr8lQ1Tlx3nkeLFgCHMzXlxdroonJ7sUfRaF0bjM4yXiVtTzJU4UNnUL',

    // Секретный ключ для action.html — можно любое слово
    // Нужен чтобы чужие не могли открыть action.html и кликать
    actionSecret: 'sw2025secret',
};

/* =========================================================
   CANVAS — animated particle network
   ========================================================= */
(function initCanvas() {
    const canvas = document.getElementById('bg-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let W, H, pts = [];

    function resize() {
        W = canvas.width  = window.innerWidth;
        H = canvas.height = window.innerHeight;
        pts = [];
        const n = Math.min(Math.floor((W * H) / 20000), 80);
        for (let i = 0; i < n; i++) {
            pts.push({
                x: Math.random() * W, y: Math.random() * H,
                vx: (Math.random() - .5) * .22, vy: (Math.random() - .5) * .22,
                r: Math.random() * 1.2 + .4, a: Math.random() * .5 + .15,
            });
        }
    }

    function frame() {
        ctx.clearRect(0, 0, W, H);
        for (let i = 0; i < pts.length; i++) {
            for (let j = i + 1; j < pts.length; j++) {
                const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
                const d  = Math.sqrt(dx*dx + dy*dy);
                if (d < 120) {
                    ctx.beginPath();
                    ctx.strokeStyle = `rgba(0,255,176,${.07*(1-d/120)})`;
                    ctx.lineWidth = .5;
                    ctx.moveTo(pts[i].x, pts[i].y);
                    ctx.lineTo(pts[j].x, pts[j].y);
                    ctx.stroke();
                }
            }
            const p = pts[i];
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.r, 0, Math.PI*2);
            ctx.fillStyle = `rgba(0,255,176,${p.a})`;
            ctx.fill();
            p.x += p.vx; p.y += p.vy;
            if (p.x < 0) p.x = W; if (p.x > W) p.x = 0;
            if (p.y < 0) p.y = H; if (p.y > H) p.y = 0;
        }
        requestAnimationFrame(frame);
    }

    window.addEventListener('resize', resize);
    resize();
    frame();
})();

/* =========================================================
   NAVBAR scroll + mobile burger
   ========================================================= */
(function initNav() {
    const nav    = document.getElementById('nav');
    const burger = document.getElementById('burger');
    const mob    = document.getElementById('mob-menu');
    if (!nav) return;

    window.addEventListener('scroll', () => {
        nav.classList.toggle('scrolled', window.scrollY > 40);
    }, { passive: true });

    if (burger && mob) {
        burger.addEventListener('click', () => mob.classList.toggle('open'));
        mob.querySelectorAll('a').forEach(a => a.addEventListener('click', () => mob.classList.remove('open')));
    }
})();

/* =========================================================
   SCROLL REVEAL
   ========================================================= */
(function initReveal() {
    const obs = new IntersectionObserver(entries => {
        entries.forEach(e => {
            if (e.isIntersecting) { e.target.classList.add('on'); obs.unobserve(e.target); }
        });
    }, { threshold: .1 });
    document.querySelectorAll('.rv').forEach(el => obs.observe(el));
})();

/* =========================================================
   COPY IP
   ========================================================= */
function copyIP() {
    const ip = document.querySelector('.ip-val');
    if (!ip) return;
    navigator.clipboard.writeText(ip.textContent.trim())
        .then(() => showToast('✅ IP скопирован!'))
        .catch(() => showToast('Скопируйте вручную: ' + ip.textContent));
}

/* =========================================================
   TOAST
   ========================================================= */
function showToast(msg) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('show');
    clearTimeout(t._tid);
    t._tid = setTimeout(() => t.classList.remove('show'), 2800);
}

/* =========================================================
   HELPERS
   ========================================================= */
function isPlaceholder(url) {
    return !url || url.startsWith('ВСТАВЬ') || url.includes('YOUR_');
}

function uid() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

// Build action URL for Accept/Reject buttons in Discord
// Encodes relevant data into the URL so action.html works without DB
function makeActionUrl(action, payload) {
    const data = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
    const base = window.location.origin + window.location.pathname.replace(/[^/]*$/, '');
    return `${base}action.html?a=${action}&d=${data}&k=${CFG.actionSecret}`;
}

/* =========================================================
   FORM SUBMIT — universal handler
   ========================================================= */
async function submitForm(event, formType) {
    event.preventDefault();
    const form      = event.target;
    const btn       = form.querySelector('.btn-submit');
    const successEl = document.getElementById(formType + '-ok');
    if (!btn || !successEl) return;

    const data = Object.fromEntries(new FormData(form).entries());
    const origLabel = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Отправка...';

    try {
        const webhookUrl = formType === 'whitelist' ? CFG.whitelistWebhook
            : formType === 'admin'     ? CFG.adminWebhook
                :                            CFG.contactWebhook;

        if (isPlaceholder(webhookUrl)) {
            // DEMO режим — вебхук не настроен
            await new Promise(r => setTimeout(r, 900));
            console.log('[STILLWILD demo] form:', formType, data);
        } else {
            const payload = buildWebhookPayload(formType, data);
            const res = await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });
            if (!res.ok) throw new Error('HTTP ' + res.status);
        }

        form.style.display = 'none';
        successEl.classList.remove('hidden');
        showToast('📨 Заявка отправлена!');

    } catch (err) {
        console.error('Webhook error:', err);
        btn.disabled = false;
        btn.textContent = origLabel;
        showToast('❌ Ошибка отправки. Напиши нам в Discord!');
    }
}

/* =========================================================
   BUILD DISCORD WEBHOOK PAYLOAD
   Includes URL buttons for Accept / Reject
   ========================================================= */
function buildWebhookPayload(type, data) {
    const appId = uid();

    // Payload for action.html links
    const actionPayload = {
        id: appId,
        type,
        nick:    data.minecraft_nick || data.sender || '—',
        discord: data.discord || '—',
        age:     data.age || '—',
    };

    const acceptUrl = makeActionUrl('accept', actionPayload);
    const rejectUrl = makeActionUrl('reject', actionPayload);

    const colors = { whitelist: 0x00ffb0, admin: 0xffb347, contact: 0x00c8ff };

    const embeds = {
        whitelist: {
            title: '📋 Новая заявка на вайтлист',
            color: colors.whitelist,
            fields: [
                { name: '🎮 Ник',           value: data.minecraft_nick || '—', inline: true },
                { name: '💬 Discord',       value: data.discord        || '—', inline: true },
                { name: '🎂 Возраст',       value: data.age            || '—', inline: true },
                { name: '⏱️ Часов в MC',   value: data.hours          || '—', inline: true },
                { name: '📣 Откуда узнал',  value: data.source         || '—', inline: true },
                { name: '⚠️ Баны',          value: data.bans           || '—', inline: true },
                { name: '🎯 О себе',        value: (data.about || '—').slice(0,1024) },
                { name: '❓ Почему STILLWILD', value: (data.why || '—').slice(0,1024) },
                ...(data.extra ? [{ name: '📝 Доп. инфо', value: data.extra.slice(0,512) }] : []),
            ],
        },
        admin: {
            title: '🛡️ Заявка в администрацию',
            color: colors.admin,
            fields: [
                { name: '🎮 Ник',           value: data.minecraft_nick || '—', inline: true },
                { name: '💬 Discord',       value: data.discord        || '—', inline: true },
                { name: '🎂 Возраст',       value: data.age            || '—', inline: true },
                { name: '🏷️ Желаемая роль', value: data.role           || '—', inline: true },
                { name: '⏱️ Время/неделю',  value: data.time_per_week  || '—', inline: true },
                { name: '📋 Опыт',          value: (data.experience    || '—').slice(0,1024) },
                { name: '⭐ Почему я',       value: (data.why_you       || '—').slice(0,1024) },
                { name: '🧩 Ситуационный',  value: (data.situation     || '—').slice(0,1024) },
                ...(data.extra ? [{ name: '📝 Доп. инфо', value: data.extra.slice(0,512) }] : []),
            ],
        },
        contact: {
            title: '📨 Сообщение администрации',
            color: colors.contact,
            fields: [
                { name: '👤 Отправитель', value: data.sender  || '—', inline: true },
                { name: '📌 Тема',        value: data.topic   || '—', inline: true },
                { name: '💬 Сообщение',   value: (data.message || '—').slice(0,1024) },
            ],
        },
    };

    const embed = embeds[type] || embeds.contact;
    embed.footer = { text: 'STILLWILD · ' + new Date().toLocaleString('ru-RU') };

    // Для вайтлиста и заявок в адмнов — добавляем ссылки Принять/Отклонить
    // прямо в description, т.к. components (кнопки) работают только с ботами,
    // а не с обычными вебхуками. Markdown-ссылки Discord рендерит кликабельными.
    if (type === 'whitelist' || type === 'admin') {
        embed.description = [
            '> Нажми ссылку чтобы принять или отклонить заявку:',
            '',
            `✅  **[ПРИНЯТЬ ЗАЯВКУ](${acceptUrl})**`,
            `❌  **[ОТКЛОНИТЬ ЗАЯВКУ](${rejectUrl})**`,
        ].join('\n');
    }

    return { embeds: [embed] };
}

/* =========================================================
   SEND RESULT WEBHOOK (called from action.html)
   ========================================================= */
async function sendResultWebhook(action, payload, reason) {
    const isAccept = action === 'accept';
    const embed = {
        title: isAccept ? '✅ Заявка ПРИНЯТА' : '❌ Заявка ОТКЛОНЕНА',
        color: isAccept ? 0x00ffb0 : 0xff4757,
        fields: [
            { name: '🎮 Ник',     value: payload.nick    || '—', inline: true },
            { name: '💬 Discord', value: payload.discord || '—', inline: true },
            { name: '📋 Тип',     value: payload.type === 'whitelist' ? 'Вайтлист' : 'Администрация', inline: true },
            ...(!isAccept && reason ? [{ name: '📝 Причина отказа', value: reason }] : []),
        ],
        footer: { text: 'STILLWILD · ' + new Date().toLocaleString('ru-RU') },
    };

    if (isPlaceholder(CFG.resultWebhook)) {
        console.log('[STILLWILD demo] result:', action, payload, reason);
        return true;
    }

    const res = await fetch(CFG.resultWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [embed] }),
    });
    return res.ok;
}