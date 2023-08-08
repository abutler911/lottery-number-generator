document.addEventListener("DOMContentLoaded", (event) => {
  const slider = document.getElementById("dataRangeSlider");
  slider.addEventListener("input", function (e) {
    document.getElementById(
      "dataRangeLabel"
    ).textContent = `Range: ${e.target.value} days`;
    fetchHistoryData(e.target.value);
  });

  // Initial fetch when page loads
  fetchHistoryData(slider.value);
});

function fetchHistoryData(days) {
  fetch(`/history?days=${days}`)
    .then((response) => response.json())
    .then((data) => {
      populateTable(data);
      analyzeFrequency(data);
      gapAnalysis(data);
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
    const dateCell = row.insertCell(0);
    const numbersCell = row.insertCell(1);
    dateCell.textContent = item.date;
    numbersCell.textContent = item.numbers.join(", ");
  });
}

function analyzeFrequency(data) {
  const frequencyCounts = {};
  data.forEach((lottery) => {
    lottery.numbers.forEach((number) => {
      if (frequencyCounts[number]) {
        frequencyCounts[number]++;
      } else {
        frequencyCounts[number] = 1;
      }
    });
  });

  // Convert the frequency counts object to an array of arrays
  const frequencyArray = Object.entries(frequencyCounts);
  // Sort the array by frequency in descending order
  frequencyArray.sort((a, b) => b[1] - a[1]);

  // Populate the frequency table
  const frequencyTableBody = document.querySelector("#frequencyTable tbody");
  frequencyTableBody.innerHTML = "";

  frequencyArray.forEach(([number, frequency]) => {
    const row = frequencyTableBody.insertRow();
    const numberCell = row.insertCell(0);
    const frequencyCell = row.insertCell(1);
    numberCell.textContent = number;
    frequencyCell.textContent = frequency;
  });
}

function gapAnalysis(data) {
  const lastAppearance = {};
  const gaps = {};

  data
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .forEach((lottery) => {
      lottery.numbers.forEach((number) => {
        if (lastAppearance[number]) {
          const lastDate = new Date(lastAppearance[number]);
          const currentDate = new Date(lottery.date);
          const gap = Math.floor(
            (currentDate - lastDate) / (1000 * 60 * 60 * 24)
          );

          if (!gaps[number]) gaps[number] = [];
          gaps[number].push(gap);
        }
        lastAppearance[number] = lottery.date;
      });
    });

  // Convert the gaps object to an array of arrays, calculating the max gap for each number
  const gapArray = Object.entries(gaps).map(([number, gapList]) => [
    number,
    Math.max(...gapList),
  ]);
  // Sort the array by max gap in descending order
  gapArray.sort((a, b) => b[1] - a[1]);

  // Populate the gap table
  const gapTableBody = document.querySelector("#gapTable tbody");
  gapTableBody.innerHTML = "";

  gapArray.forEach(([number, maxGap]) => {
    const row = gapTableBody.insertRow();
    const numberCell = row.insertCell(0);
    const gapCell = row.insertCell(1);
    numberCell.textContent = number;
    gapCell.textContent = maxGap;
  });
}
