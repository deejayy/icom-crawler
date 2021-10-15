# icom-crawler

ingatlan.com találatletöltő, értékelő és sorbarendező

# Futtasd így

```sh
npm install
node index.mjs
```

# Miez amúgy?

Beadsz neki egy ingatlan.com keresési linket és letölti az összes találat adatait, struktúrába rendezi és kirakja fájlba (csv és json).

Keresési linket így keresd a kódban:

```js
  const body = await download(
    "list",
    `https://ingatlan.com/lista/elado+haz+80-m2-felett+csak-kepes+pest-megye-buda-kornyeke+pest-megye-pest-kornyeke+budapest+pest-megye+budapest-pesti-oldal+budapest-budai-oldal+850-m2telek-alatt+csaladi-haz+konnyuszerkezetes-haz+3-szoba-felett+45-mFt-ig?page=${page}`,
  );
```

A számlálót (azaz, melyik találati oldalról kezdje a letöltést) se felejtsd el átírni:

```js
  let counter = 1;
```

Majd talán lesz felhasználóbarátabb megoldás is, most nekem így elég, de bátran jöhetnek a PR-ok.

Futtatás közben végiglépked az ingatlan.com találati listáján és az oldalakon is, direkt nincs párhuzamosítva, hogy ne tiltson le az automatika (néha azért így is). Minden letölt, azaz ha van ötvenezer találat a beállított linken, akkor meg nem áll, míg nem végez. Ezért érdemes egy korrektül beállított keresőlinket adni neki. A fenti példa úgy 850 ingatlant fog végignézni (as of now).

Ha végzett, akkor a cache könyvtárba helyezi a letöltött html-eket, szóval nem fogja állandóan az ingatlan.com-ot terhelni.  

Valamint három eredményfájl keletkezik:
- seen.json: hirdetésazonosítók, "látott", azaz már letöltött hirdetések, hogy többször ne vegye őket számításba
- result.json: adatok json-ban
- result.csv: adatok CSV-ben, excellel szépen kezelhető, szűrhető, stb.

Ilyen az adat:
```json
  {
    "score": 68.96666666666667,
    "id": "31755441",
    "url": "https://ingatlan.com/nagykoros-belvaros/elado+haz/csaladi-haz/31755441",
    "pic": "https://ot.ingatlancdn.com/b8/6a/31755441_202205176_m.jpg",
    "price": 15.9,
    "city": "Nagykőrös",
    "street": "Belváros",
    "area": 90,
    "plot": 632,
    "picCount": 10,
    "fullRooms": 3,
    "halfRooms": 0,
    "Ingatlan állapota": "nincs megadva",
    "Komfort": "nincs megadva",
    "Energiatanúsítvány": "nincs megadva",
    "Épület szintjei": "földszintes",
    "Fűtés": "vegyes tüzelésű kazán",
    "Légkondicionáló": "nincs",
    "Rezsiköltség": "nincs megadva",
    "Akadálymentesített": "nincs megadva",
    "Fürdő és WC": "külön helyiségben",
    "Kilátás": "nincs megadva",
    "Tetőtér": "nincs megadva",
    "Pince": "nincs",
    "Parkolás": "önálló garázs - benne van az árban"
  }
```

# Varázslat

Van benne egy súlyozott értékelő logika, személyre van szabva, de hangolható, `weights.mjs`-ben vannak a definíciók. Röviden: ezekkel a számokkal tudod a számolt "jóságát" egy ingatlannak beállítani. Ezen kívül van a kódban is egy score számoló.
