const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const axios = require("axios");
require("dotenv").config();
const db = require("./config/db");
const port = 3000;

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
    const days = req.query.days ? parseInt(req.query.days) : 90; // Default to 90 days if no parameter is provided
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);
    // Ignore the time part of the dates
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
    console.log(numberSets);

    const lottery = new db.Lottery({
      date: date,
      numbers: numberSets.flat(),
    });

    try {
      await lottery.save();
      console.log(`Saved number sets for ${date}`);
    } catch (error) {
      console.error(`Error saving number sets for ${date}: ${error}`);
    }
  }
}

function getMondaysAndWednesdays() {
  const dates = [];
  const now = new Date();
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(now.getMonth() - 1);

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

async function analyzeFrequency() {
  // Fetch all the lottery data from the database
  const allLotteryData = await db.Lottery.find();

  // Create an empty object to store the frequency counts
  const frequencyCounts = {};

  // Loop over all the lottery data
  allLotteryData.forEach((lottery) => {
    // Loop over all the numbers in each lottery draw
    lottery.numbers.forEach((number) => {
      // If this number has already been counted, increment its count
      if (frequencyCounts[number]) {
        frequencyCounts[number]++;
      }
      // If this number has not been counted yet, initialize its count to 1
      else {
        frequencyCounts[number] = 1;
      }
    });
  });

  // Log the frequency counts in a readable format
  console.log("Frequency of each number in the historical lottery data:");
  Object.keys(frequencyCounts).forEach((number) => {
    console.log(`Number ${number}: appeared ${frequencyCounts[number]} times`);
  });
}

async function gapAnalysis() {
  // Fetch all the lottery data from the database and sort it by date
  const allLotteryData = await db.Lottery.find().sort({ date: 1 });

  // Initialize a 'lastAppearance' object to store the date of the last appearance of each number
  const lastAppearance = {};
  const gaps = {};

  allLotteryData.forEach((lottery) => {
    lottery.numbers.forEach((number) => {
      if (lastAppearance[number]) {
        // If this number has appeared before, calculate the gap in days
        const lastDate = new Date(lastAppearance[number]);
        const currentDate = new Date(lottery.date);
        const gap = Math.floor(
          (currentDate - lastDate) / (1000 * 60 * 60 * 24)
        );

        // Update the gaps object
        if (!gaps[number]) gaps[number] = [];
        gaps[number].push(gap);
      }
      // Update the lastAppearance date for this number
      lastAppearance[number] = lottery.date;
    });
  });

  // Calculate the maximum gap for each number
  const maxGaps = Object.keys(gaps).map((number) => ({
    number,
    maxGap: Math.max(...gaps[number]),
  }));

  // Sort the numbers by their maximum gap in descending order
  maxGaps.sort((a, b) => b.maxGap - a.maxGap);

  // Log the numbers and their maximum gaps in a readable format
  console.log("Numbers sorted by maximum gap between appearances:");
  maxGaps.forEach((item) => {
    console.log(`Number ${item.number}: maximum gap of ${item.maxGap} days`);
  });
}

async function analyzeFrequencyByPosition() {
  // Fetch all the lottery data from the database
  const allLotteryData = await db.Lottery.find();

  // Initialize an array of frequency count objects, one for each position
  const frequencyCountsByPosition = [];

  // Loop over all the lottery data
  allLotteryData.forEach((lottery) => {
    // Loop over all the numbers in each lottery draw
    lottery.numbers.forEach((number, index) => {
      // If this position doesn't have a frequency count object yet, create one
      if (!frequencyCountsByPosition[index]) {
        frequencyCountsByPosition[index] = {};
      }
      // If this number has already been counted at this position, increment its count
      if (frequencyCountsByPosition[index][number]) {
        frequencyCountsByPosition[index][number]++;
      }
      // If this number has not been counted yet at this position, initialize its count to 1
      else {
        frequencyCountsByPosition[index][number] = 1;
      }
    });
  });

  // Log the frequency counts in a readable format
  console.log("Frequency of each number at each position:");
  frequencyCountsByPosition.forEach((frequencyCounts, position) => {
    console.log(`Position ${position + 1}:`);
    Object.keys(frequencyCounts).forEach((number) => {
      console.log(
        `  Number ${number}: appeared ${frequencyCounts[number]} times`
      );
    });
  });
}

analyzeFrequencyByPosition();
gapAnalysis();
analyzeFrequency();

// fetchAllData().then((result) => console.log(result));

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
