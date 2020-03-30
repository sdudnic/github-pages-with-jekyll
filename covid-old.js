const daysNumber = 14;

Date.prototype.addDays = function (days) {
    var date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
}
var now = new Date();
var utcNow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
startDate = utcNow.addDays(-daysNumber - 1);
var startDateString = startDate.toISOString();

var url = {
    "confirmed": "https://api.covid19api.com/live/country/france/status/confirmed/date/" + startDateString,
    "deaths": "https://api.covid19api.com/live/country/france/status/deaths/date/" + startDateString,
    "recovered": "https://api.covid19api.com/live/country/france/status/recovered/date/" + startDateString,
};

fetch("https://covid19-graphql.now.sh/", {
        "credentials": "omit",
        "headers": {
            "accept": "*/*",
            "accept-language": "fr,ru;q=0.9,en;q=0.8,en-US;q=0.7,ro;q=0.6,de;q=0.5",
            "cache-control": "no-cache",
            "content-type": "application/json",
            "pragma": "no-cache",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin"
        },
        "referrer": "https://covid19-graphql.now.sh/",
        "referrerPolicy": "no-referrer-when-downgrade",
        "body": "{\"operationName\":null,\"variables\":{},\"query\":\"{\\n  country(name: \\\"France\\\") {\\n    results {\\n      date\\n      confirmed\\n      recovered\\n      deaths\\n      growthRate\\n    }\\n  }\\n}\\n\"}",
        "method": "POST",
        "mode": "cors"
    })
    .then((response) => {
        console.log(response);
    });

var totalData = {};
var newData = {};

// Load the Visualization API and the corechart package.
google.charts.load('current', {
    'packages': ['line']
});

// Set a callback to run when the Google Visualization API is loaded.
google.charts.setOnLoadCallback(drawChart);

function filterProvince(e) {
    return e.Province == "France" || e.Province == "";
}

function filterUniqueDates(e, i, arr) {
    return (i == arr.length - 1 ||
        (new Date(e.Date)).toDateString() != (new Date(arr[i + 1].Date)).toDateString());
}

function getConfirmed() {
    return $.get(url.confirmed);
}

function getRecovered(confirmed) {
    confirmed = confirmed.filter(filterProvince).filter(filterUniqueDates);
    for (let i = 0, prev = 0; i < confirmed.length; i++) {
        const item = confirmed[i];
        var date = new Date(item.Date);
        var totalConfirmed = item.Cases;
        var newConfirmed = totalConfirmed - prev;
        prev = totalConfirmed;
        if (i > 0) {
            totalData.addRow([date, totalConfirmed, 0, 0]);
            newData.addRow([date, newConfirmed, 0, 0]);
        }
    }
    return $.get(url.recovered);
}

function getDeaths(recovered) {
    recovered = recovered.filter(filterProvince).filter(filterUniqueDates);
    for (let row = 0, prev = 0; row < recovered.length; row++) {
        var totalRecovered = recovered[row].Cases;
        var newRecovered = totalRecovered - prev;
        prev = totalRecovered;
        if (row > 0) {
            totalData.setCell(row - 1, 2, totalRecovered);
            newData.setCell(row - 1, 2, newRecovered);
        }
    }
    return $.get(url.deaths);
}

function finalize(deaths) {
    deaths = deaths.filter(filterProvince).filter(filterUniqueDates);
    for (let row = 0, prev = 0; row < deaths.length; row++) {
        var totalDeaths = deaths[row].Cases;
        var newDeaths = totalDeaths - prev;
        prev = totalDeaths;
        if (row > 0) {
            totalData.setCell(row - 1, 3, totalDeaths);
            newData.setCell(row - 1, 3, newDeaths);
        }
    }

    var totalChartOptions = {
        chart: {
            title: 'Total cases',
            subtitle: 'last ' + daysNumber + ' days'
        },
        curveType: 'function',
        is3D: true,
        legend: {
            position: 'bottom'
        },
        colors: ['goldenrod', 'lightgreen', 'indianred'],
    };
    var newChartOptions = {
        chart: {
            title: 'New cases',
            subtitle: 'last ' + daysNumber + ' days'
        },
        curveType: 'function',
        is3D: true,
        legend: {
            position: 'bottom'
        },
        colors: ['gold', 'green', 'red'],
    };

    var formatter = new google.visualization.DateFormat({
        pattern: 'dd/MM/yy'
    });
    formatter.format(totalData, 0);
    formatter.format(newData, 0);

    var chart = new google.charts.Line(document.getElementById('total_chart'));
    chart.draw(totalData, google.charts.Line.convertOptions(totalChartOptions));

    chart = new google.charts.Line(document.getElementById('new_chart'));
    chart.draw(newData, google.charts.Line.convertOptions(newChartOptions));
}

function drawChart() {
    totalData = new google.visualization.DataTable();

    totalData.addColumn("date", "Date");
    totalData.addColumn("number", "Confirmed");
    totalData.addColumn("number", "Recovered");
    totalData.addColumn("number", "Deaths");

    newData = new google.visualization.DataTable();

    newData.addColumn("date", "Date");
    newData.addColumn("number", "New Confirmed");
    newData.addColumn("number", "New Recovered");
    newData.addColumn("number", "New Deaths");

    getConfirmed().then(getRecovered).then(getDeaths).then(finalize);
}