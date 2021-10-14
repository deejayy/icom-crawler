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

Majd talán lesz felhasználóbarátabb megoldás is, most nekem így elég, de bátran jöhetnek a PR-ok.

Futtatás közben végiglépked az ingatlan.com találati listáján és az oldalakon is, direkt nincs párhuzamosítva, hogy ne tiltson le az automatika (néha azért így is). Minden letölt, azaz ha van ötvenezer találat a beállított linken, akkor meg nem áll, míg nem végez. Ezért érdemes egy korrektül beállított keresőlinket adni neki. A fenti példa úgy 850 ingatlant fog végignézni (as of now).

Ha végzett, akkor a cache könyvtárba helyezi a letöltött html-eket, szóval nem fogja állandóan az ingatlan.com-ot terhelni.  

Valamint három eredményfájl keletkezik:
- seen.json: hirdetésazonosítók, "látott", azaz már letöltött hirdetések, hogy többször ne vegye őket számításba
- result.json: adatok json-ban
- result.csv: adatok CSV-ben, excellel szépen kezelhető, szűrhető, stb.

# Varázslat

Van benne egy súlyozott értékelő logika, személyre van szabva, de hangolható, `weights.mjs`-ben vannak a definíciók. Röviden: ezekkel a számokkal tudod a számolt "jóságát" egy ingatlannak beállítani. Ezen kívül van a kódban is egy score számoló.
