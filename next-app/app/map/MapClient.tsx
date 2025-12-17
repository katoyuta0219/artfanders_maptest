"use client";

import { useSearchParams } from "next/navigation";
import SimpleMap from "../../components/Maps/SimpleMap";
import { useEffect, useState } from "react";

const KOBE_BOUNDS = {
    minLat: 34.62,
    maxLat: 34.76,
    minLng: 135.12,
    maxLng: 135.35,
};

export default function MapPage() {
    const params = useSearchParams();

    const latString = params.get("lat");
    const lngString = params.get("lng");

    const destination = {
        lat: latString ? parseFloat(latString) : 34.6913, // 三宮あたり
        lng: lngString ? parseFloat(lngString) : 135.1955,
    };

    const [origin, setOrigin] = useState<{
        lat: number | null;
        lng: number | null;
    }>({ lat: null, lng: null });

    const [isInKobe, setIsInKobe] = useState<boolean | null>(null);

    const USE_MOCK_LOCATION = true; // ← false にすると実GPS

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

    // ✅ 位置情報取得中
    if (isInKobe === null) {
        return (
            <div style={{ padding: 40, textAlign: "center" }}>
                現在地を取得しています...
            </div>
        );
    }

    // ✅ 神戸市外ならブロック
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
                ⚠️ このアプリは神戸市内専用です。<br />
                現在地が神戸市外のため、地図は表示できません。
            </div>
        );
    }

    // ✅ 神戸市内のみ地図表示
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
