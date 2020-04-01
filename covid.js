const daysNumber = 14;

Date.prototype.addDays = function (days) {
    var date = new Date(this.valueOf());
    date.setDate(date.getDate() + days);
    return date;
}
var now = new Date();
var utcNow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
startDate = utcNow.addDays(-daysNumber - 1);
var startDateString = startDate.toISOString().slice(0, 10);

var DEFAULT_CODE = "mda";

var apiUrl = {
    timeline: "https://covidapi.info/api/v1/country/***",
    current: "https://services1.arcgis.com/0MSEUqKaxRlEPj5g/arcgis/rest/services/Coronavirus_2019_nCoV_Cases/FeatureServer/2/query?where=UPPER(Country_Region)%20like%20%27%25***%25%27&outFields=Last_Update,Confirmed,Deaths,Recovered,Country_Region&returnGeometry=false&outSR=4326&f=json"
};

function getApiUrl(countryCode, isTimeline) {
    if (!countryCode) {
        return null;
    }
    const placeholder = "***";
    var url = "";

    if (isTimeline) {
        url = apiUrl.timeline.replace(placeholder, countryCode);
    } else { // current value, no timeline
        var country = countries.find((c) => c.value.toLowerCase() === countryCode.toLowerCase());
        if (country) {
            countryName = country.text;
        } else {
            return null;
        }
        url = apiUrl.current.replace(placeholder, countryName);
    }
    return url;
}

function filterFromStartDate(e) {
    return (e[0] >= startDateString);
}

function udpateFields(updateDate, confirmed, recovered, deaths) {
    var dateText = "-";
    if (updateDate && updateDate instanceof Date) {
        dateText = updateDate.toLocaleDateString() + " " + updateDate.toLocaleTimeString();
    }
    $("#confirmed").val(confirmed || "");
    $("#recovered").val(recovered || "");
    $("#deaths").val(deaths || "");
    $("#lastApiUpdate").text(dateText);
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

    var timelineApi = getApiUrl(code, true);
    var prevConfirmed = 0,
        prevRecovered = 0,
        prevDeaths = 0,
        lastApiUpdate = null;

    function addNewDataRow(date, confirmed, recovered, deaths, ignored) {
        lastApiUpdate = date;

        var totalConfirmed = confirmed;
        var newConfirmed = totalConfirmed - prevConfirmed;
        prevConfirmed = totalConfirmed;

        var totalRecovered = recovered;
        var newRecovered = totalRecovered - prevRecovered;
        prevRecovered = totalRecovered;

        var totalDeaths = deaths;
        var newDeaths = totalDeaths - prevDeaths;
        prevDeaths = totalDeaths;

        if (!ignored) {
            totalData.addRow([lastApiUpdate, totalConfirmed, totalRecovered, totalDeaths, null]);
            newData.addRow([lastApiUpdate, newConfirmed, newRecovered, newDeaths, null]);
        }
    }

    $.get(timelineApi)
        .done((apiAnswer) => {
            var results = Object.entries(apiAnswer.result).filter(filterFromStartDate);

            if (results.length === 0) { // no data
                totalData.addRow([null, 0, 0, 0, "NO DATA"]);
                newData.addRow([null, 0, 0, 0, "NO DATA"]);
                udpateFields();

            } else { // we have data

                for (let i = 0; i < results.length; i++) {
                    var myDate = new Date(results[i][0]);
                    const item = results[i][1];
                    var ignoreAdding = i == 0;
                    addNewDataRow(myDate, item.confirmed, item.recovered, item.deaths, ignoreAdding);
                }
            }
        })
        .fail((e) => {
            totalData.addRow([null, 0, 0, 0, "NO DATA"]);
            newData.addRow([null, 0, 0, 0, "NO DATA"]);
            udpateFields();
        })
        .always(() => {
            var currentApi = getApiUrl(code, false);

            fetch(currentApi).then((d) => d.json()).then((data) => {
                var item = data.features[0].attributes;
                var myDate = new Date(item.Last_Update);

                addNewDataRow(myDate, item.Confirmed, item.Recovered, item.Deaths);

                udpateFields(myDate, item.Confirmed, item.Recovered, item.Deaths);

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

async function getIso3CodeFromIp() {
    try {
        var jsonUrl = {
            ip: "https://ip.nf/me.json",
            iso3: "https://raw.githubusercontent.com/sdudnic/covid-19/master/countries/iso3.json"
        };
        var init = {
            headers: {
                'Origin': '*'
            }
        };
        var response = await fetch(jsonUrl.ip, init)
            .then((j2) => j2.json())
            .then((iso2) => fetch(jsonUrl.iso3)
                .then((j3) => j3.json())
                .then((iso3) => {
                    document.title = iso2.ip.country + " " + document.title;
                    return iso3[iso2.ip.country_code];
                }));
        return response;
    } catch (error) {
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

        var urlCode = getIsoCodeFromUrl();
        if (urlCode) {
            updateGraph(urlCode);
        } else {
            getIso3CodeFromIp().then((iso3) => {
                iso3 = iso3 || DEFAULT_CODE;
                iso3 = iso3.toLowerCase();
                updateGraph(iso3);
            });
        }
    },
    'packages': ['line'],
    language: "ro"
});