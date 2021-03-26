<script>
    import Legend from "./map/Legend.svelte";
    import {
        mapObject,
        selectedItem,
        filters,
        rows,
        filterExtent
    } from "../stores";
    import { styles } from "../constants";
    import { onMount } from "svelte";

    let map;
    let container;
    let loaded = false;
    let popup;
    let previousSelectedItem;
    let lastFeature;

    //filter using everything but map-extent
    $: items = $rows.filter(row =>
        $filters.filter(f => f.label !== "map-extent").every(f => f.filter(row))
    );

    function updateExtentFilter(filterExtent) {
        const features = map.queryRenderedFeatures({
            layers: ["markers", "points"]
        });

        if (features) {
            const unqiueIds = [
                ...new Set(features.map(feature => feature.properties.id))
            ];
            if ($filters) {
                //remove existing filter
                const _filters = $filters;
                const filter = _filters.findIndex(
                    f => f.label === "map-extent"
                );
                if (filter > -1) _filters.splice(filter, 1);
                if (filterExtent) {
                    //generate new filter
                    const mapExtentFilter = {
                        label: "map-extent",
                        filter: row => unqiueIds.includes(row.id)
                    };
                    filters.set([..._filters, mapExtentFilter]);
                } else {
                    filters.set(_filters);
                }
            }
        }
    }

    $: if (map && loaded) updateExtentFilter($filterExtent); //update filter when $filterExtent checkbox store changes

    function generateFeatures(items) {
        return {
            type: "FeatureCollection",
            features: items.map(item => {
                return {
                    type: "Feature",
                    id: item.id,
                    geometry: {
                        type: "Point",
                        coordinates: item.coordinates
                    },
                    properties: item
                };
            })
        };
    }

    onMount(() => {
        mapboxgl.accessToken =
            "pk.eyJ1IjoiamFzb24yNzMiLCJhIjoiY2szZXBubGM1MDBxcDNtbzZxNHBxc2I5OSJ9.uT0EGQIuUTU5cBIlu_OOcQ";
        map = new mapboxgl.Map({
            container,
            style: "mapbox://styles/mapbox/streets-v11",

            //center: [-89.2601765, 48.4205727],
            zoom: 1,
            maxZoom: 14,
        });

        map.addControl(new mapboxgl.NavigationControl());

        // //To pan and zoom, use 2 fingers
        // map.addControl(new MultiTouch());

        popup = new mapboxgl.Popup({
            closeButton: false,
            closeOnClick: false
        });

        map.on("load", () => {
            const data = generateFeatures(items);
            // Add an image to use as a custom marker
            map.loadImage(
                'https://docs.mapbox.com/mapbox-gl-js/assets/custom_marker.png',
                function (error, image) {
                    if (error) throw error;
                    map.addImage('custom-marker', image);
                }
            );

            map.addSource("libraries", {
                type: "geojson",
                data,
                cluster: true,
                clusterMaxZoom: 14, // maz zoom to cluster points on
                clusterRadius: 50 // radius of each cluster
            });

            map.addLayer({
                id: "libraries-circle",
                type: "circle",
                source: "libraries",
                filter: ["has", "point_count"],
                paint: {
                    // Use step expressions (https://docs.mapbox.com/mapbox-gl-js/style-spec/#expressions-step)
                    // with three steps to implement three types of circles:
                    //   * Blue, 20px circles when point count is less than 100
                    //   * Yellow, 30px circles when point count is between 100 and 750
                    //   * Pink, 40px circles when point count is greater than or equal to 750
                    "circle-color": [
                        "step",
                        ["get", "point_count"],
                        "#51bbd6",
                        5,
                        "#f1f075",
                        10,
                        "#f28cb1"
                    ],
                    "circle-radius": [
                        "step",
                        ["get", "point_count"],
                        25,
                        5,
                        40,
                        10,
                        50
                    ]
                }
            });

            // cluster count
            map.addLayer({
                id: "libraries-count",
                type: "symbol",
                source: "libraries",
                filter: ["has", "point_count"],
                layout: {
                    "text-field": "{point_count_abbreviated}",
                    "text-font": [
                        "DIN Offc Pro Medium",
                        "Arial Unicode MS Bold"
                    ],
                    "text-size": 16,
                }
            });
            map.addLayer({
                id: "unclustered-library",
                //type: "circle",
                type: "symbol",
                source: "libraries",
                filter: ["!", ["has", "point_count"]],
                layout: {
                  "icon-image":"custom-marker",
                  "icon-size": 0.68
                },
                //paint: {
                  //  "circle-color": "#00427a",
                   // "circle-radius": 8,
                  //  "circle-stroke-width": 1,
                  //  "circle-stroke-color": "#000"
               // }
            });

            // inspect a cluster on click
            map.on("click", "libraries-circle", function(e) {
                var features = map.queryRenderedFeatures(e.point, {
                    layers: ["libraries-circle"]
                });
                var clusterId = features[0].properties.cluster_id;
                map.getSource("libraries").getClusterExpansionZoom(
                    clusterId,
                    function(err, zoom) {
                        if (err) return;

                        map.easeTo({
                            center: features[0].geometry.coordinates,
                            zoom: zoom
                        });
                    }
                );
            });

            map.on("mouseenter", "unclustered-library", e => {
                map.getCanvas().style.cursor = "pointer";
                const feature = e.features[0];
                const coordinates = feature.geometry.coordinates.slice();
                const InstitutionName = feature.properties['Institution Name'];
                const LibraryName = feature.properties['Library Name'];
                const description = `<h6>${InstitutionName}</h6><br  /><p>${LibraryName}</p>`;

                popup
                    .setLngLat(coordinates)
                    .setHTML(description)
                    .addTo(map);
            });

            map.on("mousemove", "unclustered-library", e => {
                const feature = map.queryRenderedFeatures(e.point)[0];
                if (feature.properties.id !== lastFeature) {
                    lastFeature = feature.properties.id;
                    const coordinates = feature.geometry.coordinates.slice();
                    const InstitutionName = feature.properties['Institution Name'];
                    const LibraryName = feature.properties['Library Name'];
                    const description = `<h6>${InstitutionName}</h6><br  /><p>${LibraryName}</p>`;
                    popup.remove();
                    popup
                        .setLngLat(coordinates)
                        .setHTML(description)
                        .addTo(map);
                }
            });

            map.on("mouseleave", "unclustered-library", () => {
                map.getCanvas().style.cursor = "";
                popup.remove();
            });

            map.on("click", () => {
                selectedItem.select(null);
            });

            map.on("click", "unclustered-library", e => {
                const feature = e.features[0];
                selectedItem.select(feature.properties);
            });

            //load icon and symbol layer
            const uniqueStyleIcons = [
                ...new Set(styles.map(style => style.icon))
            ];

        });

        mapObject.set(map);
    });

    $: if (map && loaded) {
        const data = generateFeatures(items);
        const layer = map.getSource("libraries");
        if (layer) {
            layer.setData(data);
        }
    }

    $: if (map && loaded) {
        if (previousSelectedItem) {
            //remove previous selectedItem
            map.setFeatureState(
                { source: "libraries", id: previousSelectedItem.id },
                { highlight: false }
            );
        }
        if ($selectedItem) {
            map.setFeatureState(
                { source: "libraries", id: $selectedItem.id },
                { highlight: true }
            );
        }
        previousSelectedItem = $selectedItem;
    }
</script>

<style>
    #map {
        width: 100%;
        height: 100%;
    }

    :global(.mapboxgl-popup) {
        max-width: 400px;
    }

    :global(.mapboxgl-popup-content) {
        border: 1px solid rgba(211, 211, 211, 0.5);
    }

    :global(.mapboxgl-popup-content p) {
        margin-bottom: 1px !important;
    }
</style>

<div id="map" bind:this={container}>
    <!-- Legend / -->
</div>
