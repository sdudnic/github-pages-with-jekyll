const daysNumber = 14;

function updateData() {
    updated.date = new Date();
    updated.confirmed = $("#confirmed").val();
    updated.recovered = $("#recovered").val();
    updated.deaths = $("#deaths").val();
    updateGraph();
}

Date.prototype.addDays = function (days) {
    var date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
}
var now = new Date();
var utcNow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
startDate = utcNow.addDays(-daysNumber - 1);
var startDateString = startDate.toISOString().slice(0, 10);

var updated = {
    date: null,
    confirmed: null,
    recovered: null,
    deaths: null
};

var START_CODE = "mda";

var covidApiUrl = "https://covidapi.info/api/v1/country/";

function filterFromStartDate(e) {
    return (e[0] >= startDateString);
}

$('#updateData').on('click', updateData);

function drawChart(code, elementId) {
    var totalData = {};
    var newData = {};

    totalData = new google.visualization.DataTable();

    totalData.addColumn("date", "Date");
    totalData.addColumn("number", "Confirmed");
    totalData.addColumn("number", "Recovered");
    totalData.addColumn("number", "Deaths");

    newData = new google.visualization.DataTable();

    newData.addColumn("date", "Date");
    newData.addColumn("number", "Confirmed");
    newData.addColumn("number", "Recovered");
    newData.addColumn("number", "Deaths");
    var apiUrl = covidApiUrl + code;

    $.get(apiUrl)
        .then((apiAnswer) => {
            var results = Object.entries(apiAnswer.result).filter(filterFromStartDate);
            var prevConfirmed = 0,
                prevRecovered = 0,
                prevDeaths = 0,
                lastApiUpdate = {};

            for (let i = 0; i < results.length; i++) {
                const item = results[i][1];
                lastApiUpdate = new Date(results[i][0]);

                var totalConfirmed = item.confirmed;
                var newConfirmed = totalConfirmed - prevConfirmed;
                prevConfirmed = totalConfirmed;

                var totalRecovered = item.recovered;
                var newRecovered = totalRecovered - prevRecovered;
                prevRecovered = totalRecovered;

                var totalDeaths = item.deaths;
                var newDeaths = totalDeaths - prevDeaths;
                prevDeaths = totalDeaths;

                if (i > 0) {
                    totalData.addRow([lastApiUpdate, totalConfirmed, totalRecovered, totalDeaths]);
                    newData.addRow([lastApiUpdate, newConfirmed, newRecovered, newDeaths]);
                }
            }
            if (!updated.date) {
                $("#confirmed").val(prevConfirmed);
                $("#recovered").val(prevRecovered);
                $("#deaths").val(prevDeaths);
                $("#lastApiUpdate").text(lastApiUpdate.toISOString().slice(0, 10));
            }
            /********************/
            if (updated.date && updated.date > lastApiUpdate) {
                var totalConfirmed = updated.confirmed;
                var newConfirmed = totalConfirmed - prevConfirmed;

                var totalRecovered = updated.recovered;
                var newRecovered = totalRecovered - prevRecovered;

                var totalDeaths = updated.deaths;
                var newDeaths = totalDeaths - prevDeaths;

                totalData.addRow([updated.date, totalConfirmed, totalRecovered, totalDeaths]);
                newData.addRow([updated.date, newConfirmed, newRecovered, newDeaths]);
            }
            /********************/
            var totalChartOptions = {
                chart: {
                    title: 'Total cases',
                    titlePosition: 'out'
                },
                curveType: 'function',
                is3D: true,
                legend: {
                    position: 'none'
                },
                series: {
                    0: "Big",
                    1: "Small",
                    2: "Small"
                },
                axes: {
                    x: {
                        0: {
                            side: 'top',
                        }
                    }
                },
                hAxis: {
                    title: '',
                    format: "dd/MM"
                },
                colors: ['orange', 'green', 'red'],
            };

            var newChartOptions = {
                chart: {
                    title: 'New cases',
                    titlePosition: 'in'
                },
                curveType: 'function',
                is3D: true,
                legend: {
                    position: 'none'
                },
                series: {
                    0: "Big",
                    1: "Small",
                    2: "Small"
                },
                axes: {
                    x: {
                        0: {
                            side: 'top',
                            label: '',
                            format: 'dd/MM/yy'
                        }
                    }
                },
                hAxis: {
                    format: "dd/MM"
                },
                colors: ['orange', 'green', 'red'],
            };

            var formatter = new google.visualization.DateFormat({
                pattern: 'dd/MM/yy'
            });
            formatter.format(totalData, 0);
            formatter.format(newData, 0);

            var totalElement = $("article.total-chart")[0];
            var newElement = $("article.new-chart")[0];

            var chart = new google.charts.Line(totalElement);
            chart.draw(totalData, google.charts.Line.convertOptions(totalChartOptions));

            chart = new google.charts.Line(newElement);
            chart.draw(newData, google.charts.Line.convertOptions(newChartOptions));
        });
}

function updateGraph(code) {
    if ($("select#country").val() != code) {
        $("select#country").val(code);
    }
    drawChart(code);
}

function getIsoCodeFromUrl() {
    var stringUrl = window.location.href;
    var url = new URL(stringUrl);
    var code = url.searchParams.get("country") || url.searchParams.get("c");
    if (!code) {
        return null;
    }

    code = code.toLowerCase();

    var codeISO = "";
    if (Object.keys(codes).includes(code)) {
        codeISO = code;
    } else if (Object.values(codes).includes(code)) {
        codeISO = Object.keys(codes).find(key => codes[key] === code);
    } else {
        return null;
    }
    return codeISO;
}

function drawCharts() {
    for (const code in codes) {
        $("#country").append($("<option>", {
            value: code,
            text: codes[code].charAt(0).toUpperCase() + codes[code].slice(1)
        }));
    }
    $("select#country").change(function (e) {
        var code = $(e.target).val()
        drawChart(code);
    });

    var startCode = getIsoCodeFromUrl() || START_CODE;

    updateGraph(startCode);
}

// Load the Visualization API and the corechart package.
google.charts.load('current', {
    'packages': ['line']
});

// Set a callback to run when the Google Visualization API is loaded.
google.charts.setOnLoadCallback(drawCharts);