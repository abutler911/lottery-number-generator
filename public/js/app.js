document.addEventListener("DOMContentLoaded", (event) => {
  const slider = document.getElementById("dataRangeSlider");
  slider.addEventListener("input", (e) => {
    document.getElementById(
      "dataRangeLabel"
    ).textContent = `Range: ${e.target.value} days`;
    fetchHistoryData(e.target.value);
  });
  fetchHistoryData(slider.value);
});

function fetchHistoryData(days) {
  fetch(`/history?days=${days}`)
    .then((response) => response.json())
    .then((data) => {
      populateTable(data);
      const frequencies = analyzeFrequency(data);
      const gaps = gapAnalysis(data);
      const numbers = generateNumbers(frequencies, gaps);
      document.getElementById("generatedNumbers").textContent =
        numbers.join(", ");
    })
    .catch((error) => console.error("Error:", error));
}

function populateTable(data) {
  const tableBody = document
    .getElementById("dataTable")
    .getElementsByTagName("tbody")[0];
  tableBody.innerHTML = "";
  data.forEach((item) => {
    const row = tableBody.insertRow();
    row.insertCell(0).textContent = item.date;
    row.insertCell(1).textContent = item.numbers.join(", ");
  });
}

function analyzeFrequency(data) {
  const frequencyCounts = {};
  data.forEach((lottery) => {
    lottery.numbers.forEach((number) => {
      frequencyCounts[number] = frequencyCounts[number]
        ? frequencyCounts[number] + 1
        : 1;
    });
  });
  const frequencyArray = Object.entries(frequencyCounts).sort(
    (a, b) => b[1] - a[1]
  );
  const frequencyTableBody = document.querySelector("#frequencyTable tbody");
  frequencyTableBody.innerHTML = "";
  frequencyArray.forEach(([number, frequency]) => {
    const row = frequencyTableBody.insertRow();
    row.insertCell(0).textContent = number;
    row.insertCell(1).textContent = frequency;
  });
  return frequencyArray;
}

function gapAnalysis(data) {
  const lastAppearance = {};
  const gaps = {};
  data
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .forEach((lottery) => {
      lottery.numbers.forEach((number) => {
        if (lastAppearance[number]) {
          const gap = Math.floor(
            (new Date(lottery.date) - new Date(lastAppearance[number])) /
              (1000 * 60 * 60 * 24)
          );
          gaps[number] = gaps[number] ? [...gaps[number], gap] : [gap];
        }
        lastAppearance[number] = lottery.date;
      });
    });
  const gapArray = Object.entries(gaps)
    .map(([number, gapList]) => [number, Math.max(...gapList)])
    .sort((a, b) => b[1] - a[1]);
  const gapTableBody = document.querySelector("#gapTable tbody");
  gapTableBody.innerHTML = "";
  gapArray.forEach(([number, maxGap]) => {
    const row = gapTableBody.insertRow();
    row.insertCell(0).textContent = number;
    row.insertCell(1).textContent = maxGap;
  });
  return gapArray;
}

function generateNumbers(frequencies, gaps) {
  const poolSize = 15;
  const numToGenerate = 6;
  const topFrequencies = frequencies
    .slice(0, poolSize)
    .map(([number]) => number);
  const topGaps = gaps.slice(0, poolSize).map(([number]) => number);
  const numberPool = [...new Set([...topFrequencies, ...topGaps])];
  const generatedNumbers = [];
  for (let i = 0; i < numToGenerate; i++) {
    const randomIndex = Math.floor(Math.random() * numberPool.length);
    generatedNumbers.push(numberPool.splice(randomIndex, 1)[0]);
  }
  return generatedNumbers;
}

fetchHistoryData(7);
