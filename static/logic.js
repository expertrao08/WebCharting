// *** Leaflet JS map creation *** 
// adapted from the leaflet JS quickstart doc

// save the base tile layer (the world map) from mapbox. accessToken is my own. Then add it to mymap.
var satelliteLay = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
    id: 'mapbox.streets-satellite',
    accessToken: 'pk.eyJ1Ijoia2V2aW54eTAwIiwiYSI6ImNqZWJrcDFyczBjZHkycm85bTBtdzNjcjcifQ.5h1SaoW7n6f9YA4mF_dZTA'
});
// map layer of street view
var darkLay = L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
    id: 'mapbox.dark',
    accessToken: 'pk.eyJ1Ijoia2V2aW54eTAwIiwiYSI6ImNqZWJrcDFyczBjZHkycm85bTBtdzNjcjcifQ.5h1SaoW7n6f9YA4mF_dZTA'
});

//instantiate map at html #mapid with center on London and only a slight zoom. 
var mymap = L.map('mapid', {
    center: [51.505, -0.09],
    zoom: 4,
    timeDimension: true,
    timeDimensionControl: true,
    layers: satelliteLay // default map when first loads
});

// base maps layer object for the master control layer
var baseMaps = {
    "Satellite Map": satelliteLay,
    "Dark Map": darkLay
};

// master control layer
var controlLayers = L.control.layers(baseMaps).addTo(mymap);

// api from earthquake.usgs.gov
    // all earthquakes from the past week
var Earthquakes_url = "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_week.geojson";

d3.json(Earthquakes_url, function(data){
// send the features in the response to the createFeatures function
createFeatures(data.features);

});

// takes in api data, features object, which is an array of objects, and adds geojson objects to map
function createFeatures(Earthquakes_data) {

    /*** First get marker color and radius 
     * based on earthquake magnitude classes
     * found here: http://www.geo.mtu.edu/UPSeis/magnitude.html */
    function getRadius(d){
        return d > 8  ? 192:
        d > 7  ? 96 :
        d > 6  ? 48 :
        d > 5   ? 24 :
        d > 4   ? 12 :
                6;
    }
    function getColor(d) { // ranges from pale yellowish to dark reddish
        return d > 8 ? '#710016' :
            d > 7  ? '#E31A1C':
            d > 6  ? '#FC4E2A' :
            d > 5  ? '#FD8D3C' :
            d > 4   ? '#fec981' :
                        '#fff6cf';
    }
    function geojsonMarkerOptions(feature) {
        return {
            radius: getRadius(feature.properties.mag),
            fillColor: getColor(feature.properties.mag),
            color: "#000",
            weight: 1,
            opacity: 1,
            fillOpacity: 0.8
        };

    } // end geojsonMarkerOptions()

    /*** Binds popup on each circle feature.
     * Used below in the L.geoJSON for Earthquake data */
    function onEachFeature(feature, layer) {
        // if properties is not empty
        if (feature.properties) {
            layer.bindPopup(
                "Event: " + feature.properties.title 
                + "<hr>Time: " 
                + getTime(feature.properties.time)
            );
            
            // popups on circle on hover and close when mouse moves out
            layer.on("mouseover", function(event){
                this.openPopup();
            });
            layer.on('mouseout', function (e) {
                this.closePopup();
            });

            // function: Get readable date from UTC time stamp in the api
            function getTime(feature) {
                var date = new Date(feature);
                // Day part of the timestamp
                var getDate = date.getUTCDate();
                // month part of the timestamp
                var utcMonth = date.getUTCMonth();
                // returns the month based on UTC month (range: 0-11)
                var month = new Array(12);
                    month[0] = "January";
                    month[1] = "February";
                    month[2] = "March";
                    month[3] = "April";
                    month[4] = "May";
                    month[5] = "June";
                    month[6] = "July";
                    month[7] = "August";
                    month[8] = "September";
                    month[9] = "October";
                    month[10] = "November";
                    month[11] = "December";
                var getMonth = month[utcMonth];
                // Hours part from the timestamp
                var hours = date.getUTCHours();
                // Minutes part from the timestamp
                var minutes = "0" + date.getUTCMinutes();
                // Will display time in 10:30:23 format
                var formattedTime = getMonth + " " + getDate + " - " 
                    + hours + ':' + minutes.substr(-2) + " UTC"; 
                return formattedTime;
            } // end function getTime(feature)
        } // end if (feature.properties)
    } //End onEachFeature()

    // *** leaflet geoJSON to convert data into circles on the map w/ other features
    var quakePoints = 
        // add to time dimension control
        L.geoJson(Earthquakes_data, {
            pointToLayer: function (feature, latlng) {
                return L.circleMarker(latlng); // create circle for each coordinate
            },
            style: geojsonMarkerOptions,
            onEachFeature: onEachFeature // to bind mouse-hover popups
        }); // end geoJSON

    /*** Time dimension layer for earthquake points, auto get dimensions***/
    TimeDimLay = L.timeDimension.layer.geoJson(quakePoints, {
        addlastPoint: true, // add point for earliest data
        updateTimeDimension: true // use the time dimensions range for this geoJson layer 
    }).addTo(mymap); 	

    // add to master control layer
    controlLayers.addOverlay(TimeDimLay, 'Earthquake Points');

    // *** Add fault lines to mymap 
    var faultsURL = "https://raw.githubusercontent.com/fraxen/tectonicplates/master/GeoJSON/PB2002_plates.json" 
    d3.json(faultsURL, function(faultsData) {
        drawFaults(faultsData.features);
    });

    function drawFaults(faultsData) {
        var faultLayer = L.geoJSON(faultsData, {
            pointToLayer: function (feature, latlng) {
                return new L.polyline(latlng);
            },
        }).addTo(mymap);
        controlLayers.addOverlay(faultLayer, 'Fault Lines');
        // bring to front earthquake data points when page first loads
        TimeDimLay.bringToFront();
    }

    /*** Always keep quakePoints time dimension layer in front
     * add eventlistener for whenever layers are overlayed. 
     * Keep Earthquake data at the front */
    mymap.on("overlayadd", function (event) {
        TimeDimLay.bringToFront();
    });

    // *** Create legend at bottom-right
    // adapted from http://leafletjs.com/examples/choropleth/
    var legend = L.control({position: 'bottomright'});

    legend.onAdd = function (map) {

        var div = L.DomUtil.create('div', 'info legend'),
            grades = [0, 4, 5, 6, 7, 8],
            labels = ["Minor", "Light", "Moderate", "Strong", "Major", "Great"];

        // loop through our density intervals and generate a label with a colored square for each interval
        for (var i = 0; i < grades.length; i++) {
            div.innerHTML +=
                '<i style="background:' + getColor(grades[i] + 1) + '"></i> ' +
                "(" + grades[i] + (grades[i + 1] ? '&ndash;' + grades[i + 1] + ") " 
                + labels[i] + '<br>' : "+)  " + labels[i]);
        }

        return div;
    };


    // adding legend to mymap
    legend.addTo(mymap);

} //end createFeatures()

