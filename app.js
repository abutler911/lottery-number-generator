const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();
const db = require("./config/db");
const port = process.env.PORT || 3000;

const app = express();

app.use(cors());
app.use(bodyParser.json());

app.set("view engine", "ejs");
app.use(express.static("public"));

app.get("/", (req, res) => {
  res.render("index");
});

app.get("/history", async (req, res) => {
  try {
    const days = req.query.days ? parseInt(req.query.days) : 90;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    cutoffDate.setHours(0, 0, 0, 0);
    const history = await db.Lottery.find({
      date: { $gte: cutoffDate.toISOString() },
    });
    res.json(history);
  } catch (err) {
    res.status(500).send(err);
  }
});

async function fetchAllData() {
  const dates = getMondaysAndWednesdays();

  for (const date of dates) {
    const numberSets = await fetchHistoricalData(date);
    const lottery = new db.Lottery({
      date: date,
      numbers: numberSets.flat(),
    });

    try {
      await lottery.save();
    } catch (error) {
      console.error(`Error saving number sets for ${date}: ${error}`);
    }
  }
}

function getMondaysAndWednesdays() {
  const dates = [];
  const now = new Date();
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(now.getMonth() - 3);

  for (let day = oneMonthAgo; day <= now; day.setDate(day.getDate() + 1)) {
    if (day.getDay() === 1 || day.getDay() === 3) {
      const dateString = day.toISOString().split("T")[0];
      dates.push(dateString);
    }
  }
  return dates;
}

async function fetchHistoricalData(date) {
  const options = {
    method: "GET",
    url: `https://powerball.p.rapidapi.com/${date}`,
    headers: {
      "X-RapidAPI-Key": process.env.LOTTO_API_KEY,
      "X-RapidAPI-Host": "powerball.p.rapidapi.com",
    },
  };

  try {
    const response = await axios.request(options);
    const numberSets = response.data.data.map((item) => {
      const numbers = item.NumberSet.split(" ")
        .filter((num) => !isNaN(num))
        .map(Number);
      return numbers;
    });
    return numberSets;
  } catch (error) {
    console.error(error);
  }
}

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
