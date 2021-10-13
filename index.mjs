import fetch from "node-fetch";
import fs from "fs";
import jsdom from "jsdom";
import cities from "./cities.mjs";

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

async function getPage(page) {
  if (!page) return;

  const body = await download(
    'list',
    `https://ingatlan.com/lista/elado+haz+80-m2-felett+csak-kepes+pest-megye-buda-kornyeke+pest-megye-pest-kornyeke+budapest+pest-megye+budapest-pesti-oldal+budapest-budai-oldal+850-m2telek-alatt+csaladi-haz+konnyuszerkezetes-haz+3-szoba-felett+45-mFt-ig?page=${page}`,
  );
  let html = new jsdom.JSDOM(body);
  const items = [...html.window.document.querySelectorAll(".listing.js-listing")];
  const result = items.map(parseListItem);

  for (let i = 0; i < result.length; i++) {
    const advert = await download('match', result[i].url);
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
  do {
    singleResult = await getPage(counter++);
    result = [...result, ...singleResult];
    await new Promise((resolve) => setTimeout(resolve, 500)).then(() => console.log('Delayed'));
  } while (singleResult?.length >= 20);

  // const result = [...(await getPage(1)), ...(await getPage(2))];
  const csv = toCsv(result);

  fs.writeFileSync("result.json", JSON.stringify(result, null, 2));
  fs.writeFileSync("result.csv", csv);
})();
