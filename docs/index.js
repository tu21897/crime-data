home = {lat: 47.646197, long:-122.312542, zoom:13};

var map = L.map('map', {
    zoomControl: false,
    minZoom: 10
}).setView([home.lat, home.long], home.zoom);

var Stadia_AlidadeSmoothDark = L.tileLayer('https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png', {
    maxZoom: 20,
    attribution: '&copy; <a href="https://stadiamaps.com/">Stadia Maps</a>, &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
}).addTo(map);

L.svg({clickable:true}).addTo(map);

d3.json('mcpp.geojson').then(function(json) {
    const projectPoint = function(x, y) {
            const point = map.latLngToLayerPoint(new L.LatLng(y, x))
            this.stream.point(point.x, point.y)
        };
    let projection = d3.geoTransform({point: projectPoint});
    let geoGenerator = d3.geoPath().projection(projection);
    const overlay = d3.select(map.getPanes().overlayPane);
    const svg = overlay.select('svg').attr("pointer-events", "auto"),
            g = svg.append('g').attr('class', 'leaflet-zoom-hide');
    const path = g.selectAll('path')
        .data(json.features)
        .enter()
        .append('path')
        .attr('d', geoGenerator)
        .attr('fill-opacity', 0.2)
        .attr('fill', 'steelblue')
        .attr('stroke', '#fff')
        .attr('stroke-width', .3)
        .on("mouseover", function(d){
            d3.select(this).attr("fill-opacity", 0.3)
        })
        .on("mouseout", function(d){
            d3.select(this).attr("fill-opacity", 0.2)
        })
        .on("click", async function(e, d){
            if (d3.select(this).attr("fill") != 'gray') {
                d3.select(this).attr("fill", 'gray');
                const response = await fetch(`https://data.seattle.gov/resource/tazs-3rd5.json?mcpp=${d.properties.NAME}&$where=offense_start_datetime%20%3E=%20%272019-01-01T00:00:00%27&$limit=1000`);
                const data = await response.json();
                let heat = d3.group(data, d => d.latitude, d=> d.longitude);
                let h1 = [...heat.keys()].map(d => [...heat.get(d)].map(dd => [d, dd[0], dd[1].length])).flat();
                L.heatLayer(h1, {radius: 15}).addTo(map);
            }
        });
    const onZoom = () => {path.attr('d', geoGenerator);}
    onZoom()
    map.on('zoomend', onZoom)
});

// From https://gis.stackexchange.com/questions/127286/home-button-leaflet-map, user:9847
L.Control.zoomHome = L.Control.extend({
    options: {
        position: 'topright',
        zoomInText: '+',
        zoomInTitle: 'Zoom in',
        zoomOutText: '-',
        zoomOutTitle: 'Zoom out',
        zoomHomeText: '<i class="fa fa-home" style="line-height:1.65;"></i>',
        zoomHomeTitle: 'Zoom home'
    },

    onAdd: function (map) {
        var controlName = 'gin-control-zoom',
            container = L.DomUtil.create('div', controlName + ' leaflet-bar'),
            options = this.options;

        this._zoomInButton = this._createButton(options.zoomInText, options.zoomInTitle,
        controlName + '-in', container, this._zoomIn);
        this._zoomHomeButton = this._createButton(options.zoomHomeText, options.zoomHomeTitle,
        controlName + '-home', container, this._zoomHome);
        this._zoomOutButton = this._createButton(options.zoomOutText, options.zoomOutTitle,
        controlName + '-out', container, this._zoomOut);

        this._updateDisabled();
        map.on('zoomend zoomlevelschange', this._updateDisabled, this);

        return container;
    },

    onRemove: function (map) {
        map.off('zoomend zoomlevelschange', this._updateDisabled, this);
    },

    _zoomIn: function (e) {
        this._map.zoomIn(e.shiftKey ? 3 : 1);
    },

    _zoomOut: function (e) {
        this._map.zoomOut(e.shiftKey ? 3 : 1);
    },

    _zoomHome: function (e) {
        map.setView([home.lat, home.long], home.zoom);
    },

    _createButton: function (html, title, className, container, fn) {
        var link = L.DomUtil.create('a', className, container);
        link.innerHTML = html;
        link.href = '#';
        link.title = title;

        L.DomEvent.on(link, 'mousedown dblclick', L.DomEvent.stopPropagation)
            .on(link, 'click', L.DomEvent.stop)
            .on(link, 'click', fn, this)
            .on(link, 'click', this._refocusOnMap, this);

        return link;
    },

    _updateDisabled: function () {
        var map = this._map,
            className = 'leaflet-disabled';

        L.DomUtil.removeClass(this._zoomInButton, className);
        L.DomUtil.removeClass(this._zoomOutButton, className);

        if (map._zoom === map.getMinZoom()) {
            L.DomUtil.addClass(this._zoomOutButton, className);
        }
        if (map._zoom === map.getMaxZoom()) {
            L.DomUtil.addClass(this._zoomInButton, className);
        }
    }
});
var zoomHome = new L.Control.zoomHome();
zoomHome.addTo(map);