'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

// ----------------------------------------------
// 神戸の判定に使うコア境界
// ----------------------------------------------
const KOBE_CORE_BOUNDS: [[number, number], [number, number]] = [
    [135.12, 34.62],
    [135.35, 34.76],
];

// 表示用のソフト境界
const KOBE_SOFT_BOUNDS: [[number, number], [number, number]] = [
    [134.95, 34.55],
    [135.55, 34.85],
];

export default function SimpleMap({
    lat,
    lng,
    originLat,
    originLng
}: {
    lat: number;
    lng: number;
    originLat: number | null;
    originLng: number | null;
}) {
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? '';

    const mapContainer = useRef<HTMLDivElement | null>(null);
    const [isOutOfKobe, setIsOutOfKobe] = useState(false);

    useEffect(() => {
        if (!mapContainer.current) return;

        const map = new mapboxgl.Map({
            container: mapContainer.current,
            bounds: KOBE_SOFT_BOUNDS,
            fitBoundsOptions: { padding: 80 },
            maxBounds: KOBE_SOFT_BOUNDS,
            zoom: 13,
            pitch: 60,
            bearing: -20,
            style: 'mapbox://styles/mapbox/dark-v11',
            antialias: true,
        });

        map.on('load', async () => {

            /* ====================================================
               ① 神戸市の境界を読み込み（外側を暗転マスク）
               ==================================================== */

            const res = await fetch('/kobe_city_boundary.geojson');
            const kobeGeojson = await res.json();

            map.addSource('kobe-boundary', {
                type: 'geojson',
                data: kobeGeojson,
            });

            const kobeCoordinates =
                kobeGeojson.features[0].geometry.type === 'MultiPolygon'
                    ? kobeGeojson.features[0].geometry.coordinates[0][0]
                    : kobeGeojson.features[0].geometry.coordinates[0];

            //外側マスク（市外を暗くする）
            map.addSource('kobe-mask', {
                type: 'geojson',
                data: {
                    type: 'Feature',
                    geometry: {
                        type: 'Polygon',
                        coordinates: [
                            [
                                [134.0, 34.2],
                                [136.2, 34.2],
                                [136.2, 35.2],
                                [134.0, 35.2],
                                [134.0, 34.2],
                            ],
                            kobeCoordinates
                        ],
                    },
                },
            });

            map.addLayer({
                id: 'kobe-mask-layer',
                type: 'fill',
                source: 'kobe-mask',
                paint: {
                    'fill-color': '#000',
                    'fill-opacity': 0.4,
                },
            });

            // 境界線（ネオン風）
            map.addLayer({
                id: 'kobe-boundary-line',
                type: 'line',
                source: 'kobe-boundary',
                paint: {
                    'line-color': '#00ffff',
                    'line-width': 3,
                    'line-opacity': 0.8,
                    'line-blur': 1.5,
                },
            });


            /* ====================================================
               ② 地形（Terrain）＋ 空（Sky）＋ 光源
               ==================================================== */

            map.addSource('mapbox-dem', {
                type: 'raster-dem',
                url: 'mapbox://mapbox.terrain-rgb',
                tileSize: 512,
                maxzoom: 14,
            });

            map.setTerrain({ source: 'mapbox-dem', exaggeration: 1.4 });

            map.addLayer({
                id: 'sky',
                type: 'sky',
                paint: {
                    'sky-type': 'atmosphere',
                    'sky-atmosphere-sun': [0.0, 90.0],
                    'sky-atmosphere-sun-intensity': 20
                }
            });

            // 光源 → 建物の影に影響
            map.setLight({
                anchor: 'map',
                position: [1.5, 180, 80], // 太陽方向
                intensity: 0.9,
                color: '#ffffff'
            });


            /* ====================================================
               ③ 3D建物（影付き）
               ==================================================== */

            const layers = map.getStyle().layers;
            const labelLayerId = layers.find(
                (l) => l.type === 'symbol' && l.layout['text-field']
            )?.id;

            map.addLayer(
                {
                    id: '3d-buildings',
                    type: 'fill-extrusion',
                    source: 'composite',
                    'source-layer': 'building',
                    filter: ['==', 'extrude', 'true'],
                    minzoom: 14,
                    paint: {
                        'fill-extrusion-color': '#aaaaaa',

                        // 高さデータでリアル3D
                        'fill-extrusion-height': [
                            'interpolate',
                            ['linear'],
                            ['zoom'],
                            14, 0,
                            16, ['get', 'height']
                        ],
                        'fill-extrusion-base': ['get', 'min_height'],

                        // 影の演出（重要）
                        'fill-extrusion-ambient-occlusion-intensity': 0.3,
                        'fill-extrusion-opacity': 0.9,
                    },
                },
                labelLayerId
            );


            /* ====================================================
               ④ 神戸市内判定（ルートが意味を持つ範囲）
               ==================================================== */

            const isInsideKobe = (lat: number, lng: number) => {
                return (
                    lat >= KOBE_CORE_BOUNDS[0][1] &&
                    lat <= KOBE_CORE_BOUNDS[1][1] &&
                    lng >= KOBE_CORE_BOUNDS[0][0] &&
                    lng <= KOBE_CORE_BOUNDS[1][0]
                );
            };

            if (originLat && originLng) {
                setIsOutOfKobe(!isInsideKobe(originLat, originLng));
            }


            /* ====================================================
               ⑤ ルート表示（最短ルート）
               ==================================================== */

            if (originLat && originLng) {
                const url =
                    `https://api.mapbox.com/directions/v5/mapbox/walking/` +
                    `${originLng},${originLat};${lng},${lat}` +
                    `?geometries=geojson&overview=full&steps=true&access_token=${mapboxgl.accessToken}`;

                const res = await fetch(url);
                const data = await res.json();
                const route = data.routes[0].geometry;

                map.addSource('route', {
                    type: 'geojson',
                    data: {
                        type: 'Feature',
                        properties: {},
                        geometry: route,
                    }
                });

                map.addLayer({
                    id: 'route-line',
                    type: 'line',
                    source: 'route',
                    paint: {
                        'line-color': '#00e0ff',
                        'line-width': 6,
                        'line-opacity': 0.9,
                    }
                });

                new mapboxgl.Marker({ color: '#ff3b30' })
                    .setLngLat([originLng, originLat])
                    .addTo(map);

                new mapboxgl.Marker({ color: '#00ff5e' })
                    .setLngLat([lng, lat])
                    .addTo(map);
            }
        });

        return () => map.remove();
    }, [lat, lng, originLat, originLng]);


    /* ============================================================
       UI：神戸市外に出たら警告バー
       ============================================================ */
    return (
        <>
            {isOutOfKobe && (
                <div
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        width: '100%',
                        padding: '12px',
                        background: 'rgba(255,0,0,0.85)',
                        color: '#fff',
                        textAlign: 'center',
                        fontWeight: 'bold',
                        zIndex: 1000
                    }}
                >
                    ⚠️ 現在地が神戸市外に出ました。このアプリの案内は神戸市内専用です。
                </div>
            )}

            <div ref={mapContainer} style={{ width: '100%', height: '100vh' }} />
        </>
    );
}
