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

function udpateFields(confirmed, recovered, deaths, updateDate) {
    if (!updateDate || !(updateDate instanceof Date)) {
        updateDate = new Date();
    }

    $("#confirmed").val(confirmed || "");
    $("#recovered").val(recovered || "");
    $("#deaths").val(deaths || "");
    $("#lastApiUpdate").text(updateDate.toISOString().slice(0, 10));
}

function drawChart(code, elementId) {
    var totalData = {};
    var newData = {};

    totalData = new google.visualization.DataTable();

    totalData.addColumn("date", "Date");
    totalData.addColumn("number", "Confirmed");
    totalData.addColumn("number", "Recovered");
    totalData.addColumn("number", "Deaths");
    totalData.addColumn({
        role: 'annotation',
        type: 'string'
    });

    newData = new google.visualization.DataTable();

    newData.addColumn("date", "Date");
    newData.addColumn("number", "Confirmed");
    newData.addColumn("number", "Recovered");
    newData.addColumn("number", "Deaths");
    newData.addColumn({
        role: 'annotation',
        type: 'string'
    });

    var apiUrl = covidApiUrl + code;
    var prevConfirmed = 0,
        prevRecovered = 0,
        prevDeaths = 0,
        lastApiUpdate = null;

    $.get(apiUrl)
        .done((apiAnswer) => {
            var results = Object.entries(apiAnswer.result).filter(filterFromStartDate);

            if (results.length === 0) { // no data
                totalData.addRow([null, 0, 0, 0, "NO DATA"]);
                newData.addRow([null, 0, 0, 0, "NO DATA"]);
                udpateFields();

            } else { // we have data

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
                        totalData.addRow([lastApiUpdate, totalConfirmed, totalRecovered, totalDeaths, null]);
                        newData.addRow([lastApiUpdate, newConfirmed, newRecovered, newDeaths, null]);
                    }
                }
            }
        })
        .fail((e) => {
            totalData.addRow([null, 0, 0, 0, "NO DATA"]);
            newData.addRow([null, 0, 0, 0, "NO DATA"]);
            udpateFields();
        })
        .always(() => {

            if (!updated.date) {
                udpateFields(prevConfirmed, prevRecovered, prevDeaths, lastApiUpdate);
            }

            /********************/
            if (updated.date && updated.date > lastApiUpdate) {
                var totalConfirmed = updated.confirmed;
                var newConfirmed = totalConfirmed - prevConfirmed;

                var totalRecovered = updated.recovered;
                var newRecovered = totalRecovered - prevRecovered;

                var totalDeaths = updated.deaths;
                var newDeaths = totalDeaths - prevDeaths;

                totalData.addRow([updated.date, totalConfirmed, totalRecovered, totalDeaths, null]);
                newData.addRow([updated.date, newConfirmed, newRecovered, newDeaths, null]);
            }
            /********************/

            var totalChartOptions = {
                chart: {
                    title: 'Total cases',
                    titlePosition: 'in'
                },
                curveType: 'function',
                is3D: true,
                legend: {
                    position: 'none'
                },
                // set annotation for -- No Data Copy
                annotations: {
                    // remove annotation stem and push to middle of chart
                    stem: {
                        color: 'transparent',
                        length: 120
                    },
                    textStyle: {
                        color: 'red',
                        fontSize: 22
                    }
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

            var newChartOptions = JSON.parse(JSON.stringify(totalChartOptions)); // clone
            newChartOptions.chart.title = "New cases";

            // var formatter = new google.visualization.DateFormat({ pattern: 'dd/MM/yy' });
            // formatter.format(totalData, 0);
            // formatter.format(newData, 0);

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
    var countryFound = countries.find(c => c.value === code);

    if (countryFound) {
        return countryFound.value;
    }

    countryFound = countries.find(c.text.toLowerCase() === code);
    if (countryFound) {
        return countryFound.value;
    } else {
        return null;
    }
}

var app = new Vue({
    el: '#app',
    //vuetify: new Vuetify()
});

// Load the Visualization API and the corechart package.
google.charts.load('current', {
    callback: function () {
        var sortedCountries = countries.sort((a, b) => a.text.localeCompare(b.text, "en", {
            ignorePunctuation: true
        }));
        for (var country of sortedCountries) {
            $("#country").append($("<option>", country));
        }
        $("select#country").change(function (e) {
            var code = $(e.target).val();
            drawChart(code);
        });

        var startCode = getIsoCodeFromUrl() || START_CODE;

        updateGraph(startCode);
    },
    'packages': ['line'],
    language: "ro"
});