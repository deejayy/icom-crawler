import fetch from "node-fetch";
import fs from "fs";
import jsdom from "jsdom";
import cities from "./cities.mjs";
import cityScores from "./city-scores.mjs";

String.prototype.strip = function () {
  this.toLowerCase()
    .replace(/[^0-9a-z]/gi, " ")
    .replace(/ +/gi, "-");
};

String.prototype.hashCode = function () {
  let hash = 0,
    i,
    chr;
  if (this.length === 0) return hash;
  for (i = 0; i < this.length; i++) {
    chr = this.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0;
  }
  return Math.abs(hash);
};

async function download(prefix, url, cache = true) {
  const fileName = `cache/${prefix}-${url.hashCode()}.html`;

  if (cache && fs.existsSync(fileName)) {
    return fs.readFileSync(fileName).toString("utf-8");
  }

  console.log("Fetching:", url, fileName);

  return fetch(url, {
    headers: {
      "accept":
        "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
      "accept-language": "en-GB,en;q=0.9",
      "sec-fetch-dest": "document",
      "sec-fetch-mode": "navigate",
      "sec-fetch-site": "same-origin",
      "sec-fetch-user": "?1",
      "sec-gpc": "1",
      "dnt": "1",
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.77 Safari/537.36",
      "upgrade-insecure-requests": "1",
    },
    referrer: url,
    referrerPolicy: "strict-origin-when-cross-origin",
    body: null,
    method: "GET",
    mode: "cors",
  }).then((response) => {
    return response.text().then((value) => {
      fs.writeFileSync(fileName, value);
      return value;
    });
  });
}

function isPublicPlace(place) {
  const publicPlace = ["utca", "út", "tér"];
  const publicPlaceRegex = new RegExp(publicPlace.join("|"), "ig");
  if (place.match(publicPlaceRegex)) {
    return true;
  }
  if (place.match(/[0-9]/)) {
    return true;
  }
  return false;
}

function parseAddress(address) {
  const addArr = address.split(/,/);
  const result = {};
  if (isPublicPlace(addArr[0]) || !cities.includes(addArr[0])) {
    result.city = (addArr[1] || "").trim();
    result.street = addArr[0].trim();
  } else {
    result.city = addArr[0].trim();
    result.street = (addArr[1] || "").trim();
  }
  return result;
}

const parseListItem = (item) => {
  const [fullRooms, halfRooms] = [
    ...item
      .querySelector(".listing__data--room-count")
      .textContent.replace(/( fél)? szoba/gi, "")
      .trim()
      .split(/ \+ /)
      .map((v) => v * 1),
    0,
  ];
  const { city, street } = parseAddress(item.querySelector(".listing__address").textContent.trim());
  return {
    score: 0,
    id: item.getAttribute("data-id"),
    url: `https://ingatlan.com${item.querySelector(".listing__thumbnail").getAttribute("href")}`,
    pic: item.querySelector(".listing__image").getAttribute("src"),
    picCount: item.querySelector(".listing__photos-count").textContent.trim() * 1,
    price: item.querySelector(".price__container .price").textContent.trim().replace(/ M Ft/gi, "") * 1,
    city,
    street,
    area: item.querySelector(".listing__data--area-size").textContent.replace(/ m² terület/gi, "") * 1,
    plot: item.querySelector(".listing__data--plot-size").textContent.replace(/ m² telek/gi, "") * 1,
    fullRooms,
    halfRooms,
  };
};

const parseParams = (param) => {
  return {
    name: param.querySelector(".parameterName").textContent.trim(),
    value: param.querySelector(".parameterValue").textContent.trim(),
  };
};

const convertParamsReducer = (acc, curr) => {
  return {
    ...acc,
    [curr.name]: curr.value,
  };
};

const toCsv = (table) => {
  const columns = Object.values(
    table.map((item) => Object.keys(item)).reduce((acc, curr) => ({ ...acc, ...curr }), {}),
  );
  const csv =
    "\ufeff" +
    columns.join(",") +
    "\r\n" +
    table
      .map((item) => {
        return `${columns
          .map((column) => (typeof item[column] === "number" ? item[column] : `"${item[column] || ""}"`))
          .join(",")}`;
      })
      .join("\r\n");

  return csv;
};

const scoreTable = {
  "Ingatlan állapota": {
    "felújítandó": -50,
    "felújított": 0,
    "jó állapotú": 0,
    "közepes állapotú": -30,
    "nincs megadva": 0,
    "új építésű": 10,
    "újszerű": 0,
    "default": -20,
  },
  "Építés éve": {
    "1950 előtt": -50,
    "1950 és 1980 között": -30,
    "1981 és 2000 között": -20,
    "2001 és 2010 között": 0,
    "2012": 2,
    "2013": 3,
    "2015": 5,
    "2016": 6,
    "2017": 7,
    "2018": 8,
    "2019": 9,
    "2020": 10,
    "2021": 11,
    "nincs megadva": 0,
    "default": 0,
  },
};

const scoring = (item) => {
  const score = [
    (40 - item.price) / 2,
    (10 - (Math.abs(item.area - 80) / 100) * 10) * 1,
    (10 - (Math.abs(item.plot - 600) / 600) * 7) * 1,
    item.fullRooms >= 3 ? 5 + item.fullRooms / 2 - 2 + item.halfRooms / 2 : -20,
    cityScores[item.city] || 0,
    ...Object.keys(scoreTable).map((scoreCat) =>
      item[scoreCat] ? scoreTable[scoreCat][item[scoreCat]] || scoreTable[scoreCat]["default"] : 0,
    ),
  ].reduce((acc, curr) => acc + (curr || 0), 0);

  return {
    ...item,
    score,
  };
};

async function getPage(page) {
  if (!page) return;

  const body = await download(
    "list",
    `https://ingatlan.com/lista/elado+haz+80-m2-felett+csak-kepes+pest-megye-buda-kornyeke+pest-megye-pest-kornyeke+budapest+pest-megye+budapest-pesti-oldal+budapest-budai-oldal+850-m2telek-alatt+csaladi-haz+konnyuszerkezetes-haz+3-szoba-felett+45-mFt-ig?page=${page}`,
  );
  let html = new jsdom.JSDOM(body);
  const items = [...html.window.document.querySelectorAll(".listing.js-listing")];
  const result = items.map(parseListItem);

  for (let i = 0; i < result.length; i++) {
    const advert = await download("match", result[i].url);
    let advertHtml = new jsdom.JSDOM(advert);
    const parameters = [...advertHtml.window.document.querySelector("dl.parameters").querySelectorAll(".parameter")];
    const paramObject = parameters.map(parseParams).reduce(convertParamsReducer, {});

    result[i] = {
      ...result[i],
      ...paramObject,
    };

    advertHtml = undefined;
  }

  html = undefined;

  return result;
}

(async () => {
  let counter = 1;
  let result = [];
  let singleResult;

  try {
    result = JSON.parse(fs.readFileSync('./result.json', 'utf-8'));
  } catch {
    result = [];
  }

  if (result.length === 0) {
    do {
      singleResult = await getPage(counter++);
      result = [...result, ...singleResult];
      await new Promise((resolve) => setTimeout(resolve, 500)).then(() => console.log("Delayed"));
    } while (singleResult?.length >= 20);
  }

  result = result.map(scoring).sort((a, b) => (a.score > b.score ? -1 : 1));
  const csv = toCsv(result);

  fs.writeFileSync("result.json", JSON.stringify(result, null, 2));
  fs.writeFileSync("result.csv", csv);
})();
