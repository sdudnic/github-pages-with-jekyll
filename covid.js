new Vue({
    el: '#app',
    vuetify: new Vuetify(),
    data: {
        DEFAULT_CODE: "mda",
        daysNumber: 14,
        country: {
            iso3: "",
            name: ""
        },
        last: {
            total: {
                confirmed: 0,
                recovered: 0,
                deaths: 0
            },
            new: {
                confirmed: 0,
                recovered: 0,
                deaths: 0
            },
            updateDate: new Date(),

        },
        totalChartOptions: {
            chart: {
                title: 'Total cases',
                titlePosition: 'in'
            },
            curveType: 'function',
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
            pointSize: 20,
            pointShape: 'diamond',
        },
        countriesList: countries,
        apiUrl: {
            timeline: "https://covidapi.info/api/v1/country/***",
            current: "https://services1.arcgis.com/0MSEUqKaxRlEPj5g/arcgis/rest/services/Coronavirus_2019_nCoV_Cases/FeatureServer/2/query?where=UPPER(Country_Region)%20like%20%27%25***%25%27&outFields=Last_Update,Confirmed,Deaths,Recovered,Country_Region&returnGeometry=false&outSR=4326&f=json"
        },
        startDateString: "",
    },
    methods: {
        getApiUrl(countryCode, isTimeline) {
            if (!countryCode) {
                return null;
            }
            const placeholder = "***";
            var url = "";

            if (isTimeline) {
                url = this.apiUrl.timeline.replace(placeholder, countryCode);
            } else { // current value, no timeline
                var country = countries.find((c) => c.iso3 === countryCode.toLowerCase());
                if (country) {
                    countryName = country.name;
                } else {
                    return null;
                }
                url = this.apiUrl.current.replace(placeholder, countryName);
            }
            return url;
        },
        filterFromStartDate(e) {
            return (e[0] >= this.startDateString);
        },
        updateFields(updateDate, confirmed, recovered, deaths) {
            this.last.updateDate = updateDate;
            this.last.total.confirmed = confirmed;
            this.last.total.recovered = recovered;
            this.last.total.deaths = deaths;
        },
        drawChart(code) {
            var vm = this;
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

            var timelineApi = this.getApiUrl(code, true);
            var previous = {
                confirmed: 0,
                recovered: 0,
                deaths: 0
            };

            function addNewDataRow(date, confirmed, recovered, deaths, ignored) {
                vm.last.updateDate = date;

                vm.last.total.confirmed = confirmed;
                vm.last.new.confirmed = confirmed - previous.confirmed;
                previous.confirmed = confirmed;

                vm.last.total.recovered = recovered;
                vm.last.new.recovered = recovered - previous.recovered;
                previous.recovered = recovered;

                vm.last.total.deaths = deaths;
                vm.last.new.deaths = deaths - previous.deaths;
                previous.deaths = deaths;

                if (!ignored) {
                    totalData.addRow([date, confirmed, recovered, deaths, null]);
                    newData.addRow([date, vm.last.new.confirmed, vm.last.new.recovered, vm.last.new.deaths, null]);
                }
            }

            $.get(timelineApi)
                .done((apiAnswer) => {
                    var results = Object.entries(apiAnswer.result).filter(vm.filterFromStartDate);

                    if (results.length === 0) { // no data
                        totalData.addRow([null, 0, 0, 0, "NO DATA"]);
                        newData.addRow([null, 0, 0, 0, "NO DATA"]);
                        vm.updateFields();

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
                    vm.updateFields();
                })
                .always(() => {
                    var currentApi = vm.getApiUrl(code, false);

                    fetch(currentApi).then((d) => d.json()).then((data) => {
                        var item = data.features[0].attributes;
                        var myDate = new Date(item.Last_Update);

                        addNewDataRow(myDate, item.Confirmed, item.Recovered, item.Deaths);
                        vm.updateFields(myDate, item.Confirmed, item.Recovered, item.Deaths);

                        var newChartOptions = JSON.parse(JSON.stringify(vm.totalChartOptions)); // clone
                        newChartOptions.chart.title = "Daily(new) cases";

                        var formatter = new google.visualization.DateFormat({
                            pattern: 'dd/MM/yy hh:mm'
                        });
                        formatter.format(totalData, 0);
                        formatter.format(newData, 0);

                        var totalElement = $("article.total-chart")[0];
                        var newElement = $("article.new-chart")[0];

                        var chart = new google.charts.Line(totalElement);
                        chart.draw(totalData, google.charts.Line.convertOptions(vm.totalChartOptions));

                        chart = new google.charts.Line(newElement);
                        chart.draw(newData, google.charts.Line.convertOptions(newChartOptions));
                    });
                });
        },
        getIsoCodeFromUrl() {
            var stringUrl = window.location.href;
            var url = new URL(stringUrl);
            var code = url.searchParams.get("c") || url.searchParams.get("country");

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
        },
        changeTitle: function (countryName) {
            const myRegex = /(^.*)(COVID\-19 evolution graphs,)/;
            const replacement = countryName + " $2";
            document.title = document.title.replace(myRegex, replacement);
        },
        getIso3CodeFromIp: async function () {
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
                            return iso3[iso2.ip.country_code];
                        }));
                return response;
            } catch (error) {
                return null;
            }
        },
        countryChanged(newValue) {
            this.drawChart(newValue.iso3);
            this.changeTitle(newValue.name);
        }

    },
    filters: {
        isoDateTime: function (value) {
            var dateText = "-";
            if (value && value instanceof Date) {
                dateText = value.toISOString().slice(0, 10) + " " + value.toLocaleTimeString();
            }
            return dateText;
        }
    },
    watch: {
        country: {
            handler: 'countryChanged',
            deep: true
        }
    },

    mounted: function () {
        var vm = this;

        // define startDate
        Date.prototype.addDays = function (days) {
            var date = new Date(this.valueOf());
            date.setDate(date.getDate() + days);
            return date;
        }
        var now = new Date();
        var utcNow = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        startDate = utcNow.addDays(-this.daysNumber - 1);
        this.startDateString = startDate.toISOString().slice(0, 10);
        // end define startDate

        // Load the Visualization API and the line package.
        google.charts.load('current', {
            callback: function () {

                var urlCode = vm.getIsoCodeFromUrl();
                if (urlCode) {
                    vm.country.iso3 = urlCode;
                } else {
                    vm.getIso3CodeFromIp().then((iso3) => {
                        iso3 = iso3 || DEFAULT_CODE;
                        iso3 = iso3.toLowerCase();
                        vm.country.iso3 = iso3;
                    });
                }
            },
            'packages': ['line'],
            language: "en"
        });
    }
});