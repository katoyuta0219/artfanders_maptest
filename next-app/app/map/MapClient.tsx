"use client";

import SimpleMap from "../../components/Maps/SimpleMap";
import { useEffect, useState } from "react";

const KOBE_BOUNDS = {
    minLat: 34.62,
    maxLat: 34.76,
    minLng: 135.12,
    maxLng: 135.35,
};

export default function MapPage() {
    // 🎯 目的地（URLクエリから取得）
    const [destination, setDestination] = useState({
        lat: 34.6913, // デフォルト：三宮
        lng: 135.1955,
    });

    // 🎯 出発地（現在地）
    const [origin, setOrigin] = useState<{
        lat: number | null;
        lng: number | null;
    }>({ lat: null, lng: null });

    const [isInKobe, setIsInKobe] = useState<boolean | null>(null);

    const USE_MOCK_LOCATION = true; // false にすると実GPS

    // =========================
    // ✅ URLクエリ取得（useSearchParams 不使用）
    // =========================
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const lat = params.get("lat");
        const lng = params.get("lng");

        if (lat && lng) {
            setDestination({
                lat: parseFloat(lat),
                lng: parseFloat(lng),
            });
        }
    }, []);

    // =========================
    // ✅ 現在地取得
    // =========================
    useEffect(() => {
        if (!USE_MOCK_LOCATION && navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;

                setOrigin({ lat, lng });

                const inside =
                    lat >= KOBE_BOUNDS.minLat &&
                    lat <= KOBE_BOUNDS.maxLat &&
                    lng >= KOBE_BOUNDS.minLng &&
                    lng <= KOBE_BOUNDS.maxLng;

                setIsInKobe(inside);
            });
        } else {
            // ✅ モック（三宮）
            const mockLat = 34.6913;
            const mockLng = 135.1955;

            setOrigin({ lat: mockLat, lng: mockLng });
            setIsInKobe(true);
        }
    }, []);

    // =========================
    // 表示制御
    // =========================
    if (isInKobe === null) {
        return (
            <div style={{ padding: 40, textAlign: "center" }}>
                現在地を取得しています...
            </div>
        );
    }

    if (!isInKobe) {
        return (
            <div
                style={{
                    padding: 40,
                    textAlign: "center",
                    color: "red",
                    fontSize: 20,
                }}
            >
                ⚠️ このアプリは神戸市内専用です。
                <br />
                現在地が神戸市外のため、地図は表示できません。
            </div>
        );
    }

    return (
        <div style={{ width: "100%", height: "100vh" }}>
            <SimpleMap
                lat={destination.lat}
                lng={destination.lng}
                originLat={origin.lat}
                originLng={origin.lng}
            />
        </div>
    );
}