const express = require('express');
const Groq = require('groq-sdk');
const app = express();
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

app.use(express.json());
app.use(express.static('public'));

const SYSTEM_PROMPT = `Sen Beluga AI'sın. Her zaman akıcı, doğal ve temiz bir Türkçe ile cevap verirsin (asla başka bir dile geçme, düşünme adımlarını da paylaşma).
Karakterin: Genelde sıcak, samimi ve arkadaş canlısı bir tonun var; espriye açıksın. Ancak konu teknik, ciddi ya da kritik olduğunda (kod, hata ayıklama, güvenlik, sağlık, finans, önemli kararlar) tonunu profesyonel ve net bir uzmana çevirirsin.
Kod yazmada ustasın: Temiz, çalışan, açıklamalı kod üretirsin. Kodları her zaman uygun dilde markdown kod bloğu içinde verirsin (örn. \`\`\`js).
KRİTİK YAZIM KURALI: Kelimeleri asla birleştirme. Her kelimenin arasında ve her noktalama işaretinden sonra mutlaka boşluk bırak.`;

function cleanText(text) {
    if (!text) return "";
    let out = text;
    // 1) Noktalama (.,!?;:) sonrasında boşluk yoksa ekle (ama sayılar arasında değil: 3.14, 12:30)
    out = out.replace(/([.,!?;:])(?=[^\s\d\)\]\}"'`])/g, '$1 ');
    // 2) Kapanış parantezlerinden sonra boşluk
    out = out.replace(/([\)\]\}])(?=[A-Za-zÇĞİÖŞÜçğıöşü0-9])/g, '$1 ');
    // 3) küçük harf + Büyük harf birleşik kelimeleri ayır (ör: "merhabaDünya" -> "merhaba Dünya")
    out = out.replace(/([a-zçğıöşü])([A-ZÇĞİÖŞÜ])/g, '$1 $2');
    // 4) Birden fazla boşluğu tek boşluğa indir (satır sonlarını koru)
    out = out.replace(/[ \t]{2,}/g, ' ');
    return out;
}

app.post('/api/chat', async (req, res) => {
    try {
        const { message, history } = req.body;
        const completion = await groq.chat.completions.create({
            messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history, { role: "user", content: message }],
            model: "qwen/qwen3-32b",
            temperature: 0.6,
            reasoning_effort: "none"
        });

        let reply = completion.choices[0]?.message?.content || "";
        reply = cleanText(reply);

        res.json({ reply });
    } catch (error) {
        console.error("Hata:", error);
        res.status(500).json({ error: "Sunucu hatası oluştu." });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => console.log(`Beluga Limanı Hazır! Port: ${PORT}`));
